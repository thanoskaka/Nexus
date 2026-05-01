import { getFirebaseAdminFirestore } from '../firebaseAdmin.js';
import type { GeminiUsage } from './types.js';

const COLLECTION = 'ai_runs';

function now() {
  return Date.now();
}

function compactUsage(usage?: GeminiUsage) {
  if (!usage) return undefined;
  const payload = {
    promptTokenCount: usage.promptTokenCount,
    candidatesTokenCount: usage.candidatesTokenCount,
    totalTokenCount: usage.totalTokenCount,
    thoughtsTokenCount: usage.thoughtsTokenCount,
  };
  const hasAny = Object.values(payload).some((value) => typeof value === 'number');
  return hasAny ? payload : undefined;
}

export async function writeAiRun(input: {
  uid: string;
  portfolioId: string;
  question: string;
  answer: string;
  model: string;
  latencyMs: number;
  usage?: GeminiUsage;
}) {
  const usage = compactUsage(input.usage);
  await getFirebaseAdminFirestore().collection(COLLECTION).add({
    uid: input.uid,
    portfolioId: input.portfolioId,
    question: input.question,
    answer: input.answer,
    model: input.model,
    latencyMs: input.latencyMs,
    ...(usage ? { usage } : {}),
    createdAt: now(),
  });
}
