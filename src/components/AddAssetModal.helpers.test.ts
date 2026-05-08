import { describe, expect, it } from 'vitest';
import {
  getCurrencyOptionsForCountry,
  getDefaultCurrencyForCountry,
  getAssetCategory,
  getOwnerOptions,
  legacyOwnerWarning,
  buildAssetFromForm,
  loadAssetIntoForm,
  getDefaultFormState,
  ASSET_CATEGORY_MAP,
} from './addAssetModalHelpers';
import type { PortfolioMember } from '../store/portfolioHelpers';
import type { Asset } from '../store/db';

describe('AddAssetModal helpers', () => {
  describe('currency helpers', () => {
    it('returns only INR for India', () => {
      expect(getCurrencyOptionsForCountry('India')).toEqual(['INR']);
      expect(getDefaultCurrencyForCountry('India')).toBe('INR');
    });

    it('returns CAD and USD for Canada and defaults to CAD', () => {
      expect(getCurrencyOptionsForCountry('Canada')).toEqual(['CAD', 'USD']);
      expect(getDefaultCurrencyForCountry('Canada')).toBe('CAD');
    });

    it('preserves an existing valid currency for the selected country', () => {
      expect(getDefaultCurrencyForCountry('Canada', 'USD')).toBe('USD');
      expect(getDefaultCurrencyForCountry('India', 'INR')).toBe('INR');
    });

    it('falls back when the existing currency is not allowed for the selected country', () => {
      expect(getDefaultCurrencyForCountry('Canada', 'INR')).toBe('CAD');
      expect(getDefaultCurrencyForCountry('India', 'CAD')).toBe('INR');
    });
  });

  describe('getAssetCategory', () => {
    it('returns market-traded for Stocks, ETFs, Mutual Funds', () => {
      expect(getAssetCategory('Stocks')).toBe('market-traded');
      expect(getAssetCategory('ETFs')).toBe('market-traded');
      expect(getAssetCategory('Mutual Funds')).toBe('market-traded');
    });

    it('returns cash-fixed-income for Cash, FD, PF, PPF, NPS, GIC', () => {
      expect(getAssetCategory('Cash')).toBe('cash-fixed-income');
      expect(getAssetCategory('Fixed Deposits')).toBe('cash-fixed-income');
      expect(getAssetCategory('PF/EPF')).toBe('cash-fixed-income');
      expect(getAssetCategory('PPF')).toBe('cash-fixed-income');
      expect(getAssetCategory('NPS')).toBe('cash-fixed-income');
      expect(getAssetCategory('GIC')).toBe('cash-fixed-income');
      expect(getAssetCategory('TFSA/RRSP/FHSA')).toBe('cash-fixed-income');
    });

    it('returns property for Real Estate', () => {
      expect(getAssetCategory('Real Estate')).toBe('property');
    });

    it('returns liability for Credit Card', () => {
      expect(getAssetCategory('Credit Card')).toBe('liability');
    });

    it('defaults unknown asset classes to market-traded', () => {
      expect(getAssetCategory('Crypto')).toBe('market-traded');
      expect(getAssetCategory('')).toBe('market-traded');
    });

    it('every entry in ASSET_CATEGORY_MAP maps to a valid category', () => {
      const validCategories = ['market-traded', 'cash-fixed-income', 'property', 'liability'];
      for (const [key, category] of Object.entries(ASSET_CATEGORY_MAP)) {
        expect(validCategories).toContain(category);
        expect(key).toBeTruthy();
      }
    });
  });

  describe('getOwnerOptions', () => {
    const members: PortfolioMember[] = [
      { email: 'alice@test.com', role: 'owner' },
      { email: 'bob@test.com', role: 'partner' },
    ];

    it('returns sorted member emails when no existing owner', () => {
      const options = getOwnerOptions(members);
      expect(options).toEqual(['alice@test.com', 'bob@test.com']);
    });

    it('includes existing owner even if not in members list', () => {
      const options = getOwnerOptions(members, 'charlie@test.com');
      expect(options).toContain('charlie@test.com');
      expect(options).toEqual(['alice@test.com', 'bob@test.com', 'charlie@test.com']);
    });

    it('does not duplicate existing owner when already a member', () => {
      const options = getOwnerOptions(members, 'alice@test.com');
      expect(options).toEqual(['alice@test.com', 'bob@test.com']);
    });

    it('returns empty array when no members and no existing owner', () => {
      expect(getOwnerOptions([])).toEqual([]);
    });
  });

  describe('legacyOwnerWarning', () => {
    const members: PortfolioMember[] = [
      { email: 'alice@test.com', role: 'owner' },
    ];

    it('returns null when no existing owner', () => {
      expect(legacyOwnerWarning(undefined, members)).toBeNull();
    });

    it('returns null when owner is a current member', () => {
      expect(legacyOwnerWarning('alice@test.com', members)).toBeNull();
    });

    it('returns warning when owner is not in members list', () => {
      const warning = legacyOwnerWarning('old@test.com', members);
      expect(warning).toContain('old@test.com');
      expect(warning).toContain('not a current portfolio member');
    });
  });

  describe('buildAssetFromForm', () => {
    it('builds market-traded asset with quantity/price/value', () => {
      const form = getDefaultFormState();
      form.name = 'AAPL';
      form.assetClass = 'Stocks';
      form.owner = 'alice@test.com';
      form.quantity = '10';
      form.averagePurchasePrice = '150';
      form.currency = 'USD';
      form.country = 'Canada';

      const asset = buildAssetFromForm(form);
      expect(asset.name).toBe('AAPL');
      expect(asset.quantity).toBe(10);
      expect(asset.costBasis).toBe(1500);
      expect(asset.ticker).toBeUndefined();
      expect(asset.autoUpdate).toBe(true);
    });

    it('builds market-traded asset with ticker when provided', () => {
      const form = getDefaultFormState();
      form.name = 'AAPL';
      form.assetClass = 'Stocks';
      form.owner = 'alice@test.com';
      form.quantity = '10';
      form.averagePurchasePrice = '150';
      form.ticker = 'NASDAQ:AAPL';
      form.preferredPriceProvider = 'yahoo';

      const asset = buildAssetFromForm(form);
      expect(asset.ticker).toBe('NASDAQ:AAPL');
      expect(asset.preferredPriceProvider).toBe('yahoo');
    });

    it('builds cash-fixed-income asset with amount', () => {
      const form = getDefaultFormState();
      form.name = 'HDFC FD';
      form.assetClass = 'Fixed Deposits';
      form.owner = 'alice@test.com';
      form.amount = '50000';
      form.maturityDate = '2026-01-01';
      form.rate = '8.5';

      const asset = buildAssetFromForm(form);
      expect(asset.name).toBe('HDFC FD');
      expect(asset.quantity).toBe(50000);
      expect(asset.costBasis).toBe(50000);
      expect(asset.ticker).toBeUndefined();
      expect(asset.autoUpdate).toBe(false);
    });

    it('builds property asset', () => {
      const form = getDefaultFormState();
      form.name = 'My House';
      form.assetClass = 'Real Estate';
      form.owner = 'alice@test.com';
      form.purchaseValue = '500000';
      form.purchaseDate = '2020-01-01';
      form.currentValue = '600000';

      const asset = buildAssetFromForm(form);
      expect(asset.name).toBe('My House');
      expect(asset.quantity).toBe(1);
      expect(asset.costBasis).toBe(500000);
      expect(asset.autoUpdate).toBe(false);
      expect(asset.currentPrice).toBe(600000);
    });

    it('builds liability asset', () => {
      const form = getDefaultFormState();
      form.name = 'Credit Card';
      form.assetClass = 'Credit Card';
      form.owner = 'alice@test.com';
      form.outstandingAmount = '2500';
      form.dueDate = '2025-06-01';

      const asset = buildAssetFromForm(form);
      expect(asset.name).toBe('Credit Card');
      expect(asset.quantity).toBe(1);
      expect(asset.costBasis).toBe(2500);
      expect(asset.autoUpdate).toBe(false);
    });
  });

  describe('loadAssetIntoForm', () => {
    const createAsset = (overrides: Partial<Asset> = {}): Asset => ({
      id: 'test-1',
      name: 'Test Asset',
      quantity: 10,
      costBasis: 1500,
      currency: 'USD',
      owner: 'alice@test.com',
      country: 'Canada',
      assetClass: 'Stocks',
      autoUpdate: true,
      ...overrides,
    });

    it('loads market-traded asset correctly', () => {
      const asset = createAsset({ ticker: 'NASDAQ:AAPL' });
      const form = loadAssetIntoForm(asset);
      expect(form.name).toBe('Test Asset');
      expect(form.quantity).toBe('10');
      expect(form.averagePurchasePrice).toBe('150');
      expect(form.ticker).toBe('NASDAQ:AAPL');
    });

    it('loads cash-fixed-income asset correctly', () => {
      const asset = createAsset({
        assetClass: 'Fixed Deposits',
        costBasis: 50000,
        purchaseDate: '2026-01-01',
      });
      const form = loadAssetIntoForm(asset);
      expect(form.amount).toBe('50000');
      expect(form.maturityDate).toBe('2026-01-01');
    });

    it('loads property asset correctly', () => {
      const asset = createAsset({
        assetClass: 'Real Estate',
        quantity: 1,
        costBasis: 500000,
        currentPrice: 600000,
        purchaseDate: '2020-01-01',
      });
      const form = loadAssetIntoForm(asset);
      expect(form.purchaseValue).toBe('500000');
      expect(form.currentValue).toBe('600000');
      expect(form.purchaseDate).toBe('2020-01-01');
    });

    it('loads liability asset correctly', () => {
      const asset = createAsset({
        assetClass: 'Credit Card',
        quantity: 1,
        costBasis: 2500,
        purchaseDate: '2025-06-01',
      });
      const form = loadAssetIntoForm(asset);
      expect(form.outstandingAmount).toBe('2500');
      expect(form.dueDate).toBe('2025-06-01');
    });

    it('loads legacy owner that is not in members', () => {
      const asset = createAsset({ owner: 'legacy@old.com' });
      const form = loadAssetIntoForm(asset);
      expect(form.owner).toBe('legacy@old.com');
    });
  });
});
