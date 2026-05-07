// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { deleteAccount, DeleteAccountError } from './accountApi';

vi.mock('./firebase', () => ({
  auth: {
    currentUser: {
      getIdToken: vi.fn().mockResolvedValue('mock-token'),
    },
  },
}));

vi.mock('./workspaceGuard', () => ({
  assertHostedMode: vi.fn(),
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('deleteAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends DELETE request with auth header', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, authDeleted: true }),
    });

    const result = await deleteAccount();
    expect(result.authDeleted).toBe(true);

    const fetchCall = mockFetch.mock.calls[0];
    expect(fetchCall[0]).toBe('/api/user/account');
    expect(fetchCall[1].method).toBe('DELETE');
    expect(fetchCall[1].headers.Authorization).toBe('Bearer mock-token');
  });

  it('throws DeleteAccountError on server error', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ ok: false, error: 'deletion_failed', message: 'Something went wrong' }),
    });

    await expect(deleteAccount()).rejects.toThrow(DeleteAccountError);
    await expect(deleteAccount()).rejects.toMatchObject({ code: 'deletion_failed' });
  });
});
