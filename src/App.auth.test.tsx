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
  SplitwiseProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('./store/ConnectedAccountsContext', () => ({
  ConnectedAccountsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('./components/Dashboard', () => ({ Dashboard: () => <div>Dashboard</div> }));
vi.mock('./components/Ledger', () => ({ Ledger: () => <div>Ledger</div> }));
vi.mock('./components/Settings', () => ({ Settings: () => <div>Settings</div> }));
vi.mock('./components/AddAssetModal', () => ({ AddAssetModal: () => null }));
vi.mock('./components/ImportProgressOverlay', () => ({ ImportProgressOverlay: () => null }));
vi.mock('./components/GettingStartedChecklist', () => ({ GettingStartedChecklist: () => <div>GettingStartedChecklist</div> }));

import App from './App';

describe('App authentication flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    expect(screen.getAllByText('Sign in with Google').length).toBeGreaterThanOrEqual(1);
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
  });
});
