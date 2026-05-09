import { describe, expect, it } from 'vitest';
import { mapSplitwiseSummaryToAssets } from './splitwiseAssetMapper';
import type { SplitwiseSummaryResponse } from '../lib/splitwiseTypes';
import { isDebtAssetClass, getCurrentTotal } from '../lib/portfolioMetrics';
import type { Asset } from './db';

function buildSummary(net: Array<{ currency: string; amount: number }>): SplitwiseSummaryResponse {
  return {
    connected: true,
    profile: {},
    balances: {
      owes: [],
      owed: [],
      net,
    },
    groups: [],
    recentExpenses: [],
    lastSyncAt: 1_700_000_000_000,
  };
}

describe('mapSplitwiseSummaryToAssets', () => {
  it('converts multi-currency net balances into one primary-currency row', () => {
    const assets = mapSplitwiseSummaryToAssets(
      'connected',
      buildSummary([
        { currency: 'USD', amount: 100 },
        { currency: 'CAD', amount: 50 },
      ]),
      'Joint',
      'CAD',
      { CAD: 1.25, INR: 82 },
    );

    expect(assets).toHaveLength(1);
    expect(assets[0].currency).toBe('CAD');
    expect(assets[0].name).toBe('Splitwise - Cloud (CAD)');
    expect(assets[0].assetClass).toBe('Splitwise Cloud');
    expect(assets[0].splitwiseOriginalBreakdown).toEqual([
      { currency: 'USD', amount: 100 },
      { currency: 'CAD', amount: 50 },
    ]);
    expect(assets[0].currentPrice).toBeCloseTo(175, 6);
  });

  it('flags missing FX currencies and excludes them from converted total', () => {
    const assets = mapSplitwiseSummaryToAssets(
      'connected',
      buildSummary([
        { currency: 'USD', amount: 100 },
        { currency: 'INR', amount: 1000 },
      ]),
      'Joint',
      'CAD',
      { CAD: 1.25 },
    );

    expect(assets).toHaveLength(1);
    expect(assets[0].currentPrice).toBeCloseTo(125, 6);
    expect(assets[0].splitwiseConversionNote).toContain('INR');
    expect(assets[0].priceFetchStatus).toBe('failed');
  });

  it('classifies net negative Splitwise balance as Credit Card liability', () => {
    const assets = mapSplitwiseSummaryToAssets(
      'connected',
      buildSummary([
        { currency: 'USD', amount: -100 },
        { currency: 'CAD', amount: -50 },
      ]),
      'Shubham',
      'CAD',
      { CAD: 1.25, INR: 82 },
    );

    expect(assets).toHaveLength(1);
    expect(assets[0].assetClass).toBe('Credit Card');
    expect(assets[0].name).toBe('Splitwise - Debt (CAD)');
    expect(assets[0].currentPrice).toBeCloseTo(175, 6);
    expect(assets[0].costBasis).toBeCloseTo(175, 6);
    expect(isDebtAssetClass(assets[0].assetClass)).toBe(true);
  });

  it('classifies net positive Splitwise balance as asset', () => {
    const assets = mapSplitwiseSummaryToAssets(
      'connected',
      buildSummary([
        { currency: 'CAD', amount: 200 },
      ]),
      'Shubham',
      'CAD',
      { CAD: 1.25, INR: 82 },
    );

    expect(assets).toHaveLength(1);
    expect(assets[0].assetClass).toBe('Splitwise Cloud');
    expect(assets[0].name).toBe('Splitwise - Cloud (CAD)');
    expect(isDebtAssetClass(assets[0].assetClass)).toBe(false);
  });

  it('applies liability sign inversion for net worth reduction', () => {
    const assets = mapSplitwiseSummaryToAssets(
      'connected',
      buildSummary([
        { currency: 'CAD', amount: -1500 },
      ]),
      'Shubham',
      'CAD',
      { CAD: 1.25 },
    );

    expect(assets).toHaveLength(1);
    const liabilityAsset = assets[0] as Asset;
    const netWorthImpact = getCurrentTotal(liabilityAsset);
    expect(netWorthImpact).toBe(-1500);
  });
});
