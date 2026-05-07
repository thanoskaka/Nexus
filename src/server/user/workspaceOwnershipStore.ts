import { getFirebaseAdminFirestore } from '../firebaseAdmin.js';
import {
  WORKSPACE_OWNERSHIP_COLLECTION,
  type WorkspaceOwnershipDocument,
  type WorkspaceOwnershipResponse,
} from './workspaceOwnershipTypes.js';
import type { FirebaseClientConfig, WorkspaceMode } from '../../store/workspaceOwnership.js';

function now() {
  return Date.now();
}

function getDocRef(uid: string) {
  return getFirebaseAdminFirestore().collection(WORKSPACE_OWNERSHIP_COLLECTION).doc(uid);
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
  const snapshot = await getDocRef(uid).get();
  if (!snapshot.exists) return { ownership: null };
  return toResponse(snapshot.data() as WorkspaceOwnershipDocument);
}

export async function saveServerWorkspaceOwnership(input: {
  uid: string;
  email?: string;
  mode: WorkspaceMode;
  firebaseConfig?: FirebaseClientConfig;
}): Promise<WorkspaceOwnershipResponse> {
  const existing = await getDocRef(input.uid).get();
  const timestamp = now();
  const payload: WorkspaceOwnershipDocument = {
    uid: input.uid,
    email: input.email,
    mode: input.mode,
    firebaseConfig: input.mode === 'selfOwned' ? input.firebaseConfig : undefined,
    createdAt: existing.exists
      ? ((existing.data() as Partial<WorkspaceOwnershipDocument>)?.createdAt || timestamp)
      : timestamp,
    updatedAt: timestamp,
  };

  await getDocRef(input.uid).set(payload, { merge: true });
  return toResponse(payload);
}

export async function deleteServerWorkspaceOwnership(uid: string): Promise<void> {
  await getDocRef(uid).delete();
}
