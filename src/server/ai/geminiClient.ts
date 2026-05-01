import type { GeminiUsage } from './types.js';

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  usageMetadata?: GeminiUsage;
  error?: {
    message?: string;
  };
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

function extractText(response: GeminiResponse) {
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

export function getAiModelName() {
  return (process.env.NEXUS_AI_MODEL || DEFAULT_MODEL).trim() || DEFAULT_MODEL;
}

export function getGeminiApiKey() {
  return (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
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
}) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('AI configuration missing.');
  }

  const model = getAiModelName();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const promptPayload = {
    contextSummary: input.contextSummary,
    threadId: input.threadId || null,
    snapshot: input.snapshot,
    userQuestion: input.question,
    scopeHints: input.scopeHints || null,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: buildSystemPrompt() }],
        },
        generationConfig: {
          temperature: 0.2,
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: JSON.stringify(promptPayload) }],
          },
        ],
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    const message = text.slice(0, 300) || `Gemini request failed with status ${response.status}`;
    throw new Error(message);
  }

  const payload = await response.json() as GeminiResponse;
  if (payload.error?.message) {
    throw new Error(payload.error.message.slice(0, 300));
  }

  const answer = extractText(payload);
  if (!answer) {
    throw new Error('AI returned an empty response.');
  }

  return {
    answer,
    model,
    usage: payload.usageMetadata,
  };
}
