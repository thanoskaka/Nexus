import { getStorageAdapter } from '../storage/index.js';
import {
  WORKSPACE_OWNERSHIP_COLLECTION,
  type WorkspaceOwnershipDocument,
  type WorkspaceOwnershipResponse,
} from './workspaceOwnershipTypes.js';
import type { FirebaseClientConfig, WorkspaceMode } from '../../store/workspaceOwnership.js';

function now() {
  return Date.now();
}

function toResponse(doc: WorkspaceOwnershipDocument): WorkspaceOwnershipResponse {
  return {
    ownership: {
      mode: doc.mode,
      firebaseConfig: doc.firebaseConfig,
      savedAt: doc.updatedAt || doc.createdAt,
    },
  };
}

export async function getServerWorkspaceOwnership(uid: string): Promise<WorkspaceOwnershipResponse> {
  const doc = await getStorageAdapter().getDoc<WorkspaceOwnershipDocument>(WORKSPACE_OWNERSHIP_COLLECTION, uid);
  if (!doc) return { ownership: null };
  return toResponse(doc);
}

export async function saveServerWorkspaceOwnership(input: {
  uid: string;
  email?: string;
  mode: WorkspaceMode;
  firebaseConfig?: FirebaseClientConfig;
}): Promise<WorkspaceOwnershipResponse> {
  const existing = await getStorageAdapter().getDoc<WorkspaceOwnershipDocument>(WORKSPACE_OWNERSHIP_COLLECTION, input.uid);
  const timestamp = now();
  const payload: WorkspaceOwnershipDocument = {
    uid: input.uid,
    email: input.email,
    mode: input.mode,
    firebaseConfig: input.mode === 'selfOwned' ? input.firebaseConfig : undefined,
    createdAt: existing?.createdAt || timestamp,
    updatedAt: timestamp,
  };

  await getStorageAdapter().setDoc(WORKSPACE_OWNERSHIP_COLLECTION, input.uid, payload as unknown as Record<string, unknown>, true);
  return toResponse(payload);
}

export async function deleteServerWorkspaceOwnership(uid: string): Promise<void> {
  await getStorageAdapter().deleteDoc(WORKSPACE_OWNERSHIP_COLLECTION, uid);
}
