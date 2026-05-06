import { auth } from './firebase';
import { assertHostedMode } from './workspaceGuard';

export type AiChatRole = 'system' | 'user' | 'assistant';

export type AiChatMessage = {
  role: AiChatRole;
  content: string;
};

export type AiChatRequest = {
  portfolioId: string;
  question: string;
  threadId?: string;
};

export type AiChatResponse = {
  answer: string;
  model: string;
  latencyMs: number;
  contextSummary: string;
  usage?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
    thoughtsTokenCount?: number;
  };
  raw?: unknown;
};

async function requireAuthHeaders() {
  assertHostedMode('AI Chat');
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('You must be signed in to ask Nexus AI.');
  }

  const token = await currentUser.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  } satisfies Record<string, string>;
}

function extractAnswer(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';

  const candidate = payload as Record<string, unknown>;
  const answer = candidate.answer ?? candidate.response ?? candidate.message;
  return typeof answer === 'string' ? answer : '';
}

function parseUsage(payload: unknown): AiChatResponse['usage'] | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const usage = (payload as Record<string, unknown>).usage;
  if (!usage || typeof usage !== 'object') return undefined;
  const usageRecord = usage as Record<string, unknown>;
  const promptTokenCount = typeof usageRecord.promptTokenCount === 'number' ? usageRecord.promptTokenCount : undefined;
  const candidatesTokenCount = typeof usageRecord.candidatesTokenCount === 'number' ? usageRecord.candidatesTokenCount : undefined;
  const totalTokenCount = typeof usageRecord.totalTokenCount === 'number' ? usageRecord.totalTokenCount : undefined;
  const thoughtsTokenCount = typeof usageRecord.thoughtsTokenCount === 'number' ? usageRecord.thoughtsTokenCount : undefined;

  if (
    promptTokenCount == null
    && candidatesTokenCount == null
    && totalTokenCount == null
    && thoughtsTokenCount == null
  ) {
    return undefined;
  }

  return { promptTokenCount, candidatesTokenCount, totalTokenCount, thoughtsTokenCount };
}

export async function sendAiChat(input: AiChatRequest): Promise<AiChatResponse> {
  const portfolioId = input.portfolioId?.trim() || '';
  const question = input.question?.trim() || '';
  if (!portfolioId) {
    throw new Error('portfolioId is required.');
  }
  if (!question) {
    throw new Error('Please enter a question.');
  }

  const headers = await requireAuthHeaders();
  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      portfolioId,
      question,
      ...(input.threadId ? { threadId: input.threadId } : {}),
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload && typeof payload === 'object' && 'error' in payload
      ? String((payload as { error?: string }).error || 'AI request failed')
      : 'AI request failed';
    throw new Error(message);
  }

  const answer = extractAnswer(payload);
  if (!answer) {
    throw new Error('AI returned an empty answer. Please retry.');
  }

  const model = payload && typeof payload === 'object' && 'model' in payload
    ? String((payload as { model?: string }).model || '').trim()
    : '';
  const contextSummary = payload && typeof payload === 'object' && 'contextSummary' in payload
    ? String((payload as { contextSummary?: string }).contextSummary || '').trim()
    : '';
  const latencyMs = payload && typeof payload === 'object' && 'latencyMs' in payload
    ? Number((payload as { latencyMs?: number }).latencyMs)
    : NaN;

  if (!model) {
    throw new Error('AI response did not include model metadata.');
  }
  if (!contextSummary) {
    throw new Error('AI response did not include context summary.');
  }
  if (!Number.isFinite(latencyMs) || latencyMs < 0) {
    throw new Error('AI response included invalid latency metadata.');
  }

  return {
    answer,
    model,
    latencyMs,
    contextSummary,
    usage: parseUsage(payload),
    raw: payload,
  };
}
