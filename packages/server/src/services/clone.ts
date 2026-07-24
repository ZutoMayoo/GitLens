/**
 * Git clone service — handles cloning GitHub URLs into a local temp directory.
 * Supports shallow clones, caching, and progress reporting.
 */

import { simpleGit, type SimpleGit } from 'simple-git';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { broadcast } from '../ws.js';

const CLONES_DIR = path.join(os.tmpdir(), 'gitlens-clones');

/**
 * Check if a string looks like a GitHub URL.
 */
export function isGitHubUrl(input: string): boolean {
  return /^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+/.test(input);
}

/**
 * Parse owner and repo name from a GitHub URL.
 */
export function parseGitHubUrl(url: string): { owner: string; repo: string; cleanUrl: string } | null {
  const match = url.match(
    /^https?:\/\/(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:\/.*)?$/
  );
  if (!match) return null;
  const cleanUrl = `https://github.com/${match[1]}/${match[2]}.git`;
  return { owner: match[1], repo: match[2], cleanUrl };
}

/**
 * Get the local clone path for a given GitHub URL.
 */
export function getClonePath(url: string): string | null {
  const parsed = parseGitHubUrl(url);
  if (!parsed) return null;
  return path.join(CLONES_DIR, `${parsed.owner}__${parsed.repo}`);
}

/**
 * Clone a GitHub repo (or pull if already cloned).
 * Returns the local path to the cloned repo.
 */
export async function cloneOrPull(
  url: string,
  options?: { maxDepth?: number; analysisId?: string }
): Promise<{ localPath: string; isNew: boolean }> {
  const parsed = parseGitHubUrl(url);
  if (!parsed) {
    throw new Error(`Invalid GitHub URL: ${url}`);
  }

  const localPath = path.join(CLONES_DIR, `${parsed.owner}__${parsed.repo}`);
  const depth = options?.maxDepth ?? 100;

  // Ensure clones directory exists
  if (!fs.existsSync(CLONES_DIR)) {
    fs.mkdirSync(CLONES_DIR, { recursive: true });
  }

  const git: SimpleGit = simpleGit();

  // Check if already cloned
  if (fs.existsSync(path.join(localPath, '.git'))) {
    broadcast({
      type: 'progress',
      analysisId: options?.analysisId || '',
      repoPath: url,
      phase: 'parsing',
      message: 'Repository already cloned, fetching latest...',
      progress: 0.1,
    });

    // Pull latest changes (fast: shallow, no tags)
    const repoGit = simpleGit(localPath);
    try {
      await repoGit.fetch(['--depth', String(depth), '--no-tags', 'origin']);
    } catch {
      // Fetch failed, but we can still use the existing clone
    }

    broadcast({
      type: 'progress',
      analysisId: options?.analysisId || '',
      repoPath: url,
      phase: 'parsing',
      message: 'Clone ready (cached)',
      progress: 0.2,
    });

    return { localPath, isNew: false };
  }

  // Fresh clone
  broadcast({
    type: 'progress',
    analysisId: options?.analysisId || '',
    repoPath: url,
    phase: 'parsing',
    message: `Cloning ${parsed.owner}/${parsed.repo}...`,
    progress: 0.05,
  });

  await git.clone(parsed.cleanUrl, localPath, {
    '--depth': String(depth),
    '--single-branch': null,
    '--no-tags': null,
  });

  broadcast({
    type: 'progress',
    analysisId: options?.analysisId || '',
    repoPath: url,
    phase: 'parsing',
    message: `Clone complete: ${parsed.owner}/${parsed.repo}`,
    progress: 0.2,
  });

  return { localPath, isNew: true };
}

/**
 * Clean up old clones (older than `maxAgeDays`).
 */
export function cleanupOldClones(maxAgeDays: number = 7): number {
  if (!fs.existsSync(CLONES_DIR)) return 0;

  const now = Date.now();
  const maxAge = maxAgeDays * 24 * 60 * 60 * 1000;
  let removed = 0;

  const dirs = fs.readdirSync(CLONES_DIR);
  for (const dir of dirs) {
    const fullPath = path.join(CLONES_DIR, dir);
    try {
      const stat = fs.statSync(fullPath);
      if (now - stat.mtimeMs > maxAge) {
        fs.rmSync(fullPath, { recursive: true, force: true });
        removed++;
      }
    } catch {
      // Skip inaccessible directories
    }
  }

  return removed;
}
