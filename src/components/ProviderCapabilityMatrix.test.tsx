// @vitest-environment happy-dom
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProviderCapabilityMatrix } from './ProviderCapabilityMatrix';
import type { SetupStatusResponse } from '../lib/setupStatusApi';
import { getProviderCapabilityRows } from '../lib/providerCapabilities';

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
    alphaVantage: { configured: true, present: true },
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
    configured: true,
    hasServiceUrl: true,
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
    casParser: true,
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

describe('ProviderCapabilityMatrix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
  });

  it('shows loading state initially', () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<ProviderCapabilityMatrix />);
    expect(screen.getByText('Provider Capability Matrix')).toBeTruthy();
  });

  it('renders all provider rows when loaded with full status', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => fullStatus,
    });

    render(<ProviderCapabilityMatrix />);

    await waitFor(() => {
      expect(screen.getByText('Yahoo Finance (fallback)')).toBeTruthy();
    });

    expect(screen.getByText('Massive')).toBeTruthy();
    expect(screen.getByText('Alpha Vantage')).toBeTruthy();
    expect(screen.getByText('Gemini')).toBeTruthy();
    expect(screen.getByText('DeepSeek')).toBeTruthy();
    expect(screen.getByText('Logo.dev')).toBeTruthy();
    expect(screen.getByText('Upstox')).toBeTruthy();
    expect(screen.getByText('Splitwise')).toBeTruthy();
    expect(screen.getByText('CAS Parser')).toBeTruthy();
  });

  it('shows correct number of rows', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => fullStatus,
    });

    render(<ProviderCapabilityMatrix />);

    await waitFor(() => {
      expect(screen.getByText('Yahoo Finance (fallback)')).toBeTruthy();
    });

    const rows = getProviderCapabilityRows(fullStatus);
    expect(rows).toHaveLength(9);
  });

  it('shows Ready status for Yahoo when no config needed', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => emptyStatus,
    });

    render(<ProviderCapabilityMatrix />);

    await waitFor(() => {
      expect(screen.getByText('Yahoo Finance (fallback)')).toBeTruthy();
    });

    const readyBadges = screen.getAllByText('Ready');
    expect(readyBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('shows Needs Key status for Massive when not configured', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => emptyStatus,
    });

    render(<ProviderCapabilityMatrix />);

    await waitFor(() => {
      expect(screen.getByText('Massive')).toBeTruthy();
    });

    const needsKeyBadges = screen.getAllByText('Needs Key');
    expect(needsKeyBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('shows Ready for Massive when configured', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => fullStatus,
    });

    render(<ProviderCapabilityMatrix />);

    await waitFor(() => {
      expect(screen.getByText('Massive')).toBeTruthy();
    });

    const readyBadges = screen.getAllByText('Ready');
    expect(readyBadges.length).toBeGreaterThanOrEqual(2);
  });

  it('shows Ready for Upstox when fully configured', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => fullStatus,
    });

    render(<ProviderCapabilityMatrix />);

    await waitFor(() => {
      expect(screen.getByText('Upstox')).toBeTruthy();
    });

    expect(screen.getByText('Upstox connected accounts ready.')).toBeTruthy();
  });

  it('shows Needs Key for Upstox when not configured', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => emptyStatus,
    });

    render(<ProviderCapabilityMatrix />);

    await waitFor(() => {
      expect(screen.getByText('Upstox')).toBeTruthy();
    });

    expect(screen.getByText(/UPSTOX_CLIENT_ID/)).toBeTruthy();
  });

  it('shows Hosted Available column with Yes/No badges', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => fullStatus,
    });

    render(<ProviderCapabilityMatrix />);

    await waitFor(() => {
      expect(screen.getByText('Yahoo Finance (fallback)')).toBeTruthy();
    });

    const yesBadges = screen.getAllByText('Yes');
    const noBadges = screen.getAllByText('No');
    expect(yesBadges.length).toBeGreaterThanOrEqual(8);
    expect(noBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('shows Cost Posture column with correct badges for each posture', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => fullStatus,
    });

    render(<ProviderCapabilityMatrix />);

    await waitFor(() => {
      expect(screen.getByText('Yahoo Finance (fallback)')).toBeTruthy();
    });

    expect(screen.getByText('Free')).toBeTruthy();
    const byoBadges = screen.getAllByText('BYO Key');
    expect(byoBadges.length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText('Paid 3rd Party')).toBeTruthy();
  });

  it('shows error state and retry button', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    render(<ProviderCapabilityMatrix />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeTruthy();
    });

    expect(screen.getByText('Retry')).toBeTruthy();
  });

  it('retries on retry button click', async () => {
    mockFetch.mockRejectedValueOnce(new Error('First failure'));
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => fullStatus,
    });

    const user = userEvent.setup();
    render(<ProviderCapabilityMatrix />);

    await waitFor(() => {
      expect(screen.getByText('First failure')).toBeTruthy();
    });

    await user.click(screen.getByText('Retry'));

    await waitFor(() => {
      expect(screen.getByText('Yahoo Finance (fallback)')).toBeTruthy();
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('reports error on non-200 response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    });

    render(<ProviderCapabilityMatrix />);

    await waitFor(() => {
      expect(screen.getByText(/Setup status request failed/)).toBeTruthy();
    });
  });

  it('shows View docs button for ready providers', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => fullStatus,
    });

    render(<ProviderCapabilityMatrix />);

    await waitFor(() => {
      expect(screen.getByText('Yahoo Finance (fallback)')).toBeTruthy();
    });

    const viewDocsButtons = screen.getAllByText('View docs');
    expect(viewDocsButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('shows Setup guide button for providers needing setup', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => emptyStatus,
    });

    render(<ProviderCapabilityMatrix />);

    await waitFor(() => {
      expect(screen.getByText('Massive')).toBeTruthy();
    });

    const setupGuideButtons = screen.getAllByText('Setup guide');
    expect(setupGuideButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('never renders secret values', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => emptyStatus,
    });

    render(<ProviderCapabilityMatrix />);

    await waitFor(() => {
      expect(screen.getByText('Yahoo Finance (fallback)')).toBeTruthy();
    });

    const body = document.body.textContent || '';
    expect(body).not.toContain('super-secret');
    expect(body).not.toContain('apiKey');
    expect(body).not.toContain('-----BEGIN');
    expect(body).not.toContain('MASSIVE_API_KEY=');
    expect(body).not.toContain('GEMINI_API_KEY=');
  });

  it('shows Needs Setup status for partially configured Upstox', async () => {
    const partialUpstox: SetupStatusResponse = {
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

    render(<ProviderCapabilityMatrix />);

    await waitFor(() => {
      expect(screen.getByText('Upstox')).toBeTruthy();
    });

    expect(screen.getByText('Needs Setup')).toBeTruthy();
  });

  it('shows Needs Setup status for partially configured Splitwise', async () => {
    const partialSplitwise: SetupStatusResponse = {
      ...emptyStatus,
      integrations: {
        ...emptyStatus.integrations,
        splitwise: {
          ...emptyStatus.integrations.splitwise,
          clientConfigured: true,
        },
      },
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => partialSplitwise,
    });

    render(<ProviderCapabilityMatrix />);

    await waitFor(() => {
      expect(screen.getByText('Splitwise')).toBeTruthy();
    });

    expect(screen.getByText('Needs Setup')).toBeTruthy();
  });

  it('shows CAS Parser as Paid 3rd Party cost posture', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => fullStatus,
    });

    render(<ProviderCapabilityMatrix />);

    await waitFor(() => {
      expect(screen.getByText('CAS Parser')).toBeTruthy();
    });

    expect(screen.getByText('Paid 3rd Party')).toBeTruthy();
  });
});
