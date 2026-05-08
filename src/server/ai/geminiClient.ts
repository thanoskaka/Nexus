import type { GeminiUsage } from './types.js';
import type { AiProvider } from '../user/aiCredentialsTypes.js';

export type { AiProvider };

export type AiProviderConfig = {
  provider: AiProvider;
  model: string;
  apiKey: string;
  source?: 'user' | 'server-default';
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  usageMetadata?: GeminiUsage;
  error?: { message?: string };
};

type DeepSeekResponse = {
  choices?: Array<{
    message?: { content?: string };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: { message?: string };
};

type OpenAIResponse = {
  choices?: Array<{
    message?: { content?: string };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: { message?: string };
};

type AnthropicResponse = {
  content?: Array<{
    text?: string;
  }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
  error?: { message?: string; error?: { message: string } };
};

const DEFAULT_MODEL = 'gemini-2.5-flash';

function buildSystemPrompt() {
  return [
    'You are Nexus AI assistant for portfolio Q&A.',
    'Use only context provided by portfolio snapshot.',
    'If user asks anything not present in context, clearly say data is unavailable.',
    'Never invent numbers, holdings, returns, or transactions.',
    'For owner-level questions, use snapshot.owners and asset.owner fields and match names case-insensitively while ignoring punctuation and extra spaces.',
    'Scope policy is strict: "me/my/mine" means loggedInUser, explicit member name means that member, and total/overall means whole portfolio totals.',
    'For gold quantity questions, use quantity from Gold assets or owners.goldQuantity. Treat this as the portfolio quantity unit and only call it grams when explicitly indicated by the user or data conventions.',
    'Keep answer concise, factual, and clearly scoped to context.',
  ].join('\n');
}

export function getAiModelName() {
  return (process.env.NEXUS_AI_MODEL || DEFAULT_MODEL).trim() || DEFAULT_MODEL;
}

export function getGeminiApiKey() {
  return (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
}

export function resolveAiConfigFromEnv(): AiProviderConfig | null {
  const envKey = getGeminiApiKey();
  if (!envKey) return null;
  return {
    provider: 'gemini',
    model: getAiModelName(),
    apiKey: envKey,
  };
}

function extractGeminiText(response: GeminiResponse): string {
  const candidates = Array.isArray(response.candidates) ? response.candidates : [];
  for (const candidate of candidates) {
    const parts = candidate?.content?.parts;
    if (!Array.isArray(parts)) continue;
    const text = parts
      .map((part) => (typeof part?.text === 'string' ? part.text : ''))
      .join('')
      .trim();
    if (text) return text;
  }
  return '';
}

async function callGeminiChat(
  config: AiProviderConfig,
  systemPrompt: string,
  userMessage: string,
  abortController?: AbortController,
) {
  const { model, apiKey } = config;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: { temperature: 0.2 },
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
    }),
    signal: abortController?.signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text.slice(0, 300) || `Gemini request failed with status ${response.status}`);
  }

  const payload = await response.json() as GeminiResponse;
  if (payload.error?.message) throw new Error(payload.error.message.slice(0, 300));

  const answer = extractGeminiText(payload);
  if (!answer) throw new Error('AI returned an empty response.');

  return {
    answer,
    model,
    usage: payload.usageMetadata,
  };
}

async function callDeepSeekChat(
  config: AiProviderConfig,
  systemPrompt: string,
  userMessage: string,
  abortController?: AbortController,
) {
  const { model, apiKey } = config;

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    }),
    signal: abortController?.signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text.slice(0, 300) || `DeepSeek request failed with status ${response.status}`);
  }

  const payload = await response.json() as DeepSeekResponse;
  if (payload.error?.message) throw new Error(payload.error.message.slice(0, 300));

  const answer = payload.choices?.[0]?.message?.content?.trim();
  if (!answer) throw new Error('AI returned an empty response.');

  return {
    answer,
    model,
    usage: payload.usage
      ? {
          promptTokenCount: payload.usage.prompt_tokens,
          candidatesTokenCount: payload.usage.completion_tokens,
          totalTokenCount: payload.usage.total_tokens,
        }
      : undefined,
  };
}

async function callOpenAiChat(
  config: AiProviderConfig,
  systemPrompt: string,
  userMessage: string,
  abortController?: AbortController,
) {
  const { model, apiKey } = config;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    }),
    signal: abortController?.signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text.slice(0, 300) || `OpenAI request failed with status ${response.status}`);
  }

  const payload = await response.json() as OpenAIResponse;
  if (payload.error?.message) throw new Error(payload.error.message.slice(0, 300));

  const answer = payload.choices?.[0]?.message?.content?.trim();
  if (!answer) throw new Error('AI returned an empty response.');

  return {
    answer,
    model,
    usage: payload.usage
      ? {
          promptTokenCount: payload.usage.prompt_tokens,
          candidatesTokenCount: payload.usage.completion_tokens,
          totalTokenCount: payload.usage.total_tokens,
        }
      : undefined,
  };
}

async function callAnthropicChat(
  config: AiProviderConfig,
  systemPrompt: string,
  userMessage: string,
  abortController?: AbortController,
) {
  const { model, apiKey } = config;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      temperature: 0.2,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userMessage },
      ],
    }),
    signal: abortController?.signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text.slice(0, 300) || `Anthropic request failed with status ${response.status}`);
  }

  const payload = await response.json() as AnthropicResponse;
  if (payload.error?.message) throw new Error(payload.error.message.slice(0, 300));
  if (payload.error?.error?.message) throw new Error(payload.error.error.message.slice(0, 300));

  const textContents = payload.content?.filter((c) => c.text).map((c) => c.text).join('').trim();
  if (!textContents) throw new Error('AI returned an empty response.');

  return {
    answer: textContents,
    model,
    usage: payload.usage
      ? {
          promptTokenCount: payload.usage.input_tokens,
          candidatesTokenCount: payload.usage.output_tokens,
          totalTokenCount: (payload.usage.input_tokens || 0) + (payload.usage.output_tokens || 0),
        }
      : undefined,
  };
}

export async function callAiChat(
  config: AiProviderConfig,
  systemPrompt: string,
  userMessage: string,
): Promise<{ answer: string; model: string; usage?: GeminiUsage }> {
  if (!config.apiKey) throw new Error('AI API key is not configured.');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    if (config.provider === 'deepseek') {
      return await callDeepSeekChat(config, systemPrompt, userMessage, controller);
    }
    if (config.provider === 'openai') {
      return await callOpenAiChat(config, systemPrompt, userMessage, controller);
    }
    if (config.provider === 'anthropic') {
      return await callAnthropicChat(config, systemPrompt, userMessage, controller);
    }
    return await callGeminiChat(config, systemPrompt, userMessage, controller);
  } finally {
    clearTimeout(timeout);
  }
}

export async function generatePortfolioAnswer(input: {
  question: string;
  threadId?: string;
  snapshot: Record<string, unknown>;
  contextSummary: string;
  scopeHints?: {
    loggedInUser?: { uid: string; email: string | null };
    ownerCandidates?: string[];
    resolvedScope?: {
      scope: 'self' | 'member' | 'total' | 'unspecified';
      matchedOwner: string | null;
      reason: string;
    };
    interpretationRules?: string[];
  };
  aiConfig?: AiProviderConfig;
}) {
  const config = input.aiConfig || resolveAiConfigFromEnv();
  if (!config || !config.apiKey) {
    throw new Error('AI configuration missing. Set an API key in Settings or configure GEMINI_API_KEY in the server environment.');
  }

  const promptPayload = {
    contextSummary: input.contextSummary,
    threadId: input.threadId || null,
    snapshot: input.snapshot,
    userQuestion: input.question,
    scopeHints: input.scopeHints || null,
  };

  const systemPrompt = buildSystemPrompt();
  const userMessage = JSON.stringify(promptPayload);

  const result = await callAiChat(config, systemPrompt, userMessage);
  return result;
}
