import express from 'express';
import { getSetupCapabilities } from './setupStatusService.js';
import { verifyCapability, verifyAllCapabilities } from './setupVerificationService.js';

export function createSetupStatusRouter() {
  const router = express.Router();

  router.get('/status', (_req, res) => {
    const result = getSetupCapabilities({
      env: process.env as Record<string, string | undefined>,
    });
    res.json(result);
  });

  router.post('/verify/:capabilityId', (req, res) => {
    const { capabilityId } = req.params;
    const result = verifyCapability(
      capabilityId,
      process.env as Record<string, string | undefined>,
    );
    res.json(result);
  });

  router.post('/verify', (_req, res) => {
    const results = verifyAllCapabilities(
      process.env as Record<string, string | undefined>,
    );
    res.json({ results });
  });

  return router;
}
