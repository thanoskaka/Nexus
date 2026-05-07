import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireFirebaseUser } from '../auth/requireFirebaseUser.js';
import {
  getServerWorkspaceOwnership,
  saveServerWorkspaceOwnership,
} from './workspaceOwnershipStore.js';
import {
  type WorkspaceOwnershipPutRequest,
  validateWorkspaceOwnershipInput,
} from './workspaceOwnershipTypes.js';

function safeError(error: unknown): string {
  if (error instanceof Error) return error.message.slice(0, 300);
  return 'Unknown error';
}

export function createWorkspaceOwnershipRouter() {
  const router = Router();

  router.get('/', requireFirebaseUser, async (req: Request, res: Response) => {
    const user = req.user!;
    try {
      const result = await getServerWorkspaceOwnership(user.uid);
      return res.json(result);
    } catch (error) {
      return res.status(500).json({ error: safeError(error) });
    }
  });

  router.put('/', requireFirebaseUser, async (req: Request, res: Response) => {
    const user = req.user!;
    const body = req.body as WorkspaceOwnershipPutRequest;
    const validationError = validateWorkspaceOwnershipInput(body);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    try {
      const result = await saveServerWorkspaceOwnership({
        uid: user.uid,
        email: user.email,
        mode: body.mode!,
        firebaseConfig: body.firebaseConfig,
      });
      return res.json(result);
    } catch (error) {
      return res.status(500).json({ error: safeError(error) });
    }
  });

  return router;
}
