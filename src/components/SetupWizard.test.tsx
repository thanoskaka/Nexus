// @vitest-environment jsdom
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SetupWizard } from './SetupWizard';
import { SETUP_STEPS, WIZARD_STORAGE_KEY, type SetupStepId } from '../lib/setupGuideConfig';

const mockFetch = vi.fn();

const fullSetupStatus = {
  mode: 'self-hosted', app: { baseUrl: 'https://example.com' },
  firebase: { configured: true, projectId: 'my-project' },
  firebaseAdmin: { configured: true, hasProjectId: true, hasClientEmail: true, hasPrivateKey: true },
  pricing: { massive: { configured: true, present: true }, alphaVantage: { configured: false, present: false }, finnhub: { configured: false, present: false }, upstoxSystem: { configured: true, present: true } },
  integrations: { upstox: { clientConfigured: true, encryptionConfigured: true, stateSecretConfigured: true, redirectConfigured: true }, splitwise: { clientConfigured: true, encryptionConfigured: true, stateSecretConfigured: true, redirectConfigured: true } },
  ai: { serverKey: { configured: true, present: true }, userCredentialsSupported: true },
  casParser: { configured: false, hasServiceUrl: false, allowsExternalFallback: false },
  logoProvider: { serverKey: { configured: true, present: true }, clientKey: { configured: true, present: true } },
  googleDrive: { clientId: { configured: false, present: false } },
  connectedAccounts: { encryptionConfigured: true, stateSecretConfigured: true },
  integrationTokens: { encryptionConfigured: true },
  features: { manualAssets: true, dashboard: true, priceRefresh: true, firebaseAuth: true, firebaseAdmin: true, upstoxConnectedAccounts: true, splitwise: true, casParser: false, screenshotImport: true, googleDriveSync: false, aiAssistant: true, logoProvider: true },
};

const emptySetupStatus = {
  mode: 'local', app: { baseUrl: '' },
  firebase: { configured: false, projectId: null },
  firebaseAdmin: { configured: false, hasProjectId: false, hasClientEmail: false, hasPrivateKey: false },
  pricing: { massive: { configured: false, present: false }, alphaVantage: { configured: false, present: false }, finnhub: { configured: false, present: false }, upstoxSystem: { configured: false, present: false } },
  integrations: { upstox: { clientConfigured: false, encryptionConfigured: false, stateSecretConfigured: false, redirectConfigured: false }, splitwise: { clientConfigured: false, encryptionConfigured: false, stateSecretConfigured: false, redirectConfigured: false } },
  ai: { serverKey: { configured: false, present: false }, userCredentialsSupported: false },
  casParser: { configured: false, hasServiceUrl: false, allowsExternalFallback: false },
  logoProvider: { serverKey: { configured: false, present: false }, clientKey: { configured: false, present: false } },
  googleDrive: { clientId: { configured: false, present: false } },
  connectedAccounts: { encryptionConfigured: false, stateSecretConfigured: false },
  integrationTokens: { encryptionConfigured: false },
  features: { manualAssets: true, dashboard: true, priceRefresh: true, firebaseAuth: false, firebaseAdmin: false, upstoxConnectedAccounts: false, splitwise: false, casParser: false, screenshotImport: false, googleDriveSync: false, aiAssistant: false, logoProvider: false },
};

function createMockStorage() {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null, setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; }, clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
    get length() { return Object.keys(store).length; }, key: (i: number) => Object.keys(store)[i] ?? null,
  };
}

function renderWizard(props: Partial<React.ComponentProps<typeof SetupWizard>> = {}) {
  const defaults: React.ComponentProps<typeof SetupWizard> = { open: true, onClose: vi.fn(), onNavigateToSettings: vi.fn(), onNavigateToDocs: vi.fn() };
  return render(<SetupWizard {...defaults} {...props} />);
}

describe('SetupWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks(); mockFetch.mockReset(); vi.stubGlobal('fetch', mockFetch);
    const mockStorage = createMockStorage(); vi.stubGlobal('localStorage', mockStorage);
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('does not render when closed', () => {
    renderWizard({ open: false });
    expect(screen.queryByTestId('setup-wizard-overlay')).toBeNull();
  });

  it('renders when open', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => fullSetupStatus });
    renderWizard();
    await screen.findByTestId('setup-wizard-overlay');
    expect(screen.getByText('Guided Setup')).toBeTruthy();
  });

  it('renders provider section categories', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => fullSetupStatus });
    renderWizard();
    await screen.findByText('Guided Setup');
    expect(screen.getByText('Choose Setup Path')).toBeTruthy();
    expect(screen.getByText('Firebase')).toBeTruthy();
    expect(screen.getByText('Price Providers')).toBeTruthy();
    expect(screen.getByText('AI Providers')).toBeTruthy();
  });

  it('shows progress count', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => fullSetupStatus });
    renderWizard();
    await screen.findByText('Guided Setup');
    expect(screen.getByText(/of 12/)).toBeTruthy();
  });

  it('renders step title and description', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => fullSetupStatus });
    renderWizard();
    await screen.findByTestId('wizard-step-title');
    expect(screen.getByTestId('wizard-step-title').textContent).toBe(SETUP_STEPS[0].title);
    expect(screen.getByTestId('wizard-step-description').textContent).toBe(SETUP_STEPS[0].description);
  });

  it('shows what this enables section', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => fullSetupStatus });
    renderWizard();
    await screen.findByText('What this enables');
    expect(screen.getByTestId('wizard-what-enables').textContent).toBeTruthy();
  });

  it('has expandable setup instructions', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => fullSetupStatus });
    renderWizard();
    await screen.findByTestId('wizard-toggle-detail');
    expect(screen.queryByTestId('wizard-step-detail')).toBeNull();
    await userEvent.click(screen.getByTestId('wizard-toggle-detail'));
    expect(screen.getByTestId('wizard-step-detail')).toBeTruthy();
  });

  it('shows docs links', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => fullSetupStatus });
    renderWizard();
    await screen.findByText('Guided Setup');
    expect(screen.queryByTestId('wizard-docs-link-0')).toBeTruthy();
  });

  it('shows app route button', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => fullSetupStatus });
    renderWizard();
    await screen.findByText('Guided Setup');
    expect(screen.getByTestId('wizard-app-route')).toBeTruthy();
  });

  it('allows navigation to next step', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => fullSetupStatus });
    const user = userEvent.setup();
    renderWizard();
    await screen.findByTestId('wizard-step-title');
    const first = screen.getByTestId('wizard-step-title').textContent;
    await user.click(screen.getByTestId('wizard-next'));
    expect(screen.getByTestId('wizard-step-title').textContent).not.toBe(first);
  });

  it('allows navigation back', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => fullSetupStatus });
    const user = userEvent.setup();
    renderWizard();
    await screen.findByTestId('wizard-step-title');
    const first = screen.getByTestId('wizard-step-title').textContent;
    await user.click(screen.getByTestId('wizard-next'));
    await user.click(screen.getByTestId('wizard-prev'));
    expect(screen.getByTestId('wizard-step-title').textContent).toBe(first);
  });

  it('marks step done', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => fullSetupStatus });
    const user = userEvent.setup();
    renderWizard();
    await screen.findByTestId('wizard-done');
    await user.click(screen.getByTestId('wizard-done'));
    expect(screen.getByTestId('wizard-undo-done')).toBeTruthy();
  });

  it('updates progress on done', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => fullSetupStatus });
    const user = userEvent.setup();
    renderWizard();
    await screen.findByText(/0 of 12/);
    await user.click(screen.getByTestId('wizard-done'));
    expect(screen.getByText(/1 of 12/)).toBeTruthy();
  });

  it('persists state to localStorage', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => fullSetupStatus });
    const user = userEvent.setup();
    renderWizard();
    await screen.findByTestId('wizard-done');
    await user.click(screen.getByTestId('wizard-done'));
    const saved = JSON.parse(window.localStorage.getItem(WIZARD_STORAGE_KEY) || '{}');
    expect(saved.stepStates).toBeTruthy();
    expect(saved.currentStepIndex).toBe(0);
  });

  it('restores state from localStorage', () => {
    const savedState = { stepStates: { 'choose-path': 'done', 'firebase-client': 'pending', 'firebase-admin': 'pending', 'gemini': 'pending', 'deepseek': 'pending', 'massive': 'pending', 'alpha-vantage': 'pending', 'logo-dev': 'pending', 'upstox': 'pending', 'splitwise': 'pending', 'cas-parser': 'pending', 'verify-setup': 'pending' } as Record<SetupStepId, 'done' | 'pending' | 'skipped'>, currentStepIndex: 1 };
    window.localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(savedState));
    mockFetch.mockResolvedValue({ ok: true, json: async () => fullSetupStatus });
    renderWizard();
    expect(screen.getByText('Firebase Client Config')).toBeTruthy();
  });

  it('shows verification status badge', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => fullSetupStatus });
    const user = userEvent.setup();
    renderWizard();
    await screen.findByText('Guided Setup');
    await user.click(screen.getByTestId('wizard-cat-firebase'));
    await waitFor(() => expect(screen.queryAllByTestId('wizard-verify-badge').length).toBeGreaterThan(0));
  });

  it('allows closing the wizard', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => fullSetupStatus });
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderWizard({ onClose });
    await screen.findByText('Guided Setup');
    await user.click(screen.getByTestId('wizard-close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('does not render secret values', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => emptySetupStatus });
    renderWizard();
    await screen.findByText('Guided Setup');
    const body = document.body.textContent || '';
    expect(body).not.toContain('-----BEGIN');
  });

  it('handles fetch error', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));
    renderWizard();
    await waitFor(() => {
      expect(screen.getByText('Guided Setup')).toBeTruthy();
      expect(screen.queryByText(/Status unavailable/)).toBeTruthy();
    });
  });

  it('navigates via category buttons', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => fullSetupStatus });
    const user = userEvent.setup();
    renderWizard();
    await screen.findByText('Guided Setup');
    await user.click(screen.getByTestId('wizard-cat-firebase'));
    const title = screen.getByTestId('wizard-step-title').textContent;
    expect(SETUP_STEPS.filter((s) => s.category === 'firebase').some((s) => s.title === title)).toBe(true);
  });

  it('app route button calls handler', async () => {
    const onNavigateToDocs = vi.fn();
    mockFetch.mockResolvedValue({ ok: true, json: async () => fullSetupStatus });
    const user = userEvent.setup();
    renderWizard({ onNavigateToDocs });
    await screen.findByText('Guided Setup');
    await user.click(screen.getByTestId('wizard-app-route'));
    expect(onNavigateToDocs).toHaveBeenCalled();
  });

  it('shows required badge', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => fullSetupStatus });
    renderWizard();
    await screen.findByText('Guided Setup');
    expect(screen.getByText('Required')).toBeTruthy();
  });

  it('shows optional badge on optional step', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => fullSetupStatus });
    const user = userEvent.setup();
    renderWizard();
    await screen.findByText('Guided Setup');
    await user.click(screen.getByTestId('wizard-cat-ai-providers'));
    expect(screen.getByText('Optional')).toBeTruthy();
  });

  it('category heading links are present', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => fullSetupStatus });
    renderWizard();
    await screen.findByText('Guided Setup');
    expect(screen.getByTestId('wizard-cat-getting-started')).toBeTruthy();
    expect(screen.getByTestId('wizard-cat-verify')).toBeTruthy();
  });

  it('shows cost posture on current step', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => fullSetupStatus });
    renderWizard();
    await screen.findByText('Guided Setup');
    expect(document.body.textContent).toContain(SETUP_STEPS[0].costPosture);
  });
});
