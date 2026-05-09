import { describe, expect, it } from 'vitest';
import {
  convertAmount,
  formatCurrency,
  getCurrentPrice,
  getCurrentTotal,
  getDailyPriceChange,
  getDailyTotalChange,
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
});
