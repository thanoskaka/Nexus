// @vitest-environment happy-dom
import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  getWorkspaceOwnership,
  saveWorkspaceOwnership,
  resetWorkspaceOwnership,
  validateFirebaseConfigFields,
} from './workspaceOwnership';
import type { FirebaseClientConfig } from './workspaceOwnership';

describe('workspaceOwnership', () => {
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => store[key] ?? null),
        setItem: vi.fn((key: string, value: string) => {
          store[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete store[key];
        }),
      },
      configurable: true,
    });
  });

  describe('getWorkspaceOwnership', () => {
    it('returns null when no ownership saved', () => {
      expect(getWorkspaceOwnership('user1')).toBeNull();
    });

    it('returns hosted ownership when saved', () => {
      saveWorkspaceOwnership('hosted', undefined, 'user1');
      const result = getWorkspaceOwnership('user1');
      expect(result).not.toBeNull();
      expect(result!.mode).toBe('hosted');
      expect(result!.firebaseConfig).toBeUndefined();
      expect(result!.savedAt).toBeGreaterThan(0);
    });

    it('returns selfOwned ownership with firebase config', () => {
      const config: FirebaseClientConfig = {
        apiKey: 'test-key',
        authDomain: 'test.firebaseapp.com',
        projectId: 'test-project',
        storageBucket: 'test.appspot.com',
        messagingSenderId: '123',
        appId: '1:123:web:abc',
      };
      saveWorkspaceOwnership('selfOwned', config, 'user1');
      const result = getWorkspaceOwnership('user1');
      expect(result).not.toBeNull();
      expect(result!.mode).toBe('selfOwned');
      expect(result!.firebaseConfig).toEqual(config);
    });

    it('keys by uid so different users have different choices', () => {
      saveWorkspaceOwnership('hosted', undefined, 'user1');
      saveWorkspaceOwnership('selfOwned', { apiKey: 'k', authDomain: 'd', projectId: 'p', storageBucket: 's', messagingSenderId: 'm', appId: 'a' }, 'user2');
      expect(getWorkspaceOwnership('user1')!.mode).toBe('hosted');
      expect(getWorkspaceOwnership('user2')!.mode).toBe('selfOwned');
    });

    it('returns null for corrupted data', () => {
      store['nexus.workspaceOwnership.v1:user1'] = '{corrupt';
      expect(getWorkspaceOwnership('user1')).toBeNull();
    });

    it('returns null for invalid mode', () => {
      store['nexus.workspaceOwnership.v1:user1'] = JSON.stringify({ mode: 'invalid', savedAt: 1 });
      expect(getWorkspaceOwnership('user1')).toBeNull();
    });

    it('rejects selfOwned without firebaseConfig', () => {
      store['nexus.workspaceOwnership.v1:user1'] = JSON.stringify({ mode: 'selfOwned', savedAt: 1 });
      expect(getWorkspaceOwnership('user1')).toBeNull();
    });

    it('rejects selfOwned with incomplete firebaseConfig', () => {
      store['nexus.workspaceOwnership.v1:user1'] = JSON.stringify({
        mode: 'selfOwned',
        firebaseConfig: { apiKey: 'key' },
        savedAt: 1,
      });
      expect(getWorkspaceOwnership('user1')).toBeNull();
    });

    it('migrates valid global ownership to uid-scoped key', () => {
      store['nexus.workspaceOwnership.v1'] = JSON.stringify({ mode: 'hosted', savedAt: 100 });
      const result = getWorkspaceOwnership('user1');
      expect(result).not.toBeNull();
      expect(result!.mode).toBe('hosted');
      expect(store['nexus.workspaceOwnership.v1:user1']).toBeDefined();
      expect(store['nexus.workspaceOwnership.v1']).toBeUndefined();
    });

    it('migrates valid global selfOwned ownership to uid-scoped key', () => {
      const config: FirebaseClientConfig = {
        apiKey: 'test-key',
        authDomain: 'test.firebaseapp.com',
        projectId: 'test-project',
        storageBucket: 'test.appspot.com',
        messagingSenderId: '123',
        appId: '1:123:web:abc',
      };
      store['nexus.workspaceOwnership.v1'] = JSON.stringify({ mode: 'selfOwned', firebaseConfig: config, savedAt: 100 });
      const result = getWorkspaceOwnership('user1');
      expect(result).not.toBeNull();
      expect(result!.mode).toBe('selfOwned');
      expect(result!.firebaseConfig).toEqual(config);
      expect(store['nexus.workspaceOwnership.v1:user1']).toBeDefined();
      expect(store['nexus.workspaceOwnership.v1']).toBeUndefined();
    });

    it('ignores corrupt global ownership and does not migrate', () => {
      store['nexus.workspaceOwnership.v1'] = '{corrupt';
      const result = getWorkspaceOwnership('user1');
      expect(result).toBeNull();
      expect(store['nexus.workspaceOwnership.v1:user1']).toBeUndefined();
      expect(store['nexus.workspaceOwnership.v1']).toBe('{corrupt');
    });

    it('ignores invalid mode global ownership and does not migrate', () => {
      store['nexus.workspaceOwnership.v1'] = JSON.stringify({ mode: 'invalid', savedAt: 1 });
      const result = getWorkspaceOwnership('user1');
      expect(result).toBeNull();
      expect(store['nexus.workspaceOwnership.v1:user1']).toBeUndefined();
    });

    it('prefers uid-scoped over global key when both exist', () => {
      store['nexus.workspaceOwnership.v1:user1'] = JSON.stringify({ mode: 'hosted', savedAt: 200 });
      store['nexus.workspaceOwnership.v1'] = JSON.stringify({ mode: 'selfOwned', firebaseConfig: {
        apiKey: 'k', authDomain: 'd', projectId: 'p', storageBucket: 's', messagingSenderId: 'm', appId: 'a',
      }, savedAt: 100 });
      const result = getWorkspaceOwnership('user1');
      expect(result).not.toBeNull();
      expect(result!.mode).toBe('hosted');
      expect(result!.savedAt).toBe(200);
    });
  });

  describe('saveWorkspaceOwnership', () => {
    it('saves ownership to localStorage with uid key', () => {
      saveWorkspaceOwnership('hosted', undefined, 'user1');
      expect(store['nexus.workspaceOwnership.v1:user1']).toBeDefined();
      const parsed = JSON.parse(store['nexus.workspaceOwnership.v1:user1']);
      expect(parsed.mode).toBe('hosted');
    });

    it('saves without uid', () => {
      saveWorkspaceOwnership('hosted');
      expect(store['nexus.workspaceOwnership.v1']).toBeDefined();
      const parsed = JSON.parse(store['nexus.workspaceOwnership.v1']);
      expect(parsed.mode).toBe('hosted');
    });
  });

  describe('resetWorkspaceOwnership', () => {
    it('removes the ownership key from localStorage', () => {
      saveWorkspaceOwnership('hosted', undefined, 'user1');
      expect(getWorkspaceOwnership('user1')).not.toBeNull();
      resetWorkspaceOwnership('user1');
      expect(getWorkspaceOwnership('user1')).toBeNull();
    });
  });

  describe('validateFirebaseConfigFields', () => {
    it('returns no errors for valid config', () => {
      const config: FirebaseClientConfig = {
        apiKey: 'key',
        authDomain: 'domain',
        projectId: 'proj',
        storageBucket: 'bucket',
        messagingSenderId: '123',
        appId: 'id',
      };
      const errors = validateFirebaseConfigFields(config);
      expect(Object.keys(errors)).toHaveLength(0);
    });

    it('returns errors for all empty fields', () => {
      const errors = validateFirebaseConfigFields({} as any);
      expect(errors.apiKey).toBe('apiKey is required');
      expect(errors.authDomain).toBe('authDomain is required');
      expect(errors.projectId).toBe('projectId is required');
      expect(errors.storageBucket).toBe('storageBucket is required');
      expect(errors.messagingSenderId).toBe('messagingSenderId is required');
      expect(errors.appId).toBe('appId is required');
    });

    it('returns errors for whitespace-only fields', () => {
      const config: any = {
        apiKey: '  ',
        authDomain: 'x',
        projectId: 'x',
        storageBucket: 'x',
        messagingSenderId: 'x',
        appId: 'x',
      };
      const errors = validateFirebaseConfigFields(config);
      expect(errors.apiKey).toBe('apiKey is required');
    });

    it('returns only errors for empty fields', () => {
      const config: any = {
        apiKey: 'key',
        authDomain: '',
        projectId: 'proj',
        storageBucket: 'bucket',
        messagingSenderId: '123',
        appId: 'id',
      };
      const errors = validateFirebaseConfigFields(config);
      expect(Object.keys(errors)).toHaveLength(1);
      expect(errors.authDomain).toBe('authDomain is required');
    });
  });
});
