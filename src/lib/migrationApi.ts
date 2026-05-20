import { auth } from './firebase';

export interface MigrationState {
  uid: string;
  sourceInstance: 'hosted';
  targetInstance: 'self_hosted';
  phase: 'pending' | 'export_started' | 'export_complete' | 'import_started' | 'import_complete' | 'verified' | 'data_deleted';
  status: 'not_started' | 'in_progress' | 'completed' | 'failed';
  exportSnapshot?: {
    assetCount: number;
    assetClassCount: number;
    connectedAccountCount: number;
    exportedAt: number;
    exportVersion: number;
    checksum: string;
  };
  importSnapshot?: {
    assetCount: number;
    assetClassCount: number;
    importedAt: number;
    warnings: string[];
  };
  error?: string;
  createdAt: number;
  updatedAt: number;
}

interface MigrationResponse {
  migration: MigrationState | null;
}

interface PhaseResponse {
  ok: boolean;
  phase?: string;
  error?: string;
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

export async function getMigrationState(): Promise<MigrationState | null> {
  const headers = await requireAuthHeaders();
  const response = await fetch('/api/user/migration', { headers });
  const result = await parseJsonResponse<MigrationResponse>(response);
  return result.migration;
}

export async function startExport(params: {
  assetCount: number;
  assetClassCount: number;
  connectedAccountCount: number;
  checksum: string;
}): Promise<PhaseResponse> {
  const headers = await requireAuthHeaders();
  const response = await fetch('/api/user/migration/export/start', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
  return parseJsonResponse<PhaseResponse>(response);
}

export async function completeExport(): Promise<PhaseResponse> {
  const headers = await requireAuthHeaders();
  const response = await fetch('/api/user/migration/export/complete', {
    method: 'POST',
    headers,
  });
  return parseJsonResponse<PhaseResponse>(response);
}

export async function confirmImport(params: {
  assetCount: number;
  assetClassCount: number;
  warnings?: string[];
}): Promise<PhaseResponse> {
  const headers = await requireAuthHeaders();
  const response = await fetch('/api/user/migration/import/confirm', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
  return parseJsonResponse<PhaseResponse>(response);
}

export async function verifyMigration(shasum: string): Promise<{ ok: boolean; match: boolean; summary: { hostedAssets: number; selfHostedAssets: number } }> {
  const headers = await requireAuthHeaders();
  const response = await fetch('/api/user/migration/verify', {
    method: 'POST',
    headers,
    body: JSON.stringify({ shasum }),
  });
  return parseJsonResponse(response);
}

export async function markDataDeleted(): Promise<PhaseResponse> {
  const headers = await requireAuthHeaders();
  const response = await fetch('/api/user/migration/data-deleted', {
    method: 'POST',
    headers,
  });
  return parseJsonResponse<PhaseResponse>(response);
}

export async function resetMigration(): Promise<PhaseResponse> {
  const headers = await requireAuthHeaders();
  const response = await fetch('/api/user/migration/reset', {
    method: 'POST',
    headers,
  });
  return parseJsonResponse<PhaseResponse>(response);
}
