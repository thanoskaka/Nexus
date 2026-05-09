import { describe, expect, it } from 'vitest';
import { getBulkRefreshRowStatus } from './PortfolioContext';
import type { Asset } from './db';

function makeAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: 'test-1',
    name: 'Test Asset',
    quantity: 10,
    costBasis: 1000,
    currency: 'USD',
    owner: 'me',
    country: 'Canada',
    assetClass: 'stock',
    autoUpdate: true,
    ...overrides,
  };
}

describe('getBulkRefreshRowStatus', () => {
  it('returns manual for assets with autoUpdate disabled', () => {
    const asset = makeAsset({ autoUpdate: false });
    expect(getBulkRefreshRowStatus(asset)).toBe('manual');
  });

  it('returns failed_actionable when priceFetchStatus is failed', () => {
    const asset = makeAsset({ priceFetchStatus: 'failed' });
    expect(getBulkRefreshRowStatus(asset)).toBe('failed_actionable');
  });

  it('returns failed_actionable when priceFetchStatus is failed even with last-saved-price message', () => {
    const asset = makeAsset({
      priceFetchStatus: 'failed',
      priceFetchMessage: 'using the last saved price - API key expired',
    });
    expect(getBulkRefreshRowStatus(asset)).toBe('failed_actionable');
  });

  it('returns failed_actionable when priceFetchStatus is failed even with cached-close message', () => {
    const asset = makeAsset({
      priceFetchStatus: 'failed',
      priceFetchMessage: "using today's cached data",
    });
    expect(getBulkRefreshRowStatus(asset)).toBe('failed_actionable');
  });

  it('returns updated_live for success status without massive/alphavantage provider', () => {
    const asset = makeAsset({
      priceFetchStatus: 'success',
      priceProvider: 'yahoo',
    });
    expect(getBulkRefreshRowStatus(asset)).toBe('updated_live');
  });

  it('returns updated_close_today for success status with massive provider', () => {
    const asset = makeAsset({
      priceFetchStatus: 'success',
      priceProvider: 'massive',
    });
    expect(getBulkRefreshRowStatus(asset)).toBe('updated_close_today');
  });

  it('returns queued_next_window for queued messages', () => {
    const asset = makeAsset({
      priceFetchMessage: 'queued for the next massive refresh window',
    });
    expect(getBulkRefreshRowStatus(asset)).toBe('queued_next_window');
  });

  it('returns blocked_missing_credentials for API key messages', () => {
    const asset = makeAsset({
      priceFetchMessage: 'api key is missing for provider',
    });
    expect(getBulkRefreshRowStatus(asset)).toBe('blocked_missing_credentials');
  });

  it('returns idle for no status', () => {
    const asset = makeAsset({});
    expect(getBulkRefreshRowStatus(asset)).toBe('idle');
  });
});
