// @vitest-environment jsdom
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { ProviderCredentialsSection } from './ProviderCredentialsSection';

vi.mock('../lib/setupStatusApi', () => ({ fetchSetupStatus: vi.fn() }));
vi.mock('../lib/aiCredentialsApi', () => ({ getAiCredentials: vi.fn() }));

function createMockStorage() {
  const store = {};
  return {
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => { store[key] = value; },
    removeItem: (key) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => { delete store[k]; }); },
    get length() { return Object.keys(store).length; },
    key: (i) => Object.keys(store)[i] ?? null,
  };
}

const baseSetupStatus = {
  mode: 'self-hosted', app: { baseUrl: 'http://localhost:6868' },
  firebase: { configured: true, projectId: 'test' },
  firebaseAdmin: { configured: true, hasProjectId: true, hasClientEmail: true, hasPrivateKey: true },
  pricing: { massive: { configured: false, present: false }, alphaVantage: { configured: false, present: false }, finnhub: { configured: false, present: false }, upstoxSystem: { configured: false, present: false } },
  integrations: { upstox: { clientConfigured: false, encryptionConfigured: false, stateSecretConfigured: false, redirectConfigured: false }, splitwise: { clientConfigured: false, encryptionConfigured: false, stateSecretConfigured: false, redirectConfigured: false } },
  ai: { serverKey: { configured: false, present: false }, userCredentialsSupported: true },
  casParser: { configured: false, hasServiceUrl: false, allowsExternalFallback: false },
  logoProvider: { serverKey: { configured: false, present: false }, clientKey: { configured: false, present: false } },
  googleDrive: { clientId: { configured: false, present: false } },
  connectedAccounts: { encryptionConfigured: false, stateSecretConfigured: false },
  integrationTokens: { encryptionConfigured: false },
  features: { manualAssets: true, dashboard: true, priceRefresh: true, firebaseAuth: true, firebaseAdmin: true, upstoxConnectedAccounts: false, splitwise: false, casParser: false, screenshotImport: false, googleDriveSync: false, aiAssistant: false, logoProvider: false },
};

describe('ProviderCredentialsSection', () => {
  beforeEach(() => { vi.clearAllMocks(); const ms = createMockStorage(); vi.stubGlobal('localStorage', ms); });
  afterEach(() => { vi.unstubAllGlobals(); });

  async function setup() {
    const { fetchSetupStatus } = await import('../lib/setupStatusApi');
    const { getAiCredentials } = await import('../lib/aiCredentialsApi');
    vi.mocked(fetchSetupStatus).mockResolvedValue(baseSetupStatus);
    vi.mocked(getAiCredentials).mockResolvedValue({ provider: null, model: null, apiKeyLast4: null });
    render(React.createElement(ProviderCredentialsSection));
    await waitFor(() => { expect(screen.getByText('Provider Credentials')).toBeTruthy(); });
  }

  it('renders provider credential list with all providers', async () => {
    await setup();
    expect(screen.getByText('Google Gemini')).toBeTruthy();
    expect(screen.getByText('DeepSeek')).toBeTruthy();
    expect(screen.getByText('Massive')).toBeTruthy();
    expect(screen.getByText('Alpha Vantage')).toBeTruthy();
    expect(screen.getByText('Logo.dev')).toBeTruthy();
  });

  it('shows Missing badge when no hosted default and no user key', async () => {
    await setup();
    expect(screen.getAllByText('Missing').length).toBeGreaterThanOrEqual(1);
  });

  it('shows Hosted available badge when hosted default is configured', async () => {
    const { fetchSetupStatus } = await import('../lib/setupStatusApi');
    vi.mocked(fetchSetupStatus).mockResolvedValue({...baseSetupStatus, pricing: {...baseSetupStatus.pricing, massive: { configured: true, present: true }}});
    render(React.createElement(ProviderCredentialsSection));
    await waitFor(() => { expect(screen.getByText('Provider Credentials')).toBeTruthy(); });
    expect(screen.getByText('Hosted available')).toBeTruthy();
  });

  it('saves a key and shows masked value', async () => {
    const user = userEvent.setup();
    await setup();
    const input = screen.getByLabelText('Massive API key');
    await user.type(input, 'test-key-1234abcd');
    const saveBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.toLowerCase().includes('save') && b.closest('[class*=rounded-xl]')?.textContent?.includes('Massive'));
    if (saveBtn) await user.click(saveBtn);
    await waitFor(() => { expect(screen.getByText(/key saved/i)).toBeTruthy(); });
    expect(screen.queryByText('test-key-1234abcd')).toBeNull();
  });

  it('removes a key', async () => {
    const user = userEvent.setup();
    await setup();
    const input = screen.getByLabelText('Massive API key');
    await user.type(input, 'massive-key-for-removal');
    const saveBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.toLowerCase().includes('save') && b.closest('[class*=rounded-xl]')?.textContent?.includes('Massive'));
    if (saveBtn) await user.click(saveBtn);
    await waitFor(() => { expect(screen.getByText(/key saved/i)).toBeTruthy(); });
    const removeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.toLowerCase().includes('remove') && b.closest('[class*=rounded-xl]')?.textContent?.includes('Massive'));
    if (removeBtn) await user.click(removeBtn);
    await waitFor(() => { expect(screen.getByText(/key removed/i)).toBeTruthy(); });
  });

  it('preference switches between hosted and user key', async () => {
    const user = userEvent.setup();
    await setup();
    const prefSelect = screen.getByLabelText('Preference for Massive');
    await user.selectOptions(prefSelect, 'user');
    expect(prefSelect).toHaveValue('user');
    await user.selectOptions(prefSelect, 'hosted');
    expect(prefSelect).toHaveValue('hosted');
  });

  it('shows storage labels', async () => {
    await setup();
    expect(screen.getAllByText('Stored on this device only').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Encrypted on server').length).toBeGreaterThanOrEqual(1);
  });

  it('never renders full key after save', async () => {
    const user = userEvent.setup();
    await setup();
    const input = screen.getByLabelText('Alpha Vantage API key');
    await user.type(input, 'super-secret-key');
    const saveBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.toLowerCase().includes('save') && b.closest('[class*=rounded-xl]')?.textContent?.includes('Alpha Vantage'));
    if (saveBtn) await user.click(saveBtn);
    await waitFor(() => { expect(screen.getByText(/key saved/i)).toBeTruthy(); });
    expect(screen.queryByDisplayValue('super-secret-key')).toBeNull();
    expect(document.body.textContent || '').not.toContain('super-secret-key');
  });
});
