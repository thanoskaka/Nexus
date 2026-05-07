import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireFirebaseUser } from '../auth/requireFirebaseUser.js';
import {
  getOnboardingState,
  saveOnboardingStep,
  completeOnboarding,
  resetOnboarding,
} from './onboardingStore.js';
import {
  type OnboardingPutBody,
  validateOnboardingInput,
} from './onboardingTypes.js';

function safeError(error: unknown): string {
  if (error instanceof Error) return error.message.slice(0, 300);
  return 'Unknown error';
}

export function createOnboardingRouter() {
  const router = Router();

  router.get('/', requireFirebaseUser, async (req: Request, res: Response) => {
    const user = req.user!;
    try {
      const result = await getOnboardingState(user.uid);
      return res.json(result);
    } catch (error) {
      return res.status(500).json({ error: safeError(error) });
    }
  });

  router.put('/', requireFirebaseUser, async (req: Request, res: Response) => {
    const user = req.user!;
    const body = req.body as OnboardingPutBody;

    const validationError = validateOnboardingInput(body);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    try {
      const result = await saveOnboardingStep(user.uid, body);
      return res.json(result);
    } catch (error) {
      return res.status(500).json({ error: safeError(error) });
    }
  });

  router.post('/complete', requireFirebaseUser, async (req: Request, res: Response) => {
    const user = req.user!;
    try {
      const result = await completeOnboarding(user.uid);
      return res.json(result);
    } catch (error) {
      return res.status(500).json({ error: safeError(error) });
    }
  });

  router.post('/reset', requireFirebaseUser, async (req: Request, res: Response) => {
    const user = req.user!;
    try {
      await resetOnboarding(user.uid);
      return res.json({ ok: true });
    } catch (error) {
      return res.status(500).json({ error: safeError(error) });
    }
  });

  return router;
}
