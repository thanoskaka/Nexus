// @vitest-environment node
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

describe('env validation', () => {
  let reader: (key: string) => string | undefined;

  // Create a controllable env reader for tests.
  // Defaults: MODE=test (vitest default), DEV=false.
  function makeReader(overrides: Record<string, string | undefined> = {}) {
    return (key: string) => {
      if (key in overrides) return overrides[key];
      if (key === 'MODE') return 'test';
      // DEV is 'true' only when MODE is 'development'
      return undefined;
    };
  }

  beforeEach(async () => {
    const mod = await import('./env');
    mod.__resetEnvReader();
  });

  afterEach(async () => {
    const mod = await import('./env');
    mod.__resetEnvReader();
  });

  describe('isMockMode', () => {
    it('returns false when VITE_MOCK_MODE is not set', async () => {
      const mod = await import('./env');
      mod.__setEnvReaderForTest(makeReader());
      expect(mod.isMockMode()).toBe(false);
    });

    it('returns true when VITE_MOCK_MODE is "mock"', async () => {
      const mod = await import('./env');
      mod.__setEnvReaderForTest(makeReader({ VITE_MOCK_MODE: 'mock' }));
      expect(mod.isMockMode()).toBe(true);
    });

    it('returns false when VITE_MOCK_MODE is empty string', async () => {
      const mod = await import('./env');
      mod.__setEnvReaderForTest(makeReader({ VITE_MOCK_MODE: '' }));
      expect(mod.isMockMode()).toBe(false);
    });
  });

  describe('getMissingFirebaseKeys', () => {
    it('returns all keys when none are set', async () => {
      const mod = await import('./env');
      mod.__setEnvReaderForTest(makeReader());
      const missing = mod.getMissingFirebaseKeys();
      expect(missing).toHaveLength(6);
      expect(missing).toContain('NEXT_PUBLIC_FIREBASE_API_KEY');
      expect(missing).toContain('NEXT_PUBLIC_FIREBASE_APP_ID');
    });

    it('returns empty array when all Firebase keys are set', async () => {
      const mod = await import('./env');
      mod.__setEnvReaderForTest(makeReader({
        NEXT_PUBLIC_FIREBASE_API_KEY: 'AIzaSyTest',
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'test.firebaseapp.com',
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'test-project',
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'test.firebasestorage.app',
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '123456789',
        NEXT_PUBLIC_FIREBASE_APP_ID: '1:123456789:web:abc123',
      }));
      expect(mod.getMissingFirebaseKeys()).toEqual([]);
    });

    it('returns only missing keys when some are set', async () => {
      const mod = await import('./env');
      mod.__setEnvReaderForTest(makeReader({
        NEXT_PUBLIC_FIREBASE_API_KEY: 'AIzaSyTest',
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'test-project',
      }));
      const missing = mod.getMissingFirebaseKeys();
      expect(missing).not.toContain('NEXT_PUBLIC_FIREBASE_API_KEY');
      expect(missing).not.toContain('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
      expect(missing).toContain('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN');
      expect(missing).toContain('NEXT_PUBLIC_FIREBASE_APP_ID');
    });
  });

  describe('validateFirebaseConfig', () => {
    it('does not throw in mock mode even with missing keys', async () => {
      const mod = await import('./env');
      mod.__setEnvReaderForTest(makeReader({ VITE_MOCK_MODE: 'mock' }));
      expect(() => mod.validateFirebaseConfig()).not.toThrow();
    });

    it('throws with friendly message when keys are missing', async () => {
      const mod = await import('./env');
      mod.__setEnvReaderForTest(makeReader());
      expect(() => mod.validateFirebaseConfig()).toThrow(/Missing Firebase environment variables/);
      expect(() => mod.validateFirebaseConfig()).toThrow(/VITE_MOCK_MODE/);
    });

    it('does not throw when all Firebase keys are present', async () => {
      const mod = await import('./env');
      mod.__setEnvReaderForTest(makeReader({
        NEXT_PUBLIC_FIREBASE_API_KEY: 'AIzaSyTest',
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'test.firebaseapp.com',
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'test-project',
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'test.firebasestorage.app',
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '123456789',
        NEXT_PUBLIC_FIREBASE_APP_ID: '1:123456789:web:abc123',
      }));
      expect(() => mod.validateFirebaseConfig()).not.toThrow();
    });
  });

  describe('resolveFirebaseDataNamespace', () => {
    it('returns env override when set', async () => {
      const mod = await import('./env');
      mod.__setEnvReaderForTest(makeReader({
        NEXT_PUBLIC_FIREBASE_DATA_NAMESPACE: 'my-ns',
      }));
      expect(mod.resolveFirebaseDataNamespace()).toBe('my-ns');
    });

    it('returns "test" in test mode', async () => {
      const mod = await import('./env');
      mod.__setEnvReaderForTest(makeReader());
      expect(mod.resolveFirebaseDataNamespace()).toBe('test');
    });

    it('returns "local-dev" in development', async () => {
      const mod = await import('./env');
      mod.__setEnvReaderForTest(makeReader({ MODE: 'development', DEV: 'true' }));
      expect(mod.resolveFirebaseDataNamespace()).toBe('local-dev');
    });

    it('returns "prod" in production', async () => {
      const mod = await import('./env');
      mod.__setEnvReaderForTest(makeReader({ MODE: 'production' }));
      expect(mod.resolveFirebaseDataNamespace()).toBe('prod');
    });
  });

  describe('resolveServerDataNamespace', () => {
    it('returns env override when set', async () => {
      const orig = process.env.FIREBASE_DATA_NAMESPACE;
      process.env.FIREBASE_DATA_NAMESPACE = 'server-ns';
      const mod = await import('./env');
      mod.__setEnvReaderForTest(makeReader());
      expect(mod.resolveServerDataNamespace()).toBe('server-ns');
      process.env.FIREBASE_DATA_NAMESPACE = orig;
    });

    it('falls back to client namespace when server is not set', async () => {
      const orig = process.env.FIREBASE_DATA_NAMESPACE;
      delete process.env.FIREBASE_DATA_NAMESPACE;
      const mod = await import('./env');
      mod.__setEnvReaderForTest(makeReader({
        NEXT_PUBLIC_FIREBASE_DATA_NAMESPACE: 'client-ns',
      }));
      expect(mod.resolveServerDataNamespace()).toBe('client-ns');
      process.env.FIREBASE_DATA_NAMESPACE = orig;
    });

    it('returns "test" when nothing is set', async () => {
      const orig = process.env.FIREBASE_DATA_NAMESPACE;
      delete process.env.FIREBASE_DATA_NAMESPACE;
      const mod = await import('./env');
      mod.__setEnvReaderForTest(makeReader());
      expect(mod.resolveServerDataNamespace()).toBe('test');
      process.env.FIREBASE_DATA_NAMESPACE = orig;
    });
  });
});
