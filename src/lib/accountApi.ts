import { auth } from './firebase';
import { assertHostedMode } from './workspaceGuard';

export type DeleteAccountErrorCode =
  | 'not_authenticated'
  | 'firebase_admin_not_configured'
  | 'deletion_failed'
  | 'requires_recent_login';

export class DeleteAccountError extends Error {
  code: DeleteAccountErrorCode;
  dataDeleted: boolean;

  constructor(code: DeleteAccountErrorCode, message: string, dataDeleted = false) {
    super(message);
    this.name = 'DeleteAccountError';
    this.code = code;
    this.dataDeleted = dataDeleted;
  }
}

interface DeleteAccountResponse {
  ok: boolean;
  error?: string;
  message?: string;
  dataDeleted?: boolean;
  authDeleted?: boolean;
}

async function requireAuthHeaders() {
  assertHostedMode('Account Deletion');
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new DeleteAccountError('not_authenticated', 'You must be signed in to delete your account.');
  }
  const token = await currentUser.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  } satisfies Record<string, string>;
}

export async function deleteAccount(): Promise<{ authDeleted: boolean }> {
  const headers = await requireAuthHeaders();
  const response = await fetch('/api/user/account', {
    method: 'DELETE',
    headers,
  });

  const payload: DeleteAccountResponse = await response.json().catch(() => ({ ok: false }));

  if (!response.ok) {
    if (payload.error === 'not_authenticated') {
      throw new DeleteAccountError('not_authenticated', payload.message || 'Not authenticated.', Boolean(payload.dataDeleted));
    }
    if (payload.error === 'deletion_failed') {
      throw new DeleteAccountError('deletion_failed', payload.message || 'Account deletion failed. Please try again.', Boolean(payload.dataDeleted));
    }
    throw new DeleteAccountError('deletion_failed', payload.message || `Server error (${response.status})`, Boolean(payload.dataDeleted));
  }

  return { authDeleted: Boolean(payload.authDeleted) };
}
