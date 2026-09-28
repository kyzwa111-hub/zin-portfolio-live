CREATE TABLE IF NOT EXISTS mobile_login_codes (
  code_hash TEXT PRIMARY KEY NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS mobile_login_codes_expiry_idx
  ON mobile_login_codes(expires_at);

CREATE TABLE IF NOT EXISTS mobile_sessions (
  session_id TEXT PRIMARY KEY NOT NULL,
  access_token_hash TEXT NOT NULL UNIQUE,
  access_expires_at INTEGER NOT NULL,
  refresh_token_hash TEXT NOT NULL UNIQUE,
  refresh_expires_at INTEGER NOT NULL,
  revoked_at INTEGER,
  created_at INTEGER NOT NULL,
  last_used_at INTEGER
);

CREATE INDEX IF NOT EXISTS mobile_sessions_expiry_idx
  ON mobile_sessions(refresh_expires_at, revoked_at);
