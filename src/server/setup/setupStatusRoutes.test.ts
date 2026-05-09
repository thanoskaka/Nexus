import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createSetupStatusRouter } from './setupStatusRoutes.js';

vi.mock('./setupStatusService.js', () => ({
  getSetupCapabilities: vi.fn(() => ({
    mode: 'development',
    app: { baseUrl: '' },
    firebase: { configured: false, projectId: null },
    firebaseAdmin: {
      configured: false,
      hasProjectId: false,
      hasClientEmail: false,
      hasPrivateKey: false,
    },
    pricing: {
      massive: { configured: false, present: false },
      alphaVantage: { configured: false, present: false },
      finnhub: { configured: false, present: false },
      upstoxSystem: { configured: false, present: false },
    },
    integrations: {
      upstox: {
        clientConfigured: false,
        encryptionConfigured: false,
        stateSecretConfigured: false,
        redirectConfigured: false,
      },
      splitwise: {
        clientConfigured: false,
        encryptionConfigured: false,
        stateSecretConfigured: false,
        redirectConfigured: false,
      },
    },
    ai: {
      serverKey: { configured: false, present: false },
      userCredentialsSupported: false,
    },
    casParser: {
      configured: false,
      hasServiceUrl: false,
      allowsExternalFallback: false,
    },
    logoProvider: {
      serverKey: { configured: false, present: false },
      clientKey: { configured: false, present: false },
    },
    googleDrive: {
      clientId: { configured: false, present: false },
    },
    connectedAccounts: {
      encryptionConfigured: false,
      stateSecretConfigured: false,
    },
    integrationTokens: {
      encryptionConfigured: false,
    },
    features: {
      manualAssets: true,
      dashboard: true,
      priceRefresh: true,
      firebaseAuth: false,
      firebaseAdmin: false,
      upstoxConnectedAccounts: false,
      splitwise: false,
      casParser: false,
      screenshotImport: false,
      googleDriveSync: false,
      aiAssistant: false,
      logoProvider: false,
    },
  })),
}));

describe('setupStatusRoutes', () => {
  it('returns 200 with setup status JSON on GET /status', async () => {
    const app = express();
    app.use('/api/setup', createSetupStatusRouter());

    const response = await request(app).get('/api/setup/status');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/json/);
  });

  it('includes features key in response body', async () => {
    const app = express();
    app.use('/api/setup', createSetupStatusRouter());

    const response = await request(app).get('/api/setup/status');

    expect(response.body).toHaveProperty('features');
    expect(response.body.features.manualAssets).toBe(true);
    expect(response.body.features.dashboard).toBe(true);
  });

  it('does not expose secret values in response', async () => {
    const app = express();
    app.use('/api/setup', createSetupStatusRouter());

    const response = await request(app).get('/api/setup/status');

    const body = JSON.stringify(response.body);
    expect(body).not.toContain('apiKey');
    expect(body).not.toContain('secret');
    expect(body).not.toContain('token');
    expect(body).not.toContain('private_key');
  });
});
