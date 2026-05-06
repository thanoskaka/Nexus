// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { FirebaseClientConfig } from '../store/workspaceOwnership';

let mockSetCustomParams: ReturnType<typeof vi.fn>;
let mockApp: { name: string };
let mockSignOut: ReturnType<typeof vi.fn>;

const mockInitializeApp = vi.fn();
const mockGetApp = vi.fn();
const mockGetAuth = vi.fn();
const mockGetFirestore = vi.fn();

vi.mock('firebase/app', () => ({
  initializeApp: mockInitializeApp,
  getApp: mockGetApp,
}));

vi.mock('firebase/auth', () => ({
  getAuth: mockGetAuth,
  GoogleAuthProvider: vi.fn().mockImplementation(function MockProvider() {
    this.setCustomParameters = mockSetCustomParams;
    this.providerId = 'google.com';
  }),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: mockGetFirestore,
  enableIndexedDbPersistence: vi.fn(() => Promise.resolve()),
}));

vi.mock('./firebase', () => ({
  auth: { app: { name: 'hosted' }, currentUser: null },
  db: { type: 'firestore' },
  googleProvider: { providerId: 'google.com' },
}));

const SELF_OWNED_CONFIG: FirebaseClientConfig = {
  apiKey: 'self-owned-api-key',
  authDomain: 'self-owned.firebaseapp.com',
  projectId: 'self-owned-project',
  storageBucket: 'self-owned.appspot.com',
  messagingSenderId: '789',
  appId: '1:789:web:xyz',
};

describe('firebaseRuntime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetCustomParams = vi.fn();
    mockSignOut = vi.fn().mockResolvedValue(undefined);
    mockApp = { name: 'nexus-self-owned' };
    mockGetApp.mockImplementation(() => { throw new Error('App not found'); });
    mockInitializeApp.mockReturnValue(mockApp);
    mockGetAuth.mockReturnValue({ currentUser: null, signOut: mockSignOut });
    mockGetFirestore.mockReturnValue({ type: 'firestore' });
  });

  describe('getHostedRuntime', () => {
    it('returns hosted auth, db, and googleProvider', async () => {
      const { getHostedRuntime } = await import('./firebaseRuntime');
      const runtime = getHostedRuntime();
      expect(runtime.auth).toBeDefined();
      expect(runtime.db).toBeDefined();
      expect(runtime.googleProvider).toBeDefined();
    });
  });

  describe('createSelfOwnedRuntime', () => {
    it('initializes a named Firebase app from config', async () => {
      const { createSelfOwnedRuntime } = await import('./firebaseRuntime');
      const runtime = createSelfOwnedRuntime(SELF_OWNED_CONFIG);

      expect(mockInitializeApp).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: 'self-owned-api-key',
          authDomain: 'self-owned.firebaseapp.com',
          projectId: 'self-owned-project',
          storageBucket: 'self-owned.appspot.com',
          messagingSenderId: '789',
          appId: '1:789:web:xyz',
        }),
        'nexus-self-owned',
      );
      expect(runtime.auth).toBeDefined();
      expect(runtime.db).toBeDefined();
      expect(runtime.googleProvider).toBeDefined();
    });

    it('reuses existing named app instead of duplicate initializeApp', async () => {
      mockGetApp.mockReturnValue(mockApp);
      const { createSelfOwnedRuntime } = await import('./firebaseRuntime');
      const runtime = createSelfOwnedRuntime(SELF_OWNED_CONFIG);

      expect(mockInitializeApp).not.toHaveBeenCalled();
      expect(mockGetApp).toHaveBeenCalledWith('nexus-self-owned');
      expect(runtime.auth).toBeDefined();
      expect(runtime.db).toBeDefined();
    });

    it('sets prompt=select_account on Google provider', async () => {
      const { createSelfOwnedRuntime } = await import('./firebaseRuntime');
      createSelfOwnedRuntime(SELF_OWNED_CONFIG);

      expect(mockSetCustomParams).toHaveBeenCalledWith({ prompt: 'select_account' });
    });
  });

  describe('destroySelfOwnedRuntime', () => {
    it('signs out from self-owned app if it exists', async () => {
      mockGetApp.mockReturnValue(mockApp);
      const { destroySelfOwnedRuntime } = await import('./firebaseRuntime');
      destroySelfOwnedRuntime();

      expect(mockSignOut).toHaveBeenCalled();
    });

    it('does not throw if self-owned app does not exist', async () => {
      const { destroySelfOwnedRuntime } = await import('./firebaseRuntime');
      expect(() => destroySelfOwnedRuntime()).not.toThrow();
    });
  });
});
