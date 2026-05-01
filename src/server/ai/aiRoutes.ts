import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireFirebaseUser } from '../auth/requireFirebaseUser.js';
import { writeAiRun } from './aiRunStore.js';
import { buildPortfolioSnapshot } from './contextBuilder.js';
import { generatePortfolioAnswer, getGeminiApiKey } from './geminiClient.js';
import { getPersonalPortfolioByUid, getPortfolioById, isPortfolioMember } from './portfolioAccess.js';
import { validateAiChatBody } from './validation.js';

function clampLatency(startedAt: number) {
  const elapsed = Date.now() - startedAt;
  return elapsed > 0 ? elapsed : 0;
}

function toSafeErrorMessage(error: unknown) {
  if (error instanceof Error) {
    const rawMessage = error.message || '';
    const message = rawMessage.toLowerCase();
    if (message.includes('ai configuration missing')) {
      return 'Missing GEMINI_API_KEY server configuration. Add GEMINI_API_KEY to .env.local.';
    }
    if (message.includes('timeout') || message.includes('abort')) {
      return 'AI request timed out. Please try again.';
    }
    if (process.env.NODE_ENV !== 'production') {
      return rawMessage.slice(0, 300);
    }
  }
  return 'Unable to process AI request right now.';
}

function normalizeForMatch(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function extractOwnerCandidates(snapshot: Record<string, unknown>) {
  const owners = new Set<string>();

  const ownerRows = Array.isArray(snapshot.owners) ? snapshot.owners : [];
  for (const row of ownerRows) {
    const owner = (row as { owner?: unknown }).owner;
    if (typeof owner === 'string' && owner.trim()) owners.add(owner.trim());
  }

  const assets = Array.isArray(snapshot.assets) ? snapshot.assets : [];
  for (const asset of assets) {
    const owner = (asset as { owner?: unknown }).owner;
    if (typeof owner === 'string' && owner.trim()) owners.add(owner.trim());
  }

  return [...owners];
}

function detectScope(question: string, ownerCandidates: string[]) {
  const lowerQuestion = question.toLowerCase();
  const normalizedQuestion = normalizeForMatch(question);
  const hasSelfReference = /\b(i|me|my|mine|myself)\b/.test(lowerQuestion);
  const hasTotalReference = /\b(total|overall|combined|entire|whole|all|portfolio total|family total)\b/.test(lowerQuestion);

  const matchedOwner = ownerCandidates.find((owner) => {
    const normalizedOwner = normalizeForMatch(owner);
    if (!normalizedOwner) return false;
    if (normalizedQuestion.includes(normalizedOwner)) return true;

    const parts = owner
      .split(/\s+/)
      .map((part) => normalizeForMatch(part))
      .filter((part) => part.length >= 3);
    return parts.length > 0 && parts.every((part) => normalizedQuestion.includes(part));
  });

  if (matchedOwner) {
    return {
      scope: 'member',
      matchedOwner,
      reason: 'Question explicitly names a member/owner.',
    } as const;
  }

  if (hasTotalReference) {
    return {
      scope: 'total',
      matchedOwner: null,
      reason: 'Question asks for combined/overall totals.',
    } as const;
  }

  if (hasSelfReference) {
    return {
      scope: 'self',
      matchedOwner: null,
      reason: 'Question uses self references (me/my/mine).',
    } as const;
  }

  return {
    scope: 'unspecified',
    matchedOwner: null,
    reason: 'No explicit target found; default to best-fit portfolio context.',
  } as const;
}

export function createAiRouter() {
  const router = Router();

  router.post('/chat', requireFirebaseUser, async (req: Request, res: Response) => {
    const validation = validateAiChatBody(req.body);
    if (!validation.ok) {
      const errorMessage = 'error' in validation ? validation.error : 'Invalid request body.';
      return res.status(400).json({ error: errorMessage });
    }

    const { portfolioId, question, threadId } = validation.value;
    const user = req.user!;
    const startedAt = Date.now();

    try {
      if (!getGeminiApiKey()) {
        return res.status(500).json({
          error: 'Missing GEMINI_API_KEY server configuration. Add GEMINI_API_KEY to .env.local.',
        });
      }

      let portfolio = await getPortfolioById(portfolioId);
      if (!portfolio) {
        return res.status(404).json({ error: 'Portfolio not found.' });
      }
      if (!isPortfolioMember(portfolio, user)) {
        const personalFallback = await getPersonalPortfolioByUid(user.uid);
        if (!personalFallback || !isPortfolioMember(personalFallback, user)) {
          return res.status(403).json({ error: 'Forbidden' });
        }
        portfolio = personalFallback;
      }

      const { snapshot, contextSummary } = buildPortfolioSnapshot(portfolio);
      const ownerCandidates = extractOwnerCandidates(snapshot);
      const resolvedScope = detectScope(question, ownerCandidates);
      const result = await generatePortfolioAnswer({
        question,
        threadId,
        snapshot,
        contextSummary,
        scopeHints: {
          loggedInUser: {
            uid: user.uid,
            email: user.email || null,
          },
          ownerCandidates,
          resolvedScope,
          interpretationRules: [
            'If question says me/my/mine, answer for loggedInUser only.',
            'If question names a member/owner, answer for that matched owner only.',
            'If question asks total/overall/combined, answer with portfolio totals.',
          ],
        },
      });
      const latencyMs = clampLatency(startedAt);

      await writeAiRun({
        uid: user.uid,
        portfolioId,
        question,
        answer: result.answer,
        model: result.model,
        latencyMs,
        usage: result.usage,
      });

      return res.json({
        answer: result.answer,
        model: result.model,
        latencyMs,
        contextSummary,
        ...(result.usage ? { usage: result.usage } : {}),
      });
    } catch (error) {
      return res.status(500).json({ error: toSafeErrorMessage(error) });
    }
  });

  return router;
}
