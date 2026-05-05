import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Asset, AssetClassDef } from '../store/db';
import type { PortfolioMember } from '../store/portfolioHelpers';

const SAMPLE_MODE_KEY = 'nexus-sample-mode';

export interface SamplePortfolioData {
  assets: Asset[];
  assetClasses: AssetClassDef[];
  members: PortfolioMember[];
  rates: Record<string, number>;
}

export const SAMPLE_ASSETS: Asset[] = [
  { id: 'sample-cash-cad', name: 'Emergency Fund', quantity: 1, costBasis: 15000, currency: 'CAD', owner: 'Demo User', country: 'Canada', assetClass: 'Cash', autoUpdate: false, currentPrice: 15000, priceFetchStatus: 'success', comments: 'Sample data \u2014 not your real portfolio' },
  { id: 'sample-chequing', name: 'Chequing Account', quantity: 1, costBasis: 4500, currency: 'CAD', owner: 'Partner', country: 'Canada', assetClass: 'Cash', autoUpdate: false, currentPrice: 4500, priceFetchStatus: 'success', comments: 'Sample data \u2014 not your real portfolio' },
  { id: 'sample-vti', name: 'VTI', ticker: 'VTI', quantity: 12, costBasis: 3120, currency: 'USD', owner: 'Demo User', country: 'Canada', assetClass: 'US Total Market ETF', autoUpdate: true, currentPrice: 275.5, priceFetchStatus: 'success', priceProvider: 'yahoo', comments: 'Sample data \u2014 not your real portfolio' },
  { id: 'sample-vxus', name: 'VXUS', ticker: 'VXUS', quantity: 10, costBasis: 1100, currency: 'USD', owner: 'Demo User', country: 'Canada', assetClass: 'International Equity ETF', autoUpdate: true, currentPrice: 62.3, priceFetchStatus: 'success', priceProvider: 'yahoo', comments: 'Sample data \u2014 not your real portfolio' },
  { id: 'sample-xic', name: 'XIC', ticker: 'XIC:TO', quantity: 18, costBasis: 648, currency: 'CAD', owner: 'Demo User', country: 'Canada', assetClass: 'Canada Equity ETF', autoUpdate: true, currentPrice: 38.2, priceFetchStatus: 'success', priceProvider: 'yahoo', comments: 'Sample data \u2014 not your real portfolio' },
  { id: 'sample-vab', name: 'VAB', ticker: 'VAB:TO', quantity: 25, costBasis: 600, currency: 'CAD', owner: 'Partner', country: 'Canada', assetClass: 'Canadian Bond ETF', autoUpdate: true, currentPrice: 24.1, priceFetchStatus: 'success', priceProvider: 'yahoo', comments: 'Sample data \u2014 not your real portfolio' },
  { id: 'sample-nifty', name: 'NIFTY 50 ETF', ticker: 'NSE:NIFTY', quantity: 6, costBasis: 1440, currency: 'INR', owner: 'Demo User', country: 'India', assetClass: 'India Index ETF', autoUpdate: true, currentPrice: 255, priceFetchStatus: 'success', priceProvider: 'yahoo', comments: 'Sample data \u2014 not your real portfolio' },
  { id: 'sample-hdfc', name: 'HDFC Bank', ticker: 'NSE:HDFCBANK', quantity: 4, costBasis: 600, currency: 'INR', owner: 'Demo User', country: 'India', assetClass: 'Stocks', autoUpdate: true, currentPrice: 160, priceFetchStatus: 'success', priceProvider: 'yahoo', comments: 'Sample data \u2014 not your real portfolio' },
  { id: 'sample-sbi-mf', name: 'SBI Bluechip Fund', ticker: 'NSE:SBICAP', quantity: 120, costBasis: 2400, currency: 'INR', owner: 'Partner', country: 'India', assetClass: 'Mutual Funds', autoUpdate: true, currentPrice: 22.5, priceFetchStatus: 'success', priceProvider: 'yahoo', comments: 'Sample data \u2014 not your real portfolio' },
  { id: 'sample-gold-bees', name: 'Gold ETF (Gold Bees)', ticker: 'NSE:GOLDBEES', quantity: 50, costBasis: 2500, currency: 'INR', owner: 'Demo User', country: 'India', assetClass: 'Gold / Commodity', autoUpdate: true, currentPrice: 52.3, priceFetchStatus: 'success', priceProvider: 'yahoo', comments: 'Sample data \u2014 not your real portfolio' },
  { id: 'sample-physical-gold', name: 'Physical Gold', quantity: 1, costBasis: 8000, currency: 'INR', owner: 'Partner', country: 'India', assetClass: 'Gold / Commodity', autoUpdate: false, currentPrice: 8500, priceFetchStatus: 'success', comments: 'Sample data \u2014 not your real portfolio' },
  { id: 'sample-ppf', name: 'PPF Account', quantity: 1, costBasis: 150000, currency: 'INR', owner: 'Demo User', country: 'India', assetClass: 'Fixed Income', autoUpdate: false, currentPrice: 162000, priceFetchStatus: 'success', comments: 'Sample data \u2014 not your real portfolio' },
  { id: 'sample-nps', name: 'NPS Tier 1', quantity: 1, costBasis: 80000, currency: 'INR', owner: 'Partner', country: 'India', assetClass: 'Fixed Income', autoUpdate: false, currentPrice: 88000, priceFetchStatus: 'success', comments: 'Sample data \u2014 not your real portfolio' },
];

export const SAMPLE_ASSET_CLASSES: AssetClassDef[] = [
  { id: 'sample-ac-cash', country: 'Canada', name: 'Cash' },
  { id: 'sample-ac-us-total', country: 'Canada', name: 'US Total Market ETF' },
  { id: 'sample-ac-intl-equity', country: 'Canada', name: 'International Equity ETF' },
  { id: 'sample-ac-ca-equity', country: 'Canada', name: 'Canada Equity ETF' },
  { id: 'sample-ac-ca-bond', country: 'Canada', name: 'Canadian Bond ETF' },
  { id: 'sample-ac-in-index', country: 'India', name: 'India Index ETF' },
  { id: 'sample-ac-in-stocks', country: 'India', name: 'Stocks' },
  { id: 'sample-ac-in-mf', country: 'India', name: 'Mutual Funds' },
  { id: 'sample-ac-in-gold', country: 'India', name: 'Gold / Commodity' },
  { id: 'sample-ac-in-fixed', country: 'India', name: 'Fixed Income' },
  { id: 'sample-ac-in-realestate', country: 'India', name: 'Real Estate' },
];

export const SAMPLE_MEMBERS: PortfolioMember[] = [
  { email: 'demo@nexus.local', role: 'owner', uid: 'sample-user' },
  { email: 'partner@nexus.local', role: 'partner' },
];

export const SAMPLE_RATES: Record<string, number> = { USDCAD: 1.37, INRCAD: 0.016, INRUSD: 0.012 };

export const SAMPLE_PORTFOLIO_DATA: SamplePortfolioData = {
  assets: SAMPLE_ASSETS,
  assetClasses: SAMPLE_ASSET_CLASSES,
  members: SAMPLE_MEMBERS,
  rates: SAMPLE_RATES,
};

let cachedSampleMode: boolean | null = null;

export function getSampleMode(): boolean {
  if (cachedSampleMode !== null) return cachedSampleMode;
  try { cachedSampleMode = window.localStorage.getItem(SAMPLE_MODE_KEY) === 'true'; } catch { cachedSampleMode = false; }
  return cachedSampleMode;
}

export function setSampleMode(active: boolean) {
  cachedSampleMode = active;
  try {
    if (active) window.localStorage.setItem(SAMPLE_MODE_KEY, 'true');
    else window.localStorage.removeItem(SAMPLE_MODE_KEY);
  } catch {}
}

interface SampleModeContextType {
  isSampleMode: boolean;
  enableSampleMode: () => void;
  disableSampleMode: () => void;
  sampleData: SamplePortfolioData;
}

const SampleModeContext = createContext<SampleModeContextType | undefined>(undefined);

export function SampleModeProvider({ children }: { children: React.ReactNode }) {
  const [isActive, setIsActive] = useState<boolean>(getSampleMode);
  useEffect(() => {
    const handler = () => { setIsActive(getSampleMode()); };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);
  const enableSampleMode = useCallback(() => { setSampleMode(true); setIsActive(true); }, []);
  const disableSampleMode = useCallback(() => { setSampleMode(false); setIsActive(false); }, []);
  const value = useMemo<SampleModeContextType>(() => ({ isSampleMode: isActive, enableSampleMode, disableSampleMode, sampleData: SAMPLE_PORTFOLIO_DATA }), [isActive, enableSampleMode, disableSampleMode]);
  return <SampleModeContext.Provider value={value}>{children}</SampleModeContext.Provider>;
}

export function useSampleMode(): SampleModeContextType {
  const ctx = useContext(SampleModeContext);
  if (!ctx) return { isSampleMode: getSampleMode(), enableSampleMode: () => setSampleMode(true), disableSampleMode: () => setSampleMode(false), sampleData: SAMPLE_PORTFOLIO_DATA };
  return ctx;
}
