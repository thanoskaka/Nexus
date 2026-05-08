import { describe, expect, it } from 'vitest';
import { resolveAssetClassBranding } from './assetClassBranding';

describe('resolveAssetClassBranding', () => {
  const cases: [string, string][] = [
    ['US Stocks', 'stock'],
    ['ETF', 'etf'],
    ['Mutual Fund', 'mutual-fund'],
    ['Index Fund', 'index-fund'],
    ['Fixed Deposit', 'fixed-deposit'],
    ['GIC', 'fixed-deposit'],
    ['Cash', 'cash'],
    ['Gold', 'gold'],
    ['Real Estate', 'real-estate'],
    ['REIT', 'real-estate'],
    ['EPF', 'provident-fund'],
    ['PPF', 'provident-fund'],
    ['NPS', 'retirement'],
    ['Insurance', 'insurance'],
    ['Crypto', 'crypto'],
    ['Splitwise Cloud', 'splitwise'],
    ['Alternative', 'alternative'],
    ['Other', 'other'],
  ];

  for (const [input, expected] of cases) {
    it(`resolves "${input}" to "${expected}"`, () => {
      expect(resolveAssetClassBranding(input)).toBe(expected);
    });
  }

  it('resolves empty string to other', () => {
    expect(resolveAssetClassBranding('')).toBe('other');
  });

  it('resolves unknown class to other', () => {
    expect(resolveAssetClassBranding('Some Random Class')).toBe('other');
  });

  it('handles lowercase input', () => {
    expect(resolveAssetClassBranding('us stocks')).toBe('stock');
  });

  it('handles mixed case input', () => {
    expect(resolveAssetClassBranding('MuTuAl FuNd')).toBe('mutual-fund');
  });

  it('handles leading/trailing whitespace', () => {
    expect(resolveAssetClassBranding('  Real Estate  ')).toBe('real-estate');
  });
});
