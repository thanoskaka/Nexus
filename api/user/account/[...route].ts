import express from 'express';
import type { IncomingMessage, ServerResponse } from 'http';
import { createAccountDeletionRouter } from '../../../src/server/user/accountDeletionRoutes.js';

const app = express();
app.use(express.json());
app.use('/api/user/account', createAccountDeletionRouter());

export default function handler(req: IncomingMessage, res: ServerResponse) {
  app(req as Parameters<typeof app>[0], res as Parameters<typeof app>[1]);
}
