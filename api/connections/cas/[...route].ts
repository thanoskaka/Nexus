import express from 'express';
import type { IncomingMessage, ServerResponse } from 'http';
import { createCasRouter } from '../../../src/server/providers/cas/casRoutes.js';

const app = express();
app.use(express.json());
app.use('/api/connections/cas', createCasRouter());
app.use('/api/cas', createCasRouter());

export default function handler(req: IncomingMessage, res: ServerResponse) {
  app(req as Parameters<typeof app>[0], res as Parameters<typeof app>[1]);
}

