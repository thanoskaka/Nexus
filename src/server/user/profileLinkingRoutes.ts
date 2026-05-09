import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireFirebaseUser } from '../auth/requireFirebaseUser.js';
import {
  getMemberProfiles,
  linkProfileToMember,
  unlinkProfileFromMember,
} from './profileLinkingStore.js';

function safeError(error: unknown): string {
  if (error instanceof Error) return error.message.slice(0, 300);
  return 'Unknown error';
}

const VALID_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function createProfileLinkingRouter() {
  const router = Router();

  router.get('/:portfolioId/profiles', requireFirebaseUser, async (req: Request, res: Response) => {
    const { portfolioId } = req.params;
    if (!portfolioId) {
      return res.status(400).json({ error: 'portfolioId is required' });
    }

    try {
      const profiles = await getMemberProfiles(portfolioId);
      const sanitized = profiles.map((p) => ({
        email: p.email,
        displayName: p.displayName,
        avatarUrl: p.avatarUrl,
        linkedAt: p.linkedAt,
      }));
      return res.json({ profiles: sanitized });
    } catch (error) {
      return res.status(500).json({ error: safeError(error) });
    }
  });

  router.put('/:portfolioId/link', requireFirebaseUser, async (req: Request, res: Response) => {
    const user = req.user!;
    const { portfolioId } = req.params;
    const { memberEmail, displayName, avatarUrl } = req.body as {
      memberEmail?: string;
      displayName?: string;
      avatarUrl?: string;
    };

    if (!portfolioId) {
      return res.status(400).json({ error: 'portfolioId is required' });
    }

    if (!memberEmail || !VALID_EMAIL_RE.test(memberEmail)) {
      return res.status(400).json({ error: 'A valid memberEmail is required' });
    }

    try {
      const record = await linkProfileToMember(
        portfolioId,
        memberEmail,
        user.uid,
        displayName,
        avatarUrl,
      );
      return res.json({
        ok: true,
        member: {
          email: record.email,
          displayName: record.displayName,
          avatarUrl: record.avatarUrl,
          linkedAt: record.linkedAt,
        },
      });
    } catch (error) {
      return res.status(500).json({ error: safeError(error) });
    }
  });

  router.delete('/:portfolioId/link', requireFirebaseUser, async (req: Request, res: Response) => {
    const { portfolioId } = req.params;
    const { memberEmail } = req.body as { memberEmail?: string };

    if (!portfolioId || !memberEmail) {
      return res.status(400).json({ error: 'portfolioId and memberEmail are required' });
    }

    try {
      const unlinked = await unlinkProfileFromMember(portfolioId, memberEmail);
      if (!unlinked) {
        return res.status(404).json({ error: 'No profile link found for this member' });
      }
      return res.json({ ok: true });
    } catch (error) {
      return res.status(500).json({ error: safeError(error) });
    }
  });

  return router;
}
