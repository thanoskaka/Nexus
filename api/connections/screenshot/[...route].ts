import express from 'express';
import type { IncomingMessage, ServerResponse } from 'http';
import { createScreenshotRouter } from '../../../src/server/providers/screenshot/screenshotRoutes.js';

const app = express();
app.use(express.json());
app.use('/api/connections/screenshot', createScreenshotRouter());
app.use('/api/import', createScreenshotRouter());

export default function handler(req: IncomingMessage, res: ServerResponse) {
  app(req as Parameters<typeof app>[0], res as Parameters<typeof app>[1]);
}
