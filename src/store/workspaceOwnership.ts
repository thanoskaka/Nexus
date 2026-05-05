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

function buildKey(uid?: string): string {
  return uid ? `${STORAGE_KEY_PREFIX}:${uid}` : STORAGE_KEY_PREFIX;
}

export function getWorkspaceOwnership(uid?: string): WorkspaceOwnership | null {
  try {
    const raw = window.localStorage.getItem(buildKey(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WorkspaceOwnership;
    if (parsed.mode !== 'hosted' && parsed.mode !== 'selfOwned') return null;
    return parsed;
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
