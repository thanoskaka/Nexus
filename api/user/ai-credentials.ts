import express from 'express';
import type { IncomingMessage, ServerResponse } from 'http';
import { createAiCredentialsRouter } from '../../src/server/user/aiCredentialsRoutes.js';

const app = express();
app.use(express.json());
app.use('/api/user/ai-credentials', createAiCredentialsRouter());

export default function handler(req: IncomingMessage, res: ServerResponse) {
  app(req as Parameters<typeof app>[0], res as Parameters<typeof app>[1]);
}
