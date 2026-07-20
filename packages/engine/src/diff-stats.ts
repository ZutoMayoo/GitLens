/**
 * File-level diff statistics — aggregates change frequency and churn
 * across all commits to identify hot files and modules.
 */

import type { Commit, FileChange } from './types.js';

export interface FileStat {
  path: string;
  changeCount: number;
  totalAdditions: number;
  totalDeletions: number;
  netChange: number; // additions - deletions
  churnRate: number; // (additions + deletions) / changeCount — how "big" each change is on average
  lastModified: Date;
  authors: Set<string>;
}

export interface ModuleStat {
  module: string; // top-level directory or file group
  fileCount: number;
  totalChanges: number;
  children: FileStat[];
}

/**
 * Compute per-file statistics from all commits.
 */
export function computeFileStats(commits: Commit[]): Map<string, FileStat> {
  const stats = new Map<string, FileStat>();

  for (const commit of commits) {
    for (const file of commit.files) {
      let stat = stats.get(file.path);
      if (!stat) {
        stat = {
          path: file.path,
          changeCount: 0,
          totalAdditions: 0,
          totalDeletions: 0,
          netChange: 0,
          churnRate: 0,
          lastModified: commit.date,
          authors: new Set(),
        };
        stats.set(file.path, stat);
      }

      stat.changeCount++;
      stat.totalAdditions += file.additions;
      stat.totalDeletions += file.deletions;
      stat.authors.add(commit.email || commit.author);

      if (commit.date > stat.lastModified) {
        stat.lastModified = commit.date;
      }
    }
  }

  // Compute derived fields
  for (const stat of stats.values()) {
    stat.netChange = stat.totalAdditions - stat.totalDeletions;
    stat.churnRate =
      stat.changeCount > 0
        ? (stat.totalAdditions + stat.totalDeletions) / stat.changeCount
        : 0;
  }

  return stats;
}

/**
 * Group file stats by top-level directory (module).
 */
export function groupByModule(
  fileStats: Map<string, FileStat>
): ModuleStat[] {
  const modules = new Map<string, ModuleStat>();

  for (const stat of fileStats.values()) {
    const module = stat.path.split('/')[0] || '(root)';

    let mod = modules.get(module);
    if (!mod) {
      mod = {
        module,
        fileCount: 0,
        totalChanges: 0,
        children: [],
      };
      modules.set(module, mod);
    }

    mod.fileCount++;
    mod.totalChanges += stat.changeCount;
    mod.children.push(stat);
  }

  return Array.from(modules.values()).sort(
    (a, b) => b.totalChanges - a.totalChanges
  );
}

/**
 * Get the top-N most-changed files.
 */
export function topFiles(
  fileStats: Map<string, FileStat>,
  n: number = 20
): FileStat[] {
  return Array.from(fileStats.values())
    .sort((a, b) => b.changeCount - a.changeCount)
    .slice(0, n);
}
