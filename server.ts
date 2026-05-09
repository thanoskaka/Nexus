import express from 'express';
import { createServer as createViteServer, loadEnv } from 'vite';
import path from 'path';
import { fetchAutoMatchedPrice, searchInstruments } from './src/lib/financeServer';
import { getStorageAdapterAsync } from './src/server/storage/index.js';
import { createSplitwiseRouter } from './src/server/splitwise/splitwiseRoutes';
import { createUpstoxRouter } from './src/server/providers/upstox/upstoxRoutes';
import { createSharedIntegrationsRouter } from './src/server/integrations/sharedRoutes';
import { createScreenshotRouter } from './src/server/providers/screenshot/screenshotRoutes.js';
import { createAiCredentialsRouter } from './src/server/user/aiCredentialsRoutes.js';
import { createAccountDeletionRouter } from './src/server/user/accountDeletionRoutes.js';
import { createWorkspaceOwnershipRouter } from './src/server/user/workspaceOwnershipRoutes.js';
import { createOnboardingRouter } from './src/server/user/onboardingRoutes.js';
import { createMigrationRouter } from './src/server/user/migrationRoutes.js';
import { createHistoricalImportRouter } from './src/server/user/historicalImportRoutes.js';
import { createProfileLinkingRouter } from './src/server/user/profileLinkingRoutes.js';
import { createSetupStatusRouter } from './src/server/setup/setupStatusRoutes.js';

function getNormalizedTicker(result: unknown) {
  const typed = result as { normalizedTicker?: string; yahooTicker?: string };
  return typed.normalizedTicker || typed.yahooTicker;
}

export function createApp() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/finance', async (req, res) => {
    const ticker = req.query.ticker as string;
    if (!ticker) {
      return res.status(400).json({ error: 'Ticker is required' });
    }

    try {
      const result = await fetchAutoMatchedPrice({
        ticker,
        name: req.query.name as string | undefined,
        assetClass: req.query.assetClass as string | undefined,
        country: req.query.country as string | undefined,
      });

      if (result.price !== null) {
        return res.json({
          price: result.price,
          previousClose: result.previousClose,
          currency: result.currency,
          sourceUrl: result.sourceUrl,
          normalizedTicker: getNormalizedTicker(result),
          provider: 'provider' in result ? result.provider : 'yahoo',
        });
      }

      return res.status(404).json({
        error: result.error,
        previousClose: result.previousClose,
        currency: result.currency,
        sourceUrl: result.sourceUrl,
        normalizedTicker: getNormalizedTicker(result),
        provider: 'provider' in result ? result.provider : 'yahoo',
      });
    } catch (error) {
      console.error('Error fetching finance data from Yahoo:', error);
      return res.status(500).json({ error: 'Failed to fetch data' });
    }
  });

  app.get('/api/finance-auto', async (req, res) => {
    const ticker = req.query.ticker as string;
    if (!ticker) {
      return res.status(400).json({ error: 'Ticker is required' });
    }

    try {
      const result = await fetchAutoMatchedPrice({
        ticker,
        name: req.query.name as string | undefined,
        assetClass: req.query.assetClass as string | undefined,
        country: req.query.country as string | undefined,
      });

      if (result.price !== null) {
        return res.json(result);
      }
      return res.status(404).json(result);
    } catch (error) {
      console.error('Error fetching auto-matched finance data:', error);
      return res.status(500).json({ error: 'Failed to fetch data' });
    }
  });

  app.use('/api/splitwise', createSplitwiseRouter());
  app.use('/api/integrations/splitwise', createSplitwiseRouter());
  app.use('/api/connections/upstox', createUpstoxRouter());
  app.use('/api/integrations', createSharedIntegrationsRouter());
  // Compatibility alias if redirect URI is configured without the /connections segment.
  app.use('/api/upstox', createUpstoxRouter());
  app.use('/api/connections/screenshot', createScreenshotRouter());
  app.use('/api/import', createScreenshotRouter());
  app.use('/api/user/ai-credentials', createAiCredentialsRouter());
  app.use('/api/user/workspace-ownership', createWorkspaceOwnershipRouter());
  app.use('/api/user/onboarding', createOnboardingRouter());
  app.use('/api/setup', createSetupStatusRouter());
  app.use('/api/user/account', createAccountDeletionRouter());
  app.use('/api/user/migration', createMigrationRouter());
  app.use('/api/user/history', createHistoricalImportRouter());
  app.use('/api/user/members', createProfileLinkingRouter());

  app.get('/api/instruments/search', async (req, res) => {
    const q = (req.query.q as string || '').trim();
    if (!q || q.length < 2) {
      return res.json({ suggestions: [] });
    }

    try {
      const suggestions = await searchInstruments({
        q,
        country: req.query.country as string | undefined,
        assetClass: req.query.assetClass as string | undefined,
      });
      return res.json({ suggestions });
    } catch (error) {
      console.error('Error in instrument search:', error);
      return res.status(500).json({ error: 'Instrument search failed', suggestions: [] });
    }
  });

  return app;
}

export async function startServer() {
  const env = loadEnv(process.env.NODE_ENV || 'development', process.cwd(), '');

  for (const [key, value] of Object.entries(env)) {
    if (value && !process.env[key]) {
      process.env[key] = value;
    }
  }

  try {
    await getStorageAdapterAsync();
  } catch (err) {
    console.warn('Storage adapter init:', err);
  }

  const app = createApp();
  const PORT = Number(process.env.PORT || env.PORT || 3000);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

void startServer();
