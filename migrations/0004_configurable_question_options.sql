ALTER TABLE questions ADD COLUMN question_type TEXT NOT NULL DEFAULT 'CUSTOM'
  CHECK(question_type IN ('CUSTOM','TOTAL_GOALS','FIRST_HALF_GOALS','GOAL_SCORER'));

CREATE TABLE question_options (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  value_key TEXT NOT NULL,
  label TEXT NOT NULL CHECK(length(label) BETWEEN 1 AND 100),
  points_value REAL NOT NULL CHECK(points_value > 0 AND points_value <= 100),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(question_id, value_key)
);

-- Keep every existing Sí/No question working without changing old predictions.
INSERT INTO question_options(id, question_id, value_key, label, points_value, sort_order)
SELECT lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' ||
       substr(lower(hex(randomblob(2))),2) || '-' ||
       substr('89ab',abs(random()) % 4 + 1,1) ||
       substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))),
       id, 'YES', 'Sí', points_value, 0
FROM questions;

INSERT INTO question_options(id, question_id, value_key, label, points_value, sort_order)
SELECT lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' ||
       substr(lower(hex(randomblob(2))),2) || '-' ||
       substr('89ab',abs(random()) % 4 + 1,1) ||
       substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))),
       id, 'NO', 'No', points_value, 1
FROM questions;

CREATE TABLE predictions_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  match_id TEXT NOT NULL REFERENCES matches(id),
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  answer TEXT NOT NULL,
  points_snapshot REAL NOT NULL CHECK(points_snapshot > 0),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','CORRECT','INCORRECT','VOID')),
  points_awarded REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  settled_at TEXT,
  UNIQUE(user_id, question_id)
);

INSERT INTO predictions_new
SELECT id,user_id,match_id,question_id,answer,points_snapshot,status,points_awarded,
       created_at,updated_at,settled_at
FROM predictions;

DROP TABLE predictions;
ALTER TABLE predictions_new RENAME TO predictions;

CREATE INDEX idx_question_options_question ON question_options(question_id, sort_order);
CREATE INDEX idx_predictions_user_match ON predictions(user_id, match_id);
CREATE INDEX idx_predictions_question ON predictions(question_id, status);
CREATE INDEX idx_predictions_ranking ON predictions(status, points_awarded);
