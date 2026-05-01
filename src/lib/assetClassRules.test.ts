import { describe, expect, it } from 'vitest';
import type { Asset, AssetClassDef } from '../store/db';
import { reconcileAssetClassesForAssets } from './assetClassRules';
import { SYSTEM_ASSET_CLASSES } from './systemAssetClasses';

function makeAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: 'asset-1',
    name: 'Sample',
    quantity: 1,
    costBasis: 1,
    currency: 'CAD',
    owner: 'Owner',
    country: 'Canada',
    assetClass: 'Stocks',
    autoUpdate: false,
    ...overrides,
  };
}

describe('assetClassRules.reconcileAssetClassesForAssets', () => {
  it('auto-creates missing asset classes for imported assets', () => {
    const { assets, customAssetClasses } = reconcileAssetClassesForAssets({
      assets: [makeAsset({ assetClass: 'Real Estate', country: 'Canada' })],
      systemAssetClasses: SYSTEM_ASSET_CLASSES,
      customAssetClasses: [],
    });

    expect(assets[0]?.assetClass).toBe('Real Estate');
    expect(customAssetClasses.some((cls) => cls.country === 'Canada' && cls.name === 'Real Estate')).toBe(true);
  });

  it('merges minor spelling mistakes into an existing class within the same country', () => {
    const existing: AssetClassDef = { id: 'custom-stocks-ca', country: 'Canada', name: 'Stocks' };
    const { assets, customAssetClasses } = reconcileAssetClassesForAssets({
      assets: [makeAsset({ assetClass: 'Stokcs', country: 'Canada' })],
      systemAssetClasses: SYSTEM_ASSET_CLASSES,
      customAssetClasses: [existing],
    });

    expect(assets[0]?.assetClass).toBe('Stocks');
    expect(customAssetClasses).toHaveLength(1);
    expect(customAssetClasses[0]?.name).toBe('Stocks');
  });

  it('does not merge across countries', () => {
    const existing: AssetClassDef = { id: 'custom-stocks-ca', country: 'Canada', name: 'Stocks' };
    const { assets, customAssetClasses } = reconcileAssetClassesForAssets({
      assets: [makeAsset({ assetClass: 'Stokcs', country: 'India', currency: 'INR' })],
      systemAssetClasses: SYSTEM_ASSET_CLASSES,
      customAssetClasses: [existing],
    });

    expect(assets[0]?.assetClass).toBe('Stokcs');
    expect(customAssetClasses.some((cls) => cls.country === 'India' && cls.name === 'Stokcs')).toBe(true);
  });

  it('does not merge dissimilar class names', () => {
    const existing: AssetClassDef = { id: 'custom-stocks-ca', country: 'Canada', name: 'Stocks' };
    const { assets, customAssetClasses } = reconcileAssetClassesForAssets({
      assets: [makeAsset({ assetClass: 'Bonds', country: 'Canada' })],
      systemAssetClasses: SYSTEM_ASSET_CLASSES,
      customAssetClasses: [existing],
    });

    expect(assets[0]?.assetClass).toBe('Bonds');
    expect(customAssetClasses.some((cls) => cls.country === 'Canada' && cls.name === 'Bonds')).toBe(true);
  });

  it('merges created typo classes into the higher-usage spelling during the same import', () => {
    const imported: Asset[] = [
      makeAsset({ id: 'a1', country: 'Canada', assetClass: 'Stokcs' }),
      makeAsset({ id: 'a2', country: 'Canada', assetClass: 'Stocks' }),
      makeAsset({ id: 'a3', country: 'Canada', assetClass: 'Stocks' }),
      makeAsset({ id: 'a4', country: 'Canada', assetClass: 'Stocks' }),
    ];

    const { assets, customAssetClasses } = reconcileAssetClassesForAssets({
      assets: imported,
      systemAssetClasses: SYSTEM_ASSET_CLASSES,
      customAssetClasses: [],
    });

    expect(new Set(assets.map((asset) => asset.assetClass))).toEqual(new Set(['Stocks']));
    expect(customAssetClasses.some((cls) => cls.country === 'Canada' && cls.name === 'Stocks')).toBe(true);
    expect(customAssetClasses.some((cls) => cls.country === 'Canada' && cls.name === 'Stokcs')).toBe(false);
  });
});

