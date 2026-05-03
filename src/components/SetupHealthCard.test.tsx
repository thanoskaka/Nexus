// @vitest-environment happy-dom
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SetupHealthCard } from './SetupHealthCard';
import type { SetupStatusResponse } from '../lib/setupStatusApi';

const mockFetch = vi.fn();

const fullStatus: SetupStatusResponse = {
  mode: 'self-hosted',
  app: { baseUrl: 'https://example.com' },
  firebase: { configured: true, projectId: 'my-project' },
  firebaseAdmin: {
    configured: true,
    hasProjectId: true,
    hasClientEmail: true,
    hasPrivateKey: true,
  },
  pricing: {
    massive: { configured: true, present: true },
    alphaVantage: { configured: false, present: false },
    finnhub: { configured: false, present: false },
    upstoxSystem: { configured: true, present: true },
  },
  integrations: {
    upstox: {
      clientConfigured: true,
      encryptionConfigured: true,
      stateSecretConfigured: true,
      redirectConfigured: true,
    },
    splitwise: {
      clientConfigured: true,
      encryptionConfigured: true,
      stateSecretConfigured: true,
      redirectConfigured: true,
    },
  },
  ai: {
    serverKey: { configured: true, present: true },
    userCredentialsSupported: true,
  },
  casParser: {
    configured: false,
    hasServiceUrl: false,
    allowsExternalFallback: false,
  },
  logoProvider: {
    serverKey: { configured: false, present: false },
    clientKey: { configured: true, present: true },
  },
  googleDrive: {
    clientId: { configured: false, present: false },
  },
  connectedAccounts: {
    encryptionConfigured: true,
    stateSecretConfigured: true,
  },
  integrationTokens: {
    encryptionConfigured: true,
  },
  features: {
    manualAssets: true,
    dashboard: true,
    priceRefresh: true,
    firebaseAuth: true,
    firebaseAdmin: true,
    upstoxConnectedAccounts: true,
    splitwise: true,
    casParser: false,
    screenshotImport: true,
    googleDriveSync: false,
    aiAssistant: true,
    logoProvider: true,
  },
};

const emptyStatus: SetupStatusResponse = {
  mode: 'local',
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
};

describe('SetupHealthCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
  });

  it('shows loading state initially', () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<SetupHealthCard />);
    expect(screen.getByText('Setup Health')).toBeTruthy();
  });

  it('renders configured items when loaded', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => fullStatus,
    });

    render(<SetupHealthCard />);

    await waitFor(() => {
      expect(screen.getByText('self-hosted')).toBeTruthy();
    });

    expect(screen.getByText('Firebase Auth')).toBeTruthy();
    expect(screen.getByText('Firebase Admin')).toBeTruthy();
    expect(screen.getByText('Upstox')).toBeTruthy();
    expect(screen.getByText('Splitwise')).toBeTruthy();
    expect(screen.getByText('AI Assistant')).toBeTruthy();
    expect(screen.getByText('Logo Provider')).toBeTruthy();
    expect(screen.getByText('Screenshot Import')).toBeTruthy();
  });

  it('renders missing items for empty env', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => emptyStatus,
    });

    render(<SetupHealthCard />);

    await waitFor(() => {
      expect(screen.getByText('local')).toBeTruthy();
    });

    const missingBadges = screen.getAllByText('missing');
    expect(missingBadges.length).toBeGreaterThanOrEqual(7);
  });

  it('shows error state and retry button', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    render(<SetupHealthCard />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeTruthy();
    });

    const retryButton = screen.getByText('Retry');
    expect(retryButton).toBeTruthy();
  });

  it('retries on retry button click', async () => {
    mockFetch.mockRejectedValueOnce(new Error('First failure'));
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => fullStatus,
    });

    const user = userEvent.setup();
    render(<SetupHealthCard />);

    await waitFor(() => {
      expect(screen.getByText('First failure')).toBeTruthy();
    });

    await user.click(screen.getByText('Retry'));

    await waitFor(() => {
      expect(screen.getByText('self-hosted')).toBeTruthy();
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('reports error on non-200 response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    });

    render(<SetupHealthCard />);

    await waitFor(() => {
      expect(screen.getByText(/Setup status request failed/)).toBeTruthy();
    });
  });

  it('shows partial status for partially configured upstox', async () => {
    const partialUpstox = {
      ...emptyStatus,
      integrations: {
        ...emptyStatus.integrations,
        upstox: {
          ...emptyStatus.integrations.upstox,
          clientConfigured: true,
        },
      },
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => partialUpstox,
    });

    render(<SetupHealthCard />);

    await waitFor(() => {
      expect(screen.getByText('Upstox')).toBeTruthy();
    });

    expect(screen.getByText('partial')).toBeTruthy();
  });
});
