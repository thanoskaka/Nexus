import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireFirebaseUser } from '../auth/requireFirebaseUser.js';
import { deleteUserData, deleteFirebaseAuthUser } from './accountDeletionStore.js';

function safeError(error: unknown): string {
  if (error instanceof Error) return error.message.slice(0, 300);
  return 'Unknown error';
}

export function createAccountDeletionRouter() {
  const router = Router();

  router.delete('/', requireFirebaseUser, async (req: Request, res: Response) => {
    const user = req.user!;
    const uid = user.uid;
    const email = user.email;

    try {
      const result = await deleteUserData(uid, email);

      try {
        await deleteFirebaseAuthUser(uid);
        return res.json({ ok: true, authDeleted: true, ...result });
      } catch (authError) {
        const authErr = authError as { code?: string; errorInfo?: { code?: string } };
        const errorCode = authErr.code || authErr.errorInfo?.code || '';

        if (errorCode === 'auth/user-not-found') {
          return res.json({ ok: true, authDeleted: false, note: 'Firebase Auth user already deleted or not found.', ...result });
        }

        if (errorCode === 'auth/argument-error' || errorCode === 'auth/invalid-uid') {
          return res.json({ ok: true, authDeleted: false, note: 'Firebase Admin not fully configured. Auth user was not deleted.', ...result });
        }

        console.error(`Account deletion: Firebase Auth deleteUser failed for ${uid}:`, authError);
        return res.status(500).json({
          ok: false,
          error: 'deletion_failed',
          message: 'Server-side data was deleted, but Firebase Auth user could not be removed. Please try signing out and signing in again, then retry deletion.',
          dataDeleted: true,
          authDeleted: false,
        });
      }
    } catch (error) {
      console.error(`Account deletion failed for ${uid}:`, error);
      return res.status(500).json({
        ok: false,
        error: 'deletion_failed',
        message: safeError(error),
      });
    }
  });

  return router;
}
