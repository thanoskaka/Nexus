import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockVerifyIdToken = vi.fn();
const mockDeleteUserData = vi.fn();
const mockDeleteFirebaseAuthUser = vi.fn();

vi.mock('../firebaseAdmin.js', () => ({
  getFirebaseAdminAuth: () => ({
    verifyIdToken: (...args: unknown[]) => mockVerifyIdToken(...args),
    deleteUser: (...args: unknown[]) => mockDeleteFirebaseAuthUser(...args),
  }),
  getFirebaseAdminFirestore: () => ({}),
}));

vi.mock('./accountDeletionStore.js', () => ({
  deleteUserData: (...args: unknown[]) => mockDeleteUserData(...args),
  deleteFirebaseAuthUser: (...args: unknown[]) => mockDeleteFirebaseAuthUser(...args),
}));

import { createAccountDeletionRouter } from './accountDeletionRoutes.js';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/user/account', createAccountDeletionRouter());
  return app;
}

describe('DELETE /api/user/account', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue({ uid: 'test-uid', email: 'test@example.com' });
  });

  it('requires authentication', async () => {
    const app = makeApp();
    const response = await request(app).delete('/api/user/account');
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  it('deletes user data and auth when authenticated', async () => {
    mockDeleteUserData.mockResolvedValue({
      deleted: {
        personalPortfolio: 1,
        externalConnections: 1,
        aiCredentials: 1,
      },
    });
    mockDeleteFirebaseAuthUser.mockResolvedValue(undefined);

    const app = makeApp();
    const response = await request(app)
      .delete('/api/user/account')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.authDeleted).toBe(true);
    expect(mockDeleteUserData).toHaveBeenCalledWith('test-uid', 'test@example.com');
    expect(mockDeleteFirebaseAuthUser).toHaveBeenCalledWith('test-uid');
  });

  it('handles auth user already deleted', async () => {
    mockDeleteUserData.mockResolvedValue({ deleted: { personalPortfolio: 1 } });
    const notFoundError = new Error('User not found');
    (notFoundError as any).code = 'auth/user-not-found';
    mockDeleteFirebaseAuthUser.mockRejectedValue(notFoundError);

    const app = makeApp();
    const response = await request(app)
      .delete('/api/user/account')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.authDeleted).toBe(false);
    expect(response.body.note).toContain('already deleted');
  });

  it('handles deletion failure gracefully', async () => {
    mockDeleteUserData.mockRejectedValue(new Error('Firestore error'));

    const app = makeApp();
    const response = await request(app)
      .delete('/api/user/account')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(500);
    expect(response.body.ok).toBe(false);
    expect(response.body.error).toBe('deletion_failed');
  });
});
