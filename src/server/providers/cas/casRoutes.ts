import { Router } from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';
import { requireFirebaseUser } from '../../auth/requireFirebaseUser.js';
import { smartParseCasPdf } from './casParserClient.js';

type NormalizedMutualFundHolding = {
  folioNumber: string;
  amc?: string;
  schemeName: string;
  isin?: string;
  units: number;
  nav?: number;
  value?: number;
  investedValue?: number;
  asOf?: string;
};

function safeError(error: unknown) {
  if (error instanceof Error) return error.message.slice(0, 250);
  return 'Unknown error';
}

function toHoldings(payload: Awaited<ReturnType<typeof smartParseCasPdf>>) {
  const holdings: NormalizedMutualFundHolding[] = [];
  for (const folio of payload.mutual_funds || []) {
    const folioNumber = (folio.folio_number || '').trim();
    if (!folioNumber) continue;
    for (const scheme of folio.schemes || []) {
      const schemeName = (scheme.name || '').trim();
      if (!schemeName) continue;
      const units = Number.isFinite(scheme.units) ? Number(scheme.units) : 0;
      if (units === 0) continue;
      holdings.push({
        folioNumber,
        amc: folio.amc,
        schemeName,
        isin: scheme.isin,
        units,
        nav: scheme.nav,
        value: scheme.value,
        investedValue: scheme.invested_value,
        asOf: scheme.as_of,
      });
    }
  }
  return holdings;
}

export function createCasRouter() {
  const router = Router();

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 12 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
        cb(null, true);
        return;
      }
      cb(new Error('Please upload a PDF file.'));
    },
  });

  router.post(
    '/import',
    requireFirebaseUser,
    upload.single('pdf_file'),
    async (req: Request, res: Response) => {
      const password = typeof req.body?.password === 'string' ? req.body.password.trim() : undefined;
      const file = req.file;

      if (!file?.buffer || file.buffer.length === 0) {
        return res.status(400).json({ error: 'Missing pdf_file.' });
      }

      try {
        const parsed = await smartParseCasPdf({ pdfBuffer: file.buffer, password });
        const holdings = toHoldings(parsed);

        return res.json({
          meta: parsed.meta || {},
          investor: parsed.investor || {},
          summary: parsed.summary || {},
          mutualFunds: holdings,
        });
      } catch (error) {
        return res.status(400).json({ error: safeError(error) });
      }
    },
  );

  return router;
}

