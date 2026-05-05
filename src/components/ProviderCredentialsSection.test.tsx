// @vitest-environment jsdom
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { ProviderCredentialsSection } from './ProviderCredentialsSection';

vi.mock('../lib/setupStatusApi', () => ({
  fetchSetupStatus: vi.fn(),
}));

vi.mock('../lib/aiCredentialsApi', () => ({
  getAiCredentials: vi.fn(),
}));

function createMockStorage() {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach((k) => { delete store[k]; }); },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
}

const baseSetupStatus = {
  mode: 'self-hosted' as const,
  app: { baseUrl: 'http://localhost:6868' },
  firebase: { configured: true, projectId: 'test' },
  firebaseAdmin: { configured: true, hasProjectId: true, hasClientEmail: true, hasPrivateKey: true },
  pricing: {
    massive: { configured: false, present: false },
    alphaVantage: { configured: false, present: false },
    finnhub: { configured: false, present: false },
    upstoxSystem: { configured: false, present: false },
  },
  integrations: {
    upstox: { clientConfigured: false, encryptionConfigured: false, stateSecretConfigured: false, redirectConfigured: false },
    splitwise: { clientConfigured: false, encryptionConfigured: false, stateSecretConfigured: false, redirectConfigured: false },
  },
  ai: {
    serverKey: { configured: false, present: false },
    userCredentialsSupported: true,
  },
  casParser: { configured: false, hasServiceUrl: false, allowsExternalFallback: false },
  logoProvider: {
    serverKey: { configured: false, present: false },
    clientKey: { configured: false, present: false },
  },
  googleDrive: { clientId: { configured: false, present: false } },
  connectedAccounts: { encryptionConfigured: false, stateSecretConfigured: false },
  integrationTokens: { encryptionConfigured: false },
  features: {
    manualAssets: true,
    dashboard: true,
    priceRefresh: true,
    firebaseAuth: true,
    firebaseAdmin: true,
    upstoxConnectedAccounts: false,
    splitwise: false,
    casParser: false,
    screenshotImport: false,
    googleDriveSync: false,
    aiAssistant: false,
    logoProvider: false,
  },
};

describe('ProviderCredentialsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const mockStorage = createMockStorage();
    vi.stubGlobal('localStorage', mockStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function setup(overrides?: { setupStatus?: Record<string, unknown> }) {
    const { fetchSetupStatus } = await import('../lib/setupStatusApi');
    const { getAiCredentials } = await import('../lib/aiCredentialsApi');
    vi.mocked(fetchSetupStatus).mockResolvedValue({
      ...baseSetupStatus,
      ...(overrides?.setupStatus || {}),
    });
    vi.mocked(getAiCredentials).mockResolvedValue({ provider: null, model: null, apiKeyLast4: null });

    render(<ProviderCredentialsSection />);
    await waitFor(() => {
      expect(screen.getByText('Provider Credentials')).toBeTruthy();
    });
  }

  it('renders provider credential list with all providers', async () => {
    await setup();
    expect(screen.getByText('Google Gemini')).toBeTruthy();
    expect(screen.getByText('DeepSeek')).toBeTruthy();
    expect(screen.getByText('Massive')).toBeTruthy();
    expect(screen.getByText('Alpha Vantage')).toBeTruthy();
    expect(screen.getByText('Logo.dev')).toBeTruthy();
  });

  it('shows "Missing" badge when no hosted default and no user key', async () => {
    await setup();
    const badges = screen.getAllByText('Missing');
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  it('shows "Hosted available" badge when hosted default is configured', async () => {
    const { fetchSetupStatus } = await import('../lib/setupStatusApi');
    vi.mocked(fetchSetupStatus).mockResolvedValue({
      ...baseSetupStatus,
      pricing: {
        ...baseSetupStatus.pricing,
        massive: { configured: true, present: true },
      },
    });

    render(<ProviderCredentialsSection />);
    await waitFor(() => {
      expect(screen.getByText('Provider Credentials')).toBeTruthy();
    });

    expect(screen.getByText('Hosted available')).toBeTruthy();
  });

  it('saves a key and shows masked value (never full key)', async () => {
    const user = userEvent.setup();
    await setup();

    const massiveInput = screen.getByLabelText('Massive API key');
    await user.type(massiveInput, 'massive-api-key-123456789');

    const saveButtons = screen.getAllByRole('button', { name: /save/i });
    const massiveSave = saveButtons.find(
      (btn) => btn.closest('[class*="rounded-xl"]')?.textContent?.includes('Massive')
    );
    if (massiveSave) await user.click(massiveSave);

    await waitFor(() => {
      expect(screen.getByText(/key saved/i)).toBeTruthy();
    });

    expect(screen.queryByText('massive-api-key-123456789')).toBeNull();
    expect(screen.getByText(/6789/)).toBeTruthy();
  });

  it('removes a key and clears masked display', async () => {
    const user = userEvent.setup();
    await setup();

    const massiveInput = screen.getByLabelText('Massive API key');
    await user.type(massiveInput, 'massive-key-for-removal');
    const saveButtons = screen.getAllByRole('button', { name: /save/i });
    const massiveSave = saveButtons.find(
      (btn) => btn.closest('[class*="rounded-xl"]')?.textContent?.includes('Massive')
    );
    if (massiveSave) await user.click(massiveSave);

    await waitFor(() => {
      expect(screen.getByText(/key saved/i)).toBeTruthy();
    });

    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    const massiveRemove = removeButtons.find(
      (btn) => btn.closest('[class*="rounded-xl"]')?.textContent?.includes('Massive')
    );
    if (massiveRemove) await user.click(massiveRemove);

    await waitFor(() => {
      expect(screen.getByText(/key removed/i)).toBeTruthy();
    });
  });

  it('preference switches between hosted/default and user key', async () => {
    const user = userEvent.setup();
    await setup();

    const massivePrefSelect = screen.getByLabelText('Preference for Massive');
    await user.selectOptions(massivePrefSelect, 'user');
    expect(massivePrefSelect).toHaveValue('user');

    await user.selectOptions(massivePrefSelect, 'hosted');
    expect(massivePrefSelect).toHaveValue('hosted');
  });

  it('shows storage labels for local-only and encrypted-server', async () => {
    await setup();
    expect(screen.getAllByText('Stored on this device only').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Encrypted on server').length).toBeGreaterThanOrEqual(1);
  });

  it('does not show full key in the DOM after save', async () => {
    const user = userEvent.setup();
    await setup();

    const alphaInput = screen.getByLabelText('Alpha Vantage API key');
    await user.type(alphaInput, 'super-secret-alpha-key');

    const saveButtons = screen.getAllByRole('button', { name: /save/i });
    const alphaSave = saveButtons.find(
      (btn) => btn.closest('[class*="rounded-xl"]')?.textContent?.includes('Alpha Vantage')
    );
    if (alphaSave) await user.click(alphaSave);

    await waitFor(() => {
      expect(screen.getByText(/key saved/i)).toBeTruthy();
    });

    expect(screen.queryByDisplayValue('super-secret-alpha-key')).toBeNull();

    const allText = document.body.textContent || '';
    expect(allText).not.toContain('super-secret-alpha-key');
  });
});
