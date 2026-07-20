/**
 * Git log parser — reads commit history from a local repository
 * using simple-git and parses the output into structured data.
 */

import { simpleGit } from 'simple-git';
import type { Commit, FileChange, Author, ProgressCallback } from './types.js';

export interface ParseOptions {
  repoPath: string;
  maxCommits?: number;
  onProgress?: ProgressCallback;
}

/**
 * Parse git log from a repository and return structured commit data
 * plus aggregated author statistics.
 */
export async function parseGitLog(options: ParseOptions): Promise<{
  commits: Commit[];
  authors: Author[];
  headHash: string;
}> {
  const { repoPath, maxCommits = 500, onProgress } = options;
  const git = simpleGit(repoPath);

  onProgress?.({
    phase: 'parsing',
    message: 'Checking repository...',
    progress: 0,
  });

  // Verify it's a valid git repo
  const isRepo = await git.checkIsRepo();
  if (!isRepo) {
    throw new Error(`Not a git repository: ${repoPath}`);
  }

  // Get HEAD hash for caching
  const headHash = (await git.revparse(['HEAD'])).trim();
  if (!headHash) {
    throw new Error(`Repository has no commits: ${repoPath}`);
  }

  onProgress?.({
    phase: 'parsing',
    message: 'Reading commit history...',
    progress: 0.1,
  });

  // Fetch commit log with file stats
  // Format: hash%x00shortHash%x00author%x00email%x00date%x00message
  // Followed by --numstat lines for file changes
  const logOutput = await git.raw([
    'log',
    `-${maxCommits}`,
    '--all',
    '--pretty=format:__COMMIT__%H%x00%h%x00%an%x00%ae%x00%aI%x00%s',
    '--numstat',
  ]);

  onProgress?.({
    phase: 'parsing',
    message: 'Parsing commit data...',
    progress: 0.3,
  });

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
 * Parse the raw git log output into structured Commit objects.
 */
function parseRawLog(raw: string): Commit[] {
  const commits: Commit[] = [];

  // Split on commit delimiter
  const blocks = raw.split('__COMMIT__').filter((b) => b.trim());

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    const headerLine = lines[0];
    if (!headerLine) continue;

    // Parse header: hash\0shortHash\0author\0email\0date\0message
    const parts = headerLine.split('\0');
    if (parts.length < 6) continue;

    const [hash, shortHash, author, email, dateStr, message] = parts;

    // Parse file stats (--numstat lines: additions\tsubstitutions\tpath)
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

  // Sort chronologically
  commits.sort((a, b) => a.date.getTime() - b.date.getTime());

  return commits;
}

/**
 * Aggregate author statistics from parsed commits.
 */
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
