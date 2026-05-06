// @vitest-environment happy-dom
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

const mockUseAuth = vi.hoisted(() => vi.fn());
const mockUsePortfolio = vi.hoisted(() => vi.fn());

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

vi.mock('./lib/aiCredentialsApi', () => ({
  getAiCredentials: vi.fn(async () => ({ provider: null })),
}));

vi.mock('./lib/samplePortfolio', () => ({
  SampleModeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSampleMode: () => ({ isSampleMode: false, disableSampleMode: vi.fn() }),
}));

vi.mock('./lib/firebaseRuntime', () => ({
  getHostedRuntime: () => ({ auth: {}, db: {}, googleProvider: {} }),
  createSelfOwnedRuntime: vi.fn(() => ({ auth: {}, db: {}, googleProvider: {} })),
  destroySelfOwnedRuntime: vi.fn(),
}));

vi.mock('./lib/WorkspaceContext', () => ({
  WorkspaceProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  WorkspaceContext: null,
}));

vi.mock('./components/Dashboard', () => ({ Dashboard: () => <div>Dashboard</div> }));
vi.mock('./components/Ledger', () => ({ Ledger: () => <div>Ledger</div> }));
vi.mock('./components/Settings', () => ({ Settings: () => <div>Settings</div> }));
vi.mock('./components/AddAssetModal', () => ({ AddAssetModal: () => null }));
vi.mock('./components/ImportProgressOverlay', () => ({ ImportProgressOverlay: () => null }));
vi.mock('./components/GettingStartedChecklist', () => ({ GettingStartedChecklist: () => <div>GettingStartedChecklist</div> }));

import App from './App';

function setupLocalStorage(data: Record<string, string | null>) {
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: vi.fn((key: string) => data[key] ?? null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    },
    configurable: true,
  });
}

function createSelfOwnedStorage() {
  return JSON.stringify({
    mode: 'selfOwned',
    firebaseConfig: {
      apiKey: 'key',
      authDomain: 'test.firebaseapp.com',
      projectId: 'test-project',
      storageBucket: 'test.appspot.com',
      messagingSenderId: '123',
      appId: '1:123:web:abc',
    },
    savedAt: Date.now(),
  });
}

describe('App self-owned flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      configurable: true,
    });
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn(() => ({ matches: false })),
      configurable: true,
    });
  });

  it('passes self-owned sign-in gate when user is already signed into workspace auth', async () => {
    setupLocalStorage({
      'nexus.workspaceOwnership.v1:test-uid': createSelfOwnedStorage(),
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
  });

  it('shows loading while AuthProvider is still loading', async () => {
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
    expect(screen.getByText('Checking your sign-in session...')).toBeInTheDocument();
  });

  it('renders main app content when self-owned sign-in is done and user has portfolio access', async () => {
    setupLocalStorage({
      'nexus.workspaceOwnership.v1:test-uid': createSelfOwnedStorage(),
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
  });

  it('shows ownership setup for user without saved mode', async () => {
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

  it('does not render SelfOwnedPlaceholder after valid selfOwned config', async () => {
    setupLocalStorage({
      'nexus.workspaceOwnership.v1:test-uid': createSelfOwnedStorage(),
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
      expect(screen.queryByText(/Self-Owned Firebase.*Draft Saved/)).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.queryByText(/self-owned data connection is not active/)).not.toBeInTheDocument();
    });
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(2);
  });

  it('renders hosted app content when ownership is hosted', async () => {
    setupLocalStorage({
      'nexus.workspaceOwnership.v1:test-uid': JSON.stringify({
        mode: 'hosted',
        savedAt: Date.now(),
      }),
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
  });
});
