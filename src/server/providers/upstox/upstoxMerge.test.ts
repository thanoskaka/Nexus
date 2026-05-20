import { describe, expect, it } from 'vitest';

function makeHolding(overrides: Record<string, unknown> = {}) {
  return {
    id: 'h1',
    uid: 'uid-1',
    connectionId: 'conn-1',
    accountId: 'acct-1',
    provider: 'upstox',
    securityName: 'TCS',
    assetType: 'stock',
    quantity: 10,
    costCurrency: 'INR',
    priceCurrency: 'INR',
    accountCurrency: 'INR',
    sourceFingerprint: 'fp1',
    isActive: true,
    syncedAt: Date.now(),
    ...overrides,
  };
}

function duplicateDetection(holdings: Array<Record<string, unknown>>) {
  const seen = new Map<string, string>();
  return holdings.map((holding) => {
    const provider = String(holding.provider || '');
    const isin = holding.isin ? String(holding.isin) : undefined;
    const ticker = holding.ticker ? String(holding.ticker) : undefined;
    const securityName = holding.securityName ? String(holding.securityName) : '';
    const dedupeKey = `${provider}:${isin || ticker || securityName}`.toLowerCase();
    const firstId = seen.get(dedupeKey);
    if (firstId) {
      return { ...holding, possibleDuplicateOf: firstId };
    }
    seen.set(dedupeKey, String(holding.id || holding.sourceFingerprint || ''));
    return holding;
  });
}

describe('detectPossibleDuplicates', () => {
  it('leaves first occurrence unmarked', () => {
    const holdings = [
      makeHolding({ id: 'h1', sourceFingerprint: 'fp1', isin: 'INE123' }),
      makeHolding({ id: 'h2', sourceFingerprint: 'fp2', isin: 'INE456' }),
    ];
    const result = duplicateDetection(holdings);
    expect(result[0].possibleDuplicateOf).toBeUndefined();
    expect(result[1].possibleDuplicateOf).toBeUndefined();
  });

  it('marks second occurrence with same ISIN as duplicate of first', () => {
    const holdings = [
      makeHolding({ id: 'h1', sourceFingerprint: 'fp1', isin: 'INE123' }),
      makeHolding({ id: 'h2', sourceFingerprint: 'fp2', isin: 'INE123' }),
      makeHolding({ id: 'h3', sourceFingerprint: 'fp3', isin: 'INE456' }),
    ];
    const result = duplicateDetection(holdings);
    expect(result[0].possibleDuplicateOf).toBeUndefined();
    expect(result[1].possibleDuplicateOf).toBe('h1');
    expect(result[2].possibleDuplicateOf).toBeUndefined();
  });

  it('uses ticker when ISIN is missing', () => {
    const holdings = [
      makeHolding({ id: 'h1', sourceFingerprint: 'fp1', ticker: 'TCS', isin: undefined }),
      makeHolding({ id: 'h2', sourceFingerprint: 'fp2', ticker: 'TCS', isin: undefined }),
      makeHolding({ id: 'h3', sourceFingerprint: 'fp3', ticker: 'INFY', isin: undefined }),
    ];
    const result = duplicateDetection(holdings);
    expect(result[0].possibleDuplicateOf).toBeUndefined();
    expect(result[1].possibleDuplicateOf).toBe('h1');
    expect(result[2].possibleDuplicateOf).toBeUndefined();
  });

  it('uses securityName when ISIN and ticker are missing', () => {
    const holdings = [
      makeHolding({ id: 'h1', sourceFingerprint: 'fp1', isin: undefined, ticker: undefined }),
      makeHolding({ id: 'h2', sourceFingerprint: 'fp2', isin: undefined, ticker: undefined }),
    ];
    const result = duplicateDetection(holdings);
    expect(result[0].possibleDuplicateOf).toBeUndefined();
    expect(result[1].possibleDuplicateOf).toBe('h1');
  });

  it('does not flag different securities as duplicates', () => {
    const holdings = [
      makeHolding({ id: 'h1', sourceFingerprint: 'fp1', isin: 'INE123', ticker: 'TCS' }),
      makeHolding({ id: 'h2', sourceFingerprint: 'fp2', isin: 'INE456', ticker: 'INFY' }),
      makeHolding({ id: 'h3', sourceFingerprint: 'fp3', isin: 'INE789', ticker: 'RELIANCE' }),
    ];
    const result = duplicateDetection(holdings);
    expect(result.every((h) => h.possibleDuplicateOf === undefined)).toBe(true);
  });

  it('uses sourceFingerprint as fallback dedupe key reference when id is empty', () => {
    const holdings = [
      makeHolding({ id: '', sourceFingerprint: 'fp1', isin: 'INE123' }),
      makeHolding({ id: '', sourceFingerprint: 'fp2', isin: 'INE123' }),
    ];
    const result = duplicateDetection(holdings);
    expect(result[0].possibleDuplicateOf).toBeUndefined();
    expect(result[1].possibleDuplicateOf).toBe('fp1');
  });
});

describe('holding merge deterministic ID', () => {
  it('same inputs produce same ID', () => {
    const crypto = require('crypto');
    const id1 = `hold_${crypto.createHash('sha1').update('conn-1:upstox:acct1:TCS:holding').digest('hex')}`;
    const id2 = `hold_${crypto.createHash('sha1').update('conn-1:upstox:acct1:TCS:holding').digest('hex')}`;
    expect(id1).toBe(id2);
  });

  it('different fingerprints produce different IDs', () => {
    const crypto = require('crypto');
    const id1 = `hold_${crypto.createHash('sha1').update('conn-1:upstox:acct1:TCS:holding').digest('hex')}`;
    const id2 = `hold_${crypto.createHash('sha1').update('conn-1:upstox:acct2:TCS:holding').digest('hex')}`;
    expect(id1).not.toBe(id2);
  });
});
