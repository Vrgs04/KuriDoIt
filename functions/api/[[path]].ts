import { compare } from 'bcryptjs'
import { z } from 'zod'
import { normalizeApiPath } from '../../src/lib/apiPath'

interface Env { DB: D1Database; ADMIN_PASSWORD_HASH: string; SESSION_SECRET: string }
type Ctx = EventContext<Env, string, unknown>
const json = (data: unknown, status = 200, headers: HeadersInit = {}) => Response.json(data, { status, headers })
const id = () => crypto.randomUUID()
const now = () => new Date().toISOString()
const norm = (s: string) => s.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ')
const text = z.string().trim().min(2).max(80)
const matchSchema = z.object({ opponent: text, kuriyama_side: z.enum(['HOME','AWAY']), kickoff_at: z.string().datetime(), picks_close_at: z.string().datetime(), status: z.enum(['DRAFT','OPEN','LOCKED','FINISHED','CANCELLED']) }).refine(v => new Date(v.picks_close_at) <= new Date(v.kickoff_at), 'El cierre debe ser anterior al inicio')
const marketSchema = z.object({ match_id: z.string().uuid(), market_type: z.string().min(2).max(40), title: text, line: z.number().nullable().optional(), status: z.enum(['OPEN','CLOSED','DISABLED','SETTLED']).default('OPEN') })
const optionSchema = z.object({ market_id: z.string().uuid(), label: text, line_value: z.number().nullable().optional(), decimal_odds: z.number().min(1).max(1000) })

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
  const url = new URL(c.request.url), method = c.request.method, path = normalizeApiPath(c.params.path)
  const db = c.env.DB
  if (method === 'POST' && path === '/users') {
    const { name } = await body(c.request, z.object({ name: text }))
    const normalized = norm(name); let user = await db.prepare('SELECT * FROM users WHERE normalized_name=?').bind(normalized).first()
    if (!user) { const userId = id(); await db.prepare('INSERT INTO users(id,name,normalized_name) VALUES(?,?,?)').bind(userId, name, normalized).run(); user = await db.prepare('SELECT * FROM users WHERE id=?').bind(userId).first() }
    return json(user, 201)
  }
  if (method === 'GET' && path === '/matches/current') {
    const match = await db.prepare("SELECT * FROM matches WHERE status='OPEN' AND kickoff_at>? AND picks_close_at>? ORDER BY kickoff_at LIMIT 1").bind(now(), now()).first()
    return json(match)
  }
  if (method === 'GET' && path === '/matches') return json((await db.prepare('SELECT * FROM matches ORDER BY kickoff_at DESC').all()).results)
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
  if (method === 'GET' && path === '/leaderboard') return json((await db.prepare("SELECT u.id,u.name,ROUND(COALESCE(SUM(p.points_awarded),0),2) points,SUM(CASE WHEN p.status='WON' THEN 1 ELSE 0 END) won,SUM(CASE WHEN p.status='LOST' THEN 1 ELSE 0 END) lost,SUM(CASE WHEN p.status='PENDING' THEN 1 ELSE 0 END) pending,COUNT(p.id) total,COALESCE(AVG(CASE WHEN p.status='WON' THEN p.odds_snapshot END),0) avg_winning_odds FROM users u LEFT JOIN picks p ON p.user_id=u.id GROUP BY u.id ORDER BY points DESC,won DESC,avg_winning_odds DESC,u.created_at").all()).results)
  if (method === 'POST' && path === '/admin/login') {
    const { password } = await body(c.request,z.object({password:z.string().min(1).max(200)}))
    if (!c.env.ADMIN_PASSWORD_HASH || !c.env.SESSION_SECRET || !(await compare(password,c.env.ADMIN_PASSWORD_HASH))) return json({error:'Credenciales incorrectas'},401)
    const payload=btoa(JSON.stringify({exp:Date.now()+8*60*60*1000})).replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_'); const token=`${payload}.${await sign(payload,c.env.SESSION_SECRET)}`
    return json({ok:true},200,{'Set-Cookie':`kuri_admin=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800`})
  }
  if (method === 'POST' && path === '/admin/logout') return json({ok:true},200,{'Set-Cookie':'kuri_admin=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'})
  if (path.startsWith('/admin/')) { const denied=await requireAdmin(c); if(denied)return denied }
  if (method === 'GET' && path === '/admin/dashboard') {
    const stats=await db.prepare("SELECT (SELECT COUNT(*) FROM users) users,(SELECT COUNT(*) FROM picks) picks,SUM(CASE WHEN status='PENDING' THEN 1 ELSE 0 END) pending,SUM(CASE WHEN status='WON' THEN 1 ELSE 0 END) won,SUM(CASE WHEN status='LOST' THEN 1 ELSE 0 END) lost FROM picks").first()
    return json(stats)
  }
  if (method === 'POST' && path === '/admin/matches') { const v=await body(c.request,matchSchema), key=id(); await db.prepare('INSERT INTO matches(id,opponent,kuriyama_side,kickoff_at,picks_close_at,status) VALUES(?,?,?,?,?,?)').bind(key,v.opponent,v.kuriyama_side,v.kickoff_at,v.picks_close_at,v.status).run(); return json({id:key},201) }
  const matchPut=path.match(/^\/admin\/matches\/([^/]+)$/)
  if(method==='PUT'&&matchPut){const v=await body(c.request,matchSchema);await db.prepare('UPDATE matches SET opponent=?,kuriyama_side=?,kickoff_at=?,picks_close_at=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(v.opponent,v.kuriyama_side,v.kickoff_at,v.picks_close_at,v.status,matchPut[1]).run();return json({ok:true})}
  if(method==='POST'&&path==='/admin/markets'){const v=await body(c.request,marketSchema),key=id();await db.prepare('INSERT INTO markets(id,match_id,market_type,title,line,status) VALUES(?,?,?,?,?,?)').bind(key,v.match_id,v.market_type,v.title,v.line??null,v.status).run();return json({id:key},201)}
  const marketPut=path.match(/^\/admin\/markets\/([^/]+)$/)
  if(method==='PUT'&&marketPut){const v=await body(c.request,marketSchema);await db.prepare('UPDATE markets SET match_id=?,market_type=?,title=?,line=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(v.match_id,v.market_type,v.title,v.line??null,v.status,marketPut[1]).run();return json({ok:true})}
  if(method==='POST'&&path==='/admin/options'){const v=await body(c.request,optionSchema),key=id();await db.prepare('INSERT INTO market_options(id,market_id,label,line_value,decimal_odds) VALUES(?,?,?,?,?)').bind(key,v.market_id,v.label,v.line_value??null,v.decimal_odds).run();return json({id:key},201)}
  const optionPut=path.match(/^\/admin\/options\/([^/]+)$/)
  if(method==='PUT'&&optionPut){const v=await body(c.request,optionSchema);await db.prepare('UPDATE market_options SET market_id=?,label=?,line_value=?,decimal_odds=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(v.market_id,v.label,v.line_value??null,v.decimal_odds,optionPut[1]).run();return json({ok:true})}
  if(method==='POST'&&path==='/admin/settle'){const v=await body(c.request,z.object({market_id:z.string().uuid(),option_results:z.array(z.object({option_id:z.string().uuid(),status:z.enum(['WON','LOST','VOID'])})).min(1)}));const batch:D1PreparedStatement[]=[];for(const o of v.option_results){batch.push(db.prepare('UPDATE market_options SET settlement_status=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND market_id=?').bind(o.status,o.option_id,v.market_id));batch.push(db.prepare("UPDATE picks SET status=?,points_awarded=CASE WHEN ?='WON' THEN odds_snapshot ELSE 0 END,settled_at=CURRENT_TIMESTAMP WHERE market_id=? AND market_option_id=?").bind(o.status,o.status,v.market_id,o.option_id))}batch.push(db.prepare("UPDATE markets SET status='SETTLED',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(v.market_id));await db.batch(batch);return json({ok:true})}
  if(method==='GET'&&path==='/admin/picks'){const q=params(url);let sql='SELECT p.*,u.name,m.opponent,mk.title market_title,o.label option_label FROM picks p JOIN users u ON u.id=p.user_id JOIN matches m ON m.id=p.match_id JOIN markets mk ON mk.id=p.market_id JOIN market_options o ON o.id=p.market_option_id WHERE 1=1';const values:string[]=[];for(const [key,col] of [['user','p.user_id'],['match','p.match_id'],['market','p.market_id'],['status','p.status']] as const){if(q[key]){sql+=` AND ${col}=?`;values.push(q[key])}}sql+=' ORDER BY p.created_at DESC LIMIT 500';return json((await db.prepare(sql).bind(...values).all()).results)}
  return json({error:'Ruta no encontrada'},404)
}

export const onRequest: PagesFunction<Env> = async c => { try { return await route(c as Ctx) } catch(e) { if(e instanceof z.ZodError)return json({error:'Datos inválidos',details:e.issues},400); console.error(e); return json({error:'Error interno'},500) } }
