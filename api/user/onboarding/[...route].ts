import express from 'express';
import type { IncomingMessage, ServerResponse } from 'http';
import { createOnboardingRouter } from '../../../src/server/user/onboardingRoutes.js';

const app = express();
app.use(express.json());
app.use('/api/user/onboarding', createOnboardingRouter());

export default function handler(req: IncomingMessage, res: ServerResponse) {
  app(req as Parameters<typeof app>[0], res as Parameters<typeof app>[1]);
}
