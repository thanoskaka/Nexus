import express from 'express';
import type { IncomingMessage, ServerResponse } from 'http';
import { createAiRouter } from '../../src/server/ai/aiRoutes.js';

const app = express();
app.use(express.json());
app.use('/api/ai', createAiRouter());

export default function handler(req: IncomingMessage, res: ServerResponse) {
  app(req as Parameters<typeof app>[0], res as Parameters<typeof app>[1]);
}
