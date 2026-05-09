import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockVerifyIdToken = vi.fn();
const mockGetMemberProfiles = vi.fn();
const mockLinkProfileToMember = vi.fn();
const mockUnlinkProfileFromMember = vi.fn();

vi.mock('../firebaseAdmin.js', () => ({
  getFirebaseAdminAuth: () => ({
    verifyIdToken: (...args: unknown[]) => mockVerifyIdToken(...args),
  }),
}));

vi.mock('./profileLinkingStore.js', () => ({
  getMemberProfiles: (...args: unknown[]) => mockGetMemberProfiles(...args),
  linkProfileToMember: (...args: unknown[]) => mockLinkProfileToMember(...args),
  unlinkProfileFromMember: (...args: unknown[]) => mockUnlinkProfileFromMember(...args),
}));

import { createProfileLinkingRouter } from './profileLinkingRoutes.js';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/user/members', createProfileLinkingRouter());
  return app;
}

describe('/api/user/members', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue({ uid: 'uid-1', email: 'user@example.com' });
  });

  it('requires authentication', async () => {
    const response = await request(makeApp()).get('/api/user/members/portfolio-1/profiles');
    expect(response.status).toBe(401);
  });

  describe('GET /:portfolioId/profiles', () => {
    it('returns profiles for a portfolio', async () => {
      mockGetMemberProfiles.mockResolvedValue([
        { email: 'a@example.com', displayName: 'Alice', avatarUrl: null, linkedAt: 1000 },
      ]);

      const response = await request(makeApp())
        .get('/api/user/members/portfolio-1/profiles')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(200);
      expect(response.body.profiles).toHaveLength(1);
      expect(response.body.profiles[0].email).toBe('a@example.com');
    });
  });

  describe('PUT /:portfolioId/link', () => {
    it('links a profile to a member', async () => {
      mockLinkProfileToMember.mockResolvedValue({
        email: 'alice@example.com',
        displayName: 'Alice',
        avatarUrl: null,
        linkedAt: 1000,
      });

      const response = await request(makeApp())
        .put('/api/user/members/portfolio-1/link')
        .set('Authorization', 'Bearer token')
        .send({ memberEmail: 'alice@example.com', displayName: 'Alice' });

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.member.email).toBe('alice@example.com');
      expect(mockLinkProfileToMember).toHaveBeenCalledWith(
        'portfolio-1', 'alice@example.com', 'uid-1', 'Alice', undefined,
      );
    });

    it('rejects invalid email', async () => {
      const response = await request(makeApp())
        .put('/api/user/members/portfolio-1/link')
        .set('Authorization', 'Bearer token')
        .send({ memberEmail: 'not-an-email' });

      expect(response.status).toBe(400);
      expect(mockLinkProfileToMember).not.toHaveBeenCalled();
    });

    it('rejects missing memberEmail', async () => {
      const response = await request(makeApp())
        .put('/api/user/members/portfolio-1/link')
        .set('Authorization', 'Bearer token')
        .send({ displayName: 'Alice' });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /:portfolioId/link', () => {
    it('unlinks a profile from a member', async () => {
      mockUnlinkProfileFromMember.mockResolvedValue(true);

      const response = await request(makeApp())
        .delete('/api/user/members/portfolio-1/link')
        .set('Authorization', 'Bearer token')
        .send({ memberEmail: 'alice@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
    });

    it('returns 404 when no link exists', async () => {
      mockUnlinkProfileFromMember.mockResolvedValue(false);

      const response = await request(makeApp())
        .delete('/api/user/members/portfolio-1/link')
        .set('Authorization', 'Bearer token')
        .send({ memberEmail: 'nonexistent@example.com' });

      expect(response.status).toBe(404);
    });

    it('rejects missing memberEmail', async () => {
      const response = await request(makeApp())
        .delete('/api/user/members/portfolio-1/link')
        .set('Authorization', 'Bearer token')
        .send({});

      expect(response.status).toBe(400);
    });
  });
});
