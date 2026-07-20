/**
 * Rule-based commit grouping — clusters commits by temporal proximity
 * and file co-occurrence, without using an LLM.
 *
 * Two strategies:
 * 1. Time-based: commits within a short window → likely same task
 * 2. File-based: commits touching the same files → likely related work
 */

import type { Commit, CommitGroup, ProgressCallback } from './types.js';

export interface GrouperOptions {
  commits: Commit[];
  timeWindowHours?: number; // max hours between commits to consider them related
  fileOverlapThreshold?: number; // min Jaccard similarity to group by files
  onProgress?: ProgressCallback;
}

/**
 * Group commits using both time and file heuristics.
 */
export function groupCommits(options: GrouperOptions): CommitGroup[] {
  const {
    commits,
    timeWindowHours = 48,
    fileOverlapThreshold = 0.3,
    onProgress,
  } = options;

  if (commits.length === 0) return [];

  onProgress?.({
    phase: 'grouping',
    message: 'Grouping commits by time proximity...',
    progress: 0,
  });

  // Phase 1: initial time-based groups
  const timeGroups = groupByTime(commits, timeWindowHours);

  onProgress?.({
    phase: 'grouping',
    message: `Found ${timeGroups.length} time-based groups, merging by file overlap...`,
    progress: 0.4,
  });

  // Phase 2: merge groups with significant file overlap
  const merged = mergeByFileOverlap(timeGroups, fileOverlapThreshold);

  onProgress?.({
    phase: 'grouping',
    message: `Produced ${merged.length} commit groups`,
    progress: 1.0,
  });

  return merged;
}

/**
 * Group commits by temporal bursts.
 * Uses a simple algorithm: start a new group when the gap between
 * consecutive commits exceeds the time window.
 */
function groupByTime(commits: Commit[], windowHours: number): CommitGroup[] {
  const groups: CommitGroup[] = [];
  const windowMs = windowHours * 60 * 60 * 1000;

  let currentBatch: Commit[] = [];

  for (let i = 0; i < commits.length; i++) {
    const commit = commits[i];

    if (currentBatch.length === 0) {
      currentBatch.push(commit);
      continue;
    }

    const prevCommit = currentBatch[currentBatch.length - 1];
    const gap =
      commit.date.getTime() - prevCommit.date.getTime();

    if (gap <= windowMs) {
      // Within window — same group
      currentBatch.push(commit);
    } else {
      // Gap too large — flush current group
      groups.push(makeGroup(currentBatch, groups.length));
      currentBatch = [commit];
    }
  }

  // Flush final batch
  if (currentBatch.length > 0) {
    groups.push(makeGroup(currentBatch, groups.length));
  }

  return groups;
}

/**
 * Merge groups that share a significant number of files
 * (measured by Jaccard similarity of their file sets).
 */
function mergeByFileOverlap(
  groups: CommitGroup[],
  threshold: number
): CommitGroup[] {
  if (groups.length <= 1) return groups;

  const merged: CommitGroup[] = [];
  const used = new Set<number>();

  for (let i = 0; i < groups.length; i++) {
    if (used.has(i)) continue;

    let current = { ...groups[i], commitHashes: [...groups[i].commitHashes], fileSet: [...groups[i].fileSet] };
    used.add(i);

    let changed = true;
    while (changed) {
      changed = false;
      for (let j = i + 1; j < groups.length; j++) {
        if (used.has(j)) continue;

        const similarity = jaccardSimilarity(current.fileSet, groups[j].fileSet);
        if (similarity >= threshold) {
          // Merge groups[j] into current
          current.commitHashes = [
            ...new Set([...current.commitHashes, ...groups[j].commitHashes]),
          ];
          current.fileSet = [
            ...new Set([...current.fileSet, ...groups[j].fileSet]),
          ];
          current.keywords = [
            ...new Set([...current.keywords, ...groups[j].keywords]),
          ];
          if (groups[j].startDate < current.startDate)
            current.startDate = groups[j].startDate;
          if (groups[j].endDate > current.endDate)
            current.endDate = groups[j].endDate;
          used.add(j);
          changed = true;
        }
      }
    }

    // Generate a new label for the merged group
    current.label = generateLabel(current);
    merged.push(current);
  }

  return merged;
}

/**
 * Create a CommitGroup from a batch of commits.
 */
function makeGroup(commits: Commit[], index: number): CommitGroup {
  const fileSet = [
    ...new Set(commits.flatMap((c) => c.files.map((f) => f.path))),
  ];

  // Extract keywords from commit messages (simple word frequency)
  const keywords = extractKeywords(commits);

  return {
    id: `group-${index}`,
    label: generateLabelFromCommits(commits),
    commitHashes: commits.map((c) => c.hash),
    startDate: commits[0].date,
    endDate: commits[commits.length - 1].date,
    keywords,
    fileSet,
  };
}

/**
 * Simple keyword extraction from commit messages.
 * Uses TF-like scoring: word frequency / total words, filtered by stopwords.
 */
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'from', 'by', 'is', 'are', 'was', 'were', 'be', 'been',
  'this', 'that', 'it', 'its', 'has', 'have', 'had', 'not', 'no', 'so',
  'if', 'then', 'else', 'when', 'up', 'out', 'all', 'just', 'also',
  'can', 'will', 'would', 'could', 'should', 'may', 'into', 'more',
  'some', 'these', 'those', 'one', 'two', 'get', 'set', 'use', 'used',
  'using', 'make', 'made', 'add', 'added', 'fix', 'fixed', 'update',
  'updated', 'remove', 'removed', 'change', 'changed', 'refactor',
  'rename', 'renamed', 'move', 'moved',
]);

function extractKeywords(commits: Commit[]): string[] {
  const wordFreq = new Map<string, number>();
  let totalWords = 0;

  for (const commit of commits) {
    const words = commit.message
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

    for (const word of words) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      totalWords++;
    }
  }

  // Sort by frequency and return top 10
  return Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

/**
 * Generate a human-readable label from commit messages.
 * Uses the most common non-stopword or the first meaningful message.
 */
function generateLabelFromCommits(commits: Commit[]): string {
  if (commits.length === 0) return 'Empty group';
  if (commits.length === 1) return commits[0].message;

  // For larger groups, use keyword extraction
  const keywords = extractKeywords(commits);
  if (keywords.length >= 2) {
    return `${keywords[0]} / ${keywords[1]} / ... (${commits.length} commits)`;
  }
  return `${commits.length} commits from ${commits[0].date.toLocaleDateString()}`;
}

/**
 * Generate a label for a merged group.
 */
function generateLabel(group: CommitGroup): string {
  const topKeywords = group.keywords.slice(0, 3).join(' / ');
  if (topKeywords) {
    return `${topKeywords} (${group.commitHashes.length} commits)`;
  }
  return `${group.commitHashes.length} commits`;
}

/**
 * Jaccard similarity coefficient between two sets.
 */
function jaccardSimilarity(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);

  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }

  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}
