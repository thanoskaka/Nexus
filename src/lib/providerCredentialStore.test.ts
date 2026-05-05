import { getLocalCredential, saveLocalCredential, removeLocalCredential, getLocalPreference, setLocalPreference, maskApiKey } from './providerCredentialStore';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

function createMockStorage() {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach((k) => { delete store[k]; }); },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
}

describe('providerCredentialStore', () => {
  beforeEach(() => {
    const mockStorage = createMockStorage();
    vi.stubGlobal('localStorage', mockStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('saveLocalCredential / getLocalCredential / removeLocalCredential', () => {
    it('saves and retrieves a masked credential', () => {
      saveLocalCredential('massive', 'test-key-1234abcd');
      const entry = getLocalCredential('massive');
      expect(entry).not.toBeNull();
      expect(entry!.key).toBe('test-key-1234abcd');
      expect(entry!.last4).toBe('abcd');
      expect(entry!.updatedAt).toBeGreaterThan(0);
    });

    it('returns null for unset credential', () => {
      expect(getLocalCredential('massive')).toBeNull();
    });

    it('removes a credential', () => {
      saveLocalCredential('massive', 'test-key');
      removeLocalCredential('massive');
      expect(getLocalCredential('massive')).toBeNull();
    });

    it('throws on empty key', () => {
      expect(() => saveLocalCredential('massive', '')).toThrow('API key cannot be empty.');
      expect(() => saveLocalCredential('massive', '   ')).toThrow('API key cannot be empty.');
    });

    it('handles short keys (1-3 chars) for last4', () => {
      saveLocalCredential('alpha_vantage', 'ab');
      const entry = getLocalCredential('alpha_vantage');
      expect(entry!.last4).toBe('ab');
    });
  });

  describe('preference', () => {
    it('returns hosted by default', () => {
      expect(getLocalPreference('massive')).toBe('hosted');
      expect(getLocalPreference('alpha_vantage')).toBe('hosted');
    });

    it('persists and retrieves preference', () => {
      setLocalPreference('massive', 'user');
      expect(getLocalPreference('massive')).toBe('user');
    });

    it('ignores corrupt preference values', () => {
      const storage = localStorage as unknown as { setItem: (k: string, v: string) => void };
      storage.setItem('nexus:provider-pref:massive', 'garbage');
      expect(getLocalPreference('massive')).toBe('hosted');
    });
  });

  describe('maskApiKey', () => {
    it('returns empty for null', () => {
      expect(maskApiKey(null)).toBe('');
    });

    it('returns masked string', () => {
      const masked = maskApiKey('abcd');
      expect(masked).toContain('abcd');
      expect(masked).not.toContain('test-key-1234');
      expect(masked.length).toBeGreaterThan(4);
    });
  });
});
