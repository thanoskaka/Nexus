import express from 'express';
import { getSetupCapabilities } from './setupStatusService.js';

export function createSetupStatusRouter() {
  const router = express.Router();

  router.get('/status', (_req, res) => {
    const result = getSetupCapabilities({
      env: process.env as Record<string, string | undefined>,
    });
    res.json(result);
  });

  return router;
}
