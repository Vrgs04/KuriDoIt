ALTER TABLE users ADD COLUMN access_token_hash TEXT;
ALTER TABLE users ADD COLUMN deleted_at TEXT;
CREATE INDEX idx_users_active_ranking ON users(deleted_at, created_at);
