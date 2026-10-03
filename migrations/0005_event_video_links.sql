CREATE TABLE IF NOT EXISTS event_video_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url_hash TEXT NOT NULL UNIQUE,
  video_url TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'other',
  title TEXT,
  creator_name TEXT,
  license_name TEXT,
  rights_status TEXT NOT NULL DEFAULT 'public',
  review_status TEXT NOT NULL DEFAULT 'pending',
  source_kind TEXT NOT NULL DEFAULT 'search_api',
  source_query TEXT,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS event_video_links_public_idx
  ON event_video_links(source_kind, review_status, last_seen_at);
