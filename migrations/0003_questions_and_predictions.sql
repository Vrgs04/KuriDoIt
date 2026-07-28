CREATE TABLE questions (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL CHECK(length(prompt) BETWEEN 5 AND 240),
  points_value REAL NOT NULL CHECK(points_value > 0 AND points_value <= 100),
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','CLOSED','SETTLED','DISABLED')),
  correct_answer TEXT CHECK(correct_answer IN ('YES','NO','VOID')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  settled_at TEXT
);

CREATE TABLE predictions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  match_id TEXT NOT NULL REFERENCES matches(id),
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  answer TEXT NOT NULL CHECK(answer IN ('YES','NO')),
  points_snapshot REAL NOT NULL CHECK(points_snapshot > 0),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','CORRECT','INCORRECT','VOID')),
  points_awarded REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  settled_at TEXT,
  UNIQUE(user_id, question_id)
);

CREATE INDEX idx_questions_match_status ON questions(match_id, status);
CREATE INDEX idx_predictions_user_match ON predictions(user_id, match_id);
CREATE INDEX idx_predictions_question ON predictions(question_id, status);
CREATE INDEX idx_predictions_ranking ON predictions(status, points_awarded);
