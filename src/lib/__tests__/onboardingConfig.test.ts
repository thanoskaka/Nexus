import { describe, expect, it } from 'vitest';
import {
  ALLOWED_COUNTRIES,
  COUNTRY_CURRENCY_MAP,
  getCurrencyForCountry,
  isAllowedCountry,
  getAssetClassesForCountry,
  getProvidersForSelections,
  getIntegrationsForSelections,
  PRICING_PROVIDERS,
  INTEGRATIONS,
  COUNTRY_ASSET_CLASSES,
} from '../onboardingConfig';

describe('onboardingConfig', () => {
  describe('country <-> currency mapping', () => {
    it('maps US to USD', () => {
      expect(COUNTRY_CURRENCY_MAP.US).toBe('USD');
    });

    it('maps CA to CAD', () => {
      expect(COUNTRY_CURRENCY_MAP.CA).toBe('CAD');
    });

    it('maps IN to INR', () => {
      expect(COUNTRY_CURRENCY_MAP.IN).toBe('INR');
    });

    it('returns currency for valid country', () => {
      expect(getCurrencyForCountry('US')).toBe('USD');
      expect(getCurrencyForCountry('CA')).toBe('CAD');
      expect(getCurrencyForCountry('IN')).toBe('INR');
    });

    it('returns null for invalid country', () => {
      expect(getCurrencyForCountry('UK')).toBeNull();
      expect(getCurrencyForCountry('')).toBeNull();
      expect(getCurrencyForCountry('DE')).toBeNull();
    });
  });

  describe('isAllowedCountry', () => {
    it('allows US, CA, IN', () => {
      expect(isAllowedCountry('US')).toBe(true);
      expect(isAllowedCountry('CA')).toBe(true);
      expect(isAllowedCountry('IN')).toBe(true);
    });

    it('rejects other countries', () => {
      expect(isAllowedCountry('UK')).toBe(false);
      expect(isAllowedCountry('DE')).toBe(false);
      expect(isAllowedCountry('')).toBe(false);
    });
  });

  describe('ALLOWED_COUNTRIES', () => {
    it('contains exactly US, CA, IN', () => {
      expect(ALLOWED_COUNTRIES).toEqual(['US', 'CA', 'IN']);
    });
  });

  describe('getAssetClassesForCountry', () => {
    it('returns US asset classes', () => {
      const classes = getAssetClassesForCountry('US');
      expect(classes.length).toBeGreaterThan(0);
      expect(classes.map((c) => c.name)).toContain('Stocks');
      expect(classes.map((c) => c.name)).toContain('Bonds');
    });

    it('returns CA asset classes', () => {
      const classes = getAssetClassesForCountry('CA');
      expect(classes.length).toBeGreaterThan(0);
      expect(classes.map((c) => c.name)).toContain('Stocks');
      expect(classes.map((c) => c.name)).toContain('Bonds');
    });

    it('returns IN asset classes including mutual funds', () => {
      const classes = getAssetClassesForCountry('IN');
      expect(classes.length).toBeGreaterThan(0);
      expect(classes.map((c) => c.name)).toContain('Mutual Funds');
      expect(classes.map((c) => c.name)).toContain('Gold');
    });

    it('returns empty array for invalid country', () => {
      expect(getAssetClassesForCountry('UK')).toEqual([]);
    });

    it('each class has unique id per country', () => {
      for (const country of ALLOWED_COUNTRIES) {
        const classes = COUNTRY_ASSET_CLASSES[country];
        const ids = classes.map((c) => c.id);
        expect(new Set(ids).size).toBe(ids.length);
      }
    });
  });

  describe('getProvidersForSelections', () => {
    it('returns yahoo for US stocks', () => {
      const providers = getProvidersForSelections(['US'], ['us-stocks']);
      expect(providers.map((p) => p.id)).toContain('yahoo');
    });

    it('returns relevant providers for IN selections', () => {
      const providers = getProvidersForSelections(['IN'], ['in-stocks']);
      expect(providers.map((p) => p.id)).toContain('yahoo');
      expect(providers.map((p) => p.id)).not.toContain('finnhub');
    });

    it('returns empty for no matching providers', () => {
      const providers = getProvidersForSelections([], []);
      expect(providers).toEqual([]);
    });

    it('marks yahoo as recommended', () => {
      const yahoo = PRICING_PROVIDERS.find((p) => p.id === 'yahoo');
      expect(yahoo?.isRecommended).toBe(true);
    });
  });

  describe('getIntegrationsForSelections', () => {
    it('returns upstox for IN selections', () => {
      const integrations = getIntegrationsForSelections(['IN'], ['in-stocks']);
      expect(integrations.map((i) => i.id)).toContain('upstox');
    });

    it('returns splitwise for any country', () => {
      const integrations = getIntegrationsForSelections(['US'], []);
      expect(integrations.map((i) => i.id)).toContain('splitwise');
    });

    it('does not return upstox for US-only selections', () => {
      const integrations = getIntegrationsForSelections(['US'], ['us-stocks']);
      expect(integrations.map((i) => i.id)).not.toContain('upstox');
    });
  });
});
