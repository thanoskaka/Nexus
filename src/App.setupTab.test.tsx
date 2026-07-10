// @vitest-environment happy-dom
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

const mockUseAuth = vi.hoisted(() => vi.fn());
const mockUsePortfolio = vi.hoisted(() => vi.fn());
const mockUseSetupTabVisibility = vi.hoisted(() => vi.fn());
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

vi.mock('./lib/useSetupTabVisibility', () => ({
  useSetupTabVisibility: mockUseSetupTabVisibility,
}));

vi.mock('./lib/onboardingApi', () => ({
  getOnboardingState: (...args: unknown[]) => mockGetOnboardingState(...args),
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
vi.mock('./components/NextActionPanel', () => ({ NextActionPanel: () => <div>NextActionPanel</div> }));
vi.mock('./components/SetupWizard', () => ({ SetupWizard: () => null }));
vi.mock('./components/CenteredState', () => ({ CenteredState: ({ title }: { title: string }) => <div>{title}</div> }));
vi.mock('./components/WorkspaceOwnershipSetup', () => ({ WorkspaceOwnershipSetup: () => null }));
vi.mock('./components/OnboardingWizard', () => ({ OnboardingWizard: () => null }));

import App from './App';

describe('App setup tab', () => {
  let store: Record<string, string>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetServerWorkspaceOwnership.mockResolvedValue(null);
    mockGetOnboardingState.mockResolvedValue({ uid: 'test-uid', status: 'completed' });
    mockUseSetupTabVisibility.mockReturnValue({ visible: true });
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
    });
  }

  function storeOwnership(uid: string, mode: 'hosted' | 'selfOwned') {
    store[`nexus.workspaceOwnership.v1:${uid}`] = JSON.stringify({ mode, savedAt: Date.now() });
  }

  it('dashboard does not show getting started or next action content', async () => {
    setupAuthUser();
    storeOwnership('test-uid', 'hosted');
    mockUseSetupTabVisibility.mockReturnValue({ visible: true });

    render(<App />);

    await waitFor(() => {
      expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.queryByText('GettingStartedChecklist')).not.toBeInTheDocument();
    expect(screen.queryByText('NextActionPanel')).not.toBeInTheDocument();
  });

  it('shows Setup checklist in the account menu when setup is incomplete', async () => {
    const user = userEvent.setup();
    setupAuthUser();
    storeOwnership('test-uid', 'hosted');
    mockUseSetupTabVisibility.mockReturnValue({ visible: true });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Open account menu' })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Open account menu' }));
    expect(screen.getByRole('button', { name: 'Setup checklist' })).toBeInTheDocument();
  });

  it('hides Setup checklist from the account menu when setup is complete', async () => {
    const user = userEvent.setup();
    setupAuthUser();
    storeOwnership('test-uid', 'hosted');
    mockUseSetupTabVisibility.mockReturnValue({ visible: false });

    render(<App />);

    await waitFor(() => {
      expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(1);
    });
    await user.click(screen.getByRole('button', { name: 'Open account menu' }));
    expect(screen.queryByRole('button', { name: 'Setup checklist' })).not.toBeInTheDocument();
  });

  it('renders GettingStartedChecklist and NextActionPanel on the setup tab', async () => {
    const user = userEvent.setup();
    setupAuthUser();
    storeOwnership('test-uid', 'hosted');
    mockUseSetupTabVisibility.mockReturnValue({ visible: true });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Open account menu' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Open account menu' }));
    await user.click(screen.getByRole('button', { name: 'Setup checklist' }));

    expect(screen.getByText('GettingStartedChecklist')).toBeInTheDocument();
    expect(screen.getByText('NextActionPanel')).toBeInTheDocument();
  });

  it('falls back to dashboard when tab becomes hidden while on setup view', async () => {
    setupAuthUser();
    storeOwnership('test-uid', 'hosted');
    mockUseSetupTabVisibility.mockReturnValue({ visible: true });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Open account menu' })).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Open account menu' }));
    await user.click(screen.getByRole('button', { name: 'Setup checklist' }));

    expect(screen.getByText('GettingStartedChecklist')).toBeInTheDocument();

    mockUseSetupTabVisibility.mockReturnValue({ visible: false });
    await user.click(screen.getByRole('button', { name: 'Overview' }));

    await waitFor(() => {
      expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.queryByText('GettingStartedChecklist')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Open account menu' }));
    expect(screen.queryByRole('button', { name: 'Setup checklist' })).not.toBeInTheDocument();
  });

  it('does not redirect from dashboard to setup when app loads', async () => {
    setupAuthUser();
    storeOwnership('test-uid', 'hosted');
    mockUseSetupTabVisibility.mockReturnValue({ visible: true });

    render(<App />);

    await waitFor(() => {
      expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.queryByText('GettingStartedChecklist')).not.toBeInTheDocument();
  });

  it('initial view from query param works for setup', async () => {
    window.history.pushState({}, '', '/?view=setup');
    setupAuthUser();
    storeOwnership('test-uid', 'hosted');
    mockUseSetupTabVisibility.mockReturnValue({ visible: true });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('GettingStartedChecklist')).toBeInTheDocument();
    });
    window.history.pushState({}, '', '/');
  });
});
