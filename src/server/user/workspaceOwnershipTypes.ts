import type { FirebaseClientConfig, WorkspaceMode } from '../../store/workspaceOwnership.js';

export const WORKSPACE_OWNERSHIP_COLLECTION = 'user_workspace_ownership';

export interface WorkspaceOwnershipDocument {
  uid: string;
  email?: string;
  mode: WorkspaceMode;
  firebaseConfig?: FirebaseClientConfig;
  createdAt: number;
  updatedAt: number;
}

export interface WorkspaceOwnershipResponse {
  ownership: {
    mode: WorkspaceMode;
    firebaseConfig?: FirebaseClientConfig;
    savedAt: number;
  } | null;
}

export interface WorkspaceOwnershipPutRequest {
  mode?: WorkspaceMode;
  firebaseConfig?: FirebaseClientConfig;
}

const REQUIRED_FIREBASE_FIELDS: (keyof FirebaseClientConfig)[] = [
  'apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId',
];

export function validateWorkspaceOwnershipInput(input: WorkspaceOwnershipPutRequest): string | null {
  if (input.mode !== 'hosted' && input.mode !== 'selfOwned') {
    return 'Invalid workspace mode.';
  }

  if (input.mode === 'selfOwned') {
    if (!input.firebaseConfig) return 'Firebase config is required for self-owned mode.';
    const missing = REQUIRED_FIREBASE_FIELDS.find((field) => {
      const value = input.firebaseConfig?.[field];
      return typeof value !== 'string' || value.trim().length === 0;
    });
    if (missing) return `${missing} is required.`;
  }

  return null;
}
