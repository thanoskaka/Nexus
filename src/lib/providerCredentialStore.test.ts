import { getLocalCredential, saveLocalCredential, removeLocalCredential, getLocalPreference, setLocalPreference, maskApiKey } from './providerCredentialStore';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

function createMockStorage() {
  const store: Record<string, string> = {};
  return {
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => { store[key] = value; },
    removeItem: (key) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => { delete store[k]; }); },
    get length() { return Object.keys(store).length; },
    key: (i) => Object.keys(store)[i] ?? null,
  };
}

describe('providerCredentialStore', () => {
  beforeEach(() => { const ms = createMockStorage(); vi.stubGlobal('localStorage', ms); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('saves and retrieves a masked credential', () => {
    saveLocalCredential('massive', 'test-key-1234abcd');
    const entry = getLocalCredential('massive');
    expect(entry).not.toBeNull();
    expect(entry.key).toBe('test-key-1234abcd');
    expect(entry.last4).toBe('abcd');
    expect(entry.updatedAt).toBeGreaterThan(0);
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
    expect(() => saveLocalCredential('massive', '')).toThrow();
    expect(() => saveLocalCredential('massive', '   ')).toThrow();
  });

  it('returns hosted by default', () => {
    expect(getLocalPreference('massive')).toBe('hosted');
  });

  it('persists and retrieves preference', () => {
    setLocalPreference('massive', 'user');
    expect(getLocalPreference('massive')).toBe('user');
  });

  it('returns empty for null', () => {
    expect(maskApiKey(null)).toBe('');
  });

  it('returns masked string', () => {
    const masked = maskApiKey('abcd');
    expect(masked).toContain('abcd');
    expect(masked.length).toBeGreaterThan(4);
  });
});
