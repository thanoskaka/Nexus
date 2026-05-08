import crypto from 'crypto';
import { getStorageAdapter } from '../storage/index.js';
import type { ExternalProvider, ExternalSyncRun } from '../providers/types.js';

const COLLECTION = 'external_sync_runs';

function now() {
  return Date.now();
}

function omitUndefined<T extends Record<string, unknown>>(input: T) {
  const entries = Object.entries(input).filter(([, value]) => value !== undefined);
  return Object.fromEntries(entries) as T;
}

export async function startExternalSyncRun(input: {
  uid: string;
  provider: ExternalProvider;
  connectionId: string;
}) {
  const id = crypto.randomUUID();
  const run: ExternalSyncRun = {
    id,
    uid: input.uid,
    provider: input.provider,
    connectionId: input.connectionId,
    startedAt: now(),
    status: 'failed',
    metrics: {
      accountsUpserted: 0,
      holdingsUpserted: 0,
      holdingsDeactivated: 0,
    },
  };

  await getStorageAdapter().setDoc(COLLECTION, id, run as unknown as Record<string, unknown>);
  return run;
}

export async function finishExternalSyncRun(
  id: string,
  patch: Pick<ExternalSyncRun, 'status' | 'metrics'> & Partial<Pick<ExternalSyncRun, 'errorSummary'>>,
) {
  const payload = omitUndefined({
    status: patch.status,
    metrics: patch.metrics,
    errorSummary: patch.errorSummary,
    finishedAt: now(),
  });

  await getStorageAdapter().setDoc(COLLECTION, id, payload as unknown as Record<string, unknown>, true);
}

export async function listLatestSyncRuns(uid: string, provider: ExternalProvider, limit = 5) {
  const docs = await getStorageAdapter().queryWhere<ExternalSyncRun>(COLLECTION, 'uid', '==', uid);
  return docs
    .filter((run) => run.provider === provider)
    .sort((left, right) => (right.startedAt || 0) - (left.startedAt || 0))
    .slice(0, limit);
}
