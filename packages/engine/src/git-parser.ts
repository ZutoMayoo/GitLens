/**
 * Git log parser — reads commit history from a local repository.
 *
 * Uses a fast two-pass approach:
 *   Pass 1: --name-only (only file paths, no line counts — much faster than --numstat)
 *   Pass 2: --numstat is available via parseGitLogDetailed() for when line stats are needed
 */

import { simpleGit } from 'simple-git';
import type { Commit, FileChange, Author, ProgressCallback } from './types.js';

export interface ParseOptions {
  repoPath: string;
  maxCommits?: number;
  onProgress?: ProgressCallback;
}

/**
 * Fast parse — uses --name-only to get file lists without computing line counts.
 * This is 5-10x faster than --numstat on large repos.
 */
export async function parseGitLog(options: ParseOptions): Promise<{
  commits: Commit[];
  authors: Author[];
  headHash: string;
}> {
  const { repoPath, maxCommits = 200, onProgress } = options;
  const git = simpleGit(repoPath);

  onProgress?.({ phase: 'parsing', message: 'Checking repository...', progress: 0 });

  const isRepo = await git.checkIsRepo();
  if (!isRepo) {
    throw new Error(`Not a git repository: ${repoPath}`);
  }

  const headHash = (await git.revparse(['HEAD'])).trim();
  if (!headHash) {
    throw new Error(`Repository has no commits: ${repoPath}`);
  }

  onProgress?.({ phase: 'parsing', message: `Reading up to ${maxCommits} commits...`, progress: 0.15 });

  // ── Fast path: --name-only (files only, no line counts) ──
  const logOutput = await git.raw([
    'log',
    `-${maxCommits}`,
    '--all',
    '--pretty=format:__COMMIT__%H%x00%h%x00%an%x00%ae%x00%aI%x00%s',
    '--name-only',  // much faster than --numstat
  ]);

  onProgress?.({ phase: 'parsing', message: 'Parsing commit data...', progress: 0.6 });

  const commits = parseRawLog(logOutput);
  const authors = aggregateAuthors(commits);

  onProgress?.({
    phase: 'parsing',
    message: `Parsed ${commits.length} commits from ${authors.length} authors`,
    progress: 1.0,
  });

  return { commits, authors, headHash };
}

/**
 * Detailed parse — uses --numstat for full line counts.
 * Use this only when you need +/− line statistics (e.g., for detailed reports).
 * This is slower than the fast path.
 */
export async function parseGitLogDetailed(options: ParseOptions): Promise<{
  commits: Commit[];
  authors: Author[];
  headHash: string;
}> {
  const { repoPath, maxCommits = 200, onProgress } = options;
  const git = simpleGit(repoPath);

  onProgress?.({ phase: 'parsing', message: 'Checking repository...', progress: 0 });

  const isRepo = await git.checkIsRepo();
  if (!isRepo) {
    throw new Error(`Not a git repository: ${repoPath}`);
  }

  const headHash = (await git.revparse(['HEAD'])).trim();
  if (!headHash) {
    throw new Error(`Repository has no commits: ${repoPath}`);
  }

  onProgress?.({ phase: 'parsing', message: `Reading up to ${maxCommits} commits (with line stats)...`, progress: 0.1 });

  // ── Detailed path: --numstat for full line counts ──
  const logOutput = await git.raw([
    'log',
    `-${maxCommits}`,
    '--all',
    '--pretty=format:__COMMIT__%H%x00%h%x00%an%x00%ae%x00%aI%x00%s',
    '--numstat',
  ]);

  onProgress?.({ phase: 'parsing', message: 'Parsing commit data...', progress: 0.5 });

  const commits = parseDetailedLog(logOutput);
  const authors = aggregateAuthors(commits);

  onProgress?.({
    phase: 'parsing',
    message: `Parsed ${commits.length} commits from ${authors.length} authors`,
    progress: 1.0,
  });

  return { commits, authors, headHash };
}

/**
 * Parse --name-only output (file paths only, no line stats).
 */
function parseRawLog(raw: string): Commit[] {
  const commits: Commit[] = [];
  const blocks = raw.split('__COMMIT__').filter((b) => b.trim());

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    const headerLine = lines[0];
    if (!headerLine) continue;

    const parts = headerLine.split('\0');
    if (parts.length < 6) continue;

    const [hash, shortHash, author, email, dateStr, message] = parts;

    // --name-only gives us file paths (one per line after header), no stats
    const files: FileChange[] = [];
    for (let i = 1; i < lines.length; i++) {
      const path = lines[i].trim();
      if (!path) continue;
      files.push({ path, additions: 0, deletions: 0 });
    }

    commits.push({
      hash,
      shortHash,
      author,
      email,
      date: new Date(dateStr),
      message,
      files,
    });
  }

  commits.sort((a, b) => a.date.getTime() - b.date.getTime());
  return commits;
}

/**
 * Parse --numstat output (file paths WITH line counts).
 */
function parseDetailedLog(raw: string): Commit[] {
  const commits: Commit[] = [];
  const blocks = raw.split('__COMMIT__').filter((b) => b.trim());

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    const headerLine = lines[0];
    if (!headerLine) continue;

    const parts = headerLine.split('\0');
    if (parts.length < 6) continue;

    const [hash, shortHash, author, email, dateStr, message] = parts;

    // --numstat lines: additions\tsubstitutions\tpath
    const files: FileChange[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const [addStr, delStr, ...pathParts] = line.split('\t');
      const path = pathParts.join('\t');
      if (!path) continue;

      const additions = addStr === '-' ? 0 : parseInt(addStr, 10) || 0;
      const deletions = delStr === '-' ? 0 : parseInt(delStr, 10) || 0;

      files.push({ path, additions, deletions });
    }

    commits.push({
      hash,
      shortHash,
      author,
      email,
      date: new Date(dateStr),
      message,
      files,
    });
  }

  commits.sort((a, b) => a.date.getTime() - b.date.getTime());
  return commits;
}

function aggregateAuthors(commits: Commit[]): Author[] {
  const authorMap = new Map<string, Author>();

  for (const commit of commits) {
    const key = commit.email || commit.author;
    let author = authorMap.get(key);

    if (!author) {
      author = {
        name: commit.author,
        email: commit.email,
        commits: 0,
        additions: 0,
        deletions: 0,
        firstCommit: commit.date,
        lastCommit: commit.date,
      };
      authorMap.set(key, author);
    }

    author.commits++;
    author.additions += commit.files.reduce((s, f) => s + f.additions, 0);
    author.deletions += commit.files.reduce((s, f) => s + f.deletions, 0);

    if (commit.date < author.firstCommit) author.firstCommit = commit.date;
    if (commit.date > author.lastCommit) author.lastCommit = commit.date;
  }

  return Array.from(authorMap.values()).sort((a, b) => b.commits - a.commits);
}
