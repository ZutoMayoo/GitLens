/**
 * Cache service — stores and retrieves analysis results from SQLite.
 * Uses repo path + HEAD hash as cache key.
 */

import { getDb } from '../db/schema.js';
import type { AnalysisResult } from '@gitlens/engine';
import { v4 as uuid } from 'uuid';

export interface CachedRepo {
  id: string;
  path: string;
  headHash: string;
  totalCommits: number;
  totalFiles: number;
  dateStart: string;
  dateEnd: string;
  createdAt: string;
}

export interface CachedAnalysis {
  id: string;
  repoId: string;
  status: 'pending' | 'running' | 'done' | 'error';
  progress: number;
  errorMessage?: string;
  createdAt: string;
  finishedAt?: string;
}

/**
 * Look up a cached analysis result by repo path and HEAD hash.
 * Returns the parsed result if found and still valid.
 */
export function getCachedResult(
  repoPath: string,
  headHash: string
): AnalysisResult | null {
  const db = getDb();
  const row = db
    .prepare(
      'SELECT result_json FROM repos WHERE path = ? AND head_hash = ? ORDER BY updated_at DESC LIMIT 1'
    )
    .get(repoPath, headHash) as { result_json: string } | undefined;

  if (!row) return null;

  try {
    const result = JSON.parse(row.result_json) as AnalysisResult;
    // Revive date strings back to Date objects
    result.dateRange.start = new Date(result.dateRange.start);
    result.dateRange.end = new Date(result.dateRange.end);
    for (const c of result.commits) {
      c.date = new Date(c.date);
    }
    for (const a of result.authors) {
      a.firstCommit = new Date(a.firstCommit);
      a.lastCommit = new Date(a.lastCommit);
    }
    return result;
  } catch {
    return null;
  }
}

/**
 * Store an analysis result in the cache.
 */
export function cacheResult(result: AnalysisResult): string {
  const db = getDb();
  const id = uuid();

  // Serialize dates
  const json = JSON.stringify(result);

  db.prepare(
    `INSERT OR REPLACE INTO repos (id, path, head_hash, total_commits, total_files, date_start, date_end, result_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    result.repoPath,
    result.headHash,
    result.totalCommits,
    result.totalFiles,
    result.dateRange.start.toISOString(),
    result.dateRange.end.toISOString(),
    json
  );

  return id;
}

/**
 * Create an analysis job record.
 */
export function createAnalysis(
  repoPath: string,
  optionsJson?: string
): CachedAnalysis {
  const db = getDb();
  const id = uuid();

  // Find existing repo or create placeholder
  let existing = db
    .prepare('SELECT id FROM repos WHERE path = ?')
    .get(repoPath) as { id: string } | undefined;

  let repoId: string;

  if (existing) {
    repoId = existing.id;
  } else {
    // Create a placeholder repo record (will be updated after analysis)
    repoId = uuid();
    db.prepare(
      `INSERT INTO repos (id, path, head_hash, total_commits, total_files, date_start, date_end, result_json)
       VALUES (?, ?, '', 0, 0, datetime('now'), datetime('now'), '{}')`
    ).run(repoId, repoPath);
  }

  db.prepare(
    `INSERT INTO analyses (id, repo_id, status, options_json)
     VALUES (?, ?, 'pending', ?)`
  ).run(id, repoId, optionsJson || null);

  return {
    id,
    repoId,
    status: 'pending',
    progress: 0,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Update analysis job status.
 */
export function updateAnalysis(
  id: string,
  updates: { status?: string; progress?: number; errorMessage?: string }
): void {
  const db = getDb();
  const sets: string[] = [];
  const params: any[] = [];

  if (updates.status !== undefined) {
    sets.push('status = ?');
    params.push(updates.status);
  }
  if (updates.progress !== undefined) {
    sets.push('progress = ?');
    params.push(updates.progress);
  }
  if (updates.errorMessage !== undefined) {
    sets.push('error_message = ?');
    params.push(updates.errorMessage);
  }
  if (updates.status === 'done' || updates.status === 'error') {
    sets.push("finished_at = datetime('now')");
  }

  sets.push("updated_at = datetime('now')");

  params.push(id);
  db.prepare(`UPDATE analyses SET ${sets.join(', ')} WHERE id = ?`).run(
    ...params
  );
}

/**
 * List all cached repositories.
 */
export function listCachedRepos(): CachedRepo[] {
  const db = getDb();
  return db
    .prepare(
      'SELECT id, path, head_hash, total_commits, total_files, date_start, date_end, created_at FROM repos ORDER BY updated_at DESC'
    )
    .all() as CachedRepo[];
}

/**
 * Get a cached repo by ID.
 */
export function getCachedRepo(id: string): CachedRepo | null {
  const db = getDb();
  return (
    (db
      .prepare(
        'SELECT id, path, head_hash, total_commits, total_files, date_start, date_end, created_at FROM repos WHERE id = ?'
      )
      .get(id) as CachedRepo) || null
  );
}
