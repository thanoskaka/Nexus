import { getStorageAdapter } from '../storage/index.js';

export const MEMBER_PROFILES_COLLECTION = 'member_profiles';

export interface MemberProfileRecord {
  id: string;
  portfolioId: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  linkedAt: number;
  linkedByUid: string;
}

export async function getMemberProfiles(
  portfolioId: string,
): Promise<MemberProfileRecord[]> {
  const adapter = getStorageAdapter();
  return adapter.queryWhere<MemberProfileRecord>(
    MEMBER_PROFILES_COLLECTION,
    'portfolioId',
    '==',
    portfolioId,
  );
}

export async function linkProfileToMember(
  portfolioId: string,
  email: string,
  linkedByUid: string,
  displayName?: string,
  avatarUrl?: string,
): Promise<MemberProfileRecord> {
  const adapter = getStorageAdapter();
  const id = `${portfolioId}:${email.toLowerCase()}`;
  const now = Date.now();

  const record: MemberProfileRecord = {
    id,
    portfolioId,
    email: email.toLowerCase(),
    displayName: displayName || null,
    avatarUrl: avatarUrl || null,
    linkedAt: now,
    linkedByUid,
  };

  await adapter.setDoc(MEMBER_PROFILES_COLLECTION, id, record as unknown as Record<string, unknown>);
  return record;
}

export async function unlinkProfileFromMember(
  portfolioId: string,
  email: string,
): Promise<boolean> {
  const adapter = getStorageAdapter();
  const id = `${portfolioId}:${email.toLowerCase()}`;
  const existing = await adapter.getDoc(MEMBER_PROFILES_COLLECTION, id);
  if (!existing) return false;

  await adapter.deleteDoc(MEMBER_PROFILES_COLLECTION, id);
  return true;
}
