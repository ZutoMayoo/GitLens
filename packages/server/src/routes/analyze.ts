/**
 * Analysis routes — trigger git analysis and check results.
 */

import { Router, type Request, type Response } from 'express';
import { startAnalysis } from '../services/analysis.js';
import { listCachedRepos, getCachedRepo } from '../services/cache.js';
import { isGitHubUrl, cloneOrPull } from '../services/clone.js';
import fs from 'fs';

const router: Router = Router();

/**
 * POST /api/analyze
 * Start a new analysis. Supports both local paths and GitHub URLs.
 *
 * Body: { repoPath: string, maxCommits?: number, useLLM?: boolean, llmConfig?: object }
 */
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { repoPath, maxCommits, useLLM, llmConfig, forceReanalysis } = req.body;

    if (!repoPath || typeof repoPath !== 'string') {
      res.status(400).json({ error: 'repoPath is required' });
      return;
    }

    let effectivePath = repoPath;
    let isCloned = false;

    // ── GitHub URL handler ──
    if (isGitHubUrl(repoPath)) {
      try {
        const { localPath, isNew } = await cloneOrPull(repoPath, {
          maxDepth: maxCommits ?? 100,
          analysisId: '',
        });
        effectivePath = localPath;
        isCloned = true;

        console.log(
          `[clone] ${isNew ? 'Cloned' : 'Using cached'} ${repoPath} → ${localPath}`
        );
      } catch (cloneErr: any) {
        console.error('[clone] Failed:', cloneErr.message);
        res.status(400).json({
          error: `Failed to clone repository: ${cloneErr.message}`,
        });
        return;
      }
    }

    // Validate path (for local paths only)
    if (!isCloned) {
      const gitDir = `${effectivePath}/.git`;
      if (!fs.existsSync(effectivePath) || !fs.existsSync(gitDir)) {
        res.status(400).json({ error: `Not a valid git repository: ${effectivePath}` });
        return;
      }
    }

    // Start analysis — build LLM config from env vars if requested
    let effectiveLlmConfig = llmConfig;

    if (useLLM && !effectiveLlmConfig) {
      // Auto-detect API keys from environment
      const openaiKey = process.env.OPENAI_API_KEY;
      const anthropicKey = process.env.ANTHROPIC_API_KEY;

      if (openaiKey) {
        effectiveLlmConfig = {
          provider: 'openai' as const,
          apiKey: openaiKey,
          model: process.env.OPENAI_MODEL || undefined,
          baseUrl: process.env.OPENAI_BASE_URL || undefined,
        };
      } else if (anthropicKey) {
        effectiveLlmConfig = {
          provider: 'anthropic' as const,
          apiKey: anthropicKey,
          model: process.env.ANTHROPIC_MODEL || undefined,
          baseUrl: process.env.ANTHROPIC_BASE_URL || undefined,
        };
      }
    }

    const { analysisId, result } = await startAnalysis({
      repoPath: effectivePath,
      maxCommits,
      useLLM,
      llmConfig: effectiveLlmConfig,
      forceReanalysis,
    });

    res.json({
      cached: false,
      analysisId,
      repoId: effectivePath,
      repoPath: repoPath,       // original input (URL or path)
      effectivePath: effectivePath,  // actual analyzed path (cloned or local)
      isCloned,
      result,
    });
  } catch (err: any) {
    console.error('[analyze] Error:', err.message);
    res.status(500).json({
      error: err.message || 'Analysis failed',
    });
  }
});

/**
 * GET /api/repos
 * List all previously analyzed repositories.
 */
router.get('/repos', (_req: Request, res: Response) => {
  try {
    const repos = listCachedRepos();
    res.json({ repos });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/repos/:id
 * Get a specific analysis result by repo ID.
 */
router.get('/repos/:id', (req: Request, res: Response) => {
  try {
    const repo = getCachedRepo(req.params.id);
    if (!repo) {
      res.status(404).json({ error: 'Repository not found' });
      return;
    }
    res.json({ repo });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/repos/:id/timeline
 * Get timeline data for a repository.
 */
router.get('/repos/:id/timeline', (req: Request, res: Response) => {
  try {
    const repo = getCachedRepo(req.params.id);
    if (!repo) {
      res.status(404).json({ error: 'Repository not found' });
      return;
    }
    // The full result is stored in the repo record
    // In production, we'd query the repos table for result_json
    res.json({ repo });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/config
 * Returns server configuration, including whether LLM is available.
 */
router.get('/config', (_req: Request, res: Response) => {
  const llmAvailable = !!(
    process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY
  );
  res.json({
    llmAvailable,
    llmProvider: process.env.OPENAI_API_KEY
      ? 'openai'
      : process.env.ANTHROPIC_API_KEY
        ? 'anthropic'
        : null,
  });
});

/**
 * GET /api/health
 * Health check endpoint.
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
