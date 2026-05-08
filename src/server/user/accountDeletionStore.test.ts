import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { StorageAdapter } from '../storage/adapter.js';

const mockDeleteUser = vi.fn().mockResolvedValue(undefined);

let mockAdapter: StorageAdapter;
let storedDocs: Map<string, Map<string, Record<string, unknown>>>;

function createMockAdapter(): StorageAdapter {
  storedDocs = new Map();

  function getCol(collection: string): Map<string, Record<string, unknown>> {
    if (!storedDocs.has(collection)) {
      storedDocs.set(collection, new Map());
    }
    return storedDocs.get(collection)!;
  }

  return {
    async getDoc(collection: string, docId: string) {
      return (getCol(collection).get(docId) || null) as any;
    },
    async setDoc(collection, docId, data, merge) {
      const col = getCol(collection);
      if (merge && col.has(docId)) {
        const existing = { ...col.get(docId)! };
        for (const [key, value] of Object.entries(data)) {
          if (value !== null && typeof value === 'object' && (value as Record<string, unknown>).__deleteSentinel === true) {
            delete existing[key];
          } else {
            existing[key] = value as Record<string, unknown>;
          }
        }
        col.set(docId, existing);
      } else {
        col.set(docId, { ...data } as Record<string, unknown>);
      }
    },
    async updateDoc(collection, docId, data) {
      const col = getCol(collection);
      const existing = col.get(docId) || {};
      for (const [key, value] of Object.entries(data)) {
        if (value !== null && typeof value === 'object' && (value as Record<string, unknown>).__deleteSentinel === true) {
          delete existing[key];
        } else {
          existing[key] = value as Record<string, unknown>;
        }
      }
      col.set(docId, { ...existing });
    },
    async deleteDoc(collection, docId) {
      getCol(collection).delete(docId);
    },
    async queryWhere(collection, field, op, value) {
      const col = getCol(collection);
      const results: Array<Record<string, unknown> & { id: string }> = [];
      for (const [id, data] of col) {
        if (op === '==') {
          if (field === 'uid' && data.uid === value) {
            results.push({ id, ...data });
          } else if (data[field] === value) {
            results.push({ id, ...data });
          }
        } else if (op === 'array-contains') {
          const arr = data[field];
          if (Array.isArray(arr) && arr.includes(value)) {
            results.push({ id, ...data });
          }
        }
      }
      return results as unknown as Promise<any[]>;
    },
    batch() {
      const ops: Array<{ type: 'set' | 'delete'; collection: string; docId: string; data?: Record<string, unknown> }> = [];
      return {
        set(collection, docId, data) {
          ops.push({ type: 'set', collection, docId, data });
        },
        delete(collection, docId) {
          ops.push({ type: 'delete', collection, docId });
        },
        async commit() {
          for (const op of ops) {
            if (op.type === 'set') {
              getCol(op.collection).set(op.docId, { ...op.data! } as Record<string, unknown>);
            } else {
              getCol(op.collection).delete(op.docId);
            }
          }
        },
      };
    },
    deleteFieldSentinel() {
      return { __deleteSentinel: true };
    },
    async ping() { return true; },
    async close() {},
  };
}

vi.mock('../firebaseAdmin.js', () => ({
  getFirebaseAdminFirestore: vi.fn(),
  getFirebaseAdminAuth: vi.fn(() => ({
    deleteUser: mockDeleteUser,
  })),
}));

vi.mock('../storage/index.js', () => ({
  getStorageAdapter: vi.fn(() => {
    if (!mockAdapter) {
      mockAdapter = createMockAdapter();
    }
    return mockAdapter;
  }),
}));

import { getFirebaseAdminFirestore } from '../firebaseAdmin.js';

describe('deleteUserData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdapter = createMockAdapter();
  });

  async function seedDocument(collection: string, docId: string, data: Record<string, unknown>) {
    await mockAdapter.setDoc(collection, docId, data);
  }

  it('deletes user-scoped documents across all collections', async () => {
    const uid = 'test-uid';
    await seedDocument('user_ai_credentials', uid, { uid, provider: 'gemini' });
    await seedDocument('splitwise_connections', uid, { uid });
    await seedDocument('splitwise_oauth_states', uid, { uid });
    await seedDocument('user_workspace_ownership', uid, { uid, mode: 'hosted' });
    await seedDocument('user_onboarding', uid, { uid, status: 'completed' });
    await seedDocument('portfolios', `user-${uid}`, { uid, isPersonal: true });

    const { deleteUserData } = await import('./accountDeletionStore.js');
    const result = await deleteUserData(uid, 'test@example.com');

    expect(result.deleted.personalPortfolio).toBe(1);
    expect(result.deleted.aiCredentials).toBe(1);
    expect(result.deleted.splitwiseConnections).toBe(1);
    expect(result.deleted.splitwiseOAuthStates).toBe(1);
    expect(result.deleted.workspaceOwnership).toBe(1);
    expect(result.deleted.onboarding).toBe(1);
    expect(result.deleted.externalConnections).toBe(0);
    expect(result.deleted.externalAccounts).toBe(0);
    expect(result.deleted.externalHoldings).toBe(0);
    expect(result.deleted.externalOverrides).toBe(0);
    expect(result.deleted.externalSyncRuns).toBe(0);
    expect(result.deleted.sharedPortfolios).toBe(0);
  });

  it('handles missing documents gracefully (idempotent)', async () => {
    const { deleteUserData } = await import('./accountDeletionStore.js');
    const result = await deleteUserData('test-uid', 'test@example.com');

    expect(result.deleted.personalPortfolio).toBe(0);
    expect(result.deleted.aiCredentials).toBe(0);
    expect(result.deleted.onboarding).toBe(0);

    const result2 = await deleteUserData('test-uid', 'test@example.com');
    expect(result2.deleted.personalPortfolio).toBe(0);
  });

  it('does not delete other users data', async () => {
    const uid = 'test-uid';
    await seedDocument('user_ai_credentials', uid, { uid, provider: 'gemini' });
    await seedDocument('user_ai_credentials', 'other-uid', { uid: 'other-uid', provider: 'deepseek' });
    await seedDocument('portfolios', `user-${uid}`, { uid, isPersonal: true });
    await seedDocument('portfolios', 'user-other-uid', { uid: 'other-uid', isPersonal: true });

    const { deleteUserData } = await import('./accountDeletionStore.js');
    const result = await deleteUserData(uid, 'test@example.com');

    expect(result.deleted.personalPortfolio).toBe(1);
    expect(result.deleted.aiCredentials).toBe(1);

    const otherCreds = await mockAdapter.getDoc('user_ai_credentials', 'other-uid');
    expect(otherCreds).not.toBeNull();
  });

  it('handles shared portfolio membership removal', async () => {
    const uid = 'test-uid';
    await seedDocument('portfolios', 'shared-portfolio-1', {
      members: [
        { email: 'owner@example.com', role: 'owner', uid: 'owner-uid' },
        { email: 'test@example.com', role: 'partner', uid },
      ],
      memberEmails: ['owner@example.com', 'test@example.com'],
      ownerUid: 'owner-uid',
      ownerEmail: 'owner@example.com',
    });

    const { deleteUserData } = await import('./accountDeletionStore.js');
    const result = await deleteUserData(uid, 'test@example.com');

    expect(result.deleted.sharedPortfolios).toBe(1);

    const sharedDoc = await mockAdapter.getDoc<Record<string, unknown>>('portfolios', 'shared-portfolio-1');
    expect(sharedDoc).not.toBeNull();
    const members = sharedDoc!.members as Array<Record<string, unknown>>;
    expect(members).toHaveLength(1);
    expect(members[0].email).toBe('owner@example.com');
  });
});

describe('deleteFirebaseAuthUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes Firebase Auth user', async () => {
    const { deleteFirebaseAuthUser } = await import('./accountDeletionStore.js');
    await deleteFirebaseAuthUser('test-uid');
    expect(mockDeleteUser).toHaveBeenCalledWith('test-uid');
  });
});
