import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import express from 'express';
import { fetchAutoMatchedPrice } from './src/lib/financeServer';
import { createSplitwiseRouter } from './src/server/splitwise/splitwiseRoutes';
import { createUpstoxRouter } from './src/server/providers/upstox/upstoxRoutes';
import { createSharedIntegrationsRouter } from './src/server/integrations/sharedRoutes';

const rootDir = process.cwd();

const splitwiseLocalApiApp = express();
splitwiseLocalApiApp.use(express.json());
splitwiseLocalApiApp.use('/api/splitwise', createSplitwiseRouter());
splitwiseLocalApiApp.use('/api/integrations/splitwise', createSplitwiseRouter());

async function tryHandleSplitwiseLocalApi(req: import('http').IncomingMessage, res: import('http').ServerResponse) {
  const path = (req.url || '').split('?')[0] || '';
  if (!path.startsWith('/api/splitwise') && !path.startsWith('/api/integrations/splitwise')) {
    return false;
  }

  try {
    await new Promise<void>((resolve, reject) => {
      splitwiseLocalApiApp(req as Parameters<typeof splitwiseLocalApiApp>[0], res as Parameters<typeof splitwiseLocalApiApp>[1], (error?: unknown) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  } catch (error) {
    if (!res.writableEnded) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Splitwise local API failed' }));
    }
    return true;
  }

  return res.writableEnded || res.headersSent;
}

const upstoxLocalApiApp = express();
upstoxLocalApiApp.use(express.json());
upstoxLocalApiApp.use('/api/connections/upstox', createUpstoxRouter());
upstoxLocalApiApp.use('/api/upstox', createUpstoxRouter());
upstoxLocalApiApp.use('/api/integrations', createSharedIntegrationsRouter());

async function tryHandleUpstoxLocalApi(
  req: import('http').IncomingMessage,
  res: import('http').ServerResponse,
) {
  const path = (req.url || '').split('?')[0] || '';
  if (!path.startsWith('/api/connections/upstox') && !path.startsWith('/api/upstox') && !path.startsWith('/api/integrations')) {
    return false;
  }

  try {
    await new Promise<void>((resolve, reject) => {
      upstoxLocalApiApp(req as Parameters<typeof upstoxLocalApiApp>[0], res as Parameters<typeof upstoxLocalApiApp>[1], (error?: unknown) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  } catch (error) {
    if (!res.writableEnded) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Upstox local API failed' }));
    }
    return true;
  }

  return res.writableEnded || res.headersSent;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const serverEnvKeys = [
    'MASSIVE_API_KEY',
    'ALPHA_VANTAGE_API_KEY',
    'UPSTOX_CLIENT_ID',
    'UPSTOX_CLIENT_SECRET',
    'UPSTOX_REDIRECT_URI',
    'UPSTOX_ACCESS_TOKEN',
    'FIREBASE_ADMIN_PROJECT_ID',
    'FIREBASE_ADMIN_CLIENT_EMAIL',
    'FIREBASE_ADMIN_PRIVATE_KEY',
    'SPLITWISE_CLIENT_ID',
    'SPLITWISE_CLIENT_SECRET',
    'SPLITWISE_REDIRECT_URI',
    'SPLITWISE_API_BASE_URL',
    'SPLITWISE_OAUTH_TOKEN_URL',
    'SPLITWISE_OAUTH_AUTHORIZE_URL',
    'SPLITWISE_STATE_SECRET',
    'INTEGRATION_TOKEN_ENCRYPTION_KEY',
    'APP_BASE_URL',
  ] as const;
  for (const key of serverEnvKeys) {
    if (env[key] && !process.env[key]) {
      process.env[key] = env[key];
    }
  }

  return {
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
    plugins: [
      react(), 
      tailwindcss(),
      {
        name: 'local-finance-api',
        configureServer(server) {
          server.middlewares.use('/api/health', (_req, res) => {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ status: 'ok' }));
          });

          server.middlewares.use(async (req, res, next) => {
            if (await tryHandleSplitwiseLocalApi(req, res)) {
              return;
            }
            if (await tryHandleUpstoxLocalApi(req, res)) {
              return;
            }
            next();
          });

          server.middlewares.use('/api/finance', async (req, res) => {
            const requestUrl = new URL(req.url || '', 'http://localhost');
            const ticker = requestUrl.searchParams.get('ticker');

            if (!ticker) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Ticker is required' }));
              return;
            }

            try {
              const result = await fetchAutoMatchedPrice({
                ticker,
                name: requestUrl.searchParams.get('name') || undefined,
                assetClass: requestUrl.searchParams.get('assetClass') || undefined,
                country: requestUrl.searchParams.get('country') || undefined,
              });
              if (result.price == null) {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  error: result.error,
                  previousClose: result.previousClose,
                  currency: result.currency,
                  sourceUrl: result.sourceUrl,
                  normalizedTicker: result.normalizedTicker,
                  provider: result.provider,
                }));
                return;
              }

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                price: result.price,
                previousClose: result.previousClose,
                currency: result.currency,
                sourceUrl: result.sourceUrl,
                normalizedTicker: result.normalizedTicker,
                provider: result.provider,
              }));
            } catch (error) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to fetch data' }));
            }
          });

          server.middlewares.use(async (req, res, next) => {
            if (!req.url?.startsWith('/api/finance-auto')) {
              next();
              return;
            }

            const requestUrl = new URL(req.url, 'http://localhost');
            const ticker = requestUrl.searchParams.get('ticker');

            if (!ticker) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Ticker is required' }));
              return;
            }

            try {
              const result = await fetchAutoMatchedPrice({
                ticker,
                name: requestUrl.searchParams.get('name') || undefined,
                assetClass: requestUrl.searchParams.get('assetClass') || undefined,
                country: requestUrl.searchParams.get('country') || undefined,
              });

              res.statusCode = result.price == null ? 404 : 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(result));
            } catch (error) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to fetch data' }));
            }
          });
        },
        configurePreviewServer(server) {
          server.middlewares.use('/api/health', (_req, res) => {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ status: 'ok' }));
          });

          server.middlewares.use(async (req, res, next) => {
            if (await tryHandleSplitwiseLocalApi(req, res)) {
              return;
            }
            if (await tryHandleUpstoxLocalApi(req, res)) {
              return;
            }
            next();
          });
        },
      },
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: {
          enabled: false,
        },
        manifest: {
          name: 'Nexus Portfolio',
          short_name: 'Nexus',
          description: 'A private, multi-currency global wealth tracker.',
          theme_color: '#00875A',
          background_color: '#F8F9FA',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': rootDir,
      },
    },
    server: {
      allowedHosts: [
        'concern-sri-challenging-prison.trycloudflare.com',
        'pac-habits-disturbed-expression.trycloudflare.com',
      ],
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
