/**
 * LLM-powered narrative generator — turns clusters into a
 * human-readable "story" of the codebase's evolution.
 */

import { chat, type LLMConfig } from './client.js';
import type { Cluster, Milestone, ProgressCallback } from '../types.js';

export interface NarrateOptions {
  config: LLMConfig;
  clusters: Cluster[];
  repoName?: string;
  onProgress?: ProgressCallback;
}

const NARRATE_SYSTEM_PROMPT = `You are a technical storyteller. You turn dry git history into
engaging narratives about how a codebase evolved.

Given a list of development clusters (groups of commits with labels),
write a concise, insightful narrative for each major cluster.

IMPORTANT: Return ONLY valid JSON. No markdown, no explanation.

The JSON must follow this schema:
{
  "milestones": [
    {
      "clusterLabel": "exact label from input to match",
      "title": "A memorable, specific title",
      "narrative": "2-3 sentences describing what changed, why it matters, and the impact. Be technical but engaging.",
      "icon": "a single emoji that represents this milestone"
    }
  ]
}

Rules:
- Only create milestones for clusters with importance >= 0.5
- Titles should be punchy and specific (not generic like "Feature work")
- Narratives should read like a paragraph in a tech blog
- Choose emoji icons that visually represent the work (🚀 for features, 🔧 for refactors, 🐛 for fixes, etc.)
- Write in past tense, as if describing completed work
- Keep each narrative under 100 words`;

/**
 * Generate narrative milestones for the most important clusters.
 */
export async function generateNarratives(
  options: NarrateOptions
): Promise<Milestone[]> {
  const { config, clusters, repoName, onProgress } = options;

  const significant = clusters.filter((c) => c.importance >= 0.5);
  if (significant.length === 0) {
    onProgress?.({
      phase: 'narrating',
      message: 'No significant clusters to narrate',
      progress: 1.0,
    });
    return [];
  }

  onProgress?.({
    phase: 'narrating',
    message: `Generating narratives for ${significant.length} key clusters...`,
    progress: 0,
  });

  // Build input for LLM
  const clusterList = significant
    .map(
      (c) =>
        `- Label: "${c.label}"\n  Category: ${c.category}\n  Importance: ${c.importance}\n  Keywords: ${c.keywords.join(', ')}\n  Commits: ${c.commitHashes.length}\n  Description: ${c.description}`
    )
    .join('\n\n');

  const context = repoName ? `Repository: ${repoName}\n\n` : '';
  const userPrompt = `${context}Turn these development clusters into an engaging narrative timeline:\n\n${clusterList}`;

  const response = await chat(
    config,
    [
      { role: 'system', content: NARRATE_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    { temperature: 0.5, maxTokens: 3000, jsonMode: true }
  );

  // Parse response
  const cleaned = response.content
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    .trim();

  let parsed: { milestones?: any[] };

  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        parsed = JSON.parse(match[0]);
      } catch {
        console.warn('Failed to parse LLM narrative response');
        return [];
      }
    } else {
      return [];
    }
  }

  if (!parsed.milestones || !Array.isArray(parsed.milestones)) {
    return [];
  }

  // Match milestones back to clusters by label
  const result: Milestone[] = [];
  for (const m of parsed.milestones) {
    const cluster = significant.find(
      (c) => c.label === m.clusterLabel
    );
    if (!cluster) continue;

    result.push({
      id: `milestone-${result.length}`,
      clusterId: cluster.id,
      title: m.title || cluster.label,
      narrative: m.narrative || cluster.description,
      date: new Date(), // Will be overridden by caller with actual commit dates
      icon: m.icon || '📌',
    });
  }

  onProgress?.({
    phase: 'narrating',
    message: `Generated ${result.length} milestones`,
    progress: 1.0,
  });

  return result;
}

/**
 * Generate an overall project summary from the clusters.
 */
export async function generateSummary(
  config: LLMConfig,
  clusters: Cluster[],
  repoName?: string
): Promise<string> {
  if (clusters.length === 0) return '';

  const clusterSummary = clusters
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 10)
    .map((c) => `- [${c.category}] ${c.label} (importance: ${c.importance.toFixed(1)})`)
    .join('\n');

  const response = await chat(
    config,
    [
      {
        role: 'system',
        content:
          'You write concise, insightful summaries of software project histories.',
      },
      {
        role: 'user',
        content: `Repository: ${repoName || 'Unknown'}\n\nTop development themes:\n${clusterSummary}\n\nWrite a 3-4 sentence summary of this project's development history. What were the key phases? What patterns do you see?`,
      },
    ],
    { temperature: 0.4, maxTokens: 500 }
  );

  return response.content.trim();
}
