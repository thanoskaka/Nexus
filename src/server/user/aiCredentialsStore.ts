import { getStorageAdapter } from '../storage/index.js';
import { encryptJson, decryptJson } from '../security/encryption.js';
import {
  type AiCredentials,
  type AiCredentialsResponse,
  type AiProvider,
  AI_CREDENTIALS_COLLECTION,
  getDefaultUsageCap,
  getServerDefaultProvider,
  getServerDefaultModel,
  getServerDefaultApiKey,
} from './aiCredentialsTypes.js';

function now() {
  return Date.now();
}

function toResponse(creds: AiCredentials): AiCredentialsResponse {
  return {
    provider: creds.provider,
    model: creds.model,
    apiKeyLast4: creds.apiKeyLast4,
    source: 'user',
    defaultUsageCap: getDefaultUsageCap(),
  };
}

export async function getAiCredentials(uid: string): Promise<AiCredentialsResponse | null> {
  const doc = await getStorageAdapter().getDoc<AiCredentials>(AI_CREDENTIALS_COLLECTION, uid);
  if (!doc) return null;
  return toResponse(doc);
}

export async function upsertAiCredentials(
  uid: string,
  provider: AiProvider,
  model: string,
  apiKey: string,
): Promise<AiCredentialsResponse> {
  const apiKeyLast4 = apiKey.slice(-4);
  const encrypted = encryptJson({ key: apiKey });
  const payload: AiCredentials = {
    uid,
    provider,
    model,
    apiKeyEncrypted: encrypted,
    apiKeyLast4,
    createdAt: now(),
    updatedAt: now(),
  };

  await getStorageAdapter().setDoc(AI_CREDENTIALS_COLLECTION, uid, payload as unknown as Record<string, unknown>, true);
  return {
    provider,
    model,
    apiKeyLast4,
    source: 'user',
    defaultUsageCap: getDefaultUsageCap(),
  };
}

export async function deleteAiCredentials(uid: string): Promise<void> {
  await getStorageAdapter().deleteDoc(AI_CREDENTIALS_COLLECTION, uid);
}

export async function resolveAiApiKey(uid?: string): Promise<{
  provider: AiProvider;
  model: string;
  apiKey: string;
  source: 'user' | 'server-default';
} | null> {
  if (uid) {
    try {
      const doc = await getStorageAdapter().getDoc<AiCredentials>(AI_CREDENTIALS_COLLECTION, uid);
      if (doc) {
        const decrypted = decryptJson<{ key: string }>(doc.apiKeyEncrypted);
        return {
          provider: doc.provider,
          model: doc.model,
          apiKey: decrypted.key,
          source: 'user',
        };
      }
    } catch {
    }
  }

  const envKey = getServerDefaultApiKey();
  if (envKey) {
    return {
      provider: getServerDefaultProvider(),
      model: getServerDefaultModel(),
      apiKey: envKey,
      source: 'server-default',
    };
  }

  return null;
}

export async function resolveAiCredentialsResponse(uid?: string): Promise<AiCredentialsResponse> {
  const userCreds = uid ? await getAiCredentials(uid) : null;
  if (userCreds) return userCreds;

  const envKey = getServerDefaultApiKey();
  if (envKey) {
    return {
      provider: getServerDefaultProvider(),
      model: getServerDefaultModel(),
      apiKeyLast4: null,
      source: 'server-default',
      defaultUsageCap: getDefaultUsageCap(),
    };
  }

  return {
    provider: null,
    model: null,
    apiKeyLast4: null,
    source: 'none',
    defaultUsageCap: getDefaultUsageCap(),
  };
}
