/**
 * @gitlens/engine — Core analysis engine for GitLens.
 *
 * Parses git repositories and produces structured analysis data
 * suitable for visualization.
 */

import { parseGitLog } from './git-parser.js';
import { groupCommits } from './commit-grouper.js';
import { buildHeatmap } from './heatmap.js';
import type {
  AnalysisResult,
  AnalysisOptions,
  Commit,
  Author,
  CommitGroup,
  Cluster,
  Milestone,
  HeatmapEntry,
  ProgressEvent,
} from './types.js';

// Re-export types for consumers
export type {
  AnalysisResult,
  AnalysisOptions,
  Commit,
  FileChange,
  Author,
  CommitGroup,
  Cluster,
  ClusterCategory,
  Milestone,
  HeatmapEntry,
  ProgressEvent,
  ProgressCallback,
} from './types.js';

export { parseGitLog } from './git-parser.js';
export { computeFileStats, groupByModule, topFiles } from './diff-stats.js';
export { groupCommits } from './commit-grouper.js';
export { buildHeatmap, flattenHeatmap, hottestFiles } from './heatmap.js';

/**
 * Run the full analysis pipeline on a git repository.
 * This is the primary entry point for consumers.
 */
export async function analyze(options: AnalysisOptions): Promise<AnalysisResult> {
  const {
    repoPath,
    maxCommits = 500,
    onProgress,
  } = options;

  // Step 1: Parse git log
  const { commits, authors, headHash } = await parseGitLog({
    repoPath,
    maxCommits,
    onProgress,
  });

  if (commits.length === 0) {
    throw new Error(`No commits found in repository: ${repoPath}`);
  }

  // Step 2: Group commits by time + file heuristics
  const groups = groupCommits({
    commits,
    onProgress,
  });

  // Step 3: Build file change heatmap
  const heatmap = buildHeatmap({
    commits,
    onProgress,
  });

  // Step 4: Assemble the result
  const result: AnalysisResult = {
    repoPath,
    headHash,
    totalCommits: commits.length,
    totalFiles: heatmap.length,
    dateRange: {
      start: commits[0].date,
      end: commits[commits.length - 1].date,
    },
    authors,
    commits,
    groups,
    heatmap,
  };

  onProgress?.({
    phase: 'done',
    message: `Analysis complete: ${result.totalCommits} commits, ${groups.length} groups, ${authors.length} authors`,
    progress: 1.0,
  });

  return result;
}
