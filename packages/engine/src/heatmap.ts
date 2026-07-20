/**
 * File change heatmap builder — aggregates file-level change data
 * into a hierarchical structure suitable for treemap visualization.
 */

import type { Commit, HeatmapEntry, ProgressCallback } from './types.js';

export interface HeatmapOptions {
  commits: Commit[];
  onProgress?: ProgressCallback;
}

/**
 * Build a hierarchical heatmap from commit data.
 * Aggregates from file level → directory level.
 */
export function buildHeatmap(options: HeatmapOptions): HeatmapEntry[] {
  const { commits, onProgress } = options;

  onProgress?.({
    phase: 'heatmap',
    message: 'Building file change heatmap...',
    progress: 0,
  });

  // Aggregate per-file changes
  const fileMap = new Map<
    string,
    { changeCount: number; additions: number; deletions: number }
  >();

  for (const commit of commits) {
    for (const file of commit.files) {
      const existing = fileMap.get(file.path);
      if (existing) {
        existing.changeCount++;
        existing.additions += file.additions;
        existing.deletions += file.deletions;
      } else {
        fileMap.set(file.path, {
          changeCount: 1,
          additions: file.additions,
          deletions: file.deletions,
        });
      }
    }
  }

  onProgress?.({
    phase: 'heatmap',
    message: `Aggregated ${fileMap.size} files, building tree...`,
    progress: 0.5,
  });

  // Build tree structure
  const root: Map<string, HeatmapEntry> = new Map();

  for (const [path, stats] of fileMap) {
    const parts = path.split('/');
    let currentMap = root;
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isLeaf = i === parts.length - 1;

      let entry = currentMap.get(part);
      if (!entry) {
        entry = {
          path: currentPath,
          changeCount: 0,
          additions: 0,
          deletions: 0,
        };
        if (!isLeaf) {
          entry.children = [];
        }
        currentMap.set(part, entry);
      }

      // Accumulate stats
      entry.changeCount += stats.changeCount;
      entry.additions += stats.additions;
      entry.deletions += stats.deletions;

      if (isLeaf) break;

      if (!entry.children) entry.children = [];
      // Build a map for the next level
      const nextMap = new Map<string, HeatmapEntry>();
      for (const child of entry.children) {
        const childName = child.path.split('/').pop()!;
        nextMap.set(childName, child);
      }
      currentMap = nextMap;
    }
  }

  onProgress?.({
    phase: 'heatmap',
    message: 'Heatmap complete',
    progress: 1.0,
  });

  // Sort by change count descending
  return Array.from(root.values()).sort(
    (a, b) => b.changeCount - a.changeCount
  );
}

/**
 * Flatten the heatmap entries into a simple list (for bar charts etc).
 * Only includes leaf entries (files).
 */
export function flattenHeatmap(entries: HeatmapEntry[]): HeatmapEntry[] {
  const result: HeatmapEntry[] = [];

  function walk(entries: HeatmapEntry[]) {
    for (const entry of entries) {
      if (!entry.children || entry.children.length === 0) {
        result.push(entry);
      } else {
        walk(entry.children);
      }
    }
  }

  walk(entries);
  return result;
}

/**
 * Get the hot-test files by change count.
 */
export function hottestFiles(entries: HeatmapEntry[], n: number = 20): HeatmapEntry[] {
  return flattenHeatmap(entries)
    .sort((a, b) => b.changeCount - a.changeCount)
    .slice(0, n);
}
