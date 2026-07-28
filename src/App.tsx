import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom'
import { Check, ChevronDown, Clock3, HomeIcon, LogOut, Menu, Pencil, Shield, Target, Trash2, Trophy, UserRound, WifiOff, X } from 'lucide-react'
import { api, type MarketRow, type Match, type Pick } from './api'

const fmt = (n: number) => Number(n).toFixed(2)
const date = (s: string) => new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(s))
type UserIdentity = { id: string; name: string; token?: string }

function AccountMenu({ user, onChange }: { user: UserIdentity; onChange: (user: UserIdentity | null) => void }) {
  const [open, setOpen] = useState(false), [editing, setEditing] = useState(false), [confirmDelete, setConfirmDelete] = useState(false), [name, setName] = useState(user.name), [error, setError] = useState('')
  const auth = { Authorization: `Bearer ${user.token ?? ''}` }
  async function save(e: FormEvent) { e.preventDefault(); setError(''); try { const updated = await api<UserIdentity>(`/users/${user.id}`, { method: 'PUT', headers: auth, body: JSON.stringify({ name }) }); const next = { ...user, ...updated }; localStorage.setItem('kuri_user', JSON.stringify(next)); onChange(next); setEditing(false) } catch (x) { setError((x as Error).message) } }
  async function remove() { setError(''); try { await api(`/users/${user.id}`, { method: 'DELETE', headers: auth }); localStorage.removeItem('kuri_user'); onChange(null); location.assign('/welcome') } catch (x) { setError((x as Error).message) } }
  return <div className="account-menu">
    <button className="account-trigger" onClick={() => setOpen(!open)}><UserRound/><span>{user.name}</span><ChevronDown/></button>
    {open && <div className="account-popover">
      {editing ? <form onSubmit={save}>
        <label>Tu nombre<input value={name} onChange={e => setName(e.target.value)} minLength={2} maxLength={80} autoFocus/></label>
        <div className="account-actions"><button type="button" onClick={() => setEditing(false)}>Cancelar</button><button className="save-account">Guardar</button></div>
      </form> : <>
        <div className="account-name"><UserRound/><b>{user.name}</b></div>
        <button onClick={() => setEditing(true)}><Pencil/> Editar nombre</button>
        {confirmDelete ? <div className="delete-confirm"><p>¿Eliminar tu cuenta? Tus picks quedarán anonimizados.</p><div className="account-actions"><button onClick={() => setConfirmDelete(false)}>Cancelar</button><button className="danger-button" onClick={remove}>Eliminar</button></div></div> : <button className="delete-account" onClick={() => setConfirmDelete(true)}><Trash2/> Eliminar cuenta</button>}
      </>}
      {error && <p className="error">{error}</p>}
    </div>}
  </div>
}

function SportsHeader({ user, onChange }: { user?: UserIdentity | null; onChange: (user: UserIdentity | null) => void }) {
  return <>
    <header className="sports-header">
      <button className="mobile-menu" aria-label="Abrir menú"><Menu /></button>
      <NavLink to="/" className="wordmark"><b>KURI</b><span>DOIT</span></NavLink>
      <nav className="desktop-nav"><NavLink to="/">Inicio</NavLink><a href="#markets">Partidos</a><NavLink to="/ranking">Ranking</NavLink><NavLink to="/admin/login">Admin</NavLink></nav>
      {user ? <AccountMenu user={user} onChange={onChange}/> : <UserRound className="user-icon" />}
    </header>
    <div className="sports-nav"><span className="ball">●</span><b>Fútbol</b><a href="#markets">Próximos partidos</a><a href="#my-picks">Mis Picks</a></div>
  </>
}

function MobileBottomNav() {
  return <nav className="bottom-nav"><NavLink to="/"><HomeIcon/><span>Inicio</span></NavLink><a href="/#my-picks"><Target/><span>Picks</span></a><NavLink to="/ranking"><Trophy/><span>Ranking</span></NavLink></nav>
}

function Shell({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState(navigator.onLine)
  const [user, setUser] = useState<UserIdentity | null>(() => JSON.parse(localStorage.getItem('kuri_user') || 'null'))
  useEffect(() => { const sync = () => setOnline(navigator.onLine); addEventListener('online', sync); addEventListener('offline', sync); return () => { removeEventListener('online', sync); removeEventListener('offline', sync) } }, [])
  useEffect(() => { if (user && !user.token) api<UserIdentity>('/users', { method: 'POST', body: JSON.stringify({ name: user.name }) }).then(fresh => { localStorage.setItem('kuri_user', JSON.stringify(fresh)); setUser(fresh) }).catch(() => {}) }, [user])
  return <><SportsHeader user={user} onChange={setUser}/>{!online && <div className="offline"><WifiOff/> Sin conexión. Necesitas Internet para registrar picks.</div>}<main className="app-main">{children}</main><MobileBottomNav /></>
}

function MatchCard({ match, marketCount }: { match: Match; marketCount: number }) {
  return <article className="match-card">
    <div className="match-meta"><b>FÚTBOL · KURIYAMA</b><span><Clock3/> {date(match.kickoff_at)}</span></div>
    <div className="teams"><div><strong>{match.kuriyama_side === 'HOME' ? 'KURIYAMA' : match.opponent}</strong><small>{match.kuriyama_side === 'HOME' ? 'LOCAL' : 'VISITANTE'}</small></div><i>VS</i><div><strong>{match.kuriyama_side === 'HOME' ? match.opponent : 'KURIYAMA'}</strong><small>{match.kuriyama_side === 'HOME' ? 'VISITANTE' : 'LOCAL'}</small></div></div>
    <footer>Mercados disponibles: <b>{marketCount}</b></footer>
  </article>
}

function OddButton({ option, selected, onSelect }: { option: MarketRow; selected: boolean; onSelect: () => void }) {
  return <button className={`odd-button ${selected ? 'is-selected' : ''}`} onClick={onSelect}><span>{selected && <Check/>}{option.option_label}</span><b>{fmt(option.decimal_odds)}</b></button>
}

function MarketSection({ title, items, selected, onSelect }: { title: string; items: MarketRow[]; selected?: MarketRow; onSelect: (o: MarketRow) => void }) {
  const [open, setOpen] = useState(true)
  return <article className="market-section"><button className="market-heading" onClick={() => setOpen(!open)} aria-expanded={open}><b>{title}</b><ChevronDown className={open ? 'rotated' : ''}/></button>{open && <div className={`odds-grid ${items.length === 3 ? 'three' : ''}`}>{items.map(o => <OddButton key={o.option_id} option={o} selected={selected?.option_id === o.option_id} onSelect={() => onSelect(o)} />)}</div>}</article>
}

function PickSlip({ match, selected, onConfirm, onClose, mobile = false }: { match: Match; selected?: MarketRow; onConfirm: () => void; onClose?: () => void; mobile?: boolean }) {
  if (!selected) return <aside className="pick-slip empty-slip"><Target/><b>Tu pick</b><p>Selecciona un momio para preparar tu pick.</p></aside>
  return <aside className={`pick-slip ${mobile ? 'mobile-sheet' : ''}`}><div className="slip-heading"><b>TU PICK</b>{onClose && <button onClick={onClose} aria-label="Cerrar"><X/></button>}</div><div className="slip-event">Kuriyama vs {match.opponent}</div><div className="slip-selection"><span>{selected.title}<b>{selected.option_label}</b></span><strong>{fmt(selected.decimal_odds)}</strong></div><div className="slip-total"><span>Momio total</span><b>{fmt(selected.decimal_odds)}</b></div><button className="primary-button" onClick={onConfirm}><Check/> CONFIRMAR PICK</button><small>Tu momio quedará congelado al confirmar.</small></aside>
}

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = { PENDING: 'PENDIENTE', WON: 'GANADO', LOST: 'PERDIDO', VOID: 'ANULADO' }
  return <span className={`status-badge ${status.toLowerCase()}`}>{status === 'WON' && <Check/>}{status === 'LOST' && <X/>}{labels[status] || status}</span>
}

function PickHistory({ picks }: { picks: Pick[] }) {
  return <section id="my-picks" className="content-section"><div className="title-row"><div><span className="section-kicker">HISTORIAL</span><h2>Mis picks</h2></div></div>{picks.length ? <div className="pick-history">{picks.map(p => <article key={p.id}><div className="pick-event"><b>KURIYAMA VS {p.opponent.toUpperCase()}</b><small>{date(p.created_at)}</small></div><div className="pick-choice"><span>{p.market_title}<b>{p.option_label}</b></span><strong>{fmt(p.odds_snapshot)}</strong></div><div className="pick-result"><StatusBadge status={p.status}/><b>{p.status === 'WON' ? `+${fmt(p.points_awarded)} pts` : p.status === 'LOST' ? '0 pts' : ''}</b></div></article>)}</div> : <div className="empty-state">Tu historial aparecerá aquí.</div>}</section>
}

function Welcome() {
  const nav = useNavigate(), [name, setName] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('')
  async function submit(e: FormEvent) { e.preventDefault(); setBusy(true); setError(''); try { const u = await api<{ id: string; name: string }>('/users', { method: 'POST', body: JSON.stringify({ name }) }); localStorage.setItem('kuri_user', JSON.stringify(u)); nav('/') } catch (x) { setError((x as Error).message) } finally { setBusy(false) } }
  return <main className="welcome"><div className="welcome-logo"><b>KURI</b><span>DOIT</span></div><span className="section-kicker">LA QUINIELA DEL EQUIPO</span><h1>Haz tu predicción.<br/><em>Sube en el ranking.</em></h1><p>Compite con tus compañeros y demuestra cuánto sabes de fútbol.</p><form onSubmit={submit} className="login-card"><label>¿Cómo te llamas?<input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre" minLength={2} maxLength={80}/></label>{error && <p className="error">{error}</p>}<button className="primary-button" disabled={busy || name.trim().length < 2}>{busy ? 'Entrando…' : 'COMENZAR'}</button></form></main>
}

function Home() {
  const user = JSON.parse(localStorage.getItem('kuri_user') || 'null') as UserIdentity | null
  const [match, setMatch] = useState<Match | null>(), [rows, setRows] = useState<MarketRow[]>([]), [selected, setSelected] = useState<MarketRow>(), [sheet, setSheet] = useState(false), [picks, setPicks] = useState<Pick[]>([]), [msg, setMsg] = useState('')
  useEffect(() => { if (!user) return; api<Match | null>('/matches/current').then(async m => { setMatch(m); if (m) setRows(await api(`/markets/${m.id}`)) }).catch(e => { setMatch(null); setMsg(e.message) }); api<Pick[]>(`/users/${user.id}/picks`).then(setPicks).catch(() => {}) }, [])
  const markets = useMemo(() => Object.values(rows.reduce<Record<string, { title: string; items: MarketRow[] }>>((a, r) => { (a[r.id] ??= { title: r.title, items: [] }).items.push(r); return a }, {})), [rows])
  if (!user) return <Navigate to="/welcome" />
  async function save() { if (!match || !selected) return; try { await api('/picks', { method: 'POST', body: JSON.stringify({ user_id: user!.id, match_id: match.id, market_option_id: selected.option_id }) }); setMsg('PICK REGISTRADO'); setSheet(false); setSelected(undefined); setPicks(await api(`/users/${user!.id}/picks`)) } catch (e) { setMsg((e as Error).message) } }
  return <Shell><div className="sports-layout"><div className="main-column"><section className="content-section"><span className="section-kicker">PRÓXIMO PARTIDO</span>{match === undefined ? <div className="loader"/> : match ? <MatchCard match={match} marketCount={markets.length}/> : <div className="empty-state">No hay un próximo partido abierto.</div>}</section>{msg && <div className={`toast ${msg === 'PICK REGISTRADO' ? 'success' : ''}`}>{msg === 'PICK REGISTRADO' && <Check/>}{msg}</div>}{match && <section id="markets" className="content-section"><div className="title-row"><div><span className="section-kicker">MERCADOS ABIERTOS</span><h2>Haz tu pick</h2></div><small>1 pick por partido</small></div>{markets.length ? markets.map(m => <MarketSection key={m.items[0].id} title={m.title} items={m.items} selected={selected} onSelect={o => { setSelected(o); setSheet(true) }}/>) : <div className="empty-state">Aún no hay mercados disponibles.</div>}</section>}<PickHistory picks={picks}/></div>{match && <div className="slip-column"><PickSlip match={match} selected={selected} onConfirm={save}/></div>}</div>{match && selected && <button className="mobile-slip-bar" onClick={() => setSheet(true)}><span><b>{selected.option_label}</b><small>{selected.title}</small></span><strong>{fmt(selected.decimal_odds)}</strong><em>Ver pick</em></button>}{match && selected && sheet && <div className="sheet-backdrop" onClick={() => setSheet(false)}><div onClick={e => e.stopPropagation()}><PickSlip mobile match={match} selected={selected} onConfirm={save} onClose={() => setSheet(false)}/></div></div>}</Shell>
}

function RankingTable({ rows }: { rows: Array<{ id: string; name: string; points: number; won: number; lost: number; pending: number; total: number }> }) {
  return <div className="ranking-table"><div className="ranking-head"><span>POS</span><span>JUGADOR</span><span>PICKS</span><span>G</span><span>P</span><span>PTS</span></div>{rows.map((r, i) => <div className={i < 3 ? 'podium' : ''} key={r.id}><strong>{i + 1}</strong><span><b>{r.name}</b><small>{r.pending} pendientes</small></span><span>{r.total}</span><span>{r.won}</span><span>{r.lost}</span><em>{fmt(r.points)}</em></div>)}</div>
}

function Ranking() { const [rows, setRows] = useState<Array<{ id: string; name: string; points: number; won: number; lost: number; pending: number; total: number }>>([]); useEffect(() => { api<typeof rows>('/leaderboard').then(setRows) }, []); return <Shell><section className="ranking-page"><div className="page-heading"><Trophy/><div><span className="section-kicker">TEMPORADA ACTUAL</span><h1>Clasificación</h1></div></div>{rows.length ? <RankingTable rows={rows}/> : <div className="empty-state">Todavía no hay participantes.</div>}</section></Shell> }

function AdminLogin() { const nav = useNavigate(), [password, setPassword] = useState(''), [error, setError] = useState(''); async function submit(e: FormEvent) { e.preventDefault(); try { await api('/admin/login', { method: 'POST', body: JSON.stringify({ password }) }); nav('/admin') } catch (x) { setError((x as Error).message) } } return <main className="admin-login"><div className="welcome-logo"><b>KURI</b><span>DOIT</span></div><Shield/><h1>Administración</h1><form className="login-card" onSubmit={submit}><label>Contraseña<input type="password" value={password} onChange={e => setPassword(e.target.value)}/></label>{error && <p className="error">{error}</p>}<button className="primary-button">ENTRAR</button></form></main> }

function Admin() {
  const nav = useNavigate(), [stats, setStats] = useState<Record<string, number>>(), [matches, setMatches] = useState<Match[]>([]), [picks, setPicks] = useState<Array<Pick & { name: string }>>([]), [error, setError] = useState('')
  async function load() { try { setStats(await api('/admin/dashboard')); setMatches(await api('/matches')); setPicks(await api('/admin/picks')) } catch (e) { if ((e as Error).message === 'No autorizado') nav('/admin/login'); else setError((e as Error).message) } }
  useEffect(() => { load() }, [])
  async function addMatch(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const f = new FormData(e.currentTarget); try { await api('/admin/matches', { method: 'POST', body: JSON.stringify({ opponent: f.get('opponent'), kuriyama_side: f.get('side'), kickoff_at: new Date(String(f.get('kickoff'))).toISOString(), picks_close_at: new Date(String(f.get('close'))).toISOString(), status: 'OPEN' }) }); e.currentTarget.reset(); load() } catch (x) { setError((x as Error).message) } }
  async function logout() { await api('/admin/logout', { method: 'POST' }); nav('/admin/login') }
  return <div className="admin-shell"><aside className="admin-sidebar"><div className="wordmark"><b>KURI</b><span>DOIT</span></div><small>ADMIN</small><nav><a className="active">Dashboard</a><a href="#admin-matches">Partidos</a><a href="#admin-picks">Picks</a><NavLink to="/ranking">Ranking</NavLink></nav><button onClick={logout}><LogOut/> Cerrar sesión</button></aside><main className="admin-main"><div className="admin-mobile-head"><div className="wordmark"><b>KURI</b><span>DOIT</span></div><button onClick={logout}><LogOut/></button></div><span className="section-kicker">CENTRO DE CONTROL</span><h1>Dashboard</h1>{error && <p className="error">{error}</p>}<div className="stats">{['users', 'picks', 'pending', 'won', 'lost'].map(k => <article key={k}><span>{({ users: 'Usuarios', picks: 'Picks', pending: 'Pendientes', won: 'Ganados', lost: 'Perdidos' } as Record<string, string>)[k]}</span><b>{stats?.[k] ?? '—'}</b></article>)}</div><section className="admin-card" id="admin-matches"><h2>Nuevo partido</h2><form className="admin-form" onSubmit={addMatch}><label>Rival<input name="opponent" required minLength={2}/></label><label>Sede<select name="side"><option value="HOME">Local</option><option value="AWAY">Visitante</option></select></label><label>Inicio<input name="kickoff" type="datetime-local" required/></label><label>Cierre picks<input name="close" type="datetime-local" required/></label><button className="primary-button">CREAR PARTIDO</button></form></section><section className="admin-card"><h2>Partidos</h2><div className="admin-table"><div className="table-head"><span>Partido</span><span>Fecha</span><span>Estado</span></div>{matches.map(m => <div key={m.id}><b>Kuriyama vs {m.opponent}</b><span>{date(m.kickoff_at)}</span><StatusBadge status={m.status}/></div>)}</div></section><section className="admin-card" id="admin-picks"><h2>Últimos picks</h2><div className="admin-table picks-table"><div className="table-head"><span>Usuario</span><span>Mercado / Pick</span><span>Momio</span><span>Estado</span></div>{picks.slice(0, 20).map(p => <div key={p.id}><b>{p.name}</b><span>{p.market_title} · {p.option_label}</span><strong>{fmt(p.odds_snapshot)}</strong><StatusBadge status={p.status}/></div>)}</div></section></main></div>
}

export default function App() { return <Routes><Route path="/welcome" element={<Welcome/>}/><Route path="/ranking" element={<Ranking/>}/><Route path="/admin/login" element={<AdminLogin/>}/><Route path="/admin" element={<Admin/>}/><Route path="*" element={<Home/>}/></Routes> }
