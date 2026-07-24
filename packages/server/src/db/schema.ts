/**
 * SQLite database schema and initialization.
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_FILENAME = 'gitlens.db';

let _db: Database.Database | null = null;

/**
 * Get or create the SQLite database connection.
 * Data is stored in the project root by default.
 */
export function getDb(dataDir?: string): Database.Database {
  if (_db) return _db;

  const dir = dataDir || process.cwd();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const dbPath = path.join(dir, DB_FILENAME);
  _db = new Database(dbPath);

  // Performance pragmas
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  initSchema(_db);

  return _db;
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS repos (
      id TEXT PRIMARY KEY,
      path TEXT NOT NULL UNIQUE,
      head_hash TEXT NOT NULL,
      total_commits INTEGER NOT NULL DEFAULT 0,
      total_files INTEGER NOT NULL DEFAULT 0,
      date_start TEXT NOT NULL,
      date_end TEXT NOT NULL,
      result_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS analyses (
      id TEXT PRIMARY KEY,
      repo_id TEXT NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending',
      progress REAL NOT NULL DEFAULT 0,
      error_message TEXT,
      options_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      finished_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_repos_path ON repos(path);
    CREATE INDEX IF NOT EXISTS idx_analyses_repo ON analyses(repo_id);
  `);
}

/**
 * Close the database connection (for graceful shutdown).
 */
export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}
