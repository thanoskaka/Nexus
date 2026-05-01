import { getFirebaseAdminFirestore } from '../firebaseAdmin.js';
import { encryptJson, decryptJson } from '../security/encryption.js';
import {
  type AiCredentials,
  type AiCredentialsResponse,
  type AiProvider,
  AI_CREDENTIALS_COLLECTION,
} from './aiCredentialsTypes.js';

function now() {
  return Date.now();
}

function getDocRef(uid: string) {
  return getFirebaseAdminFirestore().collection(AI_CREDENTIALS_COLLECTION).doc(uid);
}

function toResponse(creds: AiCredentials): AiCredentialsResponse {
  return {
    provider: creds.provider,
    model: creds.model,
    apiKeyLast4: creds.apiKeyLast4,
  };
}

export async function getAiCredentials(uid: string): Promise<AiCredentialsResponse | null> {
  const snapshot = await getDocRef(uid).get();
  if (!snapshot.exists) return null;
  const data = snapshot.data() as AiCredentials;
  return toResponse(data);
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

  await getDocRef(uid).set(payload, { merge: true });
  return { provider, model, apiKeyLast4 };
}

export async function deleteAiCredentials(uid: string): Promise<void> {
  await getDocRef(uid).delete();
}

export async function resolveAiApiKey(uid?: string): Promise<{ provider: AiProvider; model: string; apiKey: string } | null> {
  if (uid) {
    try {
      const snapshot = await getDocRef(uid).get();
      if (snapshot.exists) {
        const data = snapshot.data() as AiCredentials;
        const decrypted = decryptJson<{ key: string }>(data.apiKeyEncrypted);
        return {
          provider: data.provider,
          model: data.model,
          apiKey: decrypted.key,
        };
      }
    } catch {
      // Fall through to env fallback
    }
  }

  const envKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
  if (envKey) {
    return {
      provider: 'gemini',
      model: process.env.NEXUS_AI_MODEL || 'gemini-2.5-flash',
      apiKey: envKey,
    };
  }

  return null;
}
