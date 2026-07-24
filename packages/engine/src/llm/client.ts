/**
 * Unified LLM client — supports OpenAI and Anthropic APIs.
 * Handles retries, rate limiting, and structured output.
 */

import type { ProgressCallback } from '../types.js';

export type LLMProvider = 'openai' | 'anthropic';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  model?: string;
  baseUrl?: string; // for proxies / alternative endpoints
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
  };
}

const DEFAULT_MODELS: Record<LLMProvider, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-sonnet-4-5',
};

/**
 * Send a chat completion request to the configured LLM provider.
 */
export async function chat(
  config: LLMConfig,
  messages: ChatMessage[],
  options?: {
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
  }
): Promise<LLMResponse> {
  const model = config.model || DEFAULT_MODELS[config.provider];
  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (config.provider === 'openai') {
        return await callOpenAI(config, model, messages, options);
      } else {
        return await callAnthropic(config, model, messages, options);
      }
    } catch (err: any) {
      const isRateLimit =
        err.message?.includes('429') || err.message?.includes('rate_limit');
      const isRetryable =
        isRateLimit || err.message?.includes('500') || err.message?.includes('503');

      if (!isRetryable || attempt === maxRetries - 1) {
        throw new Error(
          `LLM API error (attempt ${attempt + 1}/${maxRetries}): ${err.message}`
        );
      }

      // Exponential backoff: 1s, 4s, 16s
      const delay = Math.pow(2, attempt * 2) * 1000;
      await sleep(delay);
    }
  }

  throw new Error('LLM API: max retries exceeded');
}

async function callOpenAI(
  config: LLMConfig,
  model: string,
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number; jsonMode?: boolean }
): Promise<LLMResponse> {
  const baseUrl = config.baseUrl || 'https://api.openai.com/v1';

  const body: any = {
    model,
    messages,
    temperature: options?.temperature ?? 0.3,
    max_tokens: options?.maxTokens ?? 2000,
  };

  if (options?.jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI ${res.status}: ${text}`);
  }

  const data: any = await res.json();
  const choice = data.choices?.[0];

  return {
    content: choice?.message?.content || '',
    usage: {
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
    },
  };
}

async function callAnthropic(
  config: LLMConfig,
  model: string,
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number; jsonMode?: boolean }
): Promise<LLMResponse> {
  const baseUrl = config.baseUrl || 'https://api.anthropic.com/v1';

  // Extract system message if present
  const systemMsg = messages.find((m) => m.role === 'system');
  const chatMessages = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role, content: m.content }));

  const body: any = {
    model,
    messages: chatMessages,
    max_tokens: options?.maxTokens ?? 2000,
    temperature: options?.temperature ?? 0.3,
  };

  // Detect DeepSeek endpoint for auth / JSON mode compatibility
  const isDeepSeek = baseUrl.includes('deepseek');

  if (systemMsg) {
    body.system = systemMsg.content;
  }

  // JSON mode: Anthropic supports assistant prefill, DeepSeek may not
  if (options?.jsonMode) {
    if (isDeepSeek) {
      // DeepSeek: add JSON instruction to system prompt instead of prefill
      body.system = (body.system || '') + '\n\nYou MUST respond with valid JSON only. No markdown, no explanation.';
    } else {
      // Standard Anthropic: prefill with `{` to force JSON output
      body.messages.push({
        role: 'assistant',
        content: '{',
      });
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (isDeepSeek) {
    // DeepSeek uses Bearer token auth
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  } else {
    // Standard Anthropic auth
    headers['x-api-key'] = config.apiKey;
    headers['anthropic-version'] = '2023-06-01';
  }

  const res = await fetch(`${baseUrl}/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic ${res.status}: ${text.slice(0, 500)}`);
  }

  const data: any = await res.json();

  // Handle different response formats:
  // Standard Anthropic: { content: [{ text: "..." }], usage: { input_tokens, output_tokens } }
  // Some compatible endpoints return slightly different structures
  let content = '';
  if (Array.isArray(data.content)) {
    content = data.content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('');
  } else if (typeof data.content === 'string') {
    content = data.content;
  } else if (data.choices?.[0]?.message?.content) {
    // OpenAI-style fallback
    content = data.choices[0].message.content;
  }

  // If we prefilled `{`, prepend it back
  const finalContent =
    options?.jsonMode && !content.startsWith('{') ? `{${content}` : content;

  return {
    content: finalContent,
    usage: {
      promptTokens: data.usage?.input_tokens || data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.output_tokens || data.usage?.completion_tokens || 0,
    },
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
