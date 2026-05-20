import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireFirebaseUser } from '../auth/requireFirebaseUser.js';
import { saveHistoricalPrices, getHistoricalPrices, deleteHistoricalBatch } from './historicalImportStore.js';
import { randomUUID } from 'node:crypto';

function safeError(error: unknown): string {
  if (error instanceof Error) return error.message.slice(0, 300);
  return 'Unknown error';
}

export function createHistoricalImportRouter() {
  const router = Router();

  router.post('/prices', requireFirebaseUser, async (req: Request, res: Response) => {
    const user = req.user!;
    const body = req.body as {
      prices?: Array<{ ticker: string; date: string; price: number; currency?: string }>;
    };

    if (!Array.isArray(body.prices) || body.prices.length === 0) {
      return res.status(400).json({ error: 'prices array is required and must not be empty.' });
    }

    for (const price of body.prices) {
      if (!price.ticker || !price.date || typeof price.price !== 'number' || price.price < 0) {
        return res.status(400).json({
          error: `Invalid price entry for ticker "${price.ticker || 'unknown'}" on date "${price.date || 'unknown'}".`,
        });
      }
    }

    try {
      const batchId = randomUUID();
      const result = await saveHistoricalPrices(
        user.uid,
        batchId,
        body.prices.map((p) => ({
          ticker: p.ticker.toUpperCase(),
          date: p.date,
          price: p.price,
          currency: (p.currency || 'USD').toUpperCase(),
        })),
      );
      return res.json({ ok: true, inserted: result.inserted, batchId });
    } catch (error) {
      return res.status(500).json({ error: safeError(error) });
    }
  });

  router.get('/prices', requireFirebaseUser, async (req: Request, res: Response) => {
    const user = req.user!;
    const ticker = req.query.ticker as string | undefined;

    try {
      const prices = await getHistoricalPrices(user.uid, ticker);
      return res.json({ prices });
    } catch (error) {
      return res.status(500).json({ error: safeError(error) });
    }
  });

  router.delete('/prices/:batchId', requireFirebaseUser, async (req: Request, res: Response) => {
    const user = req.user!;
    const { batchId } = req.params;

    if (!batchId) {
      return res.status(400).json({ error: 'batchId is required.' });
    }

    try {
      const result = await deleteHistoricalBatch(user.uid, batchId);
      return res.json({ ok: true, deleted: result.deleted });
    } catch (error) {
      return res.status(500).json({ error: safeError(error) });
    }
  });

  return router;
}
