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
  UNIQUE(user_id, question_id, answer)
);

INSERT INTO predictions_new
SELECT id,user_id,match_id,question_id,answer,points_snapshot,status,points_awarded,
       created_at,updated_at,settled_at
FROM predictions;

DROP TABLE predictions;
ALTER TABLE predictions_new RENAME TO predictions;

CREATE INDEX idx_predictions_user_match ON predictions(user_id, match_id);
CREATE INDEX idx_predictions_question ON predictions(question_id, status);
CREATE INDEX idx_predictions_ranking ON predictions(status, points_awarded);
