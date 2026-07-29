import { compare } from 'bcryptjs'
import { z } from 'zod'
import { normalizeApiPath } from '../../src/lib/apiPath'

interface Env { DB: D1Database; ADMIN_PASSWORD_HASH: string; SESSION_SECRET: string }
type Ctx = EventContext<Env, string, unknown>
const json = (data: unknown, status = 200, headers: HeadersInit = {}) => Response.json(data, { status, headers })
const id = () => crypto.randomUUID()
const now = () => new Date().toISOString()
const norm = (s: string) => s.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ')
async function hashToken(token: string) { const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)); return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('') }
async function userToken(request: Request, db: D1Database, userId: string) { const token = request.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1]; if (!token) return false; const user = await db.prepare('SELECT id FROM users WHERE id=? AND access_token_hash=? AND deleted_at IS NULL').bind(userId, await hashToken(token)).first(); return Boolean(user) }
const text = z.string().trim().min(2).max(80)
const matchSchema = z.object({ opponent: text, kuriyama_side: z.enum(['HOME','AWAY']), kickoff_at: z.string().datetime(), picks_close_at: z.string().datetime(), status: z.enum(['DRAFT','OPEN','LOCKED','FINISHED','CANCELLED']) }).refine(v => new Date(v.picks_close_at) <= new Date(v.kickoff_at), 'El cierre debe ser anterior al inicio')
const marketSchema = z.object({ match_id: z.string().uuid(), market_type: z.string().min(2).max(40), title: text, line: z.number().nullable().optional(), status: z.enum(['OPEN','CLOSED','DISABLED','SETTLED']).default('OPEN') })
const optionSchema = z.object({ market_id: z.string().uuid(), label: text, line_value: z.number().nullable().optional(), decimal_odds: z.number().min(1).max(1000) })
const questionType = z.enum(['CUSTOM','TOTAL_GOALS','FIRST_HALF_GOALS','GOAL_SCORER','EXACT_SCORE'])
const questionOptionSchema = z.object({ value_key: z.string().trim().min(1).max(100), label: z.string().trim().min(1).max(100), points_value: z.number().positive().max(100) })
const questionSchema = z.object({ match_id: z.string().uuid(), prompt: z.string().trim().min(3).max(240), points_value: z.number().positive().max(100), status: z.enum(['OPEN','CLOSED','SETTLED','DISABLED']).default('OPEN'), question_type: questionType.default('CUSTOM'), options: z.array(questionOptionSchema).max(60) }).refine(value=>value.question_type==='EXACT_SCORE'||value.options.length>=2,'Se requieren al menos dos respuestas')
const standingNumber = z.number().int().min(-999).max(9999).nullable()
const standingSchema = z.object({ group_name:z.string().trim().min(1).max(60),place:z.number().int().min(1).max(999).nullable(),team:text,played:standingNumber,won:standingNumber,drawn:standingNumber,lost:standingNumber,goals_for:standingNumber,goals_against:standingNumber,goal_difference:standingNumber,penalty_points:standingNumber,points:standingNumber })

async function questionsWithOptions(db: D1Database, matchId: string, userId?: string) {
  const sql="SELECT q.id,q.match_id,q.prompt,q.points_value,q.status,q.question_type,q.special_type,q.correct_answer,q.settled_at,m.kickoff_at,m.picks_close_at FROM questions q JOIN matches m ON m.id=q.match_id WHERE q.match_id=? AND q.status!='DISABLED' ORDER BY CASE WHEN q.special_type='EXACT_SCORE' THEN 0 ELSE 1 END,q.created_at"
  const questions=(await db.prepare(sql).bind(matchId).all()).results as Array<Record<string, unknown>>
  const options=(await db.prepare('SELECT qo.* FROM question_options qo JOIN questions q ON q.id=qo.question_id WHERE q.match_id=? ORDER BY qo.question_id,qo.sort_order').bind(matchId).all()).results as Array<Record<string, unknown>>
  const predictions=userId?(await db.prepare('SELECT p.question_id,p.answer,p.status,p.points_awarded FROM predictions p WHERE p.user_id=? AND p.match_id=? ORDER BY p.created_at').bind(userId,matchId).all()).results as Array<Record<string, unknown>>:[]
  return questions.map(q=>{const selected=predictions.filter(p=>p.question_id===q.id);return {...q,question_type:q.special_type==='EXACT_SCORE'?'EXACT_SCORE':q.question_type,options:options.filter(o=>o.question_id===q.id),prediction_answers:selected.map(p=>p.answer),prediction_answer:selected[0]?.answer,prediction_status:selected[0]?.status,points_awarded:selected.reduce((sum,p)=>sum+Number(p.points_awarded??0),0)}})
}

async function replaceQuestionOptions(db: D1Database, questionId: string, options: z.infer<typeof questionOptionSchema>[]) {
  const statements=[db.prepare('DELETE FROM question_options WHERE question_id=?').bind(questionId)]
  options.forEach((o,index)=>statements.push(db.prepare('INSERT INTO question_options(id,question_id,value_key,label,points_value,sort_order) VALUES(?,?,?,?,?,?)').bind(id(),questionId,o.value_key,o.label,o.points_value,index)))
  await db.batch(statements)
}

async function body<T>(request: Request, schema: z.ZodType<T>) { return schema.parse(await request.json()) }
async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value))
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_')
}
async function isAdmin(request: Request, env: Env) {
  const token = request.headers.get('Cookie')?.match(/(?:^|; )kuri_admin=([^;]+)/)?.[1]
  if (!token || !env.SESSION_SECRET) return false
  const [payload, signature] = token.split('.')
  if (!payload || !signature || signature !== await sign(payload, env.SESSION_SECRET)) return false
  const data = JSON.parse(atob(payload.replace(/-/g,'+').replace(/_/g,'/'))) as { exp: number }
  return data.exp > Date.now()
}
async function requireAdmin(c: Ctx) { return await isAdmin(c.request, c.env) ? null : json({ error: 'No autorizado' }, 401) }
const params = (url: URL) => Object.fromEntries(url.searchParams)

async function route(c: Ctx) {
  const url = new URL(c.request.url), method = c.request.method, path = normalizeApiPath(url.pathname)
  const db = c.env.DB
  if (method === 'POST' && path === '/users') {
    const { name } = await body(c.request, z.object({ name: text }))
    const normalized = norm(name); let user = await db.prepare('SELECT id,name,normalized_name,created_at,updated_at FROM users WHERE normalized_name=? AND deleted_at IS NULL').bind(normalized).first()
    const token = `${id()}${id()}`, tokenHash = await hashToken(token)
    if (!user) { const userId = id(); await db.prepare('INSERT INTO users(id,name,normalized_name,access_token_hash) VALUES(?,?,?,?)').bind(userId, name, normalized, tokenHash).run(); user = await db.prepare('SELECT id,name,normalized_name,created_at,updated_at FROM users WHERE id=?').bind(userId).first() }
    else await db.prepare('UPDATE users SET access_token_hash=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(tokenHash, user.id).run()
    return json({ ...user, token }, 201)
  }
  const userAccount = path.match(/^\/users\/([^/]+)$/)
  if (userAccount && method === 'PUT') {
    if (!(await userToken(c.request, db, userAccount[1]))) return json({ error: 'Sesión de usuario inválida' }, 401)
    const { name } = await body(c.request, z.object({ name: text })); const normalized = norm(name)
    try { await db.prepare('UPDATE users SET name=?,normalized_name=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND deleted_at IS NULL').bind(name, normalized, userAccount[1]).run() } catch { return json({ error: 'Ese nombre ya está en uso' }, 409) }
    return json(await db.prepare('SELECT id,name,normalized_name,created_at,updated_at FROM users WHERE id=?').bind(userAccount[1]).first())
  }
  if (userAccount && method === 'DELETE') {
    if (!(await userToken(c.request, db, userAccount[1]))) return json({ error: 'Sesión de usuario inválida' }, 401)
    await db.prepare("UPDATE users SET name='Cuenta eliminada',normalized_name='deleted-'||id,access_token_hash=NULL,deleted_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(userAccount[1]).run()
    return json({ ok: true })
  }
  if (method === 'GET' && path === '/matches/current') {
    const match = await db.prepare("SELECT * FROM matches WHERE status='OPEN' AND kickoff_at>? AND picks_close_at>? ORDER BY kickoff_at LIMIT 1").bind(now(), now()).first()
    return json(match)
  }
  if (method === 'GET' && path === '/matches') return json((await db.prepare('SELECT * FROM matches ORDER BY kickoff_at DESC').all()).results)
  if (method === 'GET' && path === '/matches/open') return json((await db.prepare("SELECT * FROM matches WHERE status='OPEN' AND kickoff_at>? ORDER BY kickoff_at").bind(now()).all()).results)
  if (method === 'GET' && path === '/standings') return json((await db.prepare('SELECT * FROM standings ORDER BY sort_order').all()).results)
  if (method === 'GET' && path.startsWith('/markets/')) {
    const matchId = path.slice(9)
    const rows = (await db.prepare("SELECT m.*,o.id option_id,o.label option_label,o.line_value,o.decimal_odds,o.settlement_status FROM markets m JOIN market_options o ON o.market_id=m.id WHERE m.match_id=? AND m.status='OPEN' ORDER BY m.created_at,o.created_at").bind(matchId).all()).results
    return json(rows)
  }
  if (method === 'POST' && path === '/picks') {
    const v = await body(c.request, z.object({ user_id: z.string().uuid(), match_id: z.string().uuid(), market_option_id: z.string().uuid() }))
    const row = await db.prepare("SELECT m.id match_id,m.status match_status,m.kickoff_at,m.picks_close_at,mk.id market_id,mk.status market_status,o.id option_id,o.decimal_odds FROM matches m JOIN markets mk ON mk.match_id=m.id JOIN market_options o ON o.market_id=mk.id JOIN users u ON u.id=? WHERE m.id=? AND o.id=?").bind(v.user_id,v.match_id,v.market_option_id).first<Record<string, string|number>>()
    if (!row) return json({ error: 'Selección inválida' }, 400)
    if (row.match_status !== 'OPEN' || row.market_status !== 'OPEN' || Date.now() >= new Date(String(row.kickoff_at)).getTime() || Date.now() >= new Date(String(row.picks_close_at)).getTime()) return json({ error: 'Las apuestas están cerradas' }, 409)
    try { const pickId=id(); await db.prepare('INSERT INTO picks(id,user_id,match_id,market_id,market_option_id,odds_snapshot) VALUES(?,?,?,?,?,?)').bind(pickId,v.user_id,v.match_id,row.market_id,v.market_option_id,row.decimal_odds).run(); return json(await db.prepare('SELECT * FROM picks WHERE id=?').bind(pickId).first(),201) } catch { return json({ error: 'Ya tienes un pick para este partido' },409) }
  }
  const userPicks = path.match(/^\/users\/([^/]+)\/picks$/)
  if (method === 'GET' && userPicks) return json((await db.prepare('SELECT p.*,m.opponent,m.kuriyama_side,m.kickoff_at,mk.title market_title,o.label option_label FROM picks p JOIN matches m ON m.id=p.match_id JOIN markets mk ON mk.id=p.market_id JOIN market_options o ON o.id=p.market_option_id WHERE p.user_id=? ORDER BY p.created_at DESC').bind(userPicks[1]).all()).results)
  const matchQuestions=path.match(/^\/questions\/([^/]+)$/)
  if(method==='GET'&&matchQuestions){const userId=url.searchParams.get('user_id')??undefined;if(userId&&!(await userToken(c.request,db,userId)))return json({error:'Sesión de usuario inválida'},401);return json(await questionsWithOptions(db,matchQuestions[1],userId))}
  if(method==='POST'&&path==='/predictions'){const v=await body(c.request,z.object({user_id:z.string().uuid(),question_id:z.string().uuid(),answer:z.string().min(1).max(100)}));if(!(await userToken(c.request,db,v.user_id)))return json({error:'Sesión de usuario inválida'},401);const q=await db.prepare("SELECT q.id,q.match_id,q.status,q.question_type,q.special_type,m.status match_status,m.kickoff_at,m.picks_close_at FROM questions q JOIN matches m ON m.id=q.match_id WHERE q.id=?").bind(v.question_id).first<Record<string,string|number>>();if(!q)return json({error:'Pregunta inválida'},404);let points=20;if(q.special_type==='EXACT_SCORE'){if(!/^SCORE_(?:[0-9]|[1-9][0-9])_(?:[0-9]|[1-9][0-9])$/.test(v.answer))return json({error:'Marcador inválido'},400)}else{const option=await db.prepare('SELECT points_value FROM question_options WHERE question_id=? AND value_key=?').bind(v.question_id,v.answer).first<{points_value:number}>();if(!option)return json({error:'Respuesta inválida'},404);points=option.points_value}if(q.status!=='OPEN'||q.match_status!=='OPEN'||Date.now()>=new Date(String(q.kickoff_at)).getTime()||Date.now()>=new Date(String(q.picks_close_at)).getTime())return json({error:'Las predicciones están cerradas'},409);const predictionId=id();const statements:D1PreparedStatement[]=[];if(q.question_type!=='GOAL_SCORER'||q.special_type==='EXACT_SCORE')statements.push(db.prepare("DELETE FROM predictions WHERE user_id=? AND question_id=? AND status='PENDING'").bind(v.user_id,v.question_id));statements.push(db.prepare("INSERT INTO predictions(id,user_id,match_id,question_id,answer,points_snapshot) VALUES(?,?,?,?,?,?) ON CONFLICT(user_id,question_id,answer) DO UPDATE SET points_snapshot=excluded.points_snapshot,updated_at=CURRENT_TIMESTAMP WHERE status='PENDING'").bind(predictionId,v.user_id,q.match_id,v.question_id,v.answer,points));await db.batch(statements);return json({ok:true},201)}
  if(method==='DELETE'&&path==='/predictions'){const v=await body(c.request,z.object({user_id:z.string().uuid(),question_id:z.string().uuid(),answer:z.string().min(1).max(100)}));if(!(await userToken(c.request,db,v.user_id)))return json({error:'Sesión de usuario inválida'},401);const prediction=await db.prepare("SELECT p.id,p.status,q.status question_status,m.status match_status,m.kickoff_at,m.picks_close_at FROM predictions p JOIN questions q ON q.id=p.question_id JOIN matches m ON m.id=p.match_id WHERE p.user_id=? AND p.question_id=? AND p.answer=?").bind(v.user_id,v.question_id,v.answer).first<Record<string,string>>();if(!prediction)return json({error:'Predicción no encontrada'},404);if(prediction.status!=='PENDING'||prediction.question_status!=='OPEN'||prediction.match_status!=='OPEN'||Date.now()>=new Date(prediction.kickoff_at).getTime()||Date.now()>=new Date(prediction.picks_close_at).getTime())return json({error:'Las predicciones están cerradas'},409);await db.prepare('DELETE FROM predictions WHERE id=? AND user_id=?').bind(prediction.id,v.user_id).run();return json({ok:true})}
  const userPredictions=path.match(/^\/users\/([^/]+)\/predictions$/)
  if(method==='GET'&&userPredictions){const own=await userToken(c.request,db,userPredictions[1]);if(c.request.headers.has('Authorization')&&!own)return json({error:'Sesión de usuario inválida'},401);const visibility=own?'':"AND q.status='SETTLED'";const rows=(await db.prepare(`SELECT p.*,q.prompt,q.points_value,m.opponent,m.kickoff_at,COALESCE(o.label,p.answer) answer_label FROM predictions p JOIN questions q ON q.id=p.question_id JOIN matches m ON m.id=p.match_id LEFT JOIN question_options o ON o.question_id=p.question_id AND o.value_key=p.answer WHERE p.user_id=? ${visibility} ORDER BY m.kickoff_at DESC,q.created_at`).bind(userPredictions[1]).all()).results as Array<Record<string,unknown>>;return json(url.searchParams.get('latest_match')==='1'&&rows[0]?rows.filter(row=>row.match_id===rows[0].match_id):rows)}
  if (method === 'GET' && path === '/leaderboard') return json((await db.prepare("SELECT u.id,u.name,ROUND(COALESCE(SUM(p.points_awarded),0),2) points,SUM(CASE WHEN p.status='CORRECT' THEN 1 ELSE 0 END) won,SUM(CASE WHEN p.status='INCORRECT' THEN 1 ELSE 0 END) lost,SUM(CASE WHEN p.status='PENDING' THEN 1 ELSE 0 END) pending,COUNT(p.id) total FROM users u LEFT JOIN predictions p ON p.user_id=u.id WHERE u.deleted_at IS NULL GROUP BY u.id ORDER BY points DESC,won DESC,u.created_at").all()).results)
  if (method === 'POST' && path === '/admin/login') {
    const { password } = await body(c.request,z.object({password:z.string().min(1).max(200)}))
    if (!c.env.ADMIN_PASSWORD_HASH || !c.env.SESSION_SECRET || !(await compare(password,c.env.ADMIN_PASSWORD_HASH))) return json({error:'Credenciales incorrectas'},401)
    const payload=btoa(JSON.stringify({exp:Date.now()+8*60*60*1000})).replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_'); const token=`${payload}.${await sign(payload,c.env.SESSION_SECRET)}`
    return json({ok:true},200,{'Set-Cookie':`kuri_admin=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800`})
  }
  if (method === 'POST' && path === '/admin/logout') return json({ok:true},200,{'Set-Cookie':'kuri_admin=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'})
  if (path.startsWith('/admin/')) { const denied=await requireAdmin(c); if(denied)return denied }
  if (method === 'GET' && path === '/admin/dashboard') {
    const stats=await db.prepare("SELECT (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) users,(SELECT COUNT(*) FROM predictions) picks,SUM(CASE WHEN status='PENDING' THEN 1 ELSE 0 END) pending,SUM(CASE WHEN status='CORRECT' THEN 1 ELSE 0 END) won,SUM(CASE WHEN status='INCORRECT' THEN 1 ELSE 0 END) lost FROM predictions").first()
    return json(stats)
  }
  const standingPut=path.match(/^\/admin\/standings\/([^/]+)$/)
  if(method==='PUT'&&standingPut){const v=await body(c.request,standingSchema);await db.prepare('UPDATE standings SET group_name=?,place=?,team=?,played=?,won=?,drawn=?,lost=?,goals_for=?,goals_against=?,goal_difference=?,penalty_points=?,points=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(v.group_name,v.place,v.team,v.played,v.won,v.drawn,v.lost,v.goals_for,v.goals_against,v.goal_difference,v.penalty_points,v.points,standingPut[1]).run();return json({ok:true})}
  if (method === 'POST' && path === '/admin/matches') { const v=await body(c.request,matchSchema), key=id(); await db.prepare('INSERT INTO matches(id,opponent,kuriyama_side,kickoff_at,picks_close_at,status) VALUES(?,?,?,?,?,?)').bind(key,v.opponent,v.kuriyama_side,v.kickoff_at,v.picks_close_at,v.status).run(); return json({id:key},201) }
  const matchPut=path.match(/^\/admin\/matches\/([^/]+)$/)
  if(method==='PUT'&&matchPut){const v=await body(c.request,matchSchema);await db.prepare('UPDATE matches SET previous_opponent=CASE WHEN opponent<>? THEN opponent ELSE previous_opponent END,opponent=?,kuriyama_side=?,kickoff_at=?,picks_close_at=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(v.opponent,v.opponent,v.kuriyama_side,v.kickoff_at,v.picks_close_at,v.status,matchPut[1]).run();return json({ok:true})}
  if(method==='DELETE'&&matchPut){const used=await db.prepare('SELECT COUNT(*) total FROM picks WHERE match_id=?').bind(matchPut[1]).first<{total:number}>();if((used?.total??0)>0)return json({error:'No se puede eliminar un partido con picks; puedes cancelarlo.'},409);await db.prepare('DELETE FROM matches WHERE id=?').bind(matchPut[1]).run();return json({ok:true})}
  const matchResult=path.match(/^\/admin\/matches\/([^/]+)\/result$/)
  if(method==='PUT'&&matchResult){const v=await body(c.request,z.object({opponent:text,kuriyama_score:z.number().int().min(0).max(99).nullable(),opponent_score:z.number().int().min(0).max(99).nullable(),status:z.enum(['DRAFT','OPEN','LOCKED','FINISHED','CANCELLED'])}).refine(value=>value.status!=='FINISHED'||(value.kuriyama_score!==null&&value.opponent_score!==null),'Un partido finalizado necesita marcador'));await db.prepare('UPDATE matches SET previous_opponent=CASE WHEN opponent<>? THEN opponent ELSE previous_opponent END,opponent=?,kuriyama_score=?,opponent_score=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(v.opponent,v.opponent,v.kuriyama_score,v.opponent_score,v.status,matchResult[1]).run();return json({ok:true})}
  if(method==='GET'&&path==='/admin/markets'){const matchId=url.searchParams.get('match_id');if(!matchId)return json({error:'Falta match_id'},400);return json((await db.prepare('SELECT m.id,m.match_id,m.market_type,m.title,m.line,m.status,o.id option_id,o.label option_label,o.line_value,o.decimal_odds,o.settlement_status FROM markets m LEFT JOIN market_options o ON o.market_id=m.id WHERE m.match_id=? ORDER BY m.created_at,o.created_at').bind(matchId).all()).results)}
  if(method==='POST'&&path==='/admin/markets'){const v=await body(c.request,marketSchema),key=id();await db.prepare('INSERT INTO markets(id,match_id,market_type,title,line,status) VALUES(?,?,?,?,?,?)').bind(key,v.match_id,v.market_type,v.title,v.line??null,v.status).run();return json({id:key},201)}
  const marketPut=path.match(/^\/admin\/markets\/([^/]+)$/)
  if(method==='PUT'&&marketPut){const v=await body(c.request,marketSchema);await db.prepare('UPDATE markets SET match_id=?,market_type=?,title=?,line=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(v.match_id,v.market_type,v.title,v.line??null,v.status,marketPut[1]).run();return json({ok:true})}
  if(method==='POST'&&path==='/admin/options'){const v=await body(c.request,optionSchema),key=id();await db.prepare('INSERT INTO market_options(id,market_id,label,line_value,decimal_odds) VALUES(?,?,?,?,?)').bind(key,v.market_id,v.label,v.line_value??null,v.decimal_odds).run();return json({id:key},201)}
  const optionPut=path.match(/^\/admin\/options\/([^/]+)$/)
  if(method==='PUT'&&optionPut){const v=await body(c.request,optionSchema);await db.prepare('UPDATE market_options SET market_id=?,label=?,line_value=?,decimal_odds=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(v.market_id,v.label,v.line_value??null,v.decimal_odds,optionPut[1]).run();return json({ok:true})}
  if(method==='POST'&&path==='/admin/settle'){const v=await body(c.request,z.object({market_id:z.string().uuid(),option_results:z.array(z.object({option_id:z.string().uuid(),status:z.enum(['WON','LOST','VOID'])})).min(1)}));const batch:D1PreparedStatement[]=[];for(const o of v.option_results){batch.push(db.prepare('UPDATE market_options SET settlement_status=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND market_id=?').bind(o.status,o.option_id,v.market_id));batch.push(db.prepare("UPDATE picks SET status=?,points_awarded=CASE WHEN ?='WON' THEN odds_snapshot ELSE 0 END,settled_at=CURRENT_TIMESTAMP WHERE market_id=? AND market_option_id=?").bind(o.status,o.status,v.market_id,o.option_id))}batch.push(db.prepare("UPDATE markets SET status='SETTLED',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(v.market_id));await db.batch(batch);return json({ok:true})}
  if(method==='GET'&&path==='/admin/picks'){const q=params(url);let sql='SELECT p.*,u.name,m.opponent,mk.title market_title,o.label option_label FROM picks p JOIN users u ON u.id=p.user_id JOIN matches m ON m.id=p.match_id JOIN markets mk ON mk.id=p.market_id JOIN market_options o ON o.id=p.market_option_id WHERE 1=1';const values:string[]=[];for(const [key,col] of [['user','p.user_id'],['match','p.match_id'],['market','p.market_id'],['status','p.status']] as const){if(q[key]){sql+=` AND ${col}=?`;values.push(q[key])}}sql+=' ORDER BY p.created_at DESC LIMIT 500';return json((await db.prepare(sql).bind(...values).all()).results)}
  if(method==='GET'&&path==='/admin/questions'){const matchId=url.searchParams.get('match_id');if(!matchId)return json({error:'Falta match_id'},400);return json(await questionsWithOptions(db,matchId))}
  if(method==='GET'&&path==='/admin/question-templates'){const questions=(await db.prepare('SELECT q.id,q.match_id,q.prompt,q.points_value,q.question_type,q.special_type,m.opponent,m.kickoff_at FROM questions q JOIN matches m ON m.id=q.match_id ORDER BY q.created_at DESC LIMIT 200').all()).results as Array<Record<string,unknown>>;const options=(await db.prepare('SELECT qo.* FROM question_options qo JOIN questions q ON q.id=qo.question_id ORDER BY qo.question_id,qo.sort_order').all()).results as Array<Record<string,unknown>>;return json(questions.map(q=>({...q,question_type:q.special_type==='EXACT_SCORE'?'EXACT_SCORE':q.question_type,options:options.filter(o=>o.question_id===q.id)})))}
  if(method==='POST'&&path==='/admin/questions/copy'){const v=await body(c.request,z.object({source_question_id:z.string().uuid(),match_id:z.string().uuid()}));const source=await db.prepare('SELECT prompt,points_value,question_type,special_type FROM questions WHERE id=?').bind(v.source_question_id).first<Record<string,string|number>>();if(!source)return json({error:'Pregunta original no encontrada'},404);const options=(await db.prepare('SELECT value_key,label,points_value FROM question_options WHERE question_id=? ORDER BY sort_order').bind(v.source_question_id).all()).results as Array<{value_key:string,label:string,points_value:number}>;if(source.special_type!=='EXACT_SCORE'&&options.length<2)return json({error:'La pregunta original no tiene respuestas suficientes'},409);const key=id();await db.prepare("INSERT INTO questions(id,match_id,prompt,points_value,status,question_type,special_type) VALUES(?,?,?,?, 'OPEN',?,?)").bind(key,v.match_id,source.prompt,source.points_value,source.question_type,source.special_type??null).run();await replaceQuestionOptions(db,key,options);return json({id:key},201)}
  if(method==='POST'&&path==='/admin/questions'){const v=await body(c.request,questionSchema),key=id(),exact=v.question_type==='EXACT_SCORE';await db.prepare('INSERT INTO questions(id,match_id,prompt,points_value,status,question_type,special_type) VALUES(?,?,?,?,?,?,?)').bind(key,v.match_id,exact?'Marcador correcto':v.prompt,exact?20:v.points_value,v.status,exact?'CUSTOM':v.question_type,exact?'EXACT_SCORE':null).run();await replaceQuestionOptions(db,key,v.options);return json({id:key},201)}
  const adminQuestion=path.match(/^\/admin\/questions\/([^/]+)$/)
  if(method==='PUT'&&adminQuestion){const v=await body(c.request,questionSchema);const current=await db.prepare('SELECT status FROM questions WHERE id=?').bind(adminQuestion[1]).first<{status:string}>();if(!current)return json({error:'Pregunta inválida'},404);if(current.status==='SETTLED')return json({error:'Una pregunta resuelta no se puede modificar'},409);const used=(await db.prepare('SELECT DISTINCT answer FROM predictions WHERE question_id=?').bind(adminQuestion[1]).all()).results as Array<{answer:string}>;const retained=new Set(v.options.map(option=>option.value_key));if(used.some(option=>!retained.has(option.answer)))return json({error:'No puedes eliminar una respuesta que ya tiene predicciones'},409);const exact=v.question_type==='EXACT_SCORE';await db.prepare("UPDATE questions SET prompt=?,points_value=?,status=?,question_type=?,special_type=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(exact?'Marcador correcto':v.prompt,exact?20:v.points_value,v.status,exact?'CUSTOM':v.question_type,exact?'EXACT_SCORE':null,adminQuestion[1]).run();await replaceQuestionOptions(db,adminQuestion[1],v.options);return json({ok:true})}
  if(method==='DELETE'&&adminQuestion){const used=await db.prepare('SELECT COUNT(*) total FROM predictions WHERE question_id=?').bind(adminQuestion[1]).first<{total:number}>();if((used?.total??0)>0){await db.prepare("UPDATE questions SET status='DISABLED',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(adminQuestion[1]).run();return json({ok:true,disabled:true})}await db.prepare('DELETE FROM questions WHERE id=?').bind(adminQuestion[1]).run();return json({ok:true})}
  if(method==='POST'&&path==='/admin/questions/settle'){
    const v=await body(c.request,z.object({question_id:z.string().uuid(),correct_answers:z.array(z.string().min(1).max(100)).max(60).default([]),numeric_result:z.number().min(0).max(100).optional(),score_result:z.object({kuriyama_score:z.number().int().min(0).max(99),opponent_score:z.number().int().min(0).max(99)}).optional(),void:z.boolean().default(false)}))
    const question=await db.prepare('SELECT question_type,special_type FROM questions WHERE id=?').bind(v.question_id).first<{question_type:string,special_type:string|null}>();if(!question)return json({error:'Pregunta inválida'},404)
    let winners=v.correct_answers
    if(question.special_type==='EXACT_SCORE'&&v.score_result)winners=[`SCORE_${v.score_result.kuriyama_score}_${v.score_result.opponent_score}`]
    if((question.question_type==='TOTAL_GOALS'||question.question_type==='FIRST_HALF_GOALS')&&v.numeric_result!==undefined){const opts=(await db.prepare('SELECT value_key FROM question_options WHERE question_id=?').bind(v.question_id).all()).results as Array<{value_key:string}>;winners=opts.filter(o=>{const match=o.value_key.match(/^(OVER|UNDER)_(\d+)_(\d+)$/);if(!match)return false;const line=Number(`${match[2]}.${match[3]}`);return match[1]==='OVER'?v.numeric_result!>line:v.numeric_result!<line}).map(o=>o.value_key)}
    if(!v.void&&!winners.length)return json({error:'Selecciona al menos una respuesta correcta'},400)
    const markers=winners.map(()=>'?').join(',')||"''", legacy=winners.length===1&&['YES','NO'].includes(winners[0])?winners[0]:null
    await db.batch([db.prepare("UPDATE questions SET status='SETTLED',correct_answer=?,settled_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(legacy,v.question_id),db.prepare(`UPDATE predictions SET status=CASE WHEN ?=1 THEN 'VOID' WHEN answer IN (${markers}) THEN 'CORRECT' ELSE 'INCORRECT' END,points_awarded=CASE WHEN ?=1 THEN 0 WHEN answer IN (${markers}) THEN points_snapshot WHEN ?=1 THEN 0 ELSE -points_snapshot END,settled_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE question_id=?`).bind(v.void?1:0,...winners,v.void?1:0,...winners,question.special_type==='EXACT_SCORE'?1:0,v.question_id)])
    return json({ok:true,correct_answers:winners})
  }
  if(method==='GET'&&path==='/admin/predictions'){return json((await db.prepare('SELECT p.*,u.name,q.prompt,m.opponent,m.kickoff_at,COALESCE(o.label,p.answer) answer_label FROM predictions p JOIN users u ON u.id=p.user_id JOIN questions q ON q.id=p.question_id JOIN matches m ON m.id=p.match_id LEFT JOIN question_options o ON o.question_id=p.question_id AND o.value_key=p.answer ORDER BY p.created_at DESC LIMIT 500').all()).results)}
  const adminPrediction=path.match(/^\/admin\/predictions\/([^/]+)$/)
  if(method==='DELETE'&&adminPrediction){await db.prepare('DELETE FROM predictions WHERE id=?').bind(adminPrediction[1]).run();return json({ok:true})}
  const adminUser=path.match(/^\/admin\/users\/([^/]+)$/)
  if(method==='DELETE'&&adminUser){await db.prepare("UPDATE users SET name='Cuenta moderada',normalized_name='moderated-'||id,access_token_hash=NULL,deleted_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=? AND deleted_at IS NULL").bind(adminUser[1]).run();return json({ok:true})}
  return json({error:'Ruta no encontrada'},404)
}

export const onRequest: PagesFunction<Env> = async c => { try { return await route(c as Ctx) } catch(e) { if(e instanceof z.ZodError)return json({error:'Datos inválidos',details:e.issues},400); console.error(e); return json({error:'Error interno'},500) } }
