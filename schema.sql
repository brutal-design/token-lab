-- Token Lab: збережені палітри для коротких посилань /p/:id
CREATE TABLE IF NOT EXISTS palettes (
  id         TEXT PRIMARY KEY,
  hex        TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
