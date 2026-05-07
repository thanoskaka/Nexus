import express from 'express';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mockVerifyIdToken = vi.fn();
const mockGetOnboardingState = vi.fn();
const mockSaveOnboardingStep = vi.fn();
const mockCompleteOnboarding = vi.fn();
const mockResetOnboarding = vi.fn();

vi.mock('../firebaseAdmin.js', () => ({
  getFirebaseAdminAuth: () => ({
    verifyIdToken: (...args: unknown[]) => mockVerifyIdToken(...args),
  }),
  getFirebaseAdminFirestore: () => ({}),
}));

vi.mock('./onboardingStore.js', () => ({
  getOnboardingState: (...args: unknown[]) => mockGetOnboardingState(...args),
  saveOnboardingStep: (...args: unknown[]) => mockSaveOnboardingStep(...args),
  completeOnboarding: (...args: unknown[]) => mockCompleteOnboarding(...args),
  resetOnboarding: (...args: unknown[]) => mockResetOnboarding(...args),
}));

import { createOnboardingRouter } from './onboardingRoutes.js';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/user/onboarding', createOnboardingRouter());
  return app;
}

const defaultState = {
  onboarding: {
    uid: 'uid-1',
    status: 'in_progress',
    currentStep: 0,
    primaryCountry: null,
    primaryCurrency: null,
    secondaryCountry: null,
    secondaryCurrency: null,
    selectedAssetClasses: [],
    providerSelections: [],
    integrationSelections: [],
    members: [],
    createdAt: 1000,
    updatedAt: 1000,
  },
};

describe('/api/user/onboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue({ uid: 'uid-1', email: 'user@example.com' });
  });

  describe('GET /', () => {
    it('requires authentication', async () => {
      const response = await request(makeApp()).get('/api/user/onboarding');
      expect(response.status).toBe(401);
    });

    it('returns onboarding state for verified user', async () => {
      mockGetOnboardingState.mockResolvedValue(defaultState);

      const response = await request(makeApp())
        .get('/api/user/onboarding')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(200);
      expect(response.body.onboarding.status).toBe('in_progress');
      expect(mockGetOnboardingState).toHaveBeenCalledWith('uid-1');
    });

    it('returns null onboarding state when not found', async () => {
      mockGetOnboardingState.mockResolvedValue({ onboarding: null });

      const response = await request(makeApp())
        .get('/api/user/onboarding')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(200);
      expect(response.body.onboarding).toBeNull();
    });
  });

  describe('PUT /', () => {
    it('requires authentication', async () => {
      const response = await request(makeApp()).put('/api/user/onboarding').send({});
      expect(response.status).toBe(401);
    });

    it('rejects invalid primary country', async () => {
      const response = await request(makeApp())
        .put('/api/user/onboarding')
        .set('Authorization', 'Bearer token')
        .send({ primaryCountry: 'UK' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid primary country');
    });

    it('rejects primary currency mismatch for country', async () => {
      const response = await request(makeApp())
        .put('/api/user/onboarding')
        .set('Authorization', 'Bearer token')
        .send({ primaryCountry: 'US', primaryCurrency: 'INR' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Primary currency must be USD for US');
    });

    it('rejects secondary country same as primary', async () => {
      const response = await request(makeApp())
        .put('/api/user/onboarding')
        .set('Authorization', 'Bearer token')
        .send({ primaryCountry: 'US', secondaryCountry: 'US' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Secondary country must differ');
    });

    it('persists valid primary country selection', async () => {
      mockSaveOnboardingStep.mockResolvedValue({
        onboarding: {
          ...defaultState.onboarding,
          primaryCountry: 'US',
          primaryCurrency: 'USD',
        },
      });

      const response = await request(makeApp())
        .put('/api/user/onboarding')
        .set('Authorization', 'Bearer token')
        .send({ primaryCountry: 'US', primaryCurrency: 'USD' });

      expect(response.status).toBe(200);
      expect(response.body.onboarding.primaryCountry).toBe('US');
      expect(mockSaveOnboardingStep).toHaveBeenCalledWith('uid-1', {
        primaryCountry: 'US',
        primaryCurrency: 'USD',
      });
    });

    it('persists secondary country selection', async () => {
      mockSaveOnboardingStep.mockResolvedValue({
        onboarding: {
          ...defaultState.onboarding,
          primaryCountry: 'US',
          primaryCurrency: 'USD',
          secondaryCountry: 'CA',
          secondaryCurrency: 'CAD',
        },
      });

      const response = await request(makeApp())
        .put('/api/user/onboarding')
        .set('Authorization', 'Bearer token')
        .send({ primaryCountry: 'US', primaryCurrency: 'USD', secondaryCountry: 'CA', secondaryCurrency: 'CAD' });

      expect(response.status).toBe(200);
      expect(response.body.onboarding.secondaryCountry).toBe('CA');
    });

    it('persists selected asset classes', async () => {
      mockSaveOnboardingStep.mockResolvedValue({
        onboarding: {
          ...defaultState.onboarding,
          selectedAssetClasses: ['us-stocks', 'us-bonds'],
        },
      });

      const response = await request(makeApp())
        .put('/api/user/onboarding')
        .set('Authorization', 'Bearer token')
        .send({ selectedAssetClasses: ['us-stocks', 'us-bonds'] });

      expect(response.status).toBe(200);
      expect(response.body.onboarding.selectedAssetClasses).toEqual(['us-stocks', 'us-bonds']);
    });

    it('persists provider selections', async () => {
      mockSaveOnboardingStep.mockResolvedValue({
        onboarding: {
          ...defaultState.onboarding,
          providerSelections: [{ providerId: 'yahoo', enabled: true }],
        },
      });

      const response = await request(makeApp())
        .put('/api/user/onboarding')
        .set('Authorization', 'Bearer token')
        .send({ providerSelections: [{ providerId: 'yahoo', enabled: true }] });

      expect(response.status).toBe(200);
    });

    it('validates members have valid email', async () => {
      const response = await request(makeApp())
        .put('/api/user/onboarding')
        .set('Authorization', 'Bearer token')
        .send({ members: [{ email: '', role: 'partner' }] });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('member');
    });

    it('never trusts uid from client payload', async () => {
      mockSaveOnboardingStep.mockResolvedValue({
        onboarding: { ...defaultState.onboarding, primaryCountry: 'US' },
      });

      await request(makeApp())
        .put('/api/user/onboarding')
        .set('Authorization', 'Bearer token')
        .send({ uid: 'attacker-uid', primaryCountry: 'US' });

      expect(mockSaveOnboardingStep).toHaveBeenCalledWith('uid-1', expect.objectContaining({ primaryCountry: 'US' }));
    });
  });

  describe('POST /complete', () => {
    it('requires authentication', async () => {
      const response = await request(makeApp()).post('/api/user/onboarding/complete');
      expect(response.status).toBe(401);
    });

    it('marks onboarding as completed', async () => {
      mockCompleteOnboarding.mockResolvedValue({
        onboarding: {
          ...defaultState.onboarding,
          status: 'completed',
          completedAt: 2000,
        },
      });

      const response = await request(makeApp())
        .post('/api/user/onboarding/complete')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(200);
      expect(response.body.onboarding.status).toBe('completed');
      expect(mockCompleteOnboarding).toHaveBeenCalledWith('uid-1');
    });

    it('is idempotent when called multiple times', async () => {
      mockCompleteOnboarding
        .mockResolvedValueOnce({
          onboarding: { ...defaultState.onboarding, status: 'completed', completedAt: 2000 },
        })
        .mockResolvedValueOnce({
          onboarding: { ...defaultState.onboarding, status: 'completed', completedAt: 2000 },
        });

      const app = makeApp();
      const res1 = await request(app).post('/api/user/onboarding/complete').set('Authorization', 'Bearer token');
      const res2 = await request(app).post('/api/user/onboarding/complete').set('Authorization', 'Bearer token');

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      expect(res1.body.onboarding.status).toBe('completed');
      expect(res2.body.onboarding.status).toBe('completed');
    });
  });

  describe('POST /reset', () => {
    it('requires authentication', async () => {
      const response = await request(makeApp()).post('/api/user/onboarding/reset');
      expect(response.status).toBe(401);
    });

    it('resets onboarding state', async () => {
      mockResetOnboarding.mockResolvedValue(undefined);

      const response = await request(makeApp())
        .post('/api/user/onboarding/reset')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(mockResetOnboarding).toHaveBeenCalledWith('uid-1');
    });
  });
});
