// @vitest-environment happy-dom
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

const mockUseAuth = vi.hoisted(() => vi.fn());
const mockUsePortfolio = vi.hoisted(() => vi.fn());
const mockGetServerWorkspaceOwnership = vi.hoisted(() => vi.fn(async () => null));
const mockGetOnboardingState = vi.hoisted(() => vi.fn());

vi.mock('./store/AuthContext', () => ({
  useAuth: mockUseAuth,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('./store/PortfolioContext', () => ({
  usePortfolio: mockUsePortfolio,
  PortfolioProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('./store/SplitwiseContext', () => ({
  useSplitwise: () => ({ status: 'disconnected' }),
  SplitwiseProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('./store/ConnectedAccountsContext', () => ({
  useConnectedAccounts: () => ({ upstox: null }),
  ConnectedAccountsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('./lib/onboardingApi', () => ({
  getOnboardingState: (...args: unknown[]) => mockGetOnboardingState(...args),
  saveOnboardingStep: vi.fn(async () => ({})),
  completeOnboarding: vi.fn(async () => ({ status: 'completed' })),
}));

vi.mock('./lib/firebaseRuntime', () => ({
  getHostedRuntime: () => ({ auth: {}, db: {}, googleProvider: {} }),
  createSelfOwnedRuntime: () => ({ auth: {}, db: {}, googleProvider: {} }),
  destroySelfOwnedRuntime: () => {},
}));

vi.mock('./lib/WorkspaceContext', () => ({
  WorkspaceProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  WorkspaceContext: null,
}));

vi.mock('./lib/aiCredentialsApi', () => ({
  getAiCredentials: vi.fn(async () => ({ provider: null })),
}));

vi.mock('./lib/workspaceOwnershipApi', () => ({
  getServerWorkspaceOwnership: mockGetServerWorkspaceOwnership,
  saveServerWorkspaceOwnership: vi.fn(async (mode: string) => ({ mode, savedAt: Date.now() })),
}));

vi.mock('./components/Dashboard', () => ({ Dashboard: () => <div>Dashboard</div> }));
vi.mock('./components/Ledger', () => ({ Ledger: () => <div>Ledger</div> }));
vi.mock('./components/Settings', () => ({ Settings: () => <div>Settings</div> }));
vi.mock('./components/AddAssetModal', () => ({ AddAssetModal: () => null }));
vi.mock('./components/ImportProgressOverlay', () => ({ ImportProgressOverlay: () => null }));
vi.mock('./components/GettingStartedChecklist', () => ({ GettingStartedChecklist: () => <div>GettingStartedChecklist</div> }));
vi.mock('./components/SetupWizard', () => ({ SetupWizard: () => null }));
vi.mock('./components/CenteredState', () => ({ CenteredState: ({ title }: { title: string }) => <div>{title}</div> }));
vi.mock('./components/WorkspaceOwnershipSetup', () => ({ WorkspaceOwnershipSetup: () => null }));
vi.mock('./components/OnboardingWizard', () => ({ OnboardingWizard: ({ onComplete }: { onComplete: () => void }) => <div><button onClick={onComplete}>Finish Setup</button></div> }));

import App from './App';

describe('App onboarding gating flow', () => {
  let store: Record<string, string>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetServerWorkspaceOwnership.mockResolvedValue(null);
    mockGetOnboardingState.mockResolvedValue(null);
    store = {};
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => store[key] ?? null),
        setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
        removeItem: vi.fn((key: string) => { delete store[key]; }),
        clear: vi.fn(() => { Object.keys(store).forEach((k) => delete store[k]); }),
        key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
        get length() { return Object.keys(store).length; },
      },
      configurable: true,
    });
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn(() => ({ matches: false })),
      configurable: true,
    });
  });

  function setupAuthUser() {
    mockUseAuth.mockReturnValue({
      user: { uid: 'test-uid', email: 'test@example.com' },
      loading: false,
      authError: null,
      signInWithGoogle: vi.fn(),
      logout: vi.fn(),
    });
    mockUsePortfolio.mockReturnValue({
      hasAccess: true,
      accessError: null,
      isPortfolioLoading: false,
      assets: [],
      refreshPrices: vi.fn(),
      isRefreshing: false,
      portfolios: [],
      activePortfolioId: null,
      setActivePortfolioId: vi.fn(),
      upstox: null,
    });
  }

  function storeOwnership(uid: string, mode: 'hosted' | 'selfOwned') {
    store[`nexus.workspaceOwnership.v1:${uid}`] = JSON.stringify({ mode, savedAt: Date.now() });
  }

  it('shows onboarding wizard when onboarding not started', async () => {
    setupAuthUser();
    storeOwnership('test-uid', 'hosted');
    mockGetOnboardingState.mockResolvedValue(null);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Finish Setup')).toBeInTheDocument();
    });
  });

  it('shows onboarding wizard when onboarding is in_progress', async () => {
    setupAuthUser();
    storeOwnership('test-uid', 'hosted');
    mockGetOnboardingState.mockResolvedValue({
      uid: 'test-uid',
      status: 'in_progress',
      currentStep: 1,
      primaryCountry: 'US',
      primaryCurrency: 'USD',
      secondaryCountry: null,
      secondaryCurrency: null,
      selectedAssetClasses: ['us-stocks'],
      providerSelections: [],
      integrationSelections: [],
      members: [],
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Finish Setup')).toBeInTheDocument();
    });
  });

  it('renders dashboard when onboarding is completed', async () => {
    setupAuthUser();
    storeOwnership('test-uid', 'hosted');
    mockGetOnboardingState.mockResolvedValue({
      uid: 'test-uid',
      status: 'completed',
      currentStep: 6,
      primaryCountry: 'US',
      primaryCurrency: 'USD',
      secondaryCountry: null,
      secondaryCurrency: null,
      selectedAssetClasses: ['us-stocks'],
      providerSelections: [{ providerId: 'yahoo', enabled: true }],
      integrationSelections: [],
      members: [],
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('GettingStartedChecklist')).toBeInTheDocument();
    });
  });

  it('does not show wizard briefly before onboarding check resolves', async () => {
    setupAuthUser();
    storeOwnership('test-uid', 'hosted');

    let resolveOnboarding: (value: unknown) => void;
    const onboardingPromise = new Promise((resolve) => {
      resolveOnboarding = resolve;
    });
    mockGetOnboardingState.mockReturnValue(onboardingPromise);

    render(<App />);

    expect(screen.queryByText('Finish Setup')).not.toBeInTheDocument();
    expect(screen.queryByText('GettingStartedChecklist')).not.toBeInTheDocument();

    resolveOnboarding!(null);
    await waitFor(() => {
      expect(screen.getByText('Finish Setup')).toBeInTheDocument();
    });
  });
});
