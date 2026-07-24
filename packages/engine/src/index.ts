/**
 * @gitlens/engine — Core analysis engine for GitLens.
 *
 * Parses git repositories and produces structured analysis data
 * suitable for visualization.
 */

import { parseGitLog } from './git-parser.js';
import { groupCommits } from './commit-grouper.js';
import { buildHeatmap } from './heatmap.js';
import { clusterCommits } from './llm/cluster.js';
import { generateNarratives } from './llm/narrate.js';
import type { LLMConfig } from './llm/client.js';
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

export type { LLMConfig, LLMProvider } from './llm/client.js';
export { parseGitLog } from './git-parser.js';
export { computeFileStats, groupByModule, topFiles } from './diff-stats.js';
export { groupCommits } from './commit-grouper.js';
export { buildHeatmap, flattenHeatmap, hottestFiles } from './heatmap.js';
export { clusterCommits } from './llm/cluster.js';
export { generateNarratives } from './llm/narrate.js';

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

/**
 * Run the full analysis pipeline with LLM-powered semantic clustering
 * and narrative generation.
 */
export async function analyzeWithLLM(
  options: AnalysisOptions & { llmConfig: LLMConfig }
): Promise<AnalysisResult> {
  // Run the base analysis first
  const result = await analyze(options);

  const { llmConfig, onProgress, maxCommits = 500 } = options;

  // Select a representative subset for LLM processing
  // (avoid token limits and cost on very large histories)
  const sampleSize = Math.min(maxCommits, 300);
  const sample = result.commits.slice(-sampleSize);

  // Step 4: LLM semantic clustering
  const clusters = await clusterCommits({
    config: llmConfig,
    commits: sample,
    batchSize: 30,
    onProgress,
  });

  result.clusters = clusters;

  // Step 5: Narrative generation for key clusters
  const milestones = await generateNarratives({
    config: llmConfig,
    clusters,
    repoName: result.repoPath.split(/[/\\]/).pop(),
    onProgress,
  });

  // Set milestone dates from actual commit data
  const commitMap = new Map(result.commits.map((c) => [c.hash, c]));
  for (const milestone of milestones) {
    const cluster = clusters.find((c) => c.id === milestone.clusterId);
    if (cluster && cluster.commitHashes.length > 0) {
      const firstHash = cluster.commitHashes[0];
      const commit = commitMap.get(firstHash);
      if (commit) {
        milestone.date = commit.date;
      }
    }
  }

  result.milestones = milestones;

  onProgress?.({
    phase: 'done',
    message: `LLM analysis complete: ${clusters.length} clusters, ${milestones.length} milestones`,
    progress: 1.0,
  });

  return result;
}
