import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockDeleteUser = vi.fn().mockResolvedValue(undefined);

vi.mock('../firebaseAdmin.js', () => ({
  getFirebaseAdminFirestore: vi.fn(),
  getFirebaseAdminAuth: vi.fn(() => ({
    deleteUser: mockDeleteUser,
  })),
}));

import { getFirebaseAdminFirestore } from '../firebaseAdmin.js';

function makeMockDoc(exists: boolean) {
  return {
    get: vi.fn().mockResolvedValue({ exists }),
    delete: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    set: vi.fn().mockResolvedValue(undefined),
  };
}

function makeEmptyWhere() {
  return {
    limit: vi.fn(() => ({
      get: vi.fn().mockResolvedValue({ empty: true, docs: [], size: 0 }),
    })),
    get: vi.fn().mockResolvedValue({ empty: true, docs: [], size: 0 }),
  };
}

function makeWhereWithDocs(docs: Array<{ id: string; data: () => Record<string, unknown>; ref?: { delete: () => void; update: () => void } }>) {
  return {
    get: vi.fn().mockResolvedValue({ empty: docs.length === 0, docs, size: docs.length }),
  };
}

describe('deleteUserData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes user-scoped documents across all collections', async () => {
    const mockDb = {
      collection: vi.fn((name: string) => {
        if (name === 'user_ai_credentials' || name === 'splitwise_connections' || name === 'splitwise_oauth_states' || name === 'user_workspace_ownership' || name === 'user_onboarding') {
          return { doc: vi.fn(() => makeMockDoc(true)) };
        }
        if (name === 'portfolios') {
          return {
            doc: vi.fn(() => makeMockDoc(true)),
            where: vi.fn(() => makeEmptyWhere()),
          };
        }
        return {
          doc: vi.fn(() => makeMockDoc(false)),
          where: vi.fn(() => ({
            limit: vi.fn(() => ({
              get: vi.fn().mockResolvedValue({ empty: true, docs: [], size: 0 }),
            })),
            get: vi.fn().mockResolvedValue({ empty: true, docs: [], size: 0 }),
          })),
        };
      }),
      batch: vi.fn(),
    };
    (getFirebaseAdminFirestore as ReturnType<typeof vi.fn>).mockReturnValue(mockDb);

    const { deleteUserData } = await import('./accountDeletionStore.js');
    const result = await deleteUserData('test-uid', 'test@example.com');

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
    const mockDb = {
      collection: vi.fn(() => ({
        doc: vi.fn(() => makeMockDoc(false)),
        where: vi.fn(() => makeEmptyWhere()),
      })),
      batch: vi.fn(),
    };
    (getFirebaseAdminFirestore as ReturnType<typeof vi.fn>).mockReturnValue(mockDb);

    const { deleteUserData } = await import('./accountDeletionStore.js');
    const result = await deleteUserData('test-uid', 'test@example.com');

    expect(result.deleted.personalPortfolio).toBe(0);
    expect(result.deleted.aiCredentials).toBe(0);
    expect(result.deleted.splitwiseConnections).toBe(0);

    const result2 = await deleteUserData('test-uid', 'test@example.com');
    expect(result2.deleted.personalPortfolio).toBe(0);
  });

  it('does not delete other users data', async () => {
    const mockDb = {
      collection: vi.fn((name: string) => {
        if (name === 'user_ai_credentials') {
          return {
            doc: vi.fn((id: string) => makeMockDoc(id === 'test-uid')),
          };
        }
        if (name === 'splitwise_connections' || name === 'splitwise_oauth_states') {
          return { doc: vi.fn(() => makeMockDoc(false)) };
        }
        if (name === 'portfolios') {
          return {
            doc: vi.fn((id: string) => makeMockDoc(id === 'user-test-uid')),
            where: vi.fn(() => makeEmptyWhere()),
          };
        }
        return {
          doc: vi.fn(() => makeMockDoc(false)),
          where: vi.fn(() => ({
            limit: vi.fn(() => ({
              get: vi.fn().mockResolvedValue({ empty: true, docs: [], size: 0 }),
            })),
            get: vi.fn().mockResolvedValue({ empty: true, docs: [], size: 0 }),
          })),
        };
      }),
      batch: vi.fn(),
    };
    (getFirebaseAdminFirestore as ReturnType<typeof vi.fn>).mockReturnValue(mockDb);

    const { deleteUserData } = await import('./accountDeletionStore.js');
    const result = await deleteUserData('test-uid', 'test@example.com');

    expect(result.deleted.personalPortfolio).toBe(1);
    expect(result.deleted.aiCredentials).toBe(1);
    expect(result.deleted.splitwiseConnections).toBe(0);
    expect(result.deleted.externalConnections).toBe(0);
  });

  it('handles shared portfolio membership removal', async () => {
    const sharedPortfolioDoc = {
      id: 'shared-portfolio-1',
      data: vi.fn(() => ({
        members: [
          { email: 'owner@example.com', role: 'owner', uid: 'owner-uid' },
          { email: 'test@example.com', role: 'partner', uid: 'test-uid' },
        ],
        memberEmails: ['owner@example.com', 'test@example.com'],
        ownerUid: 'owner-uid',
        ownerEmail: 'owner@example.com',
      })),
      ref: { delete: vi.fn(), update: vi.fn() },
    };

    const mockDb = {
      collection: vi.fn((name: string) => {
        if (name === 'portfolios') {
          return {
            doc: vi.fn((id: string) => makeMockDoc(id === 'user-test-uid')),
            where: vi.fn(() => makeWhereWithDocs([sharedPortfolioDoc as any])),
          };
        }
        if (name === 'user_ai_credentials' || name === 'splitwise_connections' || name === 'splitwise_oauth_states') {
          return { doc: vi.fn(() => makeMockDoc(false)) };
        }
        return {
          doc: vi.fn(() => makeMockDoc(false)),
          where: vi.fn(() => ({
            limit: vi.fn(() => ({
              get: vi.fn().mockResolvedValue({ empty: true, docs: [], size: 0 }),
            })),
            get: vi.fn().mockResolvedValue({ empty: true, docs: [], size: 0 }),
          })),
        };
      }),
      batch: vi.fn(),
    };
    (getFirebaseAdminFirestore as ReturnType<typeof vi.fn>).mockReturnValue(mockDb);

    const { deleteUserData } = await import('./accountDeletionStore.js');
    const result = await deleteUserData('test-uid', 'test@example.com');

    expect(result.deleted.sharedPortfolios).toBe(1);
    expect(result.deleted.personalPortfolio).toBe(1);
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
