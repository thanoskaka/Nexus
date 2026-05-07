import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockVerifyIdToken = vi.fn();
const mockGetServerWorkspaceOwnership = vi.fn();
const mockSaveServerWorkspaceOwnership = vi.fn();

vi.mock('../firebaseAdmin.js', () => ({
  getFirebaseAdminAuth: () => ({
    verifyIdToken: (...args: unknown[]) => mockVerifyIdToken(...args),
  }),
}));

vi.mock('./workspaceOwnershipStore.js', () => ({
  getServerWorkspaceOwnership: (...args: unknown[]) => mockGetServerWorkspaceOwnership(...args),
  saveServerWorkspaceOwnership: (...args: unknown[]) => mockSaveServerWorkspaceOwnership(...args),
}));

import { createWorkspaceOwnershipRouter } from './workspaceOwnershipRoutes.js';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/user/workspace-ownership', createWorkspaceOwnershipRouter());
  return app;
}

describe('/api/user/workspace-ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue({ uid: 'uid-1', email: 'user@example.com' });
  });

  it('requires authentication', async () => {
    const response = await request(makeApp()).get('/api/user/workspace-ownership');
    expect(response.status).toBe(401);
  });

  it('returns server workspace ownership for verified user', async () => {
    mockGetServerWorkspaceOwnership.mockResolvedValue({ ownership: { mode: 'hosted', savedAt: 123 } });

    const response = await request(makeApp())
      .get('/api/user/workspace-ownership')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ownership: { mode: 'hosted', savedAt: 123 } });
    expect(mockGetServerWorkspaceOwnership).toHaveBeenCalledWith('uid-1');
  });

  it('saves workspace ownership for verified user without trusting request uid', async () => {
    mockSaveServerWorkspaceOwnership.mockResolvedValue({ ownership: { mode: 'hosted', savedAt: 456 } });

    const response = await request(makeApp())
      .put('/api/user/workspace-ownership')
      .set('Authorization', 'Bearer token')
      .send({ uid: 'attacker', mode: 'hosted' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ownership: { mode: 'hosted', savedAt: 456 } });
    expect(mockSaveServerWorkspaceOwnership).toHaveBeenCalledWith({
      uid: 'uid-1',
      email: 'user@example.com',
      mode: 'hosted',
      firebaseConfig: undefined,
    });
  });

  it('rejects self-owned mode without firebase config', async () => {
    const response = await request(makeApp())
      .put('/api/user/workspace-ownership')
      .set('Authorization', 'Bearer token')
      .send({ mode: 'selfOwned' });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Firebase config');
    expect(mockSaveServerWorkspaceOwnership).not.toHaveBeenCalled();
  });
});
