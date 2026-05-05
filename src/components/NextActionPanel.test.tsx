// @vitest-environment jsdom
import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextActionPanel } from './NextActionPanel';

function mockFetchStatus(overrides: Record<string, any> = {}) {
  const defaults = {
    mode: 'local',
    app: { baseUrl: '' },
    firebase: { configured: false, projectId: null },
    firebaseAdmin: { configured: false, hasProjectId: false, hasClientEmail: false, hasPrivateKey: false },
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
    ai: { serverKey: { configured: false, present: false }, userCredentialsSupported: false },
    casParser: { configured: false, hasServiceUrl: false, allowsExternalFallback: false },
    logoProvider: { serverKey: { configured: false, present: false }, clientKey: { configured: false, present: false } },
    googleDrive: { clientId: { configured: false, present: false } },
    connectedAccounts: { encryptionConfigured: false, stateSecretConfigured: false },
    integrationTokens: { encryptionConfigured: false },
    features: {
      manualAssets: true, dashboard: true, priceRefresh: true, firebaseAuth: false, firebaseAdmin: false,
      upstoxConnectedAccounts: false, splitwise: false, casParser: false, screenshotImport: false,
      googleDriveSync: false, aiAssistant: false, logoProvider: false,
    },
    ...overrides,
  };
  return Promise.resolve(defaults);
}

function createMockStorage() {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
}

function renderPanel(props: Partial<React.ComponentProps<typeof NextActionPanel>> = {}) {
  const defaults: React.ComponentProps<typeof NextActionPanel> = {
    assetsCount: 0,
    upstoxConnected: false,
    splitwiseConnected: false,
    aiKeyConfigured: false,
    onNavigateToSettings: vi.fn(),
    onNavigateToDocs: vi.fn(),
    onAddAsset: vi.fn(),
  };
  return render(<NextActionPanel {...defaults} {...props} />);
}

describe('NextActionPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const mockStorage = createMockStorage();
    vi.stubGlobal('localStorage', mockStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the panel title', async () => {
    window.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => mockFetchStatus(),
    } as Response);
    renderPanel();
    await waitFor(() => {
      expect(screen.getByText('What should I do next?')).toBeTruthy();
    });
  });

  it('shows primary action for new users with no assets', async () => {
    window.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => mockFetchStatus(),
    } as Response);
    renderPanel();
    await waitFor(() => {
      expect(screen.getByTestId('next-action-go-add-first-asset')).toBeTruthy();
    });
    expect(screen.getByText('Add your first asset')).toBeTruthy();
  });

  it('shows configure-firebase when firebase is not configured', async () => {
    window.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => mockFetchStatus({}),
    } as Response);
    renderPanel({ assetsCount: 5 });
    await waitFor(() => {
      expect(screen.getByTestId('next-action-go-configure-firebase')).toBeTruthy();
    });
  });

  it('shows configure-price-provider when pricing is not configured', async () => {
    window.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => mockFetchStatus({
        features: { firebaseAuth: true, firebaseAdmin: true },
      }),
    } as Response);
    renderPanel({ assetsCount: 5 });
    await waitFor(() => {
      expect(screen.getByTestId('next-action-go-configure-price-provider')).toBeTruthy();
    });
  });

  it('shows add-ai-key when AI key is not configured', async () => {
    window.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => mockFetchStatus({
        features: { firebaseAuth: true, firebaseAdmin: true },
        pricing: { massive: { configured: true, present: true }, alphaVantage: { configured: false, present: false }, finnhub: { configured: false, present: false }, upstoxSystem: { configured: false, present: false } },
      }),
    } as Response);
    renderPanel({ assetsCount: 5, aiKeyConfigured: false });
    await waitFor(() => {
      expect(screen.getByTestId('next-action-go-add-ai-key')).toBeTruthy();
    });
  });

  it('shows setup-import when no imports are connected', async () => {
    window.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => mockFetchStatus({
        features: { firebaseAuth: true, firebaseAdmin: true },
        pricing: { massive: { configured: true, present: true }, alphaVantage: { configured: false, present: false }, finnhub: { configured: false, present: false }, upstoxSystem: { configured: false, present: false } },
      }),
    } as Response);
    renderPanel({ assetsCount: 5, aiKeyConfigured: true, upstoxConnected: false, splitwiseConnected: false });
    await waitFor(() => {
      expect(screen.getByTestId('next-action-go-setup-import')).toBeTruthy();
    });
  });

  it('hides panel when everything is configured', async () => {
    window.localStorage.setItem('nexus-checklist-state', JSON.stringify({ 'review-docs': 'done' }));
    window.localStorage.setItem('nexus.workspaceOwnership.v1', JSON.stringify({ mode: 'selfOwned', savedAt: Date.now() }));
    window.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => mockFetchStatus({
        firebase: { configured: true, projectId: 'test' },
        features: { firebaseAuth: true, firebaseAdmin: true },
        pricing: { massive: { configured: true, present: true }, alphaVantage: { configured: false, present: false }, finnhub: { configured: false, present: false }, upstoxSystem: { configured: false, present: false } },
        casParser: { configured: true, hasServiceUrl: true, allowsExternalFallback: false },
      }),
    } as Response);
    renderPanel({
      assetsCount: 5,
      upstoxConnected: true,
      aiKeyConfigured: true,
    });
    await waitFor(() => {
      expect(screen.queryByText('What should I do next?')).toBeNull();
    });
  });

  it('navigates to settings for configure-price-provider', async () => {
    const onNavigateToSettings = vi.fn();
    window.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => mockFetchStatus({
        features: { firebaseAuth: true, firebaseAdmin: true },
      }),
    } as Response);
    const user = userEvent.setup();
    renderPanel({ assetsCount: 5, onNavigateToSettings });
    await waitFor(() => {
      expect(screen.getByTestId('next-action-go-configure-price-provider')).toBeTruthy();
    });
    await user.click(screen.getByTestId('next-action-go-configure-price-provider'));
    expect(onNavigateToSettings).toHaveBeenCalledWith('price-providers');
  });

  it('navigates to docs for configure-firebase', async () => {
    const onNavigateToDocs = vi.fn();
    window.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => mockFetchStatus(),
    } as Response);
    const user = userEvent.setup();
    renderPanel({ assetsCount: 5, onNavigateToDocs });
    await waitFor(() => {
      expect(screen.getByTestId('next-action-go-configure-firebase')).toBeTruthy();
    });
    await user.click(screen.getByTestId('next-action-go-configure-firebase'));
    expect(onNavigateToDocs).toHaveBeenCalled();
  });

  it('triggers add-asset flow for add-first-asset action', async () => {
    const onAddAsset = vi.fn();
    window.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => mockFetchStatus(),
    } as Response);
    const user = userEvent.setup();
    renderPanel({ onAddAsset });
    await waitFor(() => {
      expect(screen.getByTestId('next-action-go-add-first-asset')).toBeTruthy();
    });
    await user.click(screen.getByTestId('next-action-go-add-first-asset'));
    expect(onAddAsset).toHaveBeenCalled();
  });

  it('shows secondary actions', async () => {
    window.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => mockFetchStatus(),
    } as Response);
    renderPanel();
    await waitFor(() => {
      expect(screen.getByTestId('next-action-primary')).toBeTruthy();
    });
    const secondaryItems = screen.getAllByTestId(/next-action-secondary-/);
    expect(secondaryItems.length).toBeGreaterThanOrEqual(1);
  });

  it('handles setup status fetch failure gracefully', async () => {
    window.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    renderPanel();
    await waitFor(() => {
      expect(screen.getByTestId('next-action-go-add-first-asset')).toBeTruthy();
    });
  });
});
