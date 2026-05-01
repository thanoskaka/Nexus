import type { AiChatRequestBody } from './types.js';

const MAX_PORTFOLIO_ID_LENGTH = 140;
const MAX_QUESTION_LENGTH = 1500;
const MAX_THREAD_ID_LENGTH = 140;

function asString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function validateAiChatBody(body: unknown): { ok: true; value: AiChatRequestBody } | { ok: false; error: string } {
  const typed = body as Partial<Record<'portfolioId' | 'question' | 'threadId', unknown>> | null;
  const portfolioId = asString(typed?.portfolioId);
  const question = asString(typed?.question);
  const threadIdRaw = typed?.threadId;
  const threadId = threadIdRaw === undefined || threadIdRaw === null ? undefined : asString(threadIdRaw);

  if (!portfolioId) {
    return { ok: false, error: 'portfolioId is required.' };
  }
  if (portfolioId.length > MAX_PORTFOLIO_ID_LENGTH) {
    return { ok: false, error: 'portfolioId is too long.' };
  }
  if (!question) {
    return { ok: false, error: 'question is required.' };
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    return { ok: false, error: `question must be ${MAX_QUESTION_LENGTH} characters or fewer.` };
  }
  if (threadId !== undefined && !threadId) {
    return { ok: false, error: 'threadId cannot be empty when provided.' };
  }
  if (threadId && threadId.length > MAX_THREAD_ID_LENGTH) {
    return { ok: false, error: 'threadId is too long.' };
  }

  return {
    ok: true,
    value: {
      portfolioId,
      question,
      ...(threadId ? { threadId } : {}),
    },
  };
}
