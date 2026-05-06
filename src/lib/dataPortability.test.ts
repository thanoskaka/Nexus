import { describe, expect, it, beforeEach } from 'vitest';
import {
  buildExportPayload,
  computeImportResult,
  getImportPreview,
  NEXUS_APP_ID,
  NEXUS_EXPORT_VERSION,
  type NexusExportData,
  validateImportPayload,
} from './dataPortability';
import type { Asset, AssetClassDef } from '../store/db';

function makeAsset(overrides?: Partial<Asset>): Asset {
  return {
    id: 'asset-1',
    name: 'VTI',
    ticker: 'VTI',
    quantity: 10,
    costBasis: 2600,
    currency: 'USD',
    owner: 'Test User',
    country: 'Canada',
    assetClass: 'ETF',
    autoUpdate: true,
    ...overrides,
  };
}

function makeClass(overrides?: Partial<AssetClassDef>): AssetClassDef {
  return {
    id: 'class-1',
    country: 'Canada',
    name: 'ETF',
    ...overrides,
  };
}

describe('buildExportPayload', () => {
  it('returns version and app identifier', () => {
    const payload = buildExportPayload({
      assets: [],
      assetClasses: [],
      baseCurrency: 'CAD',
    });

    expect(payload.nexusExportVersion).toBe(NEXUS_EXPORT_VERSION);
    expect(payload.app).toBe(NEXUS_APP_ID);
    expect(payload.exportedAt).toBeTruthy();
  });

  it('includes assets and asset classes', () => {
    const asset = makeAsset();
    const cls = makeClass();

    const payload = buildExportPayload({
      assets: [asset],
      assetClasses: [cls],
      baseCurrency: 'CAD',
      primaryCurrency: 'CAD',
      secondaryCurrency: 'USD',
    });

    expect(payload.portfolios).toHaveLength(1);
    expect(payload.portfolios[0].assets).toHaveLength(1);
    expect(payload.portfolios[0].assets[0].name).toBe('VTI');
    expect(payload.portfolios[0].assetClasses).toHaveLength(1);
    expect(payload.portfolios[0].assetClasses[0].name).toBe('ETF');
  });

  it('includes currency settings', () => {
    const payload = buildExportPayload({
      assets: [],
      assetClasses: [],
      baseCurrency: 'INR',
      primaryCurrency: 'INR',
      secondaryCurrency: 'USD',
    });

    expect(payload.portfolios[0].baseCurrency).toBe('INR');
    expect(payload.portfolios[0].primaryCurrency).toBe('INR');
    expect(payload.portfolios[0].secondaryCurrency).toBe('USD');
  });

  it('excludes disconnected accounts', () => {
    const payload = buildExportPayload({
      assets: [],
      assetClasses: [],
      baseCurrency: 'CAD',
      connectedAccounts: {
        upstox: { status: 'disconnected', accountCount: 0, holdingsCount: 0, positionsCount: 0 },
      },
    });

    expect(payload.connectedAccounts).toBeUndefined();
  });

  it('includes connected account metadata without secrets', () => {
    const payload = buildExportPayload({
      assets: [],
      assetClasses: [],
      baseCurrency: 'CAD',
      connectedAccounts: {
        upstox: {
          status: 'connected',
          connectedAt: 1700000000000,
          lastSyncAt: 1700000001000,
          accountCount: 2,
          holdingsCount: 15,
          positionsCount: 3,
        },
      },
    });

    expect(payload.connectedAccounts).toHaveLength(1);
    const acct = payload.connectedAccounts![0];
    expect(acct.provider).toBe('upstox');
    expect(acct.status).toBe('connected');
    expect(acct.accountCount).toBe(2);
    expect(Object.keys(acct)).not.toContain('accessToken');
    expect(Object.keys(acct)).not.toContain('apiKey');
    expect(Object.keys(acct)).not.toContain('clientSecret');
  });

  it('skips checklist when localStorage is unavailable', () => {
    const payload = buildExportPayload({
      assets: [],
      assetClasses: [],
      baseCurrency: 'CAD',
    });

    expect(payload.preferences?.checklist).toBeUndefined();
  });
});

describe('validateImportPayload', () => {
  const validPayload: NexusExportData = {
    nexusExportVersion: 1,
    app: 'nexus-portfolio',
    exportedAt: new Date().toISOString(),
    portfolios: [
      {
        assets: [makeAsset()],
        assetClasses: [makeClass()],
        baseCurrency: 'CAD',
      },
    ],
  };

  it('accepts a valid payload', () => {
    const result = validateImportPayload(validPayload);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.data).toBeDefined();
  });

  it('rejects null or undefined', () => {
    expect(validateImportPayload(null).valid).toBe(false);
    expect(validateImportPayload(null).errors[0]).toContain('Empty');

    expect(validateImportPayload(undefined).valid).toBe(false);
    expect(validateImportPayload(undefined).errors[0]).toContain('Empty');
  });

  it('rejects non-object values', () => {
    expect(validateImportPayload('not an object').valid).toBe(false);
    expect(validateImportPayload(42).valid).toBe(false);
    expect(validateImportPayload(true).valid).toBe(false);
  });

  it('rejects unknown schema version', () => {
    const result = validateImportPayload({
      ...validPayload,
      nexusExportVersion: 99,
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Unsupported schema version');
  });

  it('rejects unknown app identifier', () => {
    const result = validateImportPayload({
      ...validPayload,
      app: 'some-other-app',
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Unknown app identifier');
  });

  it('rejects missing portfolios array', () => {
    const result = validateImportPayload({
      nexusExportVersion: 1,
      app: 'nexus-portfolio',
      exportedAt: new Date().toISOString(),
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('portfolios');
  });

  it('accepts empty portfolios array as valid structure', () => {
    const result = validateImportPayload({
      nexusExportVersion: 1,
      app: 'nexus-portfolio',
      exportedAt: new Date().toISOString(),
      portfolios: [],
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects portfolio entries with missing assets', () => {
    const result = validateImportPayload({
      nexusExportVersion: 1,
      app: 'nexus-portfolio',
      exportedAt: new Date().toISOString(),
      portfolios: [{ assetClasses: [] }] as unknown as NexusExportData['portfolios'],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('assets'))).toBe(true);
  });
});

describe('getImportPreview', () => {
  it('returns correct asset and class counts', () => {
    const data: NexusExportData = {
      nexusExportVersion: 1,
      app: 'nexus-portfolio',
      exportedAt: new Date().toISOString(),
      portfolios: [
        {
          assets: [makeAsset(), makeAsset({ id: 'a2' })],
          assetClasses: [makeClass()],
          baseCurrency: 'CAD',
        },
      ],
    };

    const preview = getImportPreview(data);
    expect(preview.assets).toBe(2);
    expect(preview.assetClasses).toBe(1);
    expect(preview.portfolioCount).toBe(1);
  });

  it('aggregates across multiple portfolios', () => {
    const data: NexusExportData = {
      nexusExportVersion: 1,
      app: 'nexus-portfolio',
      exportedAt: new Date().toISOString(),
      portfolios: [
        {
          assets: [makeAsset()],
          assetClasses: [makeClass()],
          baseCurrency: 'CAD',
        },
        {
          assets: [makeAsset({ id: 'ca2' })],
          assetClasses: [makeClass({ id: 'c2', name: 'Bonds' })],
          baseCurrency: 'INR',
        },
      ],
    };

    const preview = getImportPreview(data);
    expect(preview.assets).toBe(2);
    expect(preview.assetClasses).toBe(2);
    expect(preview.portfolioCount).toBe(2);
  });

  it('warns when empty', () => {
    const data: NexusExportData = {
      nexusExportVersion: 1,
      app: 'nexus-portfolio',
      exportedAt: new Date().toISOString(),
      portfolios: [
        { assets: [], assetClasses: [], baseCurrency: 'CAD' },
      ],
    };

    const preview = getImportPreview(data);
    expect(preview.warnings).toContain('No assets found in export.');
    expect(preview.warnings).toContain('No asset classes found in export.');
  });

  it('detects connected accounts', () => {
    const data: NexusExportData = {
      nexusExportVersion: 1,
      app: 'nexus-portfolio',
      exportedAt: new Date().toISOString(),
      portfolios: [
        { assets: [makeAsset()], assetClasses: [makeClass()], baseCurrency: 'CAD' },
      ],
      connectedAccounts: [
        { provider: 'upstox', status: 'connected', accountCount: 1, holdingsCount: 5, positionsCount: 2 },
      ],
    };

    const preview = getImportPreview(data);
    expect(preview.connectedAccounts).toBe(1);
  });

  it('detects checklist preferences', () => {
    const data: NexusExportData = {
      nexusExportVersion: 1,
      app: 'nexus-portfolio',
      exportedAt: new Date().toISOString(),
      portfolios: [
        { assets: [makeAsset()], assetClasses: [makeClass()], baseCurrency: 'CAD' },
      ],
      preferences: {
        checklist: { 'sign-in': 'done' },
      },
    };

    const preview = getImportPreview(data);
    expect(preview.hasChecklist).toBe(true);
  });
});

describe('computeImportResult', () => {
  const data: NexusExportData = {
    nexusExportVersion: 1,
    app: 'nexus-portfolio',
    exportedAt: new Date().toISOString(),
    portfolios: [
      {
        assets: [makeAsset()],
        assetClasses: [makeClass()],
        baseCurrency: 'INR',
        primaryCurrency: 'INR',
        secondaryCurrency: 'USD',
      },
    ],
  };

  const existingAssets = [makeAsset({ id: 'existing-1', name: 'Existing Stock' })];
  const existingClasses = [makeClass({ id: 'existing-class', name: 'Existing Class' })];

  it('replace mode returns only imported data', () => {
    const result = computeImportResult(data, 'replace', existingAssets, existingClasses);

    expect(result.assets).toHaveLength(1);
    expect(result.assets[0].name).toBe('VTI');
    expect(result.assetClasses).toHaveLength(1);
    expect(result.assetClasses[0].name).toBe('ETF');
    expect(result.baseCurrency).toBe('INR');
    expect(result.primaryCurrency).toBe('INR');
    expect(result.secondaryCurrency).toBe('USD');
  });

  it('merge mode keeps existing and adds new', () => {
    const result = computeImportResult(data, 'merge', existingAssets, existingClasses);

    expect(result.assets).toHaveLength(2);
    expect(result.assets.some((a) => a.id === 'existing-1')).toBe(true);
    expect(result.assets.some((a) => a.id === 'asset-1')).toBe(true);
  });

  it('merge deduplicates by asset id', () => {
    const existingWithSame = [
      makeAsset({ id: 'asset-1', name: 'Already Present' }),
    ];

    const result = computeImportResult(data, 'merge', existingWithSame, existingClasses);

    expect(result.assets).toHaveLength(1);
    expect(result.assets[0].name).toBe('Already Present');
  });

  it('merge deduplicates classes by id and name', () => {
    const existingSameName = [
      makeClass({ id: 'different-id', name: 'ETF' }),
    ];

    const result = computeImportResult(data, 'merge', existingAssets, existingSameName);

    expect(result.assetClasses).toHaveLength(1);
  });

  it('handles empty portfolios gracefully', () => {
    const emptyData: NexusExportData = {
      nexusExportVersion: 1,
      app: 'nexus-portfolio',
      exportedAt: new Date().toISOString(),
      portfolios: [],
    };

    const result = computeImportResult(emptyData, 'merge', existingAssets, existingClasses);
    expect(result.assets).toBe(existingAssets);
    expect(result.assetClasses).toBe(existingClasses);
  });
});

describe('asset field safety', () => {
  it('assets do not contain secret-like field names', () => {
    const asset = makeAsset();
    const secretNames = ['accessToken', 'apiKey', 'clientSecret', 'password', 'refreshToken'];

    for (const key of Object.keys(asset)) {
      expect(secretNames).not.toContain(key);
    }
  });
});
