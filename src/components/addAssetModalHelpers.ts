import type { Asset, AssetClassDef } from '../store/db';
import type { PriceProvider } from '../lib/api';
import type { PortfolioMember } from '../store/portfolioHelpers';

export type AssetCategory = 'market-traded' | 'cash-fixed-income' | 'property' | 'liability';

export const ASSET_CATEGORY_MAP: Record<string, AssetCategory> = {
  Stocks: 'market-traded',
  ETFs: 'market-traded',
  'Mutual Funds': 'market-traded',
  Gold: 'market-traded',
  Cash: 'cash-fixed-income',
  'Fixed Deposits': 'cash-fixed-income',
  'PF/EPF': 'cash-fixed-income',
  PPF: 'cash-fixed-income',
  NPS: 'cash-fixed-income',
  GIC: 'cash-fixed-income',
  Bonds: 'cash-fixed-income',
  'Cash & Savings': 'cash-fixed-income',
  'GICs & Term Deposits': 'cash-fixed-income',
  'Retirement Accounts': 'cash-fixed-income',
  'TFSA/RRSP/FHSA': 'cash-fixed-income',
  'Real Estate': 'property',
  'Credit Card': 'liability',
};

export function getAssetCategory(assetClass: string): AssetCategory {
  return ASSET_CATEGORY_MAP[assetClass] || 'market-traded';
}

export function getCurrencyOptionsForCountry(country: 'India' | 'Canada'): Array<'CAD' | 'INR' | 'USD'> {
  if (country === 'India') return ['INR'];
  return ['CAD', 'USD'];
}

export function getDefaultCurrencyForCountry(
  country: 'India' | 'Canada',
  existing?: 'CAD' | 'INR' | 'USD',
): 'CAD' | 'INR' | 'USD' {
  const allowed = getCurrencyOptionsForCountry(country);
  if (existing && allowed.includes(existing)) return existing;
  return country === 'Canada' ? 'CAD' : 'INR';
}

export interface AssetFormState {
  name: string;
  ticker: string;
  country: 'India' | 'Canada';
  assetClass: string;
  owner: string;
  currency: 'CAD' | 'INR' | 'USD';
  holdingPlatform: string;
  comments: string;
  hiddenFromDashboard: boolean;
  purchaseDate: string;
  quantity: string;
  averagePurchasePrice: string;
  purchaseValue: string;
  currentPrice: string;
  currentValue: string;
  autoUpdate: boolean;
  amount: string;
  maturityDate: string;
  rate: string;
  outstandingAmount: string;
  dueDate: string;
  preferredPriceProvider: PriceProvider;
}

export function getDefaultFormState(): AssetFormState {
  return {
    name: '',
    ticker: '',
    country: 'India',
    assetClass: 'Mutual Funds',
    owner: '',
    currency: 'INR',
    holdingPlatform: '',
    comments: '',
    hiddenFromDashboard: false,
    purchaseDate: '',
    quantity: '',
    averagePurchasePrice: '',
    purchaseValue: '',
    currentPrice: '',
    currentValue: '',
    autoUpdate: true,
    amount: '',
    maturityDate: '',
    rate: '',
    outstandingAmount: '',
    dueDate: '',
    preferredPriceProvider: 'yahoo',
  };
}

export function getOwnerOptions(members: PortfolioMember[], existingOwner?: string): string[] {
  const memberLabels = members
    .map((m) => m.email)
    .filter(Boolean)
    .sort();
  if (existingOwner && !memberLabels.includes(existingOwner)) {
    return [...memberLabels, existingOwner];
  }
  return memberLabels.length > 0 ? memberLabels : [];
}

export function legacyOwnerWarning(
  existingOwner: string | undefined,
  members: PortfolioMember[],
): string | null {
  if (!existingOwner) return null;
  const memberEmails = members.map((m) => m.email.toLowerCase());
  if (!memberEmails.includes(existingOwner.toLowerCase())) {
    return `The previous owner "${existingOwner}" is not a current portfolio member. Please reassign before saving.`;
  }
  return null;
}

export function getDisplayClasses(
  country: 'India' | 'Canada',
  customAssetClasses: AssetClassDef[],
  systemAssetClasses: AssetClassDef[],
): string[] {
  const available = customAssetClasses.filter((c) => c.country === country);
  const system = systemAssetClasses.filter((c) => c.country === country);
  const names = new Set([
    ...available.map((c) => c.name),
    ...system.map((c) => c.name),
  ]);
  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

export interface InstrumentSuggestion {
  displayName: string;
  ticker: string;
  exchange: string;
  instrumentType: string;
  currency: string;
  source: 'yahoo' | 'upstox' | 'amfi';
  confidence: number;
}

export async function fetchInstrumentSuggestions(
  q: string,
  country: string,
  assetClass: string,
): Promise<InstrumentSuggestion[]> {
  if (!q || q.length < 2) return [];
  const params = new URLSearchParams({ q, country, assetClass });
  const res = await fetch(`/api/instruments/search?${params}`);
  const data = await res.json();
  return (data?.suggestions || []) as InstrumentSuggestion[];
}

export function buildAssetFromForm(
  state: AssetFormState,
): Omit<Asset, 'id'> {
  const qty = parseFloat(state.quantity) || 0;
  const avgPrice = parseFloat(state.averagePurchasePrice) || 0;
  const pVal = parseFloat(state.purchaseValue) || 0;

  const resolvedQuantity = qty > 0 ? qty : (avgPrice > 0 && pVal > 0 ? pVal / avgPrice : 0);
  const resolvedValue = pVal > 0 ? pVal : (qty > 0 && avgPrice > 0 ? qty * avgPrice : 0);

  const category = getAssetCategory(state.assetClass);

  if (category === 'cash-fixed-income') {
    const amount = parseFloat(state.amount) || 0;
    return {
      name: state.name,
      ticker: undefined,
      quantity: amount,
      costBasis: amount,
      currency: state.currency,
      owner: state.owner,
      country: state.country,
      assetClass: state.assetClass,
      autoUpdate: false,
      purchaseDate: state.maturityDate || undefined,
      holdingPlatform: state.holdingPlatform.trim() || undefined,
      comments: state.comments.trim() || undefined,
      hiddenFromDashboard: state.hiddenFromDashboard,
    };
  }

  if (category === 'property') {
    const pv = parseFloat(state.purchaseValue) || 0;
    const cv = parseFloat(state.currentValue) || 0;
    return {
      name: state.name,
      ticker: undefined,
      quantity: 1,
      costBasis: pv,
      currency: state.currency,
      owner: state.owner,
      country: state.country,
      assetClass: state.assetClass,
      autoUpdate: !state.currentValue,
      currentPrice: cv || undefined,
      purchaseDate: state.purchaseDate || undefined,
      holdingPlatform: state.holdingPlatform.trim() || undefined,
      comments: state.comments.trim() || undefined,
      hiddenFromDashboard: state.hiddenFromDashboard,
    };
  }

  if (category === 'liability') {
    const oa = parseFloat(state.outstandingAmount) || 0;
    return {
      name: state.name,
      ticker: undefined,
      quantity: 1,
      costBasis: oa,
      currency: state.currency,
      owner: state.owner,
      country: state.country,
      assetClass: state.assetClass,
      autoUpdate: false,
      purchaseDate: state.dueDate || undefined,
      holdingPlatform: state.holdingPlatform.trim() || undefined,
      comments: state.comments.trim() || undefined,
      hiddenFromDashboard: state.hiddenFromDashboard,
    };
  }

  const tickerVal = state.ticker.trim() || undefined;
  const isManual = !state.autoUpdate;
  const cp = parseFloat(state.currentPrice) || 0;
  const cv = parseFloat(state.currentValue) || 0;
  const resolvedCurrentPrice = isManual ? (cp > 0 ? cp : (cv > 0 && resolvedQuantity > 0 ? cv / resolvedQuantity : undefined)) : undefined;

  return {
    name: state.name,
    ticker: tickerVal,
    quantity: resolvedQuantity,
    costBasis: resolvedValue,
    currency: state.currency,
    owner: state.owner,
    country: state.country,
    assetClass: state.assetClass,
    autoUpdate: state.autoUpdate,
    currentPrice: resolvedCurrentPrice,
    purchaseDate: state.purchaseDate || undefined,
    holdingPlatform: state.holdingPlatform.trim() || undefined,
    comments: state.comments.trim() || undefined,
    preferredPriceProvider: tickerVal ? state.preferredPriceProvider : undefined,
    hiddenFromDashboard: state.hiddenFromDashboard,
  };
}

export function loadAssetIntoForm(asset: Asset): AssetFormState {
  const country = asset.country as 'India' | 'Canada';
  const category = getAssetCategory(asset.assetClass);
  const state = getDefaultFormState();

  state.name = asset.name;
  state.ticker = asset.ticker || '';
  state.country = country;
  state.assetClass = asset.assetClass;
  state.owner = asset.owner;
  state.currency = getDefaultCurrencyForCountry(country, asset.currency as any);
  state.holdingPlatform = asset.holdingPlatform || '';
  state.comments = asset.comments || '';
  state.hiddenFromDashboard = Boolean(asset.hiddenFromDashboard);
  state.purchaseDate = asset.purchaseDate || '';
  state.autoUpdate = asset.autoUpdate;
  state.preferredPriceProvider = (asset.preferredPriceProvider || 'yahoo') as PriceProvider;

  if (category === 'cash-fixed-income') {
    state.amount = asset.costBasis > 0 ? asset.costBasis.toString() : '';
    state.maturityDate = asset.purchaseDate || '';
  } else if (category === 'property') {
    state.purchaseValue = asset.costBasis > 0 ? asset.costBasis.toString() : '';
    state.currentValue = (asset.currentPrice || 0) > 0 ? asset.currentPrice.toString() : '';
    state.purchaseDate = asset.purchaseDate || '';
  } else if (category === 'liability') {
    state.outstandingAmount = asset.costBasis > 0 ? asset.costBasis.toString() : '';
    state.dueDate = asset.purchaseDate || '';
  } else {
    state.quantity = asset.quantity > 0 ? asset.quantity.toString() : '';
    if (asset.quantity > 0 && asset.costBasis > 0) {
      state.averagePurchasePrice = (asset.costBasis / asset.quantity).toString();
    }
    state.purchaseValue = asset.costBasis > 0 ? asset.costBasis.toString() : '';
    if (asset.currentPrice && !asset.autoUpdate) {
      state.currentPrice = asset.currentPrice.toString();
      state.currentValue = (asset.currentPrice * asset.quantity).toString();
    }
  }

  return state;
}
