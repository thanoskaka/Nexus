import { describe, expect, it } from 'vitest';
import {
  convertAmount,
  formatCurrency,
  getAssetXirr,
  getCurrentPrice,
  getCurrentTotal,
  getDailyPriceChange,
  getDailyTotalChange,
  getGrowthTotal,
  getInvestmentTotal,
  getOriginalDisplayCurrency,
  getStableColor,
  isDebtAssetClass,
} from './portfolioMetrics';
import type { Asset } from '../store/db';

function makeAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: 'asset-1',
    name: 'Sample Asset',
    quantity: 10,
    costBasis: 1000,
    currency: 'CAD',
    owner: 'Shubham Gupta',
    country: 'Canada',
    assetClass: 'Stocks',
    autoUpdate: true,
    ...overrides,
  };
}

describe('portfolioMetrics', () => {
  it('uses Indian number formatting only for INR', () => {
    expect(formatCurrency(125000, 'INR')).toBe('₹1,25,000.00');
    expect(formatCurrency(125000, 'CAD')).toBe('CA$125,000.00');
  });

  it('returns original display currency by country', () => {
    expect(getOriginalDisplayCurrency(makeAsset({ country: 'India', currency: 'USD' }))).toBe('INR');
    expect(getOriginalDisplayCurrency(makeAsset({ country: 'Canada', currency: 'USD' }))).toBe('CAD');
  });

  it('converts via USD-based rates', () => {
    const rates = { CAD: 1.37, INR: 83.2 };
    expect(convertAmount(137, 'CAD', 'USD', rates)).toBeCloseTo(100, 4);
    expect(convertAmount(100, 'USD', 'INR', rates)).toBeCloseTo(8320, 4);
  });

  it('treats credit card assets as debt across totals and prices', () => {
    const debtAsset = makeAsset({
      assetClass: 'Credit Card',
      quantity: 1,
      costBasis: 5000,
      currentPrice: undefined,
    });

    expect(isDebtAssetClass(debtAsset.assetClass)).toBe(true);
    expect(getInvestmentTotal(debtAsset)).toBe(-5000);
    expect(getCurrentPrice(debtAsset)).toBe(-5000);
    expect(getCurrentTotal(debtAsset)).toBe(-5000);
  });

  it('preserves the entered sign for credit card values before flipping into portfolio impact', () => {
    const negativeDebtAsset = makeAsset({
      assetClass: 'Credit Card',
      quantity: 1,
      costBasis: -500,
      currentPrice: -500,
    });

    expect(getInvestmentTotal(negativeDebtAsset)).toBe(500);
    expect(getCurrentPrice(negativeDebtAsset)).toBe(500);
    expect(getCurrentTotal(negativeDebtAsset)).toBe(500);
  });

  it('computes daily changes from previous close when available', () => {
    const asset = makeAsset({
      currentPrice: 125,
      previousClose: 120,
      quantity: 4,
    });

    expect(getDailyPriceChange(asset)).toBe(5);
    expect(getDailyTotalChange(asset)).toBe(20);
  });

  it('returns null daily change when data is incomplete', () => {
    const asset = makeAsset({
      currentPrice: 125,
      previousClose: undefined,
    });

    expect(getDailyPriceChange(asset)).toBeNull();
    expect(getDailyTotalChange(asset)).toBeNull();
  });

  describe('getStableColor', () => {
    it('returns a valid color from the palette', () => {
      const result = getStableColor('Stocks');
      const validColors = ['#00875A', '#00B8D9', '#FFAB00', '#FF5630', '#6554C0', '#36B37E', '#FF8B00', '#4C9AFF'];
      expect(validColors).toContain(result);
    });

    it('returns the same color for the same input', () => {
      expect(getStableColor('Stocks')).toBe(getStableColor('Stocks'));
      expect(getStableColor('Mutual Funds')).toBe(getStableColor('Mutual Funds'));
    });

    it('returns different colors for different inputs', () => {
      const colors = new Set(['Stocks', 'Mutual Funds', 'Fixed Deposit', 'Bonds', 'ETF'].map(getStableColor));
      expect(colors.size).toBeGreaterThan(1);
    });

    it('handles empty string gracefully', () => {
      const result = getStableColor('');
      const validColors = ['#00875A', '#00B8D9', '#FFAB00', '#FF5630', '#6554C0', '#36B37E', '#FF8B00', '#4C9AFF'];
      expect(validColors).toContain(result);
    });
  });

  describe('net worth regression', () => {
    it('standard asset contributes positively to net worth', () => {
      const asset = makeAsset({
        assetClass: 'Stocks',
        quantity: 100,
        costBasis: 5000,
        currentPrice: 75,
      });

      expect(getInvestmentTotal(asset)).toBe(5000);
      expect(getCurrentTotal(asset)).toBe(7500);
      expect(getGrowthTotal(asset)).toBe(2500);
    });

    it('Credit Card liability reduces net worth via sign inversion', () => {
      const liability = makeAsset({
        assetClass: 'Credit Card',
        quantity: 1,
        costBasis: 3000,
        currentPrice: undefined,
      });

      expect(getInvestmentTotal(liability)).toBe(-3000);
      expect(getCurrentTotal(liability)).toBe(-3000);
    });

    it('combining assets and liabilities yields correct net worth', () => {
      const assets = [
        makeAsset({ id: 'a1', assetClass: 'Stocks', quantity: 100, costBasis: 5000, currentPrice: 75 }),
        makeAsset({ id: 'a2', assetClass: 'Credit Card', quantity: 1, costBasis: 3000 }),
        makeAsset({ id: 'a3', assetClass: 'Cash', quantity: 10000, costBasis: 10000 }),
      ];

      const totalInvested = assets.reduce((sum, a) => sum + getInvestmentTotal(a), 0);
      const totalCurrent = assets.reduce((sum, a) => sum + getCurrentTotal(a), 0);

      expect(totalInvested).toBe(12000);
      expect(totalCurrent).toBe(14500);
    });

    it('net negative Splitwise classified as Credit Card reduces net worth', () => {
      const splitwiseLiability = makeAsset({
        assetClass: 'Credit Card',
        quantity: 1,
        costBasis: 1500,
        currentPrice: 1500,
      });

      expect(getCurrentTotal(splitwiseLiability)).toBe(-1500);
      expect(isDebtAssetClass(splitwiseLiability.assetClass)).toBe(true);
    });

    it('returns null XIRR for liability assets', () => {
      const liability = makeAsset({
        assetClass: 'Credit Card',
        purchaseDate: '2024-01-01',
      });

      const xirr = getAssetXirr(liability, 'CAD', null);
      expect(xirr).toBeNull();
    });
  });
});
