// @vitest-environment jsdom
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { SAMPLE_ASSETS, SAMPLE_ASSET_CLASSES, SAMPLE_MEMBERS, SAMPLE_RATES, getSampleMode, setSampleMode, SAMPLE_PORTFOLIO_DATA } from '../samplePortfolio';

function createMockStorage() {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
}

describe('Sample Portfolio Data', () => {
  it('has cash, stocks/ETFs, mutual fund, and gold/commodity', () => {
    const classes = SAMPLE_ASSETS.map((a) => a.assetClass);
    expect(classes).toContain('Cash');
    expect(classes).toContain('US Total Market ETF');
    expect(classes).toContain('Mutual Funds');
    expect(classes).toContain('Gold / Commodity');
  });
  it('has cross-market holdings: Canada and India', () => {
    const countries = [...new Set(SAMPLE_ASSETS.map((a) => a.country))];
    expect(countries).toContain('Canada');
    expect(countries).toContain('India');
  });
  it('includes USD-denominated holdings for US exposure', () => {
    expect(SAMPLE_ASSETS.filter((a) => a.currency === 'USD').length).toBeGreaterThan(0);
  });
  it('has stocks and ETFs', () => {
    expect(SAMPLE_ASSETS.filter((a) => a.assetClass === 'Stocks').length).toBeGreaterThan(0);
    expect(SAMPLE_ASSETS.filter((a) => a.assetClass.includes('ETF')).length).toBeGreaterThan(0);
  });
  it('has two members with owner and partner roles', () => {
    expect(SAMPLE_MEMBERS.length).toBe(2);
    expect(SAMPLE_MEMBERS.some((m) => m.role === 'owner')).toBe(true);
    expect(SAMPLE_MEMBERS.some((m) => m.role === 'partner')).toBe(true);
  });
  it('defines asset classes covering all asset asset classes', () => {
    const classNames = SAMPLE_ASSET_CLASSES.map((c) => c.name);
    for (const name of [...new Set(SAMPLE_ASSETS.map((a) => a.assetClass))]) {
      expect(classNames).toContain(name);
    }
  });
  it('has FX rates', () => {
    expect(SAMPLE_RATES.USDCAD).toBeGreaterThan(0);
    expect(SAMPLE_RATES.INRCAD).toBeGreaterThan(0);
  });
});

describe('Sample Mode Persistence', () => {
  beforeEach(() => { vi.stubGlobal('localStorage', createMockStorage()); });
  afterEach(() => { vi.unstubAllGlobals(); });
  it('defaults to inactive', () => { expect(getSampleMode()).toBe(false); });
  it('can be activated and deactivated', () => {
    setSampleMode(true); expect(getSampleMode()).toBe(true);
    setSampleMode(false); expect(getSampleMode()).toBe(false);
  });
  it('persists across calls', () => { setSampleMode(true); expect(getSampleMode()).toBe(true); expect(getSampleMode()).toBe(true); });
});
