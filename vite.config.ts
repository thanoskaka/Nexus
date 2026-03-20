import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fetchYahooFinancePrice } from './src/lib/financeServer';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(() => {
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
              const result = await fetchYahooFinancePrice(ticker);
              if (result.price == null) {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: result.error }));
                return;
              }

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ price: result.price }));
            } catch (error) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to fetch data' }));
            }
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
          theme_color: '#ffffff',
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
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
