import { auth } from './firebase';
import type { FirebaseClientConfig, WorkspaceMode, WorkspaceOwnership } from '../store/workspaceOwnership';

export interface WorkspaceOwnershipResponse {
  ownership: WorkspaceOwnership | null;
}

async function requireAuthHeaders() {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('You must be signed in.');
  const token = await currentUser.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload && typeof payload === 'object' && 'error' in payload
      ? String((payload as { error?: string }).error || 'Request failed')
      : 'Request failed';
    throw new Error(message);
  }
  if (!payload) throw new Error('Server returned an empty response.');
  return payload as T;
}

export async function getServerWorkspaceOwnership(): Promise<WorkspaceOwnership | null> {
  const headers = await requireAuthHeaders();
  const response = await fetch('/api/user/workspace-ownership', { headers });
  const result = await parseJsonResponse<WorkspaceOwnershipResponse>(response);
  return result.ownership;
}

export async function saveServerWorkspaceOwnership(
  mode: WorkspaceMode,
  firebaseConfig?: FirebaseClientConfig,
): Promise<WorkspaceOwnership> {
  const headers = await requireAuthHeaders();
  const response = await fetch('/api/user/workspace-ownership', {
    method: 'PUT',
    headers,
    body: JSON.stringify({ mode, firebaseConfig }),
  });
  const result = await parseJsonResponse<WorkspaceOwnershipResponse>(response);
  if (!result.ownership) throw new Error('Server did not save workspace ownership.');
  return result.ownership;
}
