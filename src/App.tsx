import { useEffect, useState, type FormEvent, type ReactNode } from "react";
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
} from "./api";

const fmt = (n: number) => Number(n).toFixed(2);
const date = (s: string) =>
  new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(s));
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
  return (
    <>
      <header className="sports-header">
        <button className="mobile-menu" aria-label="Abrir menú">
          <Menu />
        </button>
        <NavLink to="/" className="wordmark">
          <b>KURI</b>
          <span>DOIT</span>
        </NavLink>
        <nav className="desktop-nav">
          <NavLink to="/">Inicio</NavLink>
          <a href="#markets">Partidos</a>
          <NavLink to="/ranking">Ranking</NavLink>
          <NavLink to="/admin/login">Admin</NavLink>
        </nav>
        {user ? (
          <AccountMenu user={user} onChange={onChange} />
        ) : (
          <UserRound className="user-icon" />
        )}
      </header>
      <div className="sports-nav">
        <span className="ball">●</span>
        <b>Fútbol</b>
        <a href="#markets">Próximos partidos</a>
        <a href="#my-picks">Mis Picks</a>
      </div>
    </>
  );
}

function MobileBottomNav() {
  return (
    <nav className="bottom-nav">
      <NavLink to="/">
        <HomeIcon />
        <span>Inicio</span>
      </NavLink>
      <a href="/#my-picks">
        <Target />
        <span>Picks</span>
      </a>
      <NavLink to="/ranking">
        <Trophy />
        <span>Ranking</span>
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
            {match.kuriyama_side === "HOME" ? "KURIYAMA" : match.opponent}
          </strong>
          <small>
            {match.kuriyama_side === "HOME" ? "LOCAL" : "VISITANTE"}
          </small>
        </div>
        <i>VS</i>
        <div>
          <strong>
            {match.kuriyama_side === "HOME" ? match.opponent : "KURIYAMA"}
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
  return (
    <section id="my-picks" className="content-section">
      <div className="title-row">
        <div>
          <span className="section-kicker">HISTORIAL</span>
          <h2>Mis predicciones</h2>
        </div>
      </div>
      {predictions.length ? (
        <div className="prediction-history">
          {predictions.map((p) => (
            <article key={p.id}>
              <div>
                <b>KURIYAMA VS {p.opponent.toUpperCase()}</b>
                <small>{date(p.kickoff_at)}</small>
              </div>
              <p>{p.prompt}</p>
              <strong className={`answer answer-${p.answer.toLowerCase()}`}>
                {p.answer === "YES" ? "SÍ" : "NO"}
              </strong>
              <StatusBadge status={p.status} />
              <em className={p.points_awarded < 0 ? "negative" : ""}>
                {p.status === "PENDING"
                  ? `±${fmt(p.points_snapshot)}`
                  : `${p.points_awarded > 0 ? "+" : ""}${fmt(p.points_awarded)}`}{" "}
                pts
              </em>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">Tus predicciones aparecerán aquí.</div>
      )}
    </section>
  );
}

function Welcome() {
  const nav = useNavigate(),
    [name, setName] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
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
      <p>Compite con tus compañeros y demuestra cuánto sabes de fútbol.</p>
      <form onSubmit={submit} className="login-card">
        <label>
          ¿Cómo te llamas?
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre"
            minLength={2}
            maxLength={80}
          />
        </label>
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

function Home() {
  const [user, setUser] = useState<UserIdentity | null>(() =>
    JSON.parse(localStorage.getItem("kuri_user") || "null"),
  );
  const [matches, setMatches] = useState<Match[]>(),
    [selectedId, setSelectedId] = useState(""),
    [questions, setQuestions] = useState<Question[]>([]),
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
      const open = await api<Match[]>("/matches/open");
      setMatches(open);
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
    api<Question[]>(`/questions/${selectedId}?user_id=${user.id}`, {
      headers: { Authorization: `Bearer ${user.token}` },
    })
      .then(setQuestions)
      .catch((e) => setMsg(e.message));
  }, [selectedId, user]);
  if (!user) return <Navigate to="/welcome" />;
  async function answer(question: Question, value: "YES" | "NO") {
    if (!user.token) return;
    try {
      await api("/predictions", {
        method: "POST",
        headers: { Authorization: `Bearer ${user.token}` },
        body: JSON.stringify({
          user_id: user.id,
          question_id: question.id,
          answer: value,
        }),
      });
      setQuestions((current) =>
        current.map((q) =>
          q.id === question.id
            ? { ...q, prediction_answer: value, prediction_status: "PENDING" }
            : q,
        ),
      );
      setPredictions(
        await api<Prediction[]>(`/users/${user.id}/predictions`, {
          headers: { Authorization: `Bearer ${user.token}` },
        }),
      );
      setMsg("PREDICCIÓN GUARDADA");
    } catch (e) {
      setMsg((e as Error).message);
    }
  }
  return (
    <Shell>
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
                <b>{m.opponent}</b>
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
            {questions.length ? (
              <div className="question-list">
                {questions.map((q, i) => (
                  <article key={q.id}>
                    <div className="question-number">{i + 1}</div>
                    <div className="question-copy">
                      <b>{q.prompt}</b>
                      <span>
                        Valor: <strong>±{fmt(q.points_value)} puntos</strong>
                      </span>
                    </div>
                    <div className="binary-answers">
                      <button
                        className={
                          q.prediction_answer === "YES" ? "selected yes" : ""
                        }
                        onClick={() => answer(q, "YES")}
                      >
                        <Check /> Sí
                      </button>
                      <button
                        className={
                          q.prediction_answer === "NO" ? "selected no" : ""
                        }
                        onClick={() => answer(q, "NO")}
                      >
                        <X /> No
                      </button>
                    </div>
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
      <PredictionHistory predictions={predictions} />
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
        `/users/${id}/predictions`,
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
                    <strong>{p.answer === "YES" ? "SÍ" : "NO"}</strong>
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
                  <Clock3 /> Las predicciones aparecen 30 minutos antes del
                  partido.
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

function AdminQuestions() {
  type AdminQuestion = Question & {
    correct_answer?: "YES" | "NO" | "VOID";
    settled_at?: string;
  };
  type AdminPrediction = Prediction & { name: string };
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
    [predictions, setPredictions] = useState<AdminPrediction[]>([]),
    [ranking, setRanking] = useState<RankingUser[]>([]),
    [deleteMatch, setDeleteMatch] = useState(""),
    [deletePrediction, setDeletePrediction] = useState(""),
    [moderateUser, setModerateUser] = useState(""),
    [notice, setNotice] = useState(""),
    [error, setError] = useState("");
  async function loadQuestions(matchId: string) {
    setSelected(matchId);
    setQuestions(
      matchId
        ? await api<AdminQuestion[]>(
            `/admin/questions?match_id=${encodeURIComponent(matchId)}`,
          )
        : [],
    );
  }
  async function refresh() {
    const [matchList, predictionList, rankingList] = await Promise.all([
      api<Match[]>("/matches"),
      api<AdminPrediction[]>("/admin/predictions"),
      api<RankingUser[]>("/leaderboard"),
    ]);
    setMatches(matchList);
    setPredictions(predictionList);
    setRanking(rankingList);
    return matchList;
  }
  useEffect(() => {
    refresh()
      .then((list) => {
        if (list[0]) loadQuestions(list[0].id);
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
  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      f = new FormData(form);
    try {
      await api("/admin/questions", {
        method: "POST",
        body: JSON.stringify({
          match_id: selected,
          prompt: f.get("prompt"),
          points_value: Number(f.get("points")),
          status: "OPEN",
        }),
      });
      form.reset();
      await loadQuestions(selected);
      setNotice("Pregunta creada correctamente");
    } catch (x) {
      setError((x as Error).message);
    }
  }
  async function update(e: FormEvent<HTMLFormElement>, q: AdminQuestion) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await api(`/admin/questions/${q.id}`, {
        method: "PUT",
        body: JSON.stringify({
          match_id: q.match_id,
          prompt: f.get("prompt"),
          points_value: Number(f.get("points")),
          status: f.get("status"),
        }),
      });
      await loadQuestions(selected);
      setNotice("Pregunta actualizada");
    } catch (x) {
      setError((x as Error).message);
    }
  }
  async function settle(id: string, answer: "YES" | "NO" | "VOID") {
    try {
      await api("/admin/questions/settle", {
        method: "POST",
        body: JSON.stringify({ question_id: id, correct_answer: answer }),
      });
      await loadQuestions(selected);
      setNotice("Pregunta resuelta y puntos calculados");
    } catch (x) {
      setError((x as Error).message);
    }
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
          <a href="#partidos">Partidos</a>
          <a href="#preguntas">Preguntas</a>
          <a href="#predicciones">Predicciones</a>
          <a href="#moderacion">Moderación</a>
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
        <span className="section-kicker">PREDICCIONES</span>
        <h1>Panel de predicciones</h1>
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
            <div className="table-head"><span>Partido</span><span>Fecha</span><span>Estado</span><span>Acciones</span></div>
            {matches.map(m=><div key={m.id}><b>Kuriyama vs {m.opponent}</b><span>{date(m.kickoff_at)}</span><StatusBadge status={m.status}/><div className="row-actions"><button onClick={()=>loadQuestions(m.id)}>Preguntas</button>{deleteMatch===m.id?<><button onClick={()=>setDeleteMatch('')}>Cancelar</button><button className="danger-small" onClick={()=>removeMatch(m.id)}>Confirmar</button></>:<button className="danger-small" onClick={()=>setDeleteMatch(m.id)}><Trash2/> Eliminar</button>}</div></div>)}
          </div>
        </section>
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
            <form className="question-admin-form" onSubmit={create}>
              <label>
                Pregunta o sentencia
                <textarea
                  name="prompt"
                  minLength={5}
                  maxLength={240}
                  placeholder="Ej. ¿Habrá 4 o más goles?"
                  required
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
                  placeholder="+3"
                  required
                />
              </label>
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
                  <div className="question-admin-actions">
                    {q.status !== "SETTLED" && (
                      <button className="secondary-small">Guardar</button>
                    )}
                    <button
                      type="button"
                      className="settle-yes"
                      onClick={() => settle(q.id, "YES")}
                    >
                      Correcta: Sí
                    </button>
                    <button
                      type="button"
                      className="settle-no"
                      onClick={() => settle(q.id, "NO")}
                    >
                      Correcta: No
                    </button>
                    <button type="button" onClick={() => settle(q.id, "VOID")}>
                      Anular
                    </button>
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
                      <Check /> Resuelta:{" "}
                      {q.correct_answer === "YES"
                        ? "SÍ"
                        : q.correct_answer === "NO"
                          ? "NO"
                          : "ANULADA"}
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
        <section className="admin-card" id="predicciones">
          <h2>Predicciones realizadas</h2>
          <p className="admin-help">Elimina una predicción si fue registrada por error. El ranking se recalcula automáticamente.</p>
          <div className="admin-table prediction-admin-table">
            <div className="table-head"><span>Usuario</span><span>Partido / pregunta</span><span>Respuesta</span><span>Puntos</span><span>Acción</span></div>
            {predictions.map(p=><div key={p.id}><b>{p.name}</b><span>vs {p.opponent}<small>{p.prompt}</small></span><strong>{p.answer==='YES'?'SÍ':'NO'}</strong><span>{p.status==='PENDING'?`±${fmt(p.points_snapshot)}`:`${p.points_awarded>0?'+':''}${fmt(p.points_awarded)}`}</span><div className="row-actions">{deletePrediction===p.id?<><button onClick={()=>setDeletePrediction('')}>Cancelar</button><button className="danger-small" onClick={()=>removePrediction(p.id)}>Confirmar</button></>:<button className="danger-small" onClick={()=>setDeletePrediction(p.id)}><Trash2/> Eliminar</button>}</div></div>)}
          </div>
        </section>
        <section className="admin-card" id="moderacion">
          <h2>Moderación del ranking</h2>
          <p className="admin-help">Retira usuarios con nombres ofensivos; su historial queda anonimizado.</p>
          <div className="admin-table moderation-table">
            <div className="table-head"><span>Usuario</span><span>Puntos</span><span>Predicciones</span><span>Acción</span></div>
            {ranking.map(u=><div key={u.id}><b>{u.name}</b><span>{fmt(u.points)}</span><span>{u.total}</span><div className="row-actions">{moderateUser===u.id?<><button onClick={()=>setModerateUser('')}>Cancelar</button><button className="danger-small" onClick={()=>removeUser(u.id)}>Confirmar</button></>:<button className="danger-small" onClick={()=>setModerateUser(u.id)}><Trash2/> Retirar</button>}</div></div>)}
          </div>
        </section>
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
      nav("/admin/questions");
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
      <Route path="/ranking" element={<Ranking />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/questions" element={<AdminQuestions />} />
      <Route path="/admin" element={<AdminQuestions />} />
      <Route path="*" element={<Home />} />
    </Routes>
  );
}
