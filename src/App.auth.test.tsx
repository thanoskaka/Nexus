// @vitest-environment happy-dom
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

const mockUseAuth = vi.hoisted(() => vi.fn());
const mockUsePortfolio = vi.hoisted(() => vi.fn());
const mockGetServerWorkspaceOwnership = vi.hoisted(() => vi.fn(async () => null));
const mockSaveServerWorkspaceOwnership = vi.hoisted(() => vi.fn(async (mode: string, firebaseConfig?: unknown) => ({
  mode,
  firebaseConfig,
  savedAt: Date.now(),
})));

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
  saveServerWorkspaceOwnership: mockSaveServerWorkspaceOwnership,
}));

vi.mock('./components/Dashboard', () => ({ Dashboard: () => <div>Dashboard</div> }));
vi.mock('./components/Ledger', () => ({ Ledger: () => <div>Ledger</div> }));
vi.mock('./components/Settings', () => ({ Settings: () => <div>Settings</div> }));
vi.mock('./components/AddAssetModal', () => ({ AddAssetModal: () => null }));
vi.mock('./components/ImportProgressOverlay', () => ({ ImportProgressOverlay: () => null }));
vi.mock('./components/GettingStartedChecklist', () => ({ GettingStartedChecklist: () => <div>GettingStartedChecklist</div> }));

import App from './App';

describe('App authentication flow', () => {
  let store: Record<string, string>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetServerWorkspaceOwnership.mockResolvedValue(null);
    mockSaveServerWorkspaceOwnership.mockImplementation(async (mode: string, firebaseConfig?: unknown) => ({
      mode,
      firebaseConfig,
      savedAt: Date.now(),
    }));
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

  function storeOwnership(uid: string, mode: 'hosted' | 'selfOwned') {
    store[`nexus.workspaceOwnership.v1:${uid}`] = JSON.stringify({ mode, savedAt: Date.now() });
  }

  it('renders public home when user is null and not loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      authError: null,
      signInWithGoogle: vi.fn(),
      logout: vi.fn(),
    });
    mockUsePortfolio.mockReturnValue({
      hasAccess: false,
      accessError: null,
      isPortfolioLoading: false,
    });

    render(<App />);

    expect(screen.getByText('Nexus Portfolio')).toBeInTheDocument();
    expect(screen.getAllByText('Get Started').length).toBeGreaterThanOrEqual(1);
  });

  it('renders auth error on public home when auth error is present', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      authError: 'Google sign-in failed.',
      signInWithGoogle: vi.fn(),
      logout: vi.fn(),
    });
    mockUsePortfolio.mockReturnValue({
      hasAccess: false,
      accessError: null,
      isPortfolioLoading: false,
    });

    render(<App />);

    expect(screen.getByText('Google sign-in failed.')).toBeInTheDocument();
  });

  it('renders loading state when auth is loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
      authError: null,
      signInWithGoogle: vi.fn(),
      logout: vi.fn(),
    });
    mockUsePortfolio.mockReturnValue({});

    render(<App />);

    expect(screen.getByText('Loading portfolio')).toBeInTheDocument();
  });

  it('renders loading state when user exists but portfolio is loading', () => {
    storeOwnership('test-uid', 'hosted');
    mockUseAuth.mockReturnValue({
      user: { uid: 'test-uid', email: 'test@example.com' },
      loading: false,
      authError: null,
      signInWithGoogle: vi.fn(),
      logout: vi.fn(),
    });
    mockUsePortfolio.mockReturnValue({
      isPortfolioLoading: true,
      hasAccess: false,
      accessError: null,
    });

    render(<App />);

    expect(screen.getByText('Loading portfolio')).toBeInTheDocument();
  });

  it('renders preparing portfolio when user exists but no access', () => {
    storeOwnership('test-uid', 'hosted');
    mockUseAuth.mockReturnValue({
      user: { uid: 'test-uid', email: 'test@example.com' },
      loading: false,
      authError: null,
      signInWithGoogle: vi.fn(),
      logout: vi.fn(),
    });
    mockUsePortfolio.mockReturnValue({
      isPortfolioLoading: false,
      hasAccess: false,
      accessError: null,
    });

    render(<App />);

    expect(screen.getByText('Preparing your portfolio')).toBeInTheDocument();
  });

  it('renders main app when user has access', () => {
    const uid = 'test-uid';
    mockUseAuth.mockReturnValue({
      user: { uid, email: 'test@example.com' },
      loading: false,
      authError: null,
      signInWithGoogle: vi.fn(),
      logout: vi.fn(),
    });
    mockUsePortfolio.mockReturnValue({
      isPortfolioLoading: false,
      hasAccess: true,
      accessError: null,
      refreshPrices: vi.fn(),
      isRefreshing: false,
      portfolios: [],
      activePortfolioId: null,
      setActivePortfolioId: vi.fn(),
      assets: [],
    });

    storeOwnership(uid, 'hosted');

    render(<App />);

    expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(2);
  });

  it('renders ownership setup before portfolio for a signed-in user without saved mode', async () => {
    mockUseAuth.mockReturnValue({
      user: { uid: 'new-user', email: 'new@example.com' },
      loading: false,
      authError: null,
      signInWithGoogle: vi.fn(),
      logout: vi.fn(),
    });
    mockUsePortfolio.mockReturnValue({
      isPortfolioLoading: true,
      hasAccess: false,
      accessError: null,
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Welcome to Nexus Portfolio')).toBeInTheDocument();
    });
    expect(screen.getAllByText('Use Nexus Hosted').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Bring Your Own Firebase').length).toBeGreaterThanOrEqual(1);
  });

  it('migrates global ownership to uid-scoped for returning user', () => {
    store['nexus.workspaceOwnership.v1'] = JSON.stringify({ mode: 'hosted', savedAt: Date.now() });

    mockUseAuth.mockReturnValue({
      user: { uid: 'test-uid', email: 'test@example.com' },
      loading: false,
      authError: null,
      signInWithGoogle: vi.fn(),
      logout: vi.fn(),
    });
    mockUsePortfolio.mockReturnValue({
      isPortfolioLoading: false,
      hasAccess: true,
      accessError: null,
      refreshPrices: vi.fn(),
      isRefreshing: false,
      portfolios: [],
      activePortfolioId: null,
      setActivePortfolioId: vi.fn(),
      assets: [],
    });

    render(<App />);

    expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(2);
    expect(store['nexus.workspaceOwnership.v1:test-uid']).toBeDefined();
    expect(store['nexus.workspaceOwnership.v1']).toBeUndefined();
  });

  it('uses server workspace ownership when local cache is empty', async () => {
    mockGetServerWorkspaceOwnership.mockResolvedValue({
      mode: 'hosted',
      savedAt: Date.now(),
    });

    mockUseAuth.mockReturnValue({
      user: { uid: 'test-uid', email: 'test@example.com' },
      loading: false,
      authError: null,
      signInWithGoogle: vi.fn(),
      logout: vi.fn(),
    });
    mockUsePortfolio.mockReturnValue({
      isPortfolioLoading: false,
      hasAccess: true,
      accessError: null,
      refreshPrices: vi.fn(),
      isRefreshing: false,
      portfolios: [],
      activePortfolioId: null,
      setActivePortfolioId: vi.fn(),
      assets: [],
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(2);
    });
    expect(store['nexus.workspaceOwnership.v1:test-uid']).toBeDefined();
  });

  it('switching from user A to user B does not reuse A ownership', async () => {
    storeOwnership('user-a', 'hosted');

    mockUseAuth.mockReturnValue({
      user: { uid: 'user-a', email: 'a@example.com' },
      loading: false,
      authError: null,
      signInWithGoogle: vi.fn(),
      logout: vi.fn(),
    });
    mockUsePortfolio.mockReturnValue({
      isPortfolioLoading: false,
      hasAccess: true,
      accessError: null,
      refreshPrices: vi.fn(),
      isRefreshing: false,
      portfolios: [],
      activePortfolioId: null,
      setActivePortfolioId: vi.fn(),
      assets: [],
    });

    const { rerender } = render(<App />);

    expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(2);

    mockUseAuth.mockReturnValue({
      user: { uid: 'user-b', email: 'b@example.com' },
      loading: false,
      authError: null,
      signInWithGoogle: vi.fn(),
      logout: vi.fn(),
    });

    rerender(<App />);

    await waitFor(() => {
      expect(screen.getByText('Welcome to Nexus Portfolio')).toBeInTheDocument();
    });
  });

  it('signing out and then signing in as user B does not reuse user A ownership', async () => {
    storeOwnership('user-a', 'hosted');

    mockUseAuth.mockReturnValue({
      user: { uid: 'user-a', email: 'a@example.com' },
      loading: false,
      authError: null,
      signInWithGoogle: vi.fn(),
      logout: vi.fn(),
    });
    mockUsePortfolio.mockReturnValue({
      isPortfolioLoading: false,
      hasAccess: true,
      accessError: null,
      refreshPrices: vi.fn(),
      isRefreshing: false,
      portfolios: [],
      activePortfolioId: null,
      setActivePortfolioId: vi.fn(),
      assets: [],
    });

    const { rerender } = render(<App />);

    expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(2);

    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      authError: null,
      signInWithGoogle: vi.fn(),
      logout: vi.fn(),
    });

    rerender(<App />);

    expect(screen.getByText('Nexus Portfolio')).toBeInTheDocument();

    mockUseAuth.mockReturnValue({
      user: { uid: 'user-b', email: 'b@example.com' },
      loading: false,
      authError: null,
      signInWithGoogle: vi.fn(),
      logout: vi.fn(),
    });

    rerender(<App />);

    await waitFor(() => {
      expect(screen.getByText('Welcome to Nexus Portfolio')).toBeInTheDocument();
    });
  });

  it('does not crash on corrupt global localStorage ownership', async () => {
    store['nexus.workspaceOwnership.v1'] = 'not-json-at-all';

    mockUseAuth.mockReturnValue({
      user: { uid: 'test-uid', email: 'test@example.com' },
      loading: false,
      authError: null,
      signInWithGoogle: vi.fn(),
      logout: vi.fn(),
    });
    mockUsePortfolio.mockReturnValue({
      isPortfolioLoading: true,
      hasAccess: false,
      accessError: null,
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Welcome to Nexus Portfolio')).toBeInTheDocument();
    });
  });
});
