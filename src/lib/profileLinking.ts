import { auth } from './firebase';

export interface ProfileLinkRequest {
  memberEmail: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface ProfileLinkResponse {
  ok: boolean;
  member?: {
    email: string;
    displayName?: string;
    avatarUrl?: string;
    linkedAt: number;
  };
}

export interface MemberProfile {
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  linkedAt: number | null;
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

export async function linkProfileToMember(
  portfolioId: string,
  params: ProfileLinkRequest,
): Promise<ProfileLinkResponse> {
  const headers = await requireAuthHeaders();
  const response = await fetch(`/api/user/members/${portfolioId}/link`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(params),
  });
  return parseJsonResponse<ProfileLinkResponse>(response);
}

export async function unlinkProfileFromMember(
  portfolioId: string,
  memberEmail: string,
): Promise<{ ok: boolean }> {
  const headers = await requireAuthHeaders();
  const response = await fetch(`/api/user/members/${portfolioId}/link`, {
    method: 'DELETE',
    headers,
    body: JSON.stringify({ memberEmail }),
  });
  return parseJsonResponse<{ ok: boolean }>(response);
}

export async function getMemberProfiles(
  portfolioId: string,
): Promise<{ profiles: MemberProfile[] }> {
  const headers = await requireAuthHeaders();
  const response = await fetch(`/api/user/members/${portfolioId}/profiles`, { headers });
  return parseJsonResponse<{ profiles: MemberProfile[] }>(response);
}
