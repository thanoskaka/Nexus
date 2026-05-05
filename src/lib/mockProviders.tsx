import React, { createContext, useContext, useMemo, useState, lazy, Suspense } from 'react';
import type { User } from 'firebase/auth';
import type { Asset, AssetClassDef } from '../store/db';
import type { PortfolioBaseCurrency, PortfolioCurrency, PortfolioDocument, PortfolioMember, PortfolioSummary } from '../store/portfolioHelpers';
import type { PriceProviderSettings } from '../lib/api';
import type { BulkRefreshRunState, ImportProgress, PortfolioContextType } from '../store/PortfolioContext';
import type { UserBrokerConnections, UserProviderOverrides } from '../store/userPreferences';
import type { SplitwiseContextType } from '../store/SplitwiseContext';
import type { ConnectedAccountsContextType } from '../store/ConnectedAccountsContext';
import { DEFAULT_PRICE_PROVIDER_SETTINGS } from '../lib/api';
import { DEFAULT_BROKER_CONNECTIONS, DEFAULT_USER_PROVIDER_OVERRIDES } from '../store/userPreferences';

// Re-create contexts locally to avoid importing store modules
// which would trigger static imports of firebase.ts.
interface MockAuthContextType {
  user: User | null;
  loading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const MockAuthContext = createContext<MockAuthContextType | undefined>(undefined);
const MockPortfolioContext = createContext<PortfolioContextType | undefined>(undefined);
const MockSplitwiseContext = createContext<SplitwiseContextType | undefined>(undefined);
const MockConnectedAccountsContext = createContext<ConnectedAccountsContextType | undefined>(undefined);

const MOCK_USER = {
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

const MOCK_PORTFOLIO_ID = 'mock-portfolio';

const MOCK_PORTFOLIO_DOC: PortfolioDocument = {
  assets: [
    { id: 'asset-1', name: 'VTI', ticker: 'VTI', quantity: 10, costBasis: 2600, currency: 'USD', owner: 'Demo User', country: 'Canada', assetClass: 'US Total Market ETF', autoUpdate: true, currentPrice: 275.5, priceFetchStatus: 'success', priceProvider: 'yahoo' },
    { id: 'asset-2', name: 'VXUS', ticker: 'VXUS', quantity: 8, costBasis: 900, currency: 'USD', owner: 'Demo User', country: 'Canada', assetClass: 'International Equity ETF', autoUpdate: true, currentPrice: 62.3, priceFetchStatus: 'success', priceProvider: 'yahoo' },
    { id: 'asset-3', name: 'XIC', ticker: 'XIC:TO', quantity: 15, costBasis: 540, currency: 'CAD', owner: 'Demo User', country: 'Canada', assetClass: 'Canada Equity ETF', autoUpdate: true, currentPrice: 38.2, priceFetchStatus: 'success', priceProvider: 'yahoo' },
    { id: 'asset-4', name: 'VAB', ticker: 'VAB:TO', quantity: 20, costBasis: 480, currency: 'CAD', owner: 'Demo User', country: 'Canada', assetClass: 'Canadian Bond ETF', autoUpdate: true, currentPrice: 24.1, priceFetchStatus: 'success', priceProvider: 'yahoo' },
    { id: 'asset-5', name: 'NIFTY 50 ETF', ticker: 'NSE:NIFTY', quantity: 5, costBasis: 1200, currency: 'INR', owner: 'Demo User', country: 'India', assetClass: 'India Index ETF', autoUpdate: true, currentPrice: 255, priceFetchStatus: 'success', priceProvider: 'yahoo' },
    { id: 'asset-6', name: 'HDFC Bank', ticker: 'NSE:HDFCBANK', quantity: 3, costBasis: 450, currency: 'INR', owner: 'Demo User', country: 'India', assetClass: 'Stocks', autoUpdate: true, currentPrice: 160, priceFetchStatus: 'success', priceProvider: 'yahoo' },
    { id: 'asset-7', name: 'Emergency Fund', quantity: 1, costBasis: 10000, currency: 'CAD', owner: 'Demo User', country: 'Canada', assetClass: 'Cash', autoUpdate: false, currentPrice: 10000, priceFetchStatus: 'success' },
    { id: 'asset-8', name: 'Chequing Account', quantity: 1, costBasis: 3500, currency: 'CAD', owner: 'Partner', country: 'Canada', assetClass: 'Cash', autoUpdate: false, currentPrice: 3500, priceFetchStatus: 'success' },
    { id: 'asset-9', name: 'Primary Residence', quantity: 1, costBasis: 650000, currency: 'CAD', owner: 'Demo User', country: 'Canada', assetClass: 'Real Estate', autoUpdate: false, currentPrice: 685000, priceFetchStatus: 'success' },
    { id: 'asset-10', name: 'PPF Account', quantity: 1, costBasis: 150000, currency: 'INR', owner: 'Demo User', country: 'India', assetClass: 'Fixed Income', autoUpdate: false, currentPrice: 162000, priceFetchStatus: 'success' },
    { id: 'asset-11', name: 'NPS Tier 1', quantity: 1, costBasis: 80000, currency: 'INR', owner: 'Partner', country: 'India', assetClass: 'Fixed Income', autoUpdate: false, currentPrice: 88000, priceFetchStatus: 'success' },
  ] as Asset[],
  assetClasses: [
    { id: 'ac-1', country: 'Canada', name: 'US Total Market ETF' },
    { id: 'ac-2', country: 'Canada', name: 'International Equity ETF' },
    { id: 'ac-3', country: 'Canada', name: 'Canada Equity ETF' },
    { id: 'ac-4', country: 'Canada', name: 'Canadian Bond ETF' },
    { id: 'ac-5', country: 'India', name: 'India Index ETF' },
    { id: 'ac-6', country: 'India', name: 'Stocks' },
    { id: 'ac-7', country: 'Canada', name: 'Cash' },
    { id: 'ac-8', country: 'Canada', name: 'Real Estate' },
    { id: 'ac-9', country: 'India', name: 'Fixed Income' },
  ] as AssetClassDef[],
  baseCurrency: 'CAD',
  primaryCurrency: 'CAD',
  secondaryCurrency: 'USD',
  currencySettingsVersion: 1,
  members: [
    { email: 'demo@nexus.local', role: 'owner', uid: 'mock-user-1' },
    { email: 'partner@nexus.local', role: 'partner' },
  ] as PortfolioMember[],
  memberEmails: ['demo@nexus.local', 'partner@nexus.local'],
  name: 'Family Portfolio',
  ownerEmail: 'demo@nexus.local',
  ownerUid: 'mock-user-1',
  isPersonal: false,
  priceProviderSettings: DEFAULT_PRICE_PROVIDER_SETTINGS,
};

const MOCK_SUMMARIES: PortfolioSummary[] = [
  { id: MOCK_PORTFOLIO_ID, name: 'Family Portfolio', ownerEmail: 'demo@nexus.local', isPersonal: false },
  { id: `${MOCK_PORTFOLIO_ID}-personal`, name: 'My Portfolio', ownerEmail: 'demo@nexus.local', isPersonal: true },
];

const EMPTY_BULK_REFRESH: BulkRefreshRunState = {
  status: 'idle', startedAt: null, completedAt: null,
  counts: { eligibleMarketLinked: 0, updatedNow: 0, usingCachedClose: 0, queued: 0, skippedManual: 0, blockedBySetup: 0, needsAttention: 0 },
  queues: [], issues: [],
};
const EMPTY_PROGRESS: ImportProgress = { visible: false, current: 0, total: 0, message: '' };
const EMPTY_RATES: Record<string, number> = { USDCAD: 1.37, INRCAD: 0.016, INRUSD: 0.012 };
const noop = async () => {};

export function MockApp() {
  const [user, setUser] = useState<User | null>(MOCK_USER);
  const [portfolio, setPortfolio] = useState<PortfolioDocument>(MOCK_PORTFOLIO_DOC);
  const [activePortfolioId, setActivePortfolioIdState] = useState<string | null>(MOCK_PORTFOLIO_ID);
  const [userProviderOverrides, setUserProviderOverrides] = useState<UserProviderOverrides>(DEFAULT_USER_PROVIDER_OVERRIDES);
  const [userBrokerConnections, setUserBrokerConnections] = useState<UserBrokerConnections>(DEFAULT_BROKER_CONNECTIONS);

  const currentUserRole = useMemo(() => {
    if (!user?.email) return null;
    return portfolio.members.find((m) => m.email.toLowerCase() === user.email?.toLowerCase())?.role || null;
  }, [portfolio.members, user?.email]);

  const mergedAssets = useMemo(() => portfolio.assets, [portfolio.assets]);

  const authValue = useMemo(() => ({
    user,
    loading: false,
    authError: null,
    signInWithGoogle: async () => { setUser(MOCK_USER); },
    logout: async () => { setUser(null); },
  }), [user]);

  const splitwiseValue = useMemo<SplitwiseContextType>(() => ({
    status: 'disconnected' as const,
    summary: null,
    loading: false,
    error: null,
    refresh: noop,
    connect: () => {},
    disconnect: noop,
  }), []);

  const connectedAccountsValue = useMemo<ConnectedAccountsContextType>(() => ({
    upstox: null,
    upstoxHoldings: [],
    loading: false,
    error: null,
    connectUpstox: () => {},
    refreshUpstox: noop,
    disconnectUpstox: noop,
    reload: noop,
    saveUpstoxOverride: noop,
  }), []);

  const portfolioValue = useMemo<PortfolioContextType>(() => ({
    assets: mergedAssets,
    assetClasses: portfolio.assetClasses,
    members: portfolio.members,
    portfolios: MOCK_SUMMARIES,
    activePortfolioId,
    setActivePortfolioId: setActivePortfolioIdState,
    currentUserRole,
    sharedIntegrationMembers: [],
    refreshSharedIntegrations: noop,
    disconnectMemberIntegration: async () => {},
    refreshMemberIntegration: async () => {},
    baseCurrency: portfolio.primaryCurrency || 'CAD',
    setBaseCurrency: async () => {},
    primaryCurrency: (portfolio.primaryCurrency || 'CAD') as PortfolioCurrency,
    secondaryCurrency: (portfolio.secondaryCurrency || 'USD') as PortfolioCurrency,
    setPrimaryCurrency: async () => {},
    setSecondaryCurrency: async () => {},
    setPortfolioCurrencies: async () => {},
    rates: EMPTY_RATES,
    sharedPriceProviderSettings: DEFAULT_PRICE_PROVIDER_SETTINGS,
    priceProviderSettings: DEFAULT_PRICE_PROVIDER_SETTINGS,
    updatePriceProviderSettings: async () => {},
    userProviderOverrides,
    updateUserProviderOverrides: async (s) => { setUserProviderOverrides(s); },
    userBrokerConnections,
    updateUserBrokerConnections: async (s) => { setUserBrokerConnections(s); },
    addAsset: async (assetData) => {
      const newAsset: Asset = { ...assetData, id: crypto.randomUUID(), lastUpdated: Date.now() };
      setPortfolio((prev) => ({ ...prev, assets: [...prev.assets, newAsset] }));
    },
    duplicateAsset: noop,
    updateAsset: async (asset) => {
      setPortfolio((prev) => ({ ...prev, assets: prev.assets.map((a) => a.id === asset.id ? asset : a) }));
    },
    removeAsset: async (id) => {
      setPortfolio((prev) => ({ ...prev, assets: prev.assets.filter((a) => a.id !== id) }));
    },
    refreshAsset: noop,
    refreshPrices: noop,
    refreshFailedPrices: noop,
    importAssets: async (assets) => {
      setPortfolio((prev) => ({ ...prev, assets }));
    },
    importAssetClasses: async (classes) => {
      setPortfolio((prev) => ({ ...prev, assetClasses: classes }));
    },
    replaceCloudPortfolio: async (data) => {
      setPortfolio((prev) => ({ ...prev, ...data }));
    },
    addAssetClass: async (cls) => {
      const newClass: AssetClassDef = { ...cls, id: crypto.randomUUID() };
      setPortfolio((prev) => ({ ...prev, assetClasses: [...prev.assetClasses, newClass] }));
    },
    updateAssetClass: async (cls) => {
      setPortfolio((prev) => ({ ...prev, assetClasses: prev.assetClasses.map((c) => c.id === cls.id ? cls : c) }));
    },
    removeAssetClass: async (id) => {
      setPortfolio((prev) => ({ ...prev, assetClasses: prev.assetClasses.filter((c) => c.id !== id) }));
    },
    clearAllAssets: async () => {
      setPortfolio((prev) => ({ ...prev, assets: [] }));
    },
    clearAllAssetClasses: async () => {
      setPortfolio((prev) => ({ ...prev, assetClasses: [] }));
    },
    inviteMember: noop,
    removeMember: noop,
    isRefreshing: false,
    refreshQueue: { pending: 0, nextRunAt: null, provider: null },
    bulkRefreshState: EMPTY_BULK_REFRESH,
    isPortfolioLoading: false,
    hasAccess: true,
    accessError: null,
    importProgress: EMPTY_PROGRESS,
    setImportProgress: () => {},
  }), [mergedAssets, portfolio, activePortfolioId, currentUserRole, userProviderOverrides, userBrokerConnections]);

  const AuthenticatedApp = lazy(() => import('../App').then((m) => ({ default: m.AuthenticatedApp })));

  return (
    <MockAuthContext.Provider value={authValue}>
      <MockConnectedAccountsContext.Provider value={connectedAccountsValue}>
        <MockSplitwiseContext.Provider value={splitwiseValue}>
          <MockPortfolioContext.Provider value={portfolioValue}>
            <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-slate-500">Loading Nexus Portfolio (mock mode)...</div>}>
              <AuthenticatedApp />
            </Suspense>
          </MockPortfolioContext.Provider>
        </MockSplitwiseContext.Provider>
      </MockConnectedAccountsContext.Provider>
    </MockAuthContext.Provider>
  );
}

export function useMockAuth() {
  const ctx = useContext(MockAuthContext);
  if (!ctx) throw new Error('useMockAuth must be used within MockApp');
  return ctx;
}
