// @vitest-environment happy-dom
import React from 'react';
import { render, screen } from '@testing-library/react';
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

vi.mock('./components/Dashboard', () => ({ Dashboard: () => <div>Dashboard</div> }));
vi.mock('./components/Ledger', () => ({ Ledger: () => <div>Ledger</div> }));
vi.mock('./components/Settings', () => ({ Settings: () => <div>Settings</div> }));
vi.mock('./components/AddAssetModal', () => ({ AddAssetModal: () => null }));
vi.mock('./components/ImportProgressOverlay', () => ({ ImportProgressOverlay: () => null }));
vi.mock('./components/GettingStartedChecklist', () => ({ GettingStartedChecklist: () => <div>GettingStartedChecklist</div> }));

import App from './App';

describe('App authentication flow', () => {
  function mockSavedOwnership(uid = 'test-uid') {
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => {
          if (key === `nexus.workspaceOwnership.v1:${uid}`) {
            return JSON.stringify({ mode: 'hosted', savedAt: Date.now() });
          }
          return null;
        }),
        setItem: vi.fn(),
      },
      configurable: true,
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
      },
      configurable: true,
    });
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn(() => ({ matches: false })),
      configurable: true,
    });
  });

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
    mockSavedOwnership();
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
    mockSavedOwnership();
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

    mockSavedOwnership(uid);

    render(<App />);

    expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(2);
  });

  it('renders ownership setup before portfolio for a signed-in user without saved mode', () => {
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

    expect(screen.getByText('Welcome to Nexus Portfolio')).toBeInTheDocument();
    expect(screen.getAllByText('Use Nexus Hosted').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Bring Your Own Firebase').length).toBeGreaterThanOrEqual(1);
  });
});
