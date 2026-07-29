import { Fragment, useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  Routes,
  Route,
  NavLink,
  Navigate,
  useNavigate,
} from "react-router-dom";
import {
  Check,
  ChevronDown,
  Clock3,
  HomeIcon,
  LogOut,
  Menu,
  Pencil,
  Shield,
  Table2,
  Target,
  Trash2,
  Trophy,
  UserRound,
  WifiOff,
  X,
} from "lucide-react";
import {
  api,
  type Match,
  type Pick,
  type Prediction,
  type Question,
  type QuestionType,
  type Standing,
} from "./api";

const fmt = (n: number) => Number(n).toFixed(2);
const date = (s: string) =>
  new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(s));
const scoreFromAnswer = (answer?: string) => {
  const match = answer?.match(/^SCORE_(\d+)_(\d+)$/);
  return match ? { kuriyama: Number(match[1]), opponent: Number(match[2]) } : null;
};
const predictionAnswer = (prediction: Prediction) => {
  const score = scoreFromAnswer(prediction.answer);
  return score ? `Kuriyama ${score.kuriyama} – ${score.opponent} ${prediction.opponent}` : prediction.answer_label ?? (prediction.answer === "YES" ? "SÍ" : prediction.answer === "NO" ? "NO" : prediction.answer);
};
type UserIdentity = { id: string; name: string; token?: string };

function AccountMenu({
  user,
  onChange,
}: {
  user: UserIdentity;
  onChange: (user: UserIdentity | null) => void;
}) {
  const [open, setOpen] = useState(false),
    [editing, setEditing] = useState(false),
    [confirmDelete, setConfirmDelete] = useState(false),
    [name, setName] = useState(user.name),
    [error, setError] = useState("");
  const auth = { Authorization: `Bearer ${user.token ?? ""}` };
  async function save(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const updated = await api<UserIdentity>(`/users/${user.id}`, {
        method: "PUT",
        headers: auth,
        body: JSON.stringify({ name }),
      });
      const next = { ...user, ...updated };
      localStorage.setItem("kuri_user", JSON.stringify(next));
      onChange(next);
      setEditing(false);
    } catch (x) {
      setError((x as Error).message);
    }
  }
  async function remove() {
    setError("");
    try {
      await api(`/users/${user.id}`, { method: "DELETE", headers: auth });
      localStorage.removeItem("kuri_user");
      onChange(null);
      location.assign("/welcome");
    } catch (x) {
      setError((x as Error).message);
    }
  }
  return (
    <div className="account-menu">
      <button className="account-trigger" onClick={() => setOpen(!open)}>
        <UserRound />
        <span>{user.name}</span>
        <ChevronDown />
      </button>
      {open && (
        <div className="account-popover">
          {editing ? (
            <form onSubmit={save}>
              <label>
                Tu nombre
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  minLength={2}
                  maxLength={80}
                  autoFocus
                />
              </label>
              <div className="account-actions">
                <button type="button" onClick={() => setEditing(false)}>
                  Cancelar
                </button>
                <button className="save-account">Guardar</button>
              </div>
            </form>
          ) : (
            <>
              <div className="account-name">
                <UserRound />
                <b>{user.name}</b>
              </div>
              <button onClick={() => setEditing(true)}>
                <Pencil /> Editar nombre
              </button>
              {confirmDelete ? (
                <div className="delete-confirm">
                  <p>¿Eliminar tu cuenta? Tus picks quedarán anonimizados.</p>
                  <div className="account-actions">
                    <button onClick={() => setConfirmDelete(false)}>
                      Cancelar
                    </button>
                    <button className="danger-button" onClick={remove}>
                      Eliminar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="delete-account"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 /> Eliminar cuenta
                </button>
              )}
            </>
          )}
          {error && <p className="error">{error}</p>}
        </div>
      )}
    </div>
  );
}

function SportsHeader({
  user,
  onChange,
}: {
  user?: UserIdentity | null;
  onChange: (user: UserIdentity | null) => void;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const closeMobileMenu = () => setMobileMenuOpen(false);
  return (
    <>
      <header className="sports-header">
        <button
          className="mobile-menu"
          aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
        <NavLink to="/" className="wordmark">
          <b>KURI</b>
          <span>DOIT</span>
        </NavLink>
        <nav className="desktop-nav">
          <NavLink to="/">Partidos</NavLink>
          <NavLink to="/predictions">Mis predicciones</NavLink>
          <NavLink to="/matches/history">Resultados</NavLink>
          <NavLink to="/ranking">Ranking</NavLink>
          <NavLink to="/standings">Tabla de posiciones</NavLink>
        </nav>
        {user ? (
          <AccountMenu user={user} onChange={onChange} />
        ) : (
          <UserRound className="user-icon" />
        )}
      </header>
      {mobileMenuOpen && (
        <div className="mobile-navigation-backdrop" onClick={closeMobileMenu}>
          <nav id="mobile-navigation" className="mobile-navigation" onClick={(event) => event.stopPropagation()}>
            <NavLink to="/" onClick={closeMobileMenu}><HomeIcon /> Partidos</NavLink>
            <NavLink to="/predictions" onClick={closeMobileMenu}><Target /> Mis predicciones</NavLink>
            <NavLink to="/matches/history" onClick={closeMobileMenu}><Clock3 /> Resultados</NavLink>
            <NavLink to="/ranking" onClick={closeMobileMenu}><Trophy /> Ranking</NavLink>
            <NavLink to="/standings" onClick={closeMobileMenu}><Table2 /> Tabla de posiciones</NavLink>
          </nav>
        </div>
      )}
      <div className="sports-nav">
        <span className="ball">●</span>
        <b>Fútbol</b>
        <NavLink to="/">Próximos partidos</NavLink>
        <NavLink to="/predictions">Mis predicciones</NavLink>
        <NavLink to="/matches/history">Resultados</NavLink>
      </div>
    </>
  );
}

function MobileBottomNav() {
  return (
    <nav className="bottom-nav">
      <NavLink to="/">
        <HomeIcon />
        <span>Partidos</span>
      </NavLink>
      <NavLink to="/predictions">
        <Target />
        <span>Picks</span>
      </NavLink>
      <NavLink to="/matches/history">
        <Clock3 />
        <span>Resultados</span>
      </NavLink>
      <NavLink to="/ranking">
        <Trophy />
        <span>Ranking</span>
      </NavLink>
      <NavLink to="/standings">
        <Table2 />
        <span>Posiciones</span>
      </NavLink>
    </nav>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState(navigator.onLine);
  const [user, setUser] = useState<UserIdentity | null>(() =>
    JSON.parse(localStorage.getItem("kuri_user") || "null"),
  );
  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    addEventListener("online", sync);
    addEventListener("offline", sync);
    return () => {
      removeEventListener("online", sync);
      removeEventListener("offline", sync);
    };
  }, []);
  useEffect(() => {
    if (user && !user.token)
      api<UserIdentity>("/users", {
        method: "POST",
        body: JSON.stringify({ name: user.name }),
      })
        .then((fresh) => {
          localStorage.setItem("kuri_user", JSON.stringify(fresh));
          setUser(fresh);
        })
        .catch(() => {});
  }, [user]);
  return (
    <>
      <SportsHeader user={user} onChange={setUser} />
      {!online && (
        <div className="offline">
          <WifiOff /> Sin conexión. Necesitas Internet para registrar picks.
        </div>
      )}
      <main className="app-main">{children}</main>
      <MobileBottomNav />
    </>
  );
}

function MatchCard({
  match,
  questionCount,
}: {
  match: Match;
  questionCount: number;
}) {
  return (
    <article className="match-card">
      <div className="match-meta">
        <b>FÚTBOL · KURIYAMA</b>
        <span>
          <Clock3 /> {date(match.kickoff_at)}
        </span>
      </div>
      <div className="teams">
        <div>
          <strong>
            {match.kuriyama_side === "HOME" ? "KURIYAMA" : <OpponentName match={match} />}
          </strong>
          <small>
            {match.kuriyama_side === "HOME" ? "LOCAL" : "VISITANTE"}
          </small>
        </div>
        <i>VS</i>
        <div>
          <strong>
            {match.kuriyama_side === "HOME" ? <OpponentName match={match} /> : "KURIYAMA"}
          </strong>
          <small>
            {match.kuriyama_side === "HOME" ? "VISITANTE" : "LOCAL"}
          </small>
        </div>
      </div>
      <footer>
        Preguntas disponibles: <b>{questionCount}</b>
      </footer>
    </article>
  );
}

function OpponentName({ match }: { match: Match }) {
  return <span className="opponent-name">
    {match.previous_opponent && match.previous_opponent !== match.opponent && <del>{match.previous_opponent}</del>}
    <span>{match.opponent}</span>
  </span>;
}

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    PENDING: "PENDIENTE",
    WON: "GANADO",
    LOST: "PERDIDO",
    CORRECT: "ACIERTO",
    INCORRECT: "FALLO",
    VOID: "ANULADO",
  };
  return (
    <span className={`status-badge ${status.toLowerCase()}`}>
      {["WON", "CORRECT"].includes(status) && <Check />}
      {["LOST", "INCORRECT"].includes(status) && <X />}
      {labels[status] || status}
    </span>
  );
}

function PredictionHistory({ predictions }: { predictions: Prediction[] }) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const groups = [
    { id: "pending", title: "Pendientes", items: predictions.filter((prediction) => prediction.status === "PENDING"), empty: "No tienes predicciones pendientes." },
    { id: "past", title: "Predicciones pasadas", items: predictions.filter((prediction) => prediction.status !== "PENDING"), empty: "Todavía no tienes predicciones pasadas." },
  ];
  return (
    <section id="my-picks" className="content-section">
      <div className="page-heading compact-heading"><Target /><div><span className="section-kicker">HISTORIAL</span><h1>Mis predicciones</h1></div></div>
      <div className="prediction-categories">
        {groups.map((group) => {
          const open = Boolean(openSections[group.id]);
          return <div className="prediction-category" key={group.id}>
            <button type="button" className="history-toggle" aria-expanded={open} aria-controls={`prediction-${group.id}`} onClick={() => setOpenSections((current) => ({ ...current, [group.id]: !open }))}>
              <div><h2>{group.title}</h2><small>{group.items.length} predicciones</small></div>
              <ChevronDown className={open ? "open" : ""} />
            </button>
            {open && (group.items.length ? <div id={`prediction-${group.id}`} className="prediction-history">
              {group.items.map((p) => <article key={p.id}>
                <div><b>KURIYAMA VS {p.opponent.toUpperCase()}</b><small>{date(p.kickoff_at)}</small></div>
                <p>{p.prompt}</p>
                <strong className="answer">{predictionAnswer(p)}</strong>
                <StatusBadge status={p.status} />
                <em className={p.points_awarded < 0 ? "negative" : ""}>{p.status === "PENDING" ? `±${fmt(p.points_snapshot)}` : `${p.points_awarded > 0 ? "+" : ""}${fmt(p.points_awarded)}`} pts</em>
              </article>)}
            </div> : <div id={`prediction-${group.id}`} className="empty-state">{group.empty}</div>)}
          </div>;
        })}
      </div>
    </section>
  );
}

function MatchHistory({ matches }: { matches: Match[] }) {
  const ordered = [...matches].sort((a, b) => new Date(b.kickoff_at).getTime() - new Date(a.kickoff_at).getTime());
  return (
    <section className="content-section">
      <div className="title-row">
        <div><span className="section-kicker">PARTIDOS</span><h2>Historial de partidos</h2></div>
      </div>
      <div className="match-history">
        {ordered.map((match) => {
          const hasScore = match.kuriyama_score !== null && match.opponent_score !== null;
          return <article key={match.id}>
            <span><b>{date(match.kickoff_at)}</b><small>{match.status === "FINISHED" ? "Finalizado" : "Próximo partido"}</small></span>
            <strong>KURIYAMA</strong>
            <em className={hasScore ? "final-score" : "pending-score"}>{hasScore ? `${match.kuriyama_score} – ${match.opponent_score}` : "Pendiente"}</em>
            <strong><OpponentName match={match} /></strong>
          </article>;
        })}
        {!ordered.length && <div className="empty-state">Todavía no hay partidos registrados.</div>}
      </div>
    </section>
  );
}

function Welcome() {
  const nav = useNavigate(),
    [name, setName] = useState(""),
    [suggestions, setSuggestions] = useState<Array<{ name: string }>>([]),
    [searching, setSearching] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(() => {
      const message = sessionStorage.getItem("kuri_login_error") ?? "";
      sessionStorage.removeItem("kuri_login_error");
      return message;
    });
  useEffect(() => {
    const query = name.trim();
    if (!query) { setSuggestions([]); setSearching(false); return; }
    let cancelled = false;
    setSearching(true);
    const timeout = window.setTimeout(() => {
      api<Array<{ name: string }>>(`/users/search?q=${encodeURIComponent(query)}`)
        .then((results) => { if (!cancelled) setSuggestions(results); })
        .catch(() => { if (!cancelled) setSuggestions([]); })
        .finally(() => { if (!cancelled) setSearching(false); });
    }, 180);
    return () => { cancelled = true; window.clearTimeout(timeout); };
  }, [name]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const u = await api<{ id: string; name: string }>("/users", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      localStorage.setItem("kuri_user", JSON.stringify(u));
      nav("/");
    } catch (x) {
      setError((x as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="welcome">
      <div className="welcome-logo">
        <b>KURI</b>
        <span>DOIT</span>
      </div>
      <span className="section-kicker">LA QUINIELA DEL EQUIPO</span>
      <h1>
        Haz tu predicción.
        <br />
        <em>Sube en el ranking.</em>
      </h1>
      <p>Busca tu nombre para entrar a tu usuario. Si todavía no existe, se creará automáticamente.</p>
      <form onSubmit={submit} className="login-card">
        <label>
          Buscar usuario por nombre
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Escribe tu nombre"
            minLength={2}
            maxLength={80}
            autoComplete="off"
            aria-autocomplete="list"
            aria-controls="user-suggestions"
          />
        </label>
        {(searching || suggestions.length > 0) && <div id="user-suggestions" className="user-suggestions" role="listbox">
          {searching && <small>Buscando usuarios…</small>}
          {!searching && suggestions.map((user) => <button key={user.name} type="button" role="option" onClick={() => { setName(user.name); setSuggestions([]); }}><UserRound />{user.name}</button>)}
        </div>}
        {error && <p className="error">{error}</p>}
        <button
          className="primary-button"
          disabled={busy || name.trim().length < 2}
        >
          {busy ? "Entrando…" : "COMENZAR"}
        </button>
      </form>
    </main>
  );
}

function Home({ view = "matches" }: { view?: "matches" | "predictions" | "history" }) {
  const [user, setUser] = useState<UserIdentity | null>(() =>
    JSON.parse(localStorage.getItem("kuri_user") || "null"),
  );
  const [matches, setMatches] = useState<Match[]>(),
    [allMatches, setAllMatches] = useState<Match[]>([]),
    [selectedId, setSelectedId] = useState(""),
    [questions, setQuestions] = useState<Question[]>([]),
    [openQuestions, setOpenQuestions] = useState<Record<string, boolean>>({}),
    [scoreDrafts, setScoreDrafts] = useState<Record<string, { kuriyama: number; opponent: number }>>({}),
    [predictions, setPredictions] = useState<Prediction[]>([]),
    [msg, setMsg] = useState("");
  const selectedMatch = matches?.find((m) => m.id === selectedId);
  useEffect(() => {
    if (!user) return;
    const prepare = async () => {
      let identity = user;
      if (!identity.token) {
        identity = await api<UserIdentity>("/users", {
          method: "POST",
          body: JSON.stringify({ name: identity.name }),
        });
        localStorage.setItem("kuri_user", JSON.stringify(identity));
        setUser(identity);
      }
      const [open, completeMatchList] = await Promise.all([api<Match[]>("/matches/open"), api<Match[]>("/matches")]);
      setMatches(open);
      setAllMatches(completeMatchList);
      if (open[0]) setSelectedId(open[0].id);
      setPredictions(
        await api<Prediction[]>(`/users/${identity.id}/predictions`, {
          headers: { Authorization: `Bearer ${identity.token}` },
        }),
      );
    };
    prepare().catch((e) => {
      setMatches([]);
      setMsg(e.message);
    });
  }, []);
  useEffect(() => {
    if (!user?.token || !selectedId) return;
    setOpenQuestions({});
    api<Question[]>(`/questions/${selectedId}?user_id=${user.id}`, {
      headers: { Authorization: `Bearer ${user.token}` },
    })
      .then(setQuestions)
      .catch((e) => setMsg(e.message));
  }, [selectedId, user]);
  useEffect(() => {
    if (msg !== "PREDICCIÓN GUARDADA") return;
    const timeout = window.setTimeout(() => setMsg(""), 1800);
    return () => window.clearTimeout(timeout);
  }, [msg]);
  if (!user) return <Navigate to="/welcome" />;
  async function answer(question: Question, value: string) {
    if (!user.token) return;
    try {
      const selectedAnswers = question.prediction_answers ?? (question.prediction_answer ? [question.prediction_answer] : []);
      const removing = selectedAnswers.includes(value);
      await api("/predictions", {
        method: removing ? "DELETE" : "POST",
        headers: { Authorization: `Bearer ${user.token}` },
        body: JSON.stringify(removing
          ? { user_id: user.id, question_id: question.id, answer: value }
          : { user_id: user.id, question_id: question.id, answer: value }),
      });
      setQuestions((current) =>
        current.map((q) =>
          q.id === question.id
            ? (() => {
                const prior = q.prediction_answers ?? (q.prediction_answer ? [q.prediction_answer] : []);
                const answers = removing ? prior.filter((answer) => answer !== value) : q.question_type === "GOAL_SCORER" ? [...prior, value] : [value];
                return { ...q, prediction_answers: answers, prediction_answer: answers[0], prediction_status: answers.length ? "PENDING" : undefined };
              })()
            : q,
        ),
      );
      setPredictions(
        await api<Prediction[]>(`/users/${user.id}/predictions`, {
          headers: { Authorization: `Bearer ${user.token}` },
        }),
      );
      setMsg(removing ? "" : "PREDICCIÓN GUARDADA");
    } catch (e) {
      setMsg((e as Error).message);
    }
  }
  function exactScore(question: Question) {
    return scoreDrafts[question.id] ?? scoreFromAnswer(question.prediction_answer) ?? { kuriyama: 0, opponent: 0 };
  }
  function changeExactScore(question: Question, team: "kuriyama" | "opponent", amount: number) {
    const current = exactScore(question);
    setScoreDrafts((drafts) => ({ ...drafts, [question.id]: { ...current, [team]: Math.max(0, Math.min(99, current[team] + amount)) } }));
  }
  return (
    <Shell>
      {view === "matches" && <>
      <section className="content-section">
        <div className="title-row">
          <div>
            <span className="section-kicker">PARTIDOS ABIERTOS</span>
            <h2>Elige un partido</h2>
          </div>
          <small>Las preguntas son opcionales</small>
        </div>
        {matches === undefined ? (
          <div className="loader" />
        ) : matches.length ? (
          <div className="match-selector">
            {matches.map((m) => (
              <button
                key={m.id}
                className={selectedId === m.id ? "active" : ""}
                onClick={() => setSelectedId(m.id)}
              >
                <span>Kuriyama vs</span>
                <b><OpponentName match={m} /></b>
                <small>{date(m.kickoff_at)}</small>
              </button>
            ))}
          </div>
        ) : (
          <div className="empty-state">No hay partidos abiertos.</div>
        )}
      </section>
      {msg && (
        <div
          className={`toast ${msg === "PREDICCIÓN GUARDADA" ? "success" : ""}`}
        >
          {msg === "PREDICCIÓN GUARDADA" && <Check />}
          {msg}
        </div>
      )}
      {selectedMatch && (
        <>
          <section className="content-section">
            <MatchCard match={selectedMatch} questionCount={questions.length} />
          </section>
          <section className="content-section question-section">
            <div className="title-row">
              <div>
                <span className="section-kicker">PREGUNTAS</span>
                <h2>Haz tus predicciones</h2>
              </div>
              <small>Acierto suma · fallo resta</small>
            </div>
            <div className="prediction-rules">
              <Target />
              <p><b>¿Cómo funcionan las predicciones?</b> Elige solo las que quieras jugar. Si aciertas, sumas los puntos indicados; si fallas, se te descuentan esos mismos puntos. Los resultados serán visibles después del partido.</p>
            </div>
            {questions.length ? (
              <div className="question-list">
                {questions.map((q, i) => (
                  <article key={q.id} className={openQuestions[q.id] ? "question-open" : "question-closed"}>
                    <button
                      type="button"
                      className="question-toggle"
                      aria-expanded={Boolean(openQuestions[q.id])}
                      aria-controls={`question-picks-${q.id}`}
                      onClick={() => setOpenQuestions((current) => ({ ...current, [q.id]: !current[q.id] }))}
                    >
                      <span><span className="question-number">{i + 1}</span><b>{q.prompt}</b></span>
                      <ChevronDown className={openQuestions[q.id] ? "open" : ""} />
                    </button>
                    {openQuestions[q.id] && <div id={`question-picks-${q.id}`} className="question-picks">
                    <div className="question-copy">
                      <span>
                        Valor: <strong>{q.question_type === "EXACT_SCORE" ? "+20 puntos · sin penalización" : `±${fmt(q.points_value)} puntos`}</strong>
                      </span>
                      {q.question_type === "GOAL_SCORER" && (q.prediction_answers?.length ?? 0) > 0 && <span>Selecciones: <strong>{q.prediction_answers?.length}</strong> · Riesgo total: <strong>±{fmt(q.options.filter((option) => q.prediction_answers?.includes(option.value_key)).reduce((sum, option) => sum + Number(option.points_value), 0))} puntos</strong></span>}
                    </div>
                    {q.question_type === "EXACT_SCORE" ? (() => {
                      const score = exactScore(q);
                      const value = `SCORE_${score.kuriyama}_${score.opponent}`;
                      const selected = q.prediction_answer === value;
                      return <div className="exact-score-picker">
                        <div><b>Kuriyama</b><span><button onClick={() => changeExactScore(q,"kuriyama",-1)} disabled={score.kuriyama===0}>−</button><strong>{score.kuriyama}</strong><button onClick={() => changeExactScore(q,"kuriyama",1)}>+</button></span></div>
                        <div><b>{selectedMatch.opponent}</b><span><button onClick={() => changeExactScore(q,"opponent",-1)} disabled={score.opponent===0}>−</button><strong>{score.opponent}</strong><button onClick={() => changeExactScore(q,"opponent",1)}>+</button></span></div>
                        <p>Si aciertas el marcador exacto sumas <b>20 puntos</b>. Si fallas, no pierdes puntos.</p>
                        <button className={selected ? "exact-score-submit selected" : "exact-score-submit"} onClick={() => answer(q,value)}>{selected ? `Quitar ${score.kuriyama} – ${score.opponent}` : `Elegir ${score.kuriyama} – ${score.opponent} · +20 pts`}</button>
                      </div>;
                    })() : <div className="binary-answers configurable-answers">
                      {q.options.map((option) => (
                        <button
                          key={option.value_key}
                          className={(q.prediction_answers ?? (q.prediction_answer ? [q.prediction_answer] : [])).includes(option.value_key) ? "selected yes" : ""}
                          onClick={() => answer(q, option.value_key)}
                        >
                          {(q.prediction_answers ?? (q.prediction_answer ? [q.prediction_answer] : [])).includes(option.value_key) && <Check />}
                          <span>{option.label}</span>
                          <small>±{fmt(option.points_value)} pts</small>
                        </button>
                      ))}
                    </div>}
                    </div>}
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                El administrador todavía no agregó preguntas.
              </div>
            )}
          </section>
        </>
      )}
      </>}
      {view === "predictions" && <PredictionHistory predictions={predictions} />}
      {view === "history" && <MatchHistory matches={allMatches} />}
    </Shell>
  );
}

function RankingTable({
  rows,
}: {
  rows: Array<{
    id: string;
    name: string;
    points: number;
    won: number;
    lost: number;
    pending: number;
    total: number;
  }>;
}) {
  const [expanded, setExpanded] = useState(""),
    [details, setDetails] = useState<Record<string, Prediction[]>>({}),
    [loading, setLoading] = useState("");
  const viewer = JSON.parse(
    localStorage.getItem("kuri_user") || "null",
  ) as UserIdentity | null;
  async function toggle(id: string) {
    if (expanded === id) {
      setExpanded("");
      return;
    }
    setExpanded(id);
    if (details[id]) return;
    setLoading(id);
    try {
      const own = viewer?.id === id;
      const data = await api<Prediction[]>(
        `/users/${id}/predictions?latest_match=1`,
        own && viewer?.token
          ? { headers: { Authorization: `Bearer ${viewer.token}` } }
          : undefined,
      );
      setDetails((current) => ({ ...current, [id]: data }));
    } finally {
      setLoading("");
    }
  }
  return (
    <div className="ranking-table">
      <div className="ranking-head">
        <span>POS</span>
        <span>JUGADOR</span>
        <span>PICKS</span>
        <span>G</span>
        <span>P</span>
        <span>PTS</span>
      </div>
      {rows.map((r, i) => (
        <div className="ranking-entry" key={r.id}>
          <button
            className={`ranking-row ${i < 3 ? "podium" : ""}`}
            onClick={() => toggle(r.id)}
          >
            <strong>{i + 1}</strong>
            <span>
              <b>{r.name}</b>
              <small>{r.pending} pendientes</small>
            </span>
            <span>{r.total}</span>
            <span>{r.won}</span>
            <span>{r.lost}</span>
            <em>
              {fmt(r.points)}
              <ChevronDown className={expanded === r.id ? "open" : ""} />
            </em>
          </button>
          {expanded === r.id && (
            <div className="ranking-predictions">
              {loading === r.id ? (
                <div className="loader" />
              ) : details[r.id]?.length ? (
                details[r.id].map((p) => (
                  <article key={p.id}>
                    <span>
                      <b>vs {p.opponent}</b>
                      <small>{date(p.kickoff_at)}</small>
                    </span>
                    <p>{p.prompt}</p>
                    <strong>{predictionAnswer(p)}</strong>
                    <StatusBadge status={p.status} />
                    <em>
                      {p.status === "PENDING"
                        ? `±${fmt(p.points_snapshot)}`
                        : `${p.points_awarded > 0 ? "+" : ""}${fmt(p.points_awarded)}`}{" "}
                      pts
                    </em>
                  </article>
                ))
              ) : (
                <p className="visibility-note">
                  <Clock3 /> Las predicciones y sus resultados serán visibles después del partido.
                </p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Ranking() {
  const [rows, setRows] = useState<
    Array<{
      id: string;
      name: string;
      points: number;
      won: number;
      lost: number;
      pending: number;
      total: number;
    }>
  >([]);
  useEffect(() => {
    api<typeof rows>("/leaderboard").then(setRows);
  }, []);
  return (
    <Shell>
      <section className="ranking-page">
        <div className="page-heading">
          <Trophy />
          <div>
            <span className="section-kicker">TEMPORADA ACTUAL</span>
            <h1>Clasificación</h1>
          </div>
        </div>
        {rows.length ? (
          <RankingTable rows={rows} />
        ) : (
          <div className="empty-state">Todavía no hay participantes.</div>
        )}
      </section>
    </Shell>
  );
}

function StandingsPage() {
  const [rows, setRows] = useState<Standing[]>([]);
  useEffect(() => { api<Standing[]>("/standings").then(setRows); }, []);
  const groups = [...new Set(rows.map((row) => row.group_name))];
  const value = (number: number | null) => number ?? "–";
  return <Shell>
    <section className="content-section standings-page">
      <div className="page-heading"><Table2 /><div><span className="section-kicker">TEMPORADA ACTUAL</span><h1>Tabla de posiciones</h1></div></div>
      {rows.length ? <div className="standings-scroll"><table className="standings-table">
        <thead><tr><th>Lugar</th><th>Equipo</th><th>JJ</th><th>JG</th><th>JE</th><th>JP</th><th>GF</th><th>GC</th><th>Dif</th><th>PA</th><th>Pts.</th></tr></thead>
        <tbody>{groups.map((group) => <Fragment key={group}>
          <tr className="standings-group"><th colSpan={11}>{group}</th></tr>
          {rows.filter((row) => row.group_name === group).map((row) => <tr key={row.id} className={row.team.toLowerCase().includes("(baja)") ? "inactive-team" : row.team === "KURIYAMA" ? "kuriyama-team" : ""}>
            <td>{value(row.place)}</td><th>{row.team}</th><td>{value(row.played)}</td><td>{value(row.won)}</td><td>{value(row.drawn)}</td><td>{value(row.lost)}</td><td>{value(row.goals_for)}</td><td>{value(row.goals_against)}</td><td>{value(row.goal_difference)}</td><td>{value(row.penalty_points)}</td><td><b>{value(row.points)}</b></td>
          </tr>)}
        </Fragment>)}</tbody>
      </table></div> : <div className="empty-state">Todavía no hay posiciones registradas.</div>}
    </section>
  </Shell>;
}

const standingFields = [
  ["place","Lugar"],["played","JJ"],["won","JG"],["drawn","JE"],["lost","JP"],
  ["goals_for","GF"],["goals_against","GC"],["goal_difference","Dif"],["penalty_points","PA"],["points","Pts."],
] as const;

function AdminQuestions({ view = "matches" }: { view?: "matches" | "questions" | "predictions" | "moderation" | "standings" }) {
  type AdminQuestion = Question & {
    correct_answer?: string;
    settled_at?: string;
  };
  type AdminPrediction = Prediction & { name: string };
  type QuestionTemplate = AdminQuestion & { opponent: string };
  type RankingUser = {
    id: string;
    name: string;
    points: number;
    won: number;
    lost: number;
    pending: number;
    total: number;
  };
  const nav = useNavigate(),
    [matches, setMatches] = useState<Match[]>([]),
    [selected, setSelected] = useState(""),
    [questions, setQuestions] = useState<AdminQuestion[]>([]),
    [optionDrafts, setOptionDrafts] = useState<Record<string, Array<{ value_key: string; label: string; points_value: number }>>>({}),
    [templates, setTemplates] = useState<QuestionTemplate[]>([]),
    [predictions, setPredictions] = useState<AdminPrediction[]>([]),
    [ranking, setRanking] = useState<RankingUser[]>([]),
    [standings, setStandings] = useState<Standing[]>([]),
    [deleteMatch, setDeleteMatch] = useState(""),
    [deletePrediction, setDeletePrediction] = useState(""),
    [moderateUser, setModerateUser] = useState(""),
    [newQuestionType, setNewQuestionType] = useState<QuestionType>("CUSTOM"),
    [copySource, setCopySource] = useState(""),
    [settlementChoices, setSettlementChoices] = useState<Record<string, string[]>>({}),
    [numericResults, setNumericResults] = useState<Record<string, string>>({}),
    [scoreResults, setScoreResults] = useState<Record<string, { kuriyama: string; opponent: string }>>({}),
    [notice, setNotice] = useState(""),
    [error, setError] = useState("");
  async function loadQuestions(matchId: string) {
    setSelected(matchId);
    const list = matchId ? await api<AdminQuestion[]>(`/admin/questions?match_id=${encodeURIComponent(matchId)}`) : [];
    setQuestions(list);
    setOptionDrafts(Object.fromEntries(list.map((question) => [question.id, question.options.map((option) => ({ value_key: option.value_key, label: option.label, points_value: option.points_value }))])));
  }
  async function openMatchQuestions(matchId: string) {
    await loadQuestions(matchId);
    nav(`/admin/questions?match_id=${encodeURIComponent(matchId)}`);
  }
  async function refresh() {
    const [matchList, predictionList, rankingList, templateList, standingList] = await Promise.all([
      api<Match[]>("/matches"),
      api<AdminPrediction[]>("/admin/predictions"),
      api<RankingUser[]>("/leaderboard"),
      api<QuestionTemplate[]>("/admin/question-templates"),
      api<Standing[]>("/standings"),
    ]);
    setMatches(matchList);
    setPredictions(predictionList);
    setRanking(rankingList);
    setTemplates(templateList);
    setStandings(standingList);
    return matchList;
  }
  useEffect(() => {
    refresh()
      .then((list) => {
        const requestedMatch = new URLSearchParams(location.search).get("match_id");
        const initialMatch = list.find((match) => match.id === requestedMatch) ?? list[0];
        if (initialMatch) loadQuestions(initialMatch.id);
      })
      .catch((e) => {
        if (e.message === "No autorizado") nav("/admin/login");
        else setError(e.message);
      });
  }, []);
  async function createMatch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      f = new FormData(form);
    try {
      const created = await api<{ id: string }>("/admin/matches", {
        method: "POST",
        body: JSON.stringify({
          opponent: f.get("opponent"),
          kuriyama_side: f.get("side"),
          kickoff_at: new Date(String(f.get("kickoff"))).toISOString(),
          picks_close_at: new Date(String(f.get("close"))).toISOString(),
          status: "OPEN",
        }),
      });
      form.reset();
      await refresh();
      await loadQuestions(created.id);
      setNotice("Partido creado correctamente");
    } catch (x) {
      setError((x as Error).message);
    }
  }
  async function removeMatch(id: string) {
    try {
      await api(`/admin/matches/${id}`, { method: "DELETE" });
      setDeleteMatch("");
      if (selected === id) {
        setSelected("");
        setQuestions([]);
      }
      await refresh();
      setNotice("Partido eliminado correctamente");
    } catch (x) {
      setError((x as Error).message);
    }
  }
  async function saveMatchResult(e: FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const score = (name: string) => String(f.get(name) ?? "").trim() === "" ? null : Number(f.get(name));
    try {
      await api(`/admin/matches/${id}/result`, {
        method: "PUT",
        body: JSON.stringify({ opponent: f.get("opponent"), kuriyama_score: score("kuriyama_score"), opponent_score: score("opponent_score"), status: f.get("status") }),
      });
      await refresh();
      setNotice("Resultado del partido actualizado");
    } catch (x) {
      setError((x as Error).message);
    }
  }
  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      f = new FormData(form);
    try {
      const type = String(f.get("question_type")) as QuestionType;
      const points = type === "EXACT_SCORE" ? 20 : Number(f.get("points"));
      const lines = String(f.get(type === "GOAL_SCORER" ? "players" : "answers") || "")
        .split("\n").map((line) => line.trim()).filter(Boolean);
      let options: Array<{ value_key: string; label: string; points_value: number }>;
      if (type === "EXACT_SCORE") {
        options = [];
      } else if (type === "TOTAL_GOALS" || type === "FIRST_HALF_GOALS") {
        const thresholds = type === "TOTAL_GOALS" ? [3.5, 4.5, 5.5] : [1.5, 2.5, 3.5];
        options = thresholds.flatMap((line) => [
          { value_key: `UNDER_${String(line).replace(".", "_")}`, label: `Under ${line}`, points_value: points },
          { value_key: `OVER_${String(line).replace(".", "_")}`, label: `Over ${line}`, points_value: points },
        ]);
      } else {
        options = lines.map((line, index) => {
          const [label, ownPoints] = line.split("|").map((part) => part.trim());
          return { value_key: `${type}_${index}_${label.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`, label, points_value: Number(ownPoints) || points };
        });
      }
      await api("/admin/questions", {
        method: "POST",
        body: JSON.stringify({
          match_id: selected,
          prompt: type === "EXACT_SCORE" ? "Marcador correcto" : f.get("prompt"),
          points_value: points,
          status: "OPEN",
          question_type: type,
          options,
        }),
      });
      form.reset();
      await loadQuestions(selected);
      setNotice("Pregunta creada correctamente");
    } catch (x) {
      setError((x as Error).message);
    }
  }
  async function copyQuestion() {
    if (!selected || !copySource) return;
    try {
      await api("/admin/questions/copy", {
        method: "POST",
        body: JSON.stringify({ source_question_id: copySource, match_id: selected }),
      });
      setCopySource("");
      await loadQuestions(selected);
      await refresh();
      setNotice("Pregunta y respuestas copiadas correctamente");
    } catch (x) {
      setError((x as Error).message);
    }
  }
  async function update(e: FormEvent<HTMLFormElement>, q: AdminQuestion) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      const options = (optionDrafts[q.id] ?? []).map((option) => ({ value_key: option.value_key, label: option.label.trim(), points_value: Number(option.points_value) }));
      await api(`/admin/questions/${q.id}`, {
        method: "PUT",
        body: JSON.stringify({
          match_id: q.match_id,
          prompt: f.get("prompt"),
          points_value: Number(f.get("points")),
          status: f.get("status"),
          question_type: q.question_type,
          options,
        }),
      });
      await loadQuestions(selected);
      setNotice("Pregunta actualizada");
    } catch (x) {
      setError((x as Error).message);
    }
  }
  function addQuestionOption(q: AdminQuestion) {
    setOptionDrafts((current) => ({ ...current, [q.id]: [...(current[q.id] ?? []), { value_key: `CUSTOM_${crypto.randomUUID()}`, label: "", points_value: Number(q.points_value) }]}));
  }
  function changeQuestionOption(questionId: string, index: number, field: "label" | "points_value", value: string) {
    setOptionDrafts((current) => ({ ...current, [questionId]: (current[questionId] ?? []).map((option, optionIndex) => optionIndex === index ? { ...option, [field]: field === "points_value" ? Number(value) : value } : option) }));
  }
  function removeQuestionOption(questionId: string, index: number) {
    setOptionDrafts((current) => ({ ...current, [questionId]: (current[questionId] ?? []).filter((_, optionIndex) => optionIndex !== index) }));
  }
  async function moveQuestion(index: number, direction: -1 | 1) {
    const target = index + direction;
    const firstMovable = questions[0]?.question_type === "EXACT_SCORE" ? 1 : 0;
    if (target < firstMovable || target >= questions.length) return;
    const reordered = [...questions];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setQuestions(reordered);
    try {
      await api("/admin/questions/reorder", { method: "POST", body: JSON.stringify({ match_id: selected, question_ids: reordered.map((question) => question.id) }) });
      setNotice("Orden de preguntas actualizado");
    } catch (x) {
      setError((x as Error).message);
      await loadQuestions(selected);
    }
  }
  async function settle(id: string, correctAnswers: string[] = [], numericResult?: number, voidQuestion = false, scoreResult?: { kuriyama_score: number; opponent_score: number }) {
    try {
      await api("/admin/questions/settle", {
        method: "POST",
        body: JSON.stringify({ question_id: id, correct_answers: correctAnswers, numeric_result: numericResult, score_result: scoreResult, void: voidQuestion }),
      });
      await loadQuestions(selected);
      setNotice("Pregunta resuelta y puntos calculados");
    } catch (x) {
      setError((x as Error).message);
    }
  }
  function toggleSettlement(questionId: string, value: string) {
    setSettlementChoices((current) => {
      const selected = current[questionId] ?? [];
      return { ...current, [questionId]: selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value] };
    });
  }
  async function remove(id: string) {
    try {
      await api(`/admin/questions/${id}`, { method: "DELETE" });
      await loadQuestions(selected);
      setNotice("Pregunta retirada");
    } catch (x) {
      setError((x as Error).message);
    }
  }
  async function removePrediction(id: string) {
    try {
      await api(`/admin/predictions/${id}`, { method: "DELETE" });
      setDeletePrediction("");
      await refresh();
      setNotice("Predicción eliminada");
    } catch (x) {
      setError((x as Error).message);
    }
  }
  async function removeUser(id: string) {
    try {
      await api(`/admin/users/${id}`, { method: "DELETE" });
      setModerateUser("");
      await refresh();
      setNotice("Usuario retirado del ranking");
    } catch (x) {
      setError((x as Error).message);
    }
  }
  async function saveStanding(e: FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const optionalNumber = (name: string) => String(f.get(name) ?? "").trim() === "" ? null : Number(f.get(name));
    try {
      await api(`/admin/standings/${id}`, { method: "PUT", body: JSON.stringify({
        group_name: f.get("group_name"), team: f.get("team"), place: optionalNumber("place"),
        played: optionalNumber("played"), won: optionalNumber("won"), drawn: optionalNumber("drawn"), lost: optionalNumber("lost"),
        goals_for: optionalNumber("goals_for"), goals_against: optionalNumber("goals_against"), goal_difference: optionalNumber("goal_difference"),
        penalty_points: optionalNumber("penalty_points"), points: optionalNumber("points"),
      }) });
      await refresh();
      setNotice("Tabla de posiciones actualizada");
    } catch (x) { setError((x as Error).message); }
  }
  async function logout() {
    await api("/admin/logout", { method: "POST" });
    nav("/admin/login");
  }
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="wordmark">
          <b>KURI</b>
          <span>DOIT</span>
        </div>
        <small>ADMIN</small>
        <nav>
          <NavLink to="/admin/matches">Partidos</NavLink>
          <NavLink to="/admin/questions">Preguntas</NavLink>
          <NavLink to="/admin/predictions">Predicciones</NavLink>
          <NavLink to="/admin/moderation">Moderación</NavLink>
          <NavLink to="/admin/standings">Tabla de posiciones</NavLink>
        </nav>
        <button onClick={logout}>
          <LogOut /> Cerrar sesión
        </button>
      </aside>
      <main className="admin-main">
        <div className="admin-mobile-head">
          <div className="wordmark">
            <b>KURI</b>
            <span>DOIT</span>
          </div>
          <button onClick={logout}>
            <LogOut />
          </button>
        </div>
        <nav className="admin-mobile-nav">
          <NavLink to="/admin/matches">Partidos</NavLink>
          <NavLink to="/admin/questions">Preguntas</NavLink>
          <NavLink to="/admin/predictions">Predicciones</NavLink>
          <NavLink to="/admin/moderation">Moderación</NavLink>
          <NavLink to="/admin/standings">Posiciones</NavLink>
        </nav>
        <span className="section-kicker">ADMINISTRACIÓN</span>
        <h1>{view === "matches" ? "Partidos" : view === "questions" ? "Preguntas" : view === "predictions" ? "Predicciones realizadas" : view === "standings" ? "Tabla de posiciones" : "Moderación"}</h1>
        {error && <p className="error">{error}</p>}
        {notice && (
          <div className="admin-notice">
            <Check />
            {notice}
            <button onClick={() => setNotice("")}>
              <X />
            </button>
          </div>
        )}
        {view === "matches" && <>
        <section className="admin-card" id="partidos">
          <h2>Nuevo partido</h2>
          <form className="admin-form" onSubmit={createMatch}>
            <label>Rival<input name="opponent" required minLength={2}/></label>
            <label>Sede<select name="side"><option value="HOME">Local</option><option value="AWAY">Visitante</option></select></label>
            <label>Inicio<input name="kickoff" type="datetime-local" required/></label>
            <label>Cierre de predicciones<input name="close" type="datetime-local" required/></label>
            <button className="primary-button">CREAR PARTIDO</button>
          </form>
        </section>
        <section className="admin-card">
          <h2>Partidos</h2>
          <div className="admin-table match-admin-table">
            <div className="table-head"><span>Partido</span><span>Fecha</span><span>Marcador</span><span>Estado</span><span>Acciones</span></div>
            {matches.map(m=><form key={m.id} onSubmit={(e)=>saveMatchResult(e,m.id)}><label className="opponent-editor">Rival<input name="opponent" required minLength={2} defaultValue={m.opponent}/>{m.previous_opponent && m.previous_opponent !== m.opponent && <small>Antes: <del>{m.previous_opponent}</del></small>}</label><span>{date(m.kickoff_at)}</span><div className="score-inputs"><input aria-label="Goles Kuriyama" name="kuriyama_score" type="number" min="0" max="99" defaultValue={m.kuriyama_score ?? ""}/><b>–</b><input aria-label={`Goles ${m.opponent}`} name="opponent_score" type="number" min="0" max="99" defaultValue={m.opponent_score ?? ""}/></div><select name="status" defaultValue={m.status}><option value="OPEN">Próximo / abierto</option><option value="LOCKED">Cerrado</option><option value="FINISHED">Finalizado</option><option value="CANCELLED">Cancelado</option><option value="DRAFT">Borrador</option></select><div className="row-actions"><button>Guardar cambios</button><button type="button" onClick={()=>openMatchQuestions(m.id)}>Preguntas</button>{deleteMatch===m.id?<><button type="button" onClick={()=>setDeleteMatch('')}>Cancelar</button><button type="button" className="danger-small" onClick={()=>removeMatch(m.id)}>Confirmar</button></>:<button type="button" className="danger-small" onClick={()=>setDeleteMatch(m.id)}><Trash2/> Eliminar</button>}</div></form>)}
          </div>
        </section>
        </>}
        {view === "questions" && <>
        <section className="admin-card" id="preguntas">
          <label className="admin-select">
            Configurar preguntas del partido
            <select
              value={selected}
              onChange={(e) => loadQuestions(e.target.value)}
            >
              <option value="">Selecciona un partido</option>
              {matches.map((m) => (
                <option key={m.id} value={m.id}>
                  Kuriyama vs {m.opponent} · {date(m.kickoff_at)}
                </option>
              ))}
            </select>
          </label>
        </section>
        {selected && (
          <section className="admin-card nested-admin-card">
            <h2>Nueva pregunta</h2>
            <div className="copy-question-row">
              <label>Copiar una pregunta anterior con todas sus respuestas y puntos
                <select value={copySource} onChange={(e) => setCopySource(e.target.value)}>
                  <option value="">Selecciona una pregunta anterior</option>
                  {templates.filter((template) => template.match_id !== selected).map((template) => (
                    <option key={template.id} value={template.id}>{template.prompt} · vs {template.opponent}</option>
                  ))}
                </select>
              </label>
              <button type="button" className="primary-button" disabled={!copySource} onClick={copyQuestion}>COPIAR PREGUNTA Y RESPUESTAS</button>
            </div>
            <div className="admin-divider"><span>o crea una nueva</span></div>
            <form className="question-admin-form" onSubmit={create}>
              <label>
                Tipo de pregunta
                <select name="question_type" value={newQuestionType} onChange={(e) => setNewQuestionType(e.target.value as QuestionType)}>
                  <option value="CUSTOM">Respuestas personalizadas</option>
                  <option value="TOTAL_GOALS">Cantidad de goles</option>
                  <option value="FIRST_HALF_GOALS">Goles en la primera mitad</option>
                  <option value="GOAL_SCORER">Jugador que meterá gol</option>
                  <option value="EXACT_SCORE">Marcador correcto (+20, sin penalización)</option>
                </select>
              </label>
              {newQuestionType !== "EXACT_SCORE" && <label>
                Pregunta o sentencia
                <textarea
                  name="prompt"
                  minLength={5}
                  maxLength={240}
                  placeholder="Ej. ¿Quién marcará gol?"
                  required
                />
              </label>}
              {newQuestionType !== "EXACT_SCORE" && <label>
                Puntos
                <input
                  name="points"
                  type="number"
                  min="0.5"
                  max="100"
                  step="0.5"
                  placeholder="+3"
                  required
                />
              </label>}
              {newQuestionType === "EXACT_SCORE" && <p className="admin-help wide-field">Esta pregunta aparecerá siempre primero. El usuario elegirá los goles con un contador; acertar suma 20 puntos y fallar no resta puntos.</p>}
              {newQuestionType === "CUSTOM" && (
                <label className="wide-field">Respuestas (una por línea; opcionalmente Respuesta | puntos)
                  <textarea name="answers" defaultValue={"Sí\nNo"} required />
                </label>
              )}
              {newQuestionType === "GOAL_SCORER" && (
                <label className="wide-field">Jugadores que van a jugar (uno por línea; opcionalmente Jugador | puntos)
                  <textarea name="players" placeholder={"Víctor | 4\nCarlos | 3"} required />
                </label>
              )}
              {(newQuestionType === "TOTAL_GOALS" || newQuestionType === "FIRST_HALF_GOALS") && (
                <p className="admin-help wide-field">Se crearán automáticamente todas las opciones Under y Over indicadas. Después puedes modificar los puntos de cada respuesta.</p>
              )}
              <button className="primary-button">AGREGAR PREGUNTA</button>
            </form>
          </section>
        )}
        <section className="admin-card" id="preguntas-configuradas">
          <h2>Preguntas configuradas</h2>
          {questions.length ? (
            <div className="admin-question-list">
              {questions.map((q) => (
                <form key={q.id} onSubmit={(e) => update(e, q)}>
                  <div className="question-order-controls">
                    <b>{q.prompt}</b>
                    {q.question_type === "EXACT_SCORE" ? <small>Siempre aparece primero</small> : <span>
                      <button type="button" disabled={questions.indexOf(q) <= (questions[0]?.question_type === "EXACT_SCORE" ? 1 : 0)} onClick={() => moveQuestion(questions.indexOf(q),-1)}>↑ Subir</button>
                      <button type="button" disabled={questions.indexOf(q) === questions.length - 1} onClick={() => moveQuestion(questions.indexOf(q),1)}>↓ Bajar</button>
                    </span>}
                  </div>
                  <label>
                    Pregunta
                    <input
                      name="prompt"
                      defaultValue={q.prompt}
                      disabled={q.status === "SETTLED"}
                    />
                  </label>
                  <label>
                    Puntos
                    <input
                      name="points"
                      type="number"
                      min="0.5"
                      max="100"
                      step="0.5"
                      defaultValue={q.points_value}
                      disabled={q.status === "SETTLED"}
                    />
                  </label>
                  <label>
                    Estado
                    <select
                      name="status"
                      defaultValue={q.status}
                      disabled={q.status === "SETTLED"}
                    >
                      <option value="OPEN">Abierta</option>
                      <option value="CLOSED">Cerrada</option>
                      <option value="DISABLED">Desactivada</option>
                    </select>
                  </label>
                  {q.question_type !== "EXACT_SCORE" && <div className="question-option-editor">
                    <b>Respuestas y puntos</b>
                    {(optionDrafts[q.id] ?? []).map((option, index) => (
                      <div key={option.value_key}>
                        <input aria-label={`Respuesta ${index + 1}`} value={option.label} onChange={(event) => changeQuestionOption(q.id,index,"label",event.target.value)} disabled={q.status === "SETTLED"} required />
                        <input aria-label={`Puntos de respuesta ${index + 1}`} type="number" min="0.5" max="100" step="0.5" value={option.points_value} onChange={(event) => changeQuestionOption(q.id,index,"points_value",event.target.value)} disabled={q.status === "SETTLED"} required />
                        {q.status !== "SETTLED" && (q.question_type === "CUSTOM" || q.question_type === "GOAL_SCORER") && <button type="button" className="remove-option" disabled={(optionDrafts[q.id]?.length ?? 0) <= 2} onClick={() => removeQuestionOption(q.id,index)}><Trash2 /> Eliminar</button>}
                      </div>
                    ))}
                    {q.status !== "SETTLED" && (q.question_type === "CUSTOM" || q.question_type === "GOAL_SCORER") && <button type="button" className="add-option" onClick={() => addQuestionOption(q)}>+ Agregar opción</button>}
                    {(q.question_type === "CUSTOM" || q.question_type === "GOAL_SCORER") && <small>Se requieren al menos dos opciones. No podrás eliminar una respuesta que ya tenga predicciones.</small>}
                  </div>}
                  <div className="question-admin-actions">
                    {q.status !== "SETTLED" && (
                      <button className="secondary-small">Guardar</button>
                    )}
                    {q.status !== "SETTLED" && (q.question_type === "TOTAL_GOALS" || q.question_type === "FIRST_HALF_GOALS") && <>
                      <input className="result-input" type="number" min="0" step="1" placeholder="Goles reales" value={numericResults[q.id] ?? ""} onChange={(e) => setNumericResults((current) => ({ ...current, [q.id]: e.target.value }))} />
                      <button type="button" onClick={() => settle(q.id, [], Number(numericResults[q.id]))} disabled={!numericResults[q.id]}>Calcular resultado</button>
                    </>}
                    {q.status !== "SETTLED" && q.question_type === "EXACT_SCORE" && <>
                      <div className="admin-score-result"><input type="number" min="0" max="99" placeholder="Kuriyama" value={scoreResults[q.id]?.kuriyama ?? ""} onChange={(e) => setScoreResults((current) => ({ ...current, [q.id]: { kuriyama: e.target.value, opponent: current[q.id]?.opponent ?? "" } }))}/><b>–</b><input type="number" min="0" max="99" placeholder="Rival" value={scoreResults[q.id]?.opponent ?? ""} onChange={(e) => setScoreResults((current) => ({ ...current, [q.id]: { kuriyama: current[q.id]?.kuriyama ?? "", opponent: e.target.value } }))}/></div>
                      <button type="button" disabled={!scoreResults[q.id]?.kuriyama || !scoreResults[q.id]?.opponent} onClick={() => settle(q.id, [], undefined, false, { kuriyama_score: Number(scoreResults[q.id].kuriyama), opponent_score: Number(scoreResults[q.id].opponent) })}>Resolver marcador</button>
                    </>}
                    {q.status !== "SETTLED" && q.question_type !== "TOTAL_GOALS" && q.question_type !== "FIRST_HALF_GOALS" && q.question_type !== "EXACT_SCORE" && <>
                      <div className="settlement-options">
                        {q.options.map((option) => <button type="button" key={option.value_key} className={(settlementChoices[q.id] ?? []).includes(option.value_key) ? "selected-correct" : ""} onClick={() => toggleSettlement(q.id, option.value_key)}>{option.label}</button>)}
                      </div>
                      <button type="button" onClick={() => settle(q.id, settlementChoices[q.id] ?? [])}>Resolver seleccionadas</button>
                    </>}
                    {q.status !== "SETTLED" && <button type="button" onClick={() => settle(q.id, [], undefined, true)}>Anular</button>}
                    <button
                      type="button"
                      className="danger-small"
                      onClick={() => remove(q.id)}
                    >
                      <Trash2 /> Retirar
                    </button>
                  </div>
                  {q.status === "SETTLED" && (
                    <div className="settled-label">
                      <Check /> Pregunta resuelta y puntos calculados
                    </div>
                  )}
                </form>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              Este partido todavía no tiene preguntas.
            </div>
          )}
        </section>
        </>}
        {view === "predictions" && <section className="admin-card" id="predicciones">
          <h2>Predicciones realizadas</h2>
          <p className="admin-help">Elimina una predicción si fue registrada por error. El ranking se recalcula automáticamente.</p>
          <div className="admin-table prediction-admin-table">
            <div className="table-head"><span>Usuario</span><span>Partido / pregunta</span><span>Respuesta</span><span>Puntos</span><span>Acción</span></div>
            {predictions.map(p=><div key={p.id}><b>{p.name}</b><span>vs {p.opponent}<small>{p.prompt}</small></span><strong>{p.answer_label ?? (p.answer==='YES'?'SÍ':p.answer==='NO'?'NO':p.answer)}</strong><span>{p.status==='PENDING'?`±${fmt(p.points_snapshot)}`:`${p.points_awarded>0?'+':''}${fmt(p.points_awarded)}`}</span><div className="row-actions">{deletePrediction===p.id?<><button onClick={()=>setDeletePrediction('')}>Cancelar</button><button className="danger-small" onClick={()=>removePrediction(p.id)}>Confirmar</button></>:<button className="danger-small" onClick={()=>setDeletePrediction(p.id)}><Trash2/> Eliminar</button>}</div></div>)}
          </div>
        </section>}
        {view === "standings" && <section className="admin-card" id="posiciones">
          <h2>Editar tabla de posiciones</h2>
          <p className="admin-help">Los cambios guardados se muestran inmediatamente en la tabla pública.</p>
          <div className="standing-admin-list">
            {standings.map((row) => <form key={row.id} onSubmit={(event) => saveStanding(event,row.id)}>
              <label>Grupo<input name="group_name" required defaultValue={row.group_name}/></label>
              <label className="standing-team-field">Equipo<input name="team" required minLength={2} defaultValue={row.team}/></label>
              {standingFields.map(([field,label]) => <label key={field}>{label}<input name={field} type="number" defaultValue={row[field] ?? ""}/></label>)}
              <button>Guardar</button>
            </form>)}
          </div>
        </section>}
        {view === "moderation" && <section className="admin-card" id="moderacion">
          <h2>Moderación del ranking</h2>
          <p className="admin-help">Retira usuarios con nombres ofensivos; su historial queda anonimizado.</p>
          <div className="admin-table moderation-table">
            <div className="table-head"><span>Usuario</span><span>Puntos</span><span>Predicciones</span><span>Acción</span></div>
            {ranking.map(u=><div key={u.id}><b>{u.name}</b><span>{fmt(u.points)}</span><span>{u.total}</span><div className="row-actions">{moderateUser===u.id?<><button onClick={()=>setModerateUser('')}>Cancelar</button><button className="danger-small" onClick={()=>removeUser(u.id)}>Confirmar</button></>:<button className="danger-small" onClick={()=>setModerateUser(u.id)}><Trash2/> Retirar</button>}</div></div>)}
          </div>
        </section>}
      </main>
    </div>
  );
}

function AdminLogin() {
  const nav = useNavigate(),
    [password, setPassword] = useState(""),
    [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      await api("/admin/login", {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      nav("/admin/matches");
    } catch (x) {
      setError((x as Error).message);
    }
  }
  return (
    <main className="admin-login">
      <div className="welcome-logo">
        <b>KURI</b>
        <span>DOIT</span>
      </div>
      <Shield />
      <h1>Administración</h1>
      <form className="login-card" onSubmit={submit}>
        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="primary-button">ENTRAR</button>
      </form>
    </main>
  );
}

function Admin() {
  type AdminMarket = {
    id: string;
    match_id: string;
    market_type: string;
    title: string;
    line: number | null;
    status: string;
    option_id?: string;
    option_label?: string;
    line_value?: number | null;
    decimal_odds?: number;
  };
  type RankingUser = {
    id: string;
    name: string;
    points: number;
    won: number;
    lost: number;
    pending: number;
    total: number;
  };
  const nav = useNavigate(),
    [stats, setStats] = useState<Record<string, number>>(),
    [matches, setMatches] = useState<Match[]>([]),
    [picks, setPicks] = useState<Array<Pick & { name: string }>>([]),
    [ranking, setRanking] = useState<RankingUser[]>([]),
    [markets, setMarkets] = useState<AdminMarket[]>([]),
    [selectedMatch, setSelectedMatch] = useState(""),
    [selectedMarket, setSelectedMarket] = useState(""),
    [deleteMatchId, setDeleteMatchId] = useState(""),
    [moderateUserId, setModerateUserId] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  async function load() {
    try {
      const [nextStats, nextMatches, nextPicks, nextRanking] =
        await Promise.all([
          api<Record<string, number>>("/admin/dashboard"),
          api<Match[]>("/matches"),
          api<Array<Pick & { name: string }>>("/admin/picks"),
          api<RankingUser[]>("/leaderboard"),
        ]);
      setStats(nextStats);
      setMatches(nextMatches);
      setPicks(nextPicks);
      setRanking(nextRanking);
    } catch (e) {
      if ((e as Error).message === "No autorizado") nav("/admin/login");
      else setError((e as Error).message);
    }
  }
  async function loadMarkets(matchId: string) {
    setSelectedMatch(matchId);
    setSelectedMarket("");
    setMarkets(
      matchId
        ? await api<AdminMarket[]>(
            `/admin/markets?match_id=${encodeURIComponent(matchId)}`,
          )
        : [],
    );
  }
  useEffect(() => {
    load();
  }, []);
  async function addMatch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      f = new FormData(form);
    setError("");
    try {
      const created = await api<{ id: string }>("/admin/matches", {
        method: "POST",
        body: JSON.stringify({
          opponent: f.get("opponent"),
          kuriyama_side: f.get("side"),
          kickoff_at: new Date(String(f.get("kickoff"))).toISOString(),
          picks_close_at: new Date(String(f.get("close"))).toISOString(),
          status: "OPEN",
        }),
      });
      form.reset();
      await load();
      await loadMarkets(created.id);
      setNotice("Partido creado correctamente");
    } catch (x) {
      setError((x as Error).message);
    }
  }
  async function addMarket(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      f = new FormData(form);
    setError("");
    try {
      const created = await api<{ id: string }>("/admin/markets", {
        method: "POST",
        body: JSON.stringify({
          match_id: selectedMatch,
          market_type: f.get("type"),
          title: f.get("title"),
          line: f.get("line") ? Number(f.get("line")) : null,
          status: "OPEN",
        }),
      });
      form.reset();
      await loadMarkets(selectedMatch);
      setSelectedMarket(created.id);
      setNotice("Mercado creado correctamente");
    } catch (x) {
      setError((x as Error).message);
    }
  }
  async function addOption(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      f = new FormData(form);
    setError("");
    try {
      await api("/admin/options", {
        method: "POST",
        body: JSON.stringify({
          market_id: selectedMarket,
          label: f.get("label"),
          line_value: f.get("line") ? Number(f.get("line")) : null,
          decimal_odds: Number(f.get("odds")),
        }),
      });
      form.reset();
      await loadMarkets(selectedMatch);
      setNotice("Momio agregado correctamente");
    } catch (x) {
      setError((x as Error).message);
    }
  }
  async function removeMatch(id: string) {
    try {
      await api(`/admin/matches/${id}`, { method: "DELETE" });
      setDeleteMatchId("");
      if (selectedMatch === id) {
        setSelectedMatch("");
        setMarkets([]);
      }
      await load();
      setNotice("Partido eliminado");
    } catch (x) {
      setError((x as Error).message);
    }
  }
  async function moderateUser(id: string) {
    try {
      await api(`/admin/users/${id}`, { method: "DELETE" });
      setModerateUserId("");
      await load();
      setNotice("Usuario retirado del ranking");
    } catch (x) {
      setError((x as Error).message);
    }
  }
  async function logout() {
    await api("/admin/logout", { method: "POST" });
    nav("/admin/login");
  }
  const uniqueMarkets = Array.from(
    new Map(markets.map((m) => [m.id, m])).values(),
  );
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="wordmark">
          <b>KURI</b>
          <span>DOIT</span>
        </div>
        <small>ADMIN</small>
        <nav>
          <a className="active">Dashboard</a>
          <a href="#admin-matches">Partidos</a>
          <a href="#admin-markets">Mercados</a>
          <a href="#admin-picks">Picks</a>
          <a href="#admin-ranking">Ranking</a>
        </nav>
        <button onClick={logout}>
          <LogOut /> Cerrar sesión
        </button>
      </aside>
      <main className="admin-main">
        <div className="admin-mobile-head">
          <div className="wordmark">
            <b>KURI</b>
            <span>DOIT</span>
          </div>
          <button onClick={logout}>
            <LogOut />
          </button>
        </div>
        <span className="section-kicker">CENTRO DE CONTROL</span>
        <h1>Dashboard</h1>
        {error && <p className="error">{error}</p>}
        {notice && (
          <div className="admin-notice">
            <Check />
            {notice}
            <button onClick={() => setNotice("")}>
              <X />
            </button>
          </div>
        )}
        <div className="stats">
          {["users", "picks", "pending", "won", "lost"].map((k) => (
            <article key={k}>
              <span>
                {
                  (
                    {
                      users: "Usuarios",
                      picks: "Picks",
                      pending: "Pendientes",
                      won: "Ganados",
                      lost: "Perdidos",
                    } as Record<string, string>
                  )[k]
                }
              </span>
              <b>{stats?.[k] ?? "—"}</b>
            </article>
          ))}
        </div>
        <section className="admin-card" id="admin-matches">
          <h2>Nuevo partido</h2>
          <form className="admin-form" onSubmit={addMatch}>
            <label>
              Rival
              <input name="opponent" required minLength={2} />
            </label>
            <label>
              Sede
              <select name="side">
                <option value="HOME">Local</option>
                <option value="AWAY">Visitante</option>
              </select>
            </label>
            <label>
              Inicio
              <input name="kickoff" type="datetime-local" required />
            </label>
            <label>
              Cierre picks
              <input name="close" type="datetime-local" required />
            </label>
            <button className="primary-button">CREAR PARTIDO</button>
          </form>
        </section>
        <section className="admin-card">
          <h2>Partidos</h2>
          <div className="admin-table match-admin-table">
            <div className="table-head">
              <span>Partido</span>
              <span>Fecha</span>
              <span>Estado</span>
              <span>Acciones</span>
            </div>
            {matches.map((m) => (
              <div key={m.id}>
                <b>Kuriyama vs {m.opponent}</b>
                <span>{date(m.kickoff_at)}</span>
                <StatusBadge status={m.status} />
                <div className="row-actions">
                  <button onClick={() => loadMarkets(m.id)}>Momios</button>
                  {deleteMatchId === m.id ? (
                    <>
                      <button onClick={() => setDeleteMatchId("")}>
                        Cancelar
                      </button>
                      <button
                        className="danger-small"
                        onClick={() => removeMatch(m.id)}
                      >
                        Confirmar
                      </button>
                    </>
                  ) : (
                    <button
                      className="danger-small"
                      onClick={() => setDeleteMatchId(m.id)}
                    >
                      <Trash2 />
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="admin-card" id="admin-markets">
          <h2>Mercados y momios</h2>
          <label className="admin-select">
            Partido
            <select
              value={selectedMatch}
              onChange={(e) => loadMarkets(e.target.value)}
            >
              <option value="">Selecciona un partido</option>
              {matches.map((m) => (
                <option key={m.id} value={m.id}>
                  Kuriyama vs {m.opponent} · {date(m.kickoff_at)}
                </option>
              ))}
            </select>
          </label>
          {selectedMatch && (
            <div className="market-admin-grid">
              <form className="admin-form compact-form" onSubmit={addMarket}>
                <h3>1. Crear mercado</h3>
                <label>
                  Tipo
                  <select name="type">
                    <option value="MONEYLINE">Ganador</option>
                    <option value="BOTH_SCORE">Ambos anotan</option>
                    <option value="TOTAL_GOALS">Total de goles</option>
                    <option value="ASIAN_HANDICAP">Handicap asiático</option>
                    <option value="TOTAL_CORNERS">Total de corners</option>
                  </select>
                </label>
                <label>
                  Título
                  <input
                    name="title"
                    placeholder="Ej. Total de goles 2.5"
                    required
                  />
                </label>
                <label>
                  Línea opcional
                  <input name="line" type="number" step="0.5" />
                </label>
                <button className="primary-button">CREAR MERCADO</button>
              </form>
              <form className="admin-form compact-form" onSubmit={addOption}>
                <h3>2. Agregar selección y momio</h3>
                <label>
                  Mercado
                  <select
                    value={selectedMarket}
                    onChange={(e) => setSelectedMarket(e.target.value)}
                    required
                  >
                    <option value="">Selecciona un mercado</option>
                    {uniqueMarkets.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Selección
                  <input name="label" placeholder="Ej. Over 2.5" required />
                </label>
                <label>
                  Línea opcional
                  <input name="line" type="number" step="0.5" />
                </label>
                <label>
                  Momio decimal
                  <input
                    name="odds"
                    type="number"
                    min="1"
                    max="1000"
                    step="0.01"
                    placeholder="1.85"
                    required
                  />
                </label>
                <button className="primary-button" disabled={!selectedMarket}>
                  AGREGAR MOMIO
                </button>
              </form>
            </div>
          )}
          {selectedMatch && (
            <div className="configured-markets">
              {uniqueMarkets.length ? (
                uniqueMarkets.map((m) => (
                  <article key={m.id}>
                    <b>{m.title}</b>
                    <small>{m.market_type}</small>
                    <div>
                      {markets
                        .filter((o) => o.id === m.id && o.option_id)
                        .map((o) => (
                          <span key={o.option_id}>
                            {o.option_label}
                            <strong>{fmt(o.decimal_odds!)}</strong>
                          </span>
                        ))}
                    </div>
                  </article>
                ))
              ) : (
                <div className="empty-state">
                  Este partido todavía no tiene mercados.
                </div>
              )}
            </div>
          )}
        </section>
        <section className="admin-card" id="admin-picks">
          <h2>Últimos picks</h2>
          <div className="admin-table picks-table">
            <div className="table-head">
              <span>Usuario</span>
              <span>Mercado / Pick</span>
              <span>Momio</span>
              <span>Estado</span>
            </div>
            {picks.slice(0, 20).map((p) => (
              <div key={p.id}>
                <b>{p.name}</b>
                <span>
                  {p.market_title} · {p.option_label}
                </span>
                <strong>{fmt(p.odds_snapshot)}</strong>
                <StatusBadge status={p.status} />
              </div>
            ))}
          </div>
        </section>
        <section className="admin-card" id="admin-ranking">
          <h2>Moderación del ranking</h2>
          <p className="admin-help">
            Retira nombres ofensivos. Los picks históricos permanecen
            anonimizados.
          </p>
          <div className="admin-table moderation-table">
            <div className="table-head">
              <span>Usuario</span>
              <span>Puntos</span>
              <span>Picks</span>
              <span>Acción</span>
            </div>
            {ranking.map((u) => (
              <div key={u.id}>
                <b>{u.name}</b>
                <span>{fmt(u.points)}</span>
                <span>{u.total}</span>
                <div className="row-actions">
                  {moderateUserId === u.id ? (
                    <>
                      <button onClick={() => setModerateUserId("")}>
                        Cancelar
                      </button>
                      <button
                        className="danger-small"
                        onClick={() => moderateUser(u.id)}
                      >
                        Confirmar
                      </button>
                    </>
                  ) : (
                    <button
                      className="danger-small"
                      onClick={() => setModerateUserId(u.id)}
                    >
                      <Trash2 />
                      Retirar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

void Admin;

export default function App() {
  return (
    <Routes>
      <Route path="/welcome" element={<Welcome />} />
      <Route path="/predictions" element={<Home view="predictions" />} />
      <Route path="/matches/history" element={<Home view="history" />} />
      <Route path="/ranking" element={<Ranking />} />
      <Route path="/standings" element={<StandingsPage />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/matches" element={<AdminQuestions view="matches" />} />
      <Route path="/admin/questions" element={<AdminQuestions view="questions" />} />
      <Route path="/admin/predictions" element={<AdminQuestions view="predictions" />} />
      <Route path="/admin/moderation" element={<AdminQuestions view="moderation" />} />
      <Route path="/admin/standings" element={<AdminQuestions view="standings" />} />
      <Route path="/admin" element={<Navigate to="/admin/matches" replace />} />
      <Route path="*" element={<Home view="matches" />} />
    </Routes>
  );
}
