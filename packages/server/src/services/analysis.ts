/**
 * Analysis orchestration — runs the engine pipeline with progress
 * tracking and WebSocket broadcasting.
 */

import { analyze, analyzeWithLLM } from '@gitlens/engine';
import type { AnalysisResult, ProgressEvent } from '@gitlens/engine';
import type { LLMConfig } from '@gitlens/engine';
import {
  getCachedResult,
  cacheResult,
  createAnalysis,
  updateAnalysis,
} from './cache.js';
import { broadcast } from '../ws.js';

export interface StartAnalysisOptions {
  repoPath: string;
  maxCommits?: number;
  useLLM?: boolean;
  llmConfig?: LLMConfig;
  forceReanalysis?: boolean;
}

/**
 * Run a complete analysis with caching and progress broadcasting.
 */
export async function startAnalysis(
  options: StartAnalysisOptions
): Promise<{ analysisId: string; result: AnalysisResult }> {
  const { repoPath, maxCommits = 200, useLLM = false, llmConfig, forceReanalysis } = options;

  // Create analysis record
  const record = createAnalysis(repoPath, JSON.stringify({ maxCommits, useLLM }));
  const analysisId = record.id;

  try {
    updateAnalysis(analysisId, { status: 'running', progress: 0 });

    // Build progress callback that broadcasts via WebSocket
    const onProgress = (event: ProgressEvent) => {
      broadcast({
        type: 'progress',
        analysisId,
        repoPath,
        ...event,
      });
      updateAnalysis(analysisId, { progress: event.progress });
    };

    let result: AnalysisResult;

    if (useLLM && llmConfig) {
      result = await analyzeWithLLM({
        repoPath,
        maxCommits,
        llmConfig,
        onProgress,
      });
    } else {
      result = await analyze({
        repoPath,
        maxCommits,
        onProgress,
      });
    }

    // Cache the result
    const repoId = cacheResult(result);
    updateAnalysis(analysisId, { status: 'done', progress: 1 });

    broadcast({
      type: 'complete',
      analysisId,
      repoPath,
      repoId,
      summary: {
        totalCommits: result.totalCommits,
        totalFiles: result.totalFiles,
        authors: result.authors.length,
        groups: result.groups.length,
        clusters: result.clusters?.length || 0,
        milestones: result.milestones?.length || 0,
        dateRange: result.dateRange,
      },
    });

    return { analysisId, result };
  } catch (err: any) {
    const message = err instanceof Error ? err.message : String(err);
    updateAnalysis(analysisId, { status: 'error', errorMessage: message });

    broadcast({
      type: 'error',
      analysisId,
      repoPath,
      message,
    });

    throw err;
  }
}

/**
 * Try to get a cached result, or return null if stale/missing.
 */
export async function getOrCacheResult(
  repoPath: string,
  headHash: string
): Promise<AnalysisResult | null> {
  return getCachedResult(repoPath, headHash);
}
