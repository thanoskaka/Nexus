import express from 'express';
import type { IncomingMessage, ServerResponse } from 'http';
import { createAccountDeletionRouter } from '../../src/server/user/accountDeletionRoutes.js';
import { createAiCredentialsRouter } from '../../src/server/user/aiCredentialsRoutes.js';
import { createOnboardingRouter } from '../../src/server/user/onboardingRoutes.js';
import { createWorkspaceOwnershipRouter } from '../../src/server/user/workspaceOwnershipRoutes.js';

const app = express();
app.use(express.json());
app.use('/api/user/account', createAccountDeletionRouter());
app.use('/api/user/ai-credentials', createAiCredentialsRouter());
app.use('/api/user/onboarding', createOnboardingRouter());
app.use('/api/user/workspace-ownership', createWorkspaceOwnershipRouter());

export default function handler(req: IncomingMessage, res: ServerResponse) {
  app(req as Parameters<typeof app>[0], res as Parameters<typeof app>[1]);
}
