// ============================================================
// Core types for the GitLens analysis engine
// ============================================================

/** A single file change within a commit */
export interface FileChange {
  path: string;
  additions: number;
  deletions: number;
}

/** A parsed git commit */
export interface Commit {
  hash: string;
  shortHash: string;
  author: string;
  email: string;
  date: Date;
  message: string;
  files: FileChange[];
}

/** Author statistics */
export interface Author {
  name: string;
  email: string;
  commits: number;
  additions: number;
  deletions: number;
  firstCommit: Date;
  lastCommit: Date;
}

/** A rule-based grouping of related commits */
export interface CommitGroup {
  id: string;
  label: string;
  commitHashes: string[];
  startDate: Date;
  endDate: Date;
  keywords: string[];
  fileSet: string[]; // files touched by this group
}

/** LLM-generated cluster with semantic meaning */
export interface Cluster {
  id: string;
  label: string; // e.g. "认证模块重构"
  description: string; // 1-2 sentence summary
  commitHashes: string[];
  keywords: string[];
  importance: number; // 0-1 score
  category: ClusterCategory;
}

export type ClusterCategory =
  | 'feature'
  | 'refactor'
  | 'fix'
  | 'docs'
  | 'test'
  | 'chore'
  | 'breaking';

/** A milestone is a highlighted cluster with a narrative */
export interface Milestone {
  id: string;
  clusterId: string;
  title: string;
  narrative: string; // human-readable story
  date: Date;
  icon: string; // emoji or icon name
}

/** Heatmap data for file/module changes */
export interface HeatmapEntry {
  path: string;
  changeCount: number;
  additions: number;
  deletions: number;
  children?: HeatmapEntry[]; // for directory-level aggregation
}

/** Top-level analysis result */
export interface AnalysisResult {
  repoPath: string;
  headHash: string;
  totalCommits: number;
  totalFiles: number;
  dateRange: {
    start: Date;
    end: Date;
  };
  authors: Author[];
  commits: Commit[];
  groups: CommitGroup[];
  clusters?: Cluster[];
  milestones?: Milestone[];
  heatmap: HeatmapEntry[];
}

/** Progress events emitted during analysis */
export type ProgressEvent =
  | { phase: 'parsing'; message: string; progress: number }
  | { phase: 'grouping'; message: string; progress: number }
  | { phase: 'clustering'; message: string; progress: number }
  | { phase: 'narrating'; message: string; progress: number }
  | { phase: 'heatmap'; message: string; progress: number }
  | { phase: 'done'; message: string; progress: number }
  | { phase: 'error'; message: string; progress: number };

/** Callback for progress reporting */
export type ProgressCallback = (event: ProgressEvent) => void;

/** Options for the analysis pipeline */
export interface AnalysisOptions {
  repoPath: string;
  maxCommits?: number; // limit commits to analyze (default: 500)
  useLLM?: boolean; // whether to use LLM for clustering (default: false)
  llmApiKey?: string;
  llmProvider?: 'openai' | 'anthropic';
  onProgress?: ProgressCallback;
  forceReanalysis?: boolean; // skip cache
}
