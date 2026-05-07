export type WorkspaceMode = 'hosted' | 'selfOwned';

export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export interface WorkspaceOwnership {
  mode: WorkspaceMode;
  firebaseConfig?: FirebaseClientConfig;
  savedAt: number;
}

const STORAGE_KEY_PREFIX = 'nexus.workspaceOwnership.v1';
const REQUIRED_FIREBASE_FIELDS: (keyof FirebaseClientConfig)[] = [
  'apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId',
];

function buildKey(uid?: string): string {
  return uid ? `${STORAGE_KEY_PREFIX}:${uid}` : STORAGE_KEY_PREFIX;
}

function parseAndValidateOwnership(raw: string): WorkspaceOwnership | null {
  try {
    const parsed = JSON.parse(raw) as WorkspaceOwnership;
    if (parsed.mode !== 'hosted' && parsed.mode !== 'selfOwned') return null;
    if (parsed.mode === 'selfOwned') {
      if (!parsed.firebaseConfig) return null;
      const missing = REQUIRED_FIREBASE_FIELDS.some(
        (f) => !parsed.firebaseConfig![f] || parsed.firebaseConfig![f].trim().length === 0,
      );
      if (missing) return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function getWorkspaceOwnership(uid?: string): WorkspaceOwnership | null {
  try {
    if (uid) {
      const raw = window.localStorage.getItem(buildKey(uid));
      if (raw) {
        const result = parseAndValidateOwnership(raw);
        if (result) return result;
      }
      const globalRaw = window.localStorage.getItem(buildKey());
      if (globalRaw) {
        const result = parseAndValidateOwnership(globalRaw);
        if (result) {
          window.localStorage.setItem(buildKey(uid), globalRaw);
          window.localStorage.removeItem(buildKey());
          return result;
        }
      }
      return null;
    }
    const raw = window.localStorage.getItem(buildKey());
    if (!raw) return null;
    return parseAndValidateOwnership(raw);
  } catch {
    return null;
  }
}

export function saveWorkspaceOwnership(
  mode: WorkspaceMode,
  firebaseConfig?: FirebaseClientConfig,
  uid?: string,
): void {
  const ownership: WorkspaceOwnership = {
    mode,
    firebaseConfig,
    savedAt: Date.now(),
  };
  window.localStorage.setItem(buildKey(uid), JSON.stringify(ownership));
}

export function resetWorkspaceOwnership(uid?: string): void {
  window.localStorage.removeItem(buildKey(uid));
}

export function validateFirebaseConfigFields(config: Partial<FirebaseClientConfig>): Record<string, string> {
  const errors: Record<string, string> = {};
  const required: (keyof FirebaseClientConfig)[] = [
    'apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId',
  ];
  for (const field of required) {
    if (!config[field] || config[field].trim().length === 0) {
      errors[field] = `${field} is required`;
    }
  }
  return errors;
}
