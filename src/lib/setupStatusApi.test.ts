import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fetchSetupStatus } from './setupStatusApi';

const mockFetch = vi.fn();

const mockResponse = {
  mode: 'development',
  app: { baseUrl: 'http://localhost:6868' },
  firebase: { configured: true, projectId: 'test-project' },
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
};

describe('fetchSetupStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
  });

  it('returns parsed status on success', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await fetchSetupStatus();
    expect(result.mode).toBe('development');
    expect(result.features.manualAssets).toBe(true);
    expect(result.firebase.projectId).toBe('test-project');
  });

  it('throws on non-200 response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Server error',
    });

    await expect(fetchSetupStatus()).rejects.toThrow('Setup status request failed (500)');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(fetchSetupStatus()).rejects.toThrow('Network failure');
  });

  it('hits /api/setup/status endpoint', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    await fetchSetupStatus();
    expect(mockFetch).toHaveBeenCalledWith('/api/setup/status');
  });
});
