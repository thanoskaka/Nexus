export type OnboardingCountry = 'US' | 'CA' | 'IN';

export type OnboardingCurrency = 'USD' | 'CAD' | 'INR';

export const ALLOWED_COUNTRIES: OnboardingCountry[] = ['US', 'CA', 'IN'];

export const COUNTRY_CURRENCY_MAP: Record<OnboardingCountry, OnboardingCurrency> = {
  US: 'USD',
  CA: 'CAD',
  IN: 'INR',
};

export const COUNTRY_LABELS: Record<OnboardingCountry, string> = {
  US: 'United States',
  CA: 'Canada',
  IN: 'India',
};

export const CURRENCY_LABELS: Record<OnboardingCurrency, string> = {
  USD: 'USD ($)',
  CAD: 'CAD (C$)',
  INR: 'INR (₹)',
};

export interface AssetClassOption {
  id: string;
  name: string;
  description: string;
}

export const COUNTRY_ASSET_CLASSES: Record<OnboardingCountry, AssetClassOption[]> = {
  US: [
    { id: 'us-stocks', name: 'Stocks', description: 'US equities and ETFs' },
    { id: 'us-bonds', name: 'Bonds', description: 'US treasuries and corporate bonds' },
    { id: 'us-real-estate', name: 'Real Estate', description: 'US property investments' },
    { id: 'us-crypto', name: 'Cryptocurrency', description: 'Digital assets traded on US exchanges' },
  ],
  CA: [
    { id: 'ca-stocks', name: 'Stocks', description: 'Canadian equities and ETFs' },
    { id: 'ca-bonds', name: 'Bonds', description: 'Canadian government and corporate bonds' },
    { id: 'ca-real-estate', name: 'Real Estate', description: 'Canadian property investments' },
    { id: 'ca-crypto', name: 'Cryptocurrency', description: 'Digital assets traded on Canadian exchanges' },
  ],
  IN: [
    { id: 'in-stocks', name: 'Stocks', description: 'Indian equities (BSE/NSE)' },
    { id: 'in-mutual-funds', name: 'Mutual Funds', description: 'Indian mutual funds and SIPs' },
    { id: 'in-bonds', name: 'Bonds', description: 'Indian government securities and corporate bonds' },
    { id: 'in-real-estate', name: 'Real Estate', description: 'Indian property investments' },
    { id: 'in-gold', name: 'Gold', description: 'Digital gold, Sovereign Gold Bonds, and Gold ETFs' },
  ],
};

export interface ProviderOption {
  id: string;
  name: string;
  description: string;
  countries: OnboardingCountry[];
  assetClassIds: string[];
  isRecommended: boolean;
}

export const PRICING_PROVIDERS: ProviderOption[] = [
  {
    id: 'yahoo',
    name: 'Yahoo Finance',
    description: 'Free, broad coverage of global markets. Good default for most asset classes.',
    countries: ['US', 'CA', 'IN'],
    assetClassIds: ['us-stocks', 'ca-stocks', 'in-stocks', 'us-bonds', 'ca-bonds', 'in-bonds', 'us-crypto', 'ca-crypto'],
    isRecommended: true,
  },
  {
    id: 'alphavantage',
    name: 'Alpha Vantage',
    description: 'Free-tier API with good US and Canadian coverage. Requires API key.',
    countries: ['US', 'CA'],
    assetClassIds: ['us-stocks', 'ca-stocks', 'us-bonds', 'ca-bonds'],
    isRecommended: false,
  },
  {
    id: 'finnhub',
    name: 'Finnhub',
    description: 'Real-time US stock data. Requires API key.',
    countries: ['US'],
    assetClassIds: ['us-stocks'],
    isRecommended: false,
  },
];

export interface IntegrationOption {
  id: string;
  name: string;
  description: string;
  countries: OnboardingCountry[];
  assetClassIds: string[];
  providerType: 'broker' | 'data' | 'sync';
}

export const INTEGRATIONS: IntegrationOption[] = [
  {
    id: 'upstox',
    name: 'Upstox',
    description: 'Connect your Upstox trading account to auto-sync Indian holdings.',
    countries: ['IN'],
    assetClassIds: ['in-stocks', 'in-mutual-funds'],
    providerType: 'broker',
  },
  {
    id: 'splitwise',
    name: 'Splitwise',
    description: 'Sync shared expenses and IOUs from Splitwise.',
    countries: ['US', 'CA', 'IN'],
    assetClassIds: [],
    providerType: 'sync',
  },
];

export function getCurrencyForCountry(country: string): OnboardingCurrency | null {
  if (isAllowedCountry(country)) return COUNTRY_CURRENCY_MAP[country];
  return null;
}

export function isAllowedCountry(country: string): country is OnboardingCountry {
  return ALLOWED_COUNTRIES.includes(country as OnboardingCountry);
}

export function getAssetClassesForCountry(country: string): AssetClassOption[] {
  if (isAllowedCountry(country)) return COUNTRY_ASSET_CLASSES[country];
  return [];
}

export function getProvidersForSelections(countries: string[], assetClassIds: string[]): ProviderOption[] {
  return PRICING_PROVIDERS.filter((p) => {
    const matchesCountry = countries.some((c) => p.countries.includes(c as OnboardingCountry));
    const matchesAssetClass = assetClassIds.length === 0 || p.assetClassIds.some((a) => assetClassIds.includes(a));
    return matchesCountry && matchesAssetClass;
  });
}

export function getIntegrationsForSelections(countries: string[], assetClassIds: string[]): IntegrationOption[] {
  return INTEGRATIONS.filter((i) => {
    const matchesCountry = i.countries.length === 0 || countries.some((c) => i.countries.includes(c as OnboardingCountry));
    const matchesAssetClass = i.assetClassIds.length === 0 || i.assetClassIds.some((a) => assetClassIds.includes(a));
    return matchesCountry || matchesAssetClass;
  });
}

export function getCountryLabel(country: string): string {
  if (isAllowedCountry(country)) return COUNTRY_LABELS[country];
  return country;
}
