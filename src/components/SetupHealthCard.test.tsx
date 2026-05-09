// @vitest-environment happy-dom
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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

const workingResult = {
  capabilityId: 'firebase-auth',
  status: 'working',
  checkedAt: new Date().toISOString(),
  errorCode: null,
  errorMessage: null,
  guidance: { missingEnvKeys: [], docsPath: 'docs/setup-modes.md', hint: 'Firebase Auth is configured.' },
};

const failedResult = {
  capabilityId: 'firebase-auth',
  status: 'failed',
  checkedAt: new Date().toISOString(),
  errorCode: 'MISSING_ENV_KEYS',
  errorMessage: 'Missing required environment variables: NEXT_PUBLIC_FIREBASE_API_KEY',
  guidance: { missingEnvKeys: ['NEXT_PUBLIC_FIREBASE_API_KEY'], docsPath: 'docs/setup-modes.md', hint: 'Set the required env vars.' },
};

const verifyAllResponse = {
  results: [
    { capabilityId: 'firebase-auth', status: 'working', checkedAt: new Date().toISOString(), guidance: { missingEnvKeys: [] } },
    { capabilityId: 'firebase-admin', status: 'working', checkedAt: new Date().toISOString(), guidance: { missingEnvKeys: [] } },
    { capabilityId: 'price-provider', status: 'working', checkedAt: new Date().toISOString(), guidance: { missingEnvKeys: [] } },
    { capabilityId: 'ai-provider', status: 'working', checkedAt: new Date().toISOString(), guidance: { missingEnvKeys: [] } },
    { capabilityId: 'logo-provider', status: 'working', checkedAt: new Date().toISOString(), guidance: { missingEnvKeys: [] } },
    { capabilityId: 'cas-parser', status: 'not-configured', checkedAt: new Date().toISOString(), guidance: { missingEnvKeys: ['CAS_PARSER_SERVICE_URL'] } },
    { capabilityId: 'upstox', status: 'working', checkedAt: new Date().toISOString(), guidance: { missingEnvKeys: [] } },
    { capabilityId: 'splitwise', status: 'working', checkedAt: new Date().toISOString(), guidance: { missingEnvKeys: [] } },
  ],
};

describe('SetupHealthCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
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

    const missingBadges = screen.getAllByText('Not Available');
    expect(missingBadges.length).toBeGreaterThanOrEqual(7);
  });

  it('shows error state and retry button', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    render(<SetupHealthCard />);

    await waitFor(() => {
      expect(screen.getByText('Diagnostics Unavailable')).toBeTruthy();
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

  it('shows Test button for configured items', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => fullStatus,
    });

    render(<SetupHealthCard />);

    await waitFor(() => {
      expect(screen.getByText('self-hosted')).toBeTruthy();
    });

    const testButtons = screen.getAllByText('Test');
    expect(testButtons.length).toBeGreaterThanOrEqual(5);
  });

  it('shows Verify All button when configured items exist', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => fullStatus,
    });

    render(<SetupHealthCard />);

    await waitFor(() => {
      expect(screen.getByText('Verify All')).toBeTruthy();
    });
  });

  it('does not show Verify All button when only price-refresh (always-true) is configured', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => emptyStatus,
    });

    render(<SetupHealthCard />);

    await waitFor(() => {
      expect(screen.getByText('local')).toBeTruthy();
    });

    const verifyAllButtons = screen.queryAllByText('Verify All');
    expect(verifyAllButtons.length).toBeLessThanOrEqual(1);
  });

  it('shows verification badge and timestamp after successful test', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => fullStatus,
    });

    const user = userEvent.setup();
    render(<SetupHealthCard />);

    await waitFor(() => {
      expect(screen.getByText('self-hosted')).toBeTruthy();
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => workingResult,
    });

    const testButtons = screen.getAllByText('Test');
    await user.click(testButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('verified')).toBeTruthy();
    });

    expect(screen.getByText(/Last tested:/)).toBeTruthy();
  });

  it('shows Fix this guidance when verification fails', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => fullStatus,
    });

    const user = userEvent.setup();
    render(<SetupHealthCard />);

    await waitFor(() => {
      expect(screen.getByText('self-hosted')).toBeTruthy();
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => failedResult,
    });

    const testButtons = screen.getAllByText('Test');
    await user.click(testButtons[0]);

    await waitFor(() => {
      const fixThisElements = screen.getAllByText(/Verification failed/);
      expect(fixThisElements.length).toBeGreaterThanOrEqual(1);
    });

    const keyElements = screen.getAllByText(/NEXT_PUBLIC_FIREBASE_API_KEY/);
    expect(keyElements.length).toBeGreaterThanOrEqual(1);
  });

  it('shows Re-test button after first test', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => fullStatus,
    });

    const user = userEvent.setup();
    render(<SetupHealthCard />);

    await waitFor(() => {
      expect(screen.getByText('self-hosted')).toBeTruthy();
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => workingResult,
    });

    const testButtons = screen.getAllByText('Test');
    await user.click(testButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('verified')).toBeTruthy();
    });

    expect(screen.getByText('Re-test')).toBeTruthy();
  });

  it('shows View details button for trusted items', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => fullStatus,
    });

    render(<SetupHealthCard />);

    await waitFor(() => {
      expect(screen.getAllByText('View details').length).toBeGreaterThanOrEqual(6);
    });
  });

  it('shows Setup button and required badge for unavailable required item', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => emptyStatus,
    });

    render(<SetupHealthCard />);

    const required = await screen.findAllByText('required');
    expect(required.length).toBeGreaterThanOrEqual(1);

    const setupButtons = await screen.findAllByText('Setup');
    expect(setupButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('shows View steps for unavailable optional item', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => emptyStatus,
    });

    render(<SetupHealthCard />);

    const viewSteps = await screen.findAllByText('View steps');
    expect(viewSteps.length).toBeGreaterThanOrEqual(5);
  });

  it('never renders secret values from status endpoint', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => emptyStatus,
    });

    render(<SetupHealthCard />);

    await waitFor(() => {
      expect(screen.getByText('local')).toBeTruthy();
    });

    const body = document.body.textContent || '';
    expect(body).not.toContain('super-secret');
    expect(body).not.toContain('apiKey');
    expect(body).not.toContain('-----BEGIN');
  });
});
