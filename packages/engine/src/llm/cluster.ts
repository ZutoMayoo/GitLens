/**
 * LLM-powered commit clustering — sends batches of commit messages
 * to an LLM and asks it to categorize them into semantic groups.
 */

import { chat, type LLMConfig } from './client.js';
import type { Commit, Cluster, ProgressCallback } from '../types.js';

export interface ClusterOptions {
  config: LLMConfig;
  commits: Commit[];
  batchSize?: number;
  onProgress?: ProgressCallback;
}

const CLUSTER_SYSTEM_PROMPT = `You are a code archaeology expert. You analyze git commit histories
to identify meaningful patterns and themes.

Given a list of commit messages (with short hashes), group them into
semantic clusters that represent coherent pieces of work.

IMPORTANT: Return ONLY valid JSON. No markdown, no explanation.

The JSON must follow this schema:
{
  "clusters": [
    {
      "label": "Short label like 'Auth module refactor'",
      "description": "1-2 sentences describing the work",
      "commitShortHashes": ["abc1234", "def5678"],
      "keywords": ["auth", "refactor", "jwt"],
      "importance": 0.8,
      "category": "feature|refactor|fix|docs|test|chore|breaking"
    }
  ]
}

Rules:
- importance: 0.0-1.0 score. High for breaking changes, architectural shifts, major features.
  Low for minor typo fixes, formatting, dependency bumps.
- category: use "feature" for new capabilities, "refactor" for code restructuring,
  "fix" for bug fixes, "docs" for documentation, "test" for testing,
  "chore" for maintenance, "breaking" for breaking changes.
- Every commit should belong to exactly one cluster.
- Create 3-8 clusters per batch of ~30 commits.
- Make labels specific, not generic ("Fix login timeout race condition" not "Bug fixes").`;

/**
 * Cluster commits using an LLM for semantic understanding.
 * Processes commits in batches to avoid token limits.
 */
export async function clusterCommits(
  options: ClusterOptions
): Promise<Cluster[]> {
  const { config, commits, batchSize = 30, onProgress } = options;

  if (commits.length === 0) return [];

  const allClusters: Cluster[] = [];
  const batches = chunkArray(commits, batchSize);

  onProgress?.({
    phase: 'clustering',
    message: `Clustering ${commits.length} commits in ${batches.length} batches...`,
    progress: 0,
  });

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];

    onProgress?.({
      phase: 'clustering',
      message: `Clustering batch ${i + 1}/${batches.length} (${batch.length} commits)...`,
      progress: i / batches.length,
    });

    const batchClusters = await processBatch(config, batch, i);
    allClusters.push(...batchClusters);
  }

  // Re-index cluster IDs
  const finalClusters = allClusters.map((c, idx) => ({
    ...c,
    id: `cluster-${idx}`,
  }));

  onProgress?.({
    phase: 'clustering',
    message: `Clustering complete: ${finalClusters.length} clusters`,
    progress: 1.0,
  });

  return finalClusters;
}

async function processBatch(
  config: LLMConfig,
  commits: Commit[],
  batchIndex: number
): Promise<Cluster[]> {
  // Build a compact representation of commits for the LLM
  const commitList = commits
    .map(
      (c, i) =>
        `[${i}] ${c.shortHash} | ${c.date.toISOString().slice(0, 10)} | ${c.message}`
    )
    .join('\n');

  const userPrompt = `Analyze these ${commits.length} commit messages and group them into semantic clusters.\n\nCommits:\n${commitList}`;

  const response = await chat(
    config,
    [
      { role: 'system', content: CLUSTER_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    { temperature: 0.2, maxTokens: 4000, jsonMode: true }
  );

  // Parse the JSON response
  const cleaned = response.content
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    .trim();

  let parsed: { clusters?: any[] };

  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Try to extract JSON block
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        parsed = JSON.parse(match[0]);
      } catch {
        console.warn(
          `Failed to parse LLM cluster response for batch ${batchIndex}`
        );
        return [];
      }
    } else {
      console.warn(
        `No JSON found in LLM response for batch ${batchIndex}`
      );
      return [];
    }
  }

  if (!parsed.clusters || !Array.isArray(parsed.clusters)) {
    return [];
  }

  // Map short hashes back to full hashes and validate
  const hashMap = new Map(commits.map((c) => [c.shortHash, c.hash]));

  return parsed.clusters.map((c: any, idx: number) => ({
    id: `cluster-${batchIndex}-${idx}`,
    label: c.label || `Cluster ${idx}`,
    description: c.description || '',
    commitHashes: (c.commitShortHashes || [])
      .map((sh: string) => hashMap.get(sh) || sh)
      .filter(Boolean),
    keywords: c.keywords || [],
    importance: clamp(c.importance ?? 0.5, 0, 1),
    category: validateCategory(c.category),
  }));
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function validateCategory(cat: string): Cluster['category'] {
  const valid = ['feature', 'refactor', 'fix', 'docs', 'test', 'chore', 'breaking'];
  return valid.includes(cat) ? (cat as Cluster['category']) : 'chore';
}
