import express from 'express';
import type { IncomingMessage, ServerResponse } from 'http';
import { createWorkspaceOwnershipRouter } from '../../src/server/user/workspaceOwnershipRoutes.js';

const app = express();
app.use(express.json());
app.use('/api/user/workspace-ownership', createWorkspaceOwnershipRouter());

export default function handler(req: IncomingMessage, res: ServerResponse) {
  app(req as Parameters<typeof app>[0], res as Parameters<typeof app>[1]);
}
