import crypto from 'crypto';
import { getStorageAdapter } from '../storage/index.js';
import type { ExternalAccount } from '../providers/types.js';

const COLLECTION = 'external_accounts';

function now() {
  return Date.now();
}

function makeId(connectionId: string, remoteAccountId: string) {
  const digest = crypto.createHash('sha1').update(`${connectionId}:${remoteAccountId}`).digest('hex');
  return `acct_${digest}`;
}

export async function listExternalAccounts(uid: string, connectionId: string) {
  const docs = await getStorageAdapter().queryWhere<ExternalAccount>(COLLECTION, 'uid', '==', uid);
  return docs.filter((account) => account.connectionId === connectionId);
}

export async function upsertExternalAccounts(accounts: Array<Omit<ExternalAccount, 'id'>>) {
  if (accounts.length === 0) return 0;

  const batch = getStorageAdapter().batch();

  for (const account of accounts) {
    const id = makeId(account.connectionId, account.remoteAccountId);
    batch.set(COLLECTION, id, { ...account, id, syncedAt: now() } as unknown as Record<string, unknown>);
  }

  await batch.commit();
  return accounts.length;
}

export async function deactivateMissingExternalAccounts(
  uid: string,
  connectionId: string,
  activeRemoteAccountIds: string[],
) {
  const accounts = await listExternalAccounts(uid, connectionId);
  const activeSet = new Set(activeRemoteAccountIds);
  const toDeactivate = accounts.filter((account) => account.isActive && !activeSet.has(account.remoteAccountId));

  if (toDeactivate.length === 0) return 0;

  const batch = getStorageAdapter().batch();
  for (const account of toDeactivate) {
    batch.set(
      COLLECTION,
      account.id,
      { isActive: false, syncedAt: now() } as unknown as Record<string, unknown>,
    );
  }

  await batch.commit();
  return toDeactivate.length;
}
