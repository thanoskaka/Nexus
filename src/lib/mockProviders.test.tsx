// @vitest-environment happy-dom
import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { User } from 'firebase/auth';

const mockUser = {
  uid: 'mock-user-1',
  email: 'demo@nexus.local',
  displayName: 'Demo User',
  emailVerified: true,
  isAnonymous: false,
  providerData: [],
  metadata: {},
  refreshToken: '',
  tenantId: null,
  photoURL: null,
  providerId: 'google.com',
  delete: async () => {},
  getIdToken: async () => 'mock-token',
  getIdTokenResult: async () => ({}) as any,
  reload: async () => {},
  toJSON: () => ({}),
} as User;

vi.mock('../lib/firebase', () => ({
  auth: {
    currentUser: mockUser,
    onAuthStateChanged: (_cb: any) => { setTimeout(() => _cb(mockUser), 0); return () => {}; },
    signInWithPopup: async () => {},
    signOut: async () => {},
    signInWithRedirect: async () => {},
    getRedirectResult: async () => null,
  },
  db: {},
  googleProvider: {},
  firebaseDataNamespace: 'test',
  defaultPortfolioId: 'test-portfolio',
}));

vi.mock('../store/db', () => ({
  Asset: {},
  AssetClassDef: {},
  getSetting: async () => null,
  saveSetting: async () => {},
}));

vi.mock('../lib/api', () => ({
  DEFAULT_PRICE_PROVIDER_SETTINGS: {},
  fetchAutoMatchedPriceForAsset: async () => ({ price: null }),
  fetchExchangeRates: async () => null,
  fetchGoldSystemQuote: async () => ({ price: null }),
  isCanadianAutoMatchTicker: () => false,
  isIndianMutualFundAsset: () => false,
  isIndianStockAsset: () => false,
  isMassiveCandidateTicker: () => false,
}));

vi.mock('../store/userPreferences', () => ({
  DEFAULT_USER_PROVIDER_OVERRIDES: {},
  DEFAULT_BROKER_CONNECTIONS: {},
  normalizeUserProviderOverrides: (s: any) => s,
  normalizeUserBrokerConnections: (s: any) => s,
  getUserProviderOverridesKey: () => 'overrides',
  getUserBrokerConnectionsKey: () => 'broker',
  mergePriceProviderSettings: (a: any) => a,
}));

vi.mock('../store/portfolioHelpers', () => ({
  buildPortfolioName: () => 'Mock Portfolio',
  createDefaultPortfolio: () => ({}),
  derivePortfolioCurrencies: () => ({ primaryCurrency: 'CAD', secondaryCurrency: 'USD' }),
  getActivePortfolioStorageKey: () => 'active-portfolio',
  getPersonalPortfolioId: () => 'personal',
  isLegacySelfPortfolioCandidate: () => false,
  normalizePortfolio: (d: any) => d,
  removeLegacySelfPortfolioDuplicates: (p: any) => p,
  shouldHydratePersonalPortfolioFromLegacy: () => false,
  selectActivePortfolioId: () => 'mock-portfolio',
}));

vi.mock('../store/ConnectedAccountsContext', () => ({
  ConnectedAccountsContext: { Provider: ({ children }: any) => children },
  useConnectedAccounts: () => ({
    upstox: null, upstoxHoldings: [], loading: false, error: null,
    connectUpstox: () => {}, refreshUpstox: async () => {},
    disconnectUpstox: async () => {}, reload: async () => {},
    saveUpstoxOverride: async () => {},
  }),
}));

vi.mock('../store/SplitwiseContext', () => ({
  SplitwiseContext: { Provider: ({ children }: any) => children },
  useSplitwise: () => ({
    status: 'disconnected', summary: null, loading: false, error: null,
    refresh: async () => {}, connect: () => {}, disconnect: async () => {},
  }),
}));

vi.mock('../lib/sharedIntegrationsApi', () => ({
  SharedIntegrationMember: {},
  getSharedIntegrations: async () => ({ members: [] }),
  disconnectSharedIntegration: async () => {},
  refreshSharedIntegration: async () => {},
}));

vi.mock('../App', () => ({
  MainApp: () => <div data-testid="main-app">Main App</div>,
}));

beforeEach(() => {
  vi.stubGlobal('crypto', { randomUUID: () => 'mock-uuid' });
});

describe('MockApp', () => {
  it('renders MainApp through the real application contexts', async () => {
    const { MockApp } = await import('./mockProviders');
    render(<MockApp />);

    const app = await screen.findByTestId('main-app');
    expect(app).not.toBeNull();
    expect(app.textContent).toContain('Main App');
  });

  it('renders without throwing', async () => {
    const { MockApp } = await import('./mockProviders');
    expect(() => render(<MockApp />)).not.toThrow();
  });
});
