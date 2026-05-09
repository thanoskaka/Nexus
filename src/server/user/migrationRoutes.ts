import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireFirebaseUser } from '../auth/requireFirebaseUser.js';
import {
  getMigrationState,
  startExport,
  completeExport,
  recordImport,
  completeVerification,
  markDataDeleted,
  resetMigration,
  recordError,
} from './migrationStore.js';

function safeError(error: unknown): string {
  if (error instanceof Error) return error.message.slice(0, 300);
  return 'Unknown error';
}

export function createMigrationRouter() {
  const router = Router();

  router.get('/', requireFirebaseUser, async (req: Request, res: Response) => {
    const user = req.user!;
    try {
      const migration = await getMigrationState(user.uid);
      return res.json({ migration });
    } catch (error) {
      return res.status(500).json({ error: safeError(error) });
    }
  });

  router.post('/export/start', requireFirebaseUser, async (req: Request, res: Response) => {
    const user = req.user!;
    const body = req.body as {
      assetCount?: number;
      assetClassCount?: number;
      connectedAccountCount?: number;
      checksum?: string;
    };

    if (typeof body.assetCount !== 'number' || typeof body.checksum !== 'string') {
      return res.status(400).json({ error: 'assetCount and checksum are required' });
    }

    try {
      const doc = await startExport(user.uid, {
        assetCount: body.assetCount,
        assetClassCount: body.assetClassCount || 0,
        connectedAccountCount: body.connectedAccountCount || 0,
        exportVersion: 1,
        checksum: body.checksum,
      });
      return res.json({ ok: true, phase: doc.phase, exportSnapshot: doc.exportSnapshot } as const);
    } catch (error) {
      await recordError(user.uid, safeError(error));
      return res.status(500).json({ error: safeError(error) });
    }
  });

  router.post('/export/complete', requireFirebaseUser, async (req: Request, res: Response) => {
    const user = req.user!;
    try {
      const doc = await completeExport(user.uid);
      return res.json({ ok: true, phase: doc.phase });
    } catch (error) {
      return res.status(500).json({ error: safeError(error) });
    }
  });

  router.post('/import/confirm', requireFirebaseUser, async (req: Request, res: Response) => {
    const user = req.user!;
    const body = req.body as {
      assetCount?: number;
      assetClassCount?: number;
      warnings?: string[];
    };

    if (typeof body.assetCount !== 'number') {
      return res.status(400).json({ error: 'assetCount is required' });
    }

    try {
      const doc = await recordImport(user.uid, {
        assetCount: body.assetCount,
        assetClassCount: body.assetClassCount || 0,
        warnings: body.warnings || [],
      });
      return res.json({ ok: true, phase: doc.phase, importSnapshot: doc.importSnapshot } as const);
    } catch (error) {
      return res.status(500).json({ error: safeError(error) });
    }
  });

  router.post('/verify', requireFirebaseUser, async (req: Request, res: Response) => {
    const user = req.user!;
    const body = req.body as { shasum?: string };

    if (typeof body.shasum !== 'string') {
      return res.status(400).json({ error: 'shasum is required for verification' });
    }

    try {
      const doc = await completeVerification(user.uid, body.shasum);
      const match = doc.exportSnapshot?.checksum === body.shasum;
      return res.json({
        ok: true,
        phase: doc.phase,
        match,
        summary: {
          hostedAssets: doc.exportSnapshot?.assetCount || 0,
          selfHostedAssets: doc.importSnapshot?.assetCount || 0,
        },
      } as const);
    } catch (error) {
      return res.status(500).json({ error: safeError(error) });
    }
  });

  router.post('/data-deleted', requireFirebaseUser, async (req: Request, res: Response) => {
    const user = req.user!;
    try {
      const doc = await markDataDeleted(user.uid);
      return res.json({ ok: true, phase: doc.phase });
    } catch (error) {
      return res.status(500).json({ error: safeError(error) });
    }
  });

  router.post('/reset', requireFirebaseUser, async (req: Request, res: Response) => {
    const user = req.user!;
    try {
      await resetMigration(user.uid);
      return res.json({ ok: true });
    } catch (error) {
      return res.status(500).json({ error: safeError(error) });
    }
  });

  return router;
}
