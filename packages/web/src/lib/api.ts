/**
 * API client for the GitLens server.
 */

const BASE_URL = '/api';

export interface AnalysisRequest {
  repoPath: string;
  maxCommits?: number;
  useLLM?: boolean;
  llmConfig?: {
    provider: 'openai' | 'anthropic';
    apiKey: string;
    model?: string;
    baseUrl?: string;
  };
  forceReanalysis?: boolean;
}

export interface AnalysisResponse {
  cached: boolean;
  analysisId?: string;
  repoId?: string;
  result?: any;
  error?: string;
}

export async function triggerAnalysis(
  request: AnalysisRequest
): Promise<AnalysisResponse> {
  const res = await fetch(`${BASE_URL}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export interface ServerConfig {
  llmAvailable: boolean;
  llmProvider: 'openai' | 'anthropic' | null;
}

export async function getServerConfig(): Promise<ServerConfig> {
  const res = await fetch(`${BASE_URL}/config`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function listRepos(): Promise<any[]> {
  const res = await fetch(`${BASE_URL}/repos`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.repos || [];
}

export async function getRepo(id: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/repos/${id}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.repo;
}
