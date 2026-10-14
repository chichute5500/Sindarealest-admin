CREATE TABLE IF NOT EXISTS ai_request_limits (
  scope TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0)
);
