import { getStorageAdapter } from '../storage/index.js';
import type { ExternalConnection, ExternalConnectionStatus, ExternalProvider } from '../providers/types.js';

const COLLECTION = 'external_connections';

function now() {
  return Date.now();
}

function omitUndefined<T extends Record<string, unknown>>(input: T) {
  const entries = Object.entries(input).filter(([, value]) => value !== undefined);
  return Object.fromEntries(entries) as T;
}

function toConnectionId(uid: string, provider: ExternalProvider) {
  return `${uid}:${provider}`;
}

export async function getExternalConnection(uid: string, provider: ExternalProvider) {
  const id = toConnectionId(uid, provider);
  const doc = await getStorageAdapter().getDoc<ExternalConnection>(COLLECTION, id);
  return doc || null;
}

export async function upsertExternalConnection(
  input: Omit<ExternalConnection, 'id' | 'updatedAt'> & { id?: string },
) {
  const id = input.id || toConnectionId(input.uid, input.provider);
  const payload = omitUndefined({
    ...input,
    id,
    updatedAt: now(),
  }) as ExternalConnection;

  await getStorageAdapter().setDoc(COLLECTION, id, payload as unknown as Record<string, unknown>, true);
  return payload;
}

export async function updateExternalConnectionStatus(
  uid: string,
  provider: ExternalProvider,
  status: ExternalConnectionStatus,
  patch?: Partial<ExternalConnection>,
) {
  const id = toConnectionId(uid, provider);
  const payload = omitUndefined({
    uid,
    provider,
    id,
    status,
    updatedAt: now(),
    ...(patch || {}),
  });

  await getStorageAdapter().setDoc(COLLECTION, id, payload as unknown as Record<string, unknown>, true);
}

export async function clearExternalConnectionToken(uid: string, provider: ExternalProvider) {
  const id = toConnectionId(uid, provider);
  await getStorageAdapter().setDoc(
    COLLECTION,
    id,
    {
      uid,
      provider,
      id,
      tokenBlob: getStorageAdapter().deleteFieldSentinel(),
      scopes: getStorageAdapter().deleteFieldSentinel(),
      updatedAt: now(),
    } as unknown as Record<string, unknown>,
    true,
  );
}

export function sanitizeExternalConnection(connection: ExternalConnection | null) {
  if (!connection) return null;
  const { tokenBlob, ...safe } = connection;
  return safe;
}
