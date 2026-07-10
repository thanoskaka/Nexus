import { describe, expect, it } from 'vitest';
import { normalizeTickerForLogoDev } from './assetLogos';

describe('normalizeTickerForLogoDev', () => {
  it('uses Logo.dev exchange shortcodes', () => {
    expect(normalizeTickerForLogoDev('NASDAQ:AAPL')).toBe('AAPL');
    expect(normalizeTickerForLogoDev('NYSE:SHOP')).toBe('SHOP');
    expect(normalizeTickerForLogoDev('XIC:TO')).toBe('XIC.TO');
    expect(normalizeTickerForLogoDev('TSX:VFV')).toBe('VFV.TO');
    expect(normalizeTickerForLogoDev('CVE:PNG')).toBe('PNG.V');
    expect(normalizeTickerForLogoDev('NSE:HDFCBANK')).toBe('HDFCBANK.IN');
    expect(normalizeTickerForLogoDev('RELIANCE.NS')).toBe('RELIANCE.IN');
  });

  it('keeps unsupported Bombay listings on the local fallback', () => {
    expect(normalizeTickerForLogoDev('BOM:500325')).toBe('');
    expect(normalizeTickerForLogoDev('500325.BO')).toBe('');
  });
});
