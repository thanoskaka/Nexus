import { getStorageAdapter } from '../storage/index.js';
import { MIGRATION_COLLECTION, type MigrationDocument } from './migrationTypes.js';

function getMigrationDocId(uid: string): string {
  return `migration-${uid}`;
}

export async function getMigrationState(uid: string): Promise<MigrationDocument | null> {
  const doc = await getStorageAdapter().getDoc<MigrationDocument>(
    MIGRATION_COLLECTION,
    getMigrationDocId(uid),
  );
  return doc ?? null;
}

export async function startExport(uid: string, exportDetails: Omit<MigrationDocument['exportSnapshot'], 'exportedAt'>): Promise<MigrationDocument> {
  const now = Date.now();
  const doc: MigrationDocument = {
    uid,
    sourceInstance: 'hosted',
    targetInstance: 'self_hosted',
    phase: 'export_started',
    status: 'in_progress',
    exportSnapshot: {
      ...exportDetails,
      exportedAt: now,
    },
    createdAt: now,
    updatedAt: now,
  };

  await getStorageAdapter().setDoc(MIGRATION_COLLECTION, getMigrationDocId(uid), doc as unknown as Record<string, unknown>);
  return doc;
}

export async function completeExport(uid: string): Promise<MigrationDocument> {
  const docId = getMigrationDocId(uid);
  const existing = await getStorageAdapter().getDoc<MigrationDocument>(MIGRATION_COLLECTION, docId);
  if (!existing) throw new Error('No migration in progress');

  const updated: Partial<MigrationDocument> = {
    phase: 'export_complete',
    status: 'in_progress',
    updatedAt: Date.now(),
  };

  await getStorageAdapter().updateDoc(MIGRATION_COLLECTION, docId, updated as unknown as Record<string, unknown>);
  return { ...existing, ...updated } as MigrationDocument;
}

export async function recordImport(
  uid: string,
  importDetails: Omit<MigrationDocument['importSnapshot'], 'importedAt'>,
): Promise<MigrationDocument> {
  const docId = getMigrationDocId(uid);
  const existing = await getStorageAdapter().getDoc<MigrationDocument>(MIGRATION_COLLECTION, docId);
  if (!existing) throw new Error('No migration in progress');

  const now = Date.now();
  const updated: Partial<MigrationDocument> = {
    phase: 'import_complete',
    importSnapshot: {
      ...importDetails,
      importedAt: now,
    },
    updatedAt: now,
  };

  await getStorageAdapter().updateDoc(MIGRATION_COLLECTION, docId, updated as unknown as Record<string, unknown>);
  return { ...existing, ...updated } as MigrationDocument;
}

export async function completeVerification(uid: string, shasum: string): Promise<MigrationDocument> {
  const docId = getMigrationDocId(uid);
  const existing = await getStorageAdapter().getDoc<MigrationDocument>(MIGRATION_COLLECTION, docId);
  if (!existing) throw new Error('No migration in progress');

  const updated: Partial<MigrationDocument> = {
    phase: 'verified',
    verificationShasum: shasum,
    updatedAt: Date.now(),
  };

  await getStorageAdapter().updateDoc(MIGRATION_COLLECTION, docId, updated as unknown as Record<string, unknown>);
  return { ...existing, ...updated } as MigrationDocument;
}

export async function markDataDeleted(uid: string): Promise<MigrationDocument> {
  const docId = getMigrationDocId(uid);
  const existing = await getStorageAdapter().getDoc<MigrationDocument>(MIGRATION_COLLECTION, docId);
  if (!existing) throw new Error('No migration in progress');

  const updated: Partial<MigrationDocument> = {
    phase: 'data_deleted',
    status: 'completed',
    updatedAt: Date.now(),
  };

  await getStorageAdapter().updateDoc(MIGRATION_COLLECTION, docId, updated as unknown as Record<string, unknown>);
  return { ...existing, ...updated } as MigrationDocument;
}

export async function resetMigration(uid: string): Promise<void> {
  await getStorageAdapter().deleteDoc(MIGRATION_COLLECTION, getMigrationDocId(uid));
}

export async function recordError(uid: string, error: string): Promise<void> {
  const docId = getMigrationDocId(uid);
  const existing = await getStorageAdapter().getDoc<MigrationDocument>(MIGRATION_COLLECTION, docId);
  const updates: Partial<MigrationDocument> = {
    status: 'failed',
    error: error.slice(0, 500),
    updatedAt: Date.now(),
  };

  if (existing) {
    await getStorageAdapter().updateDoc(MIGRATION_COLLECTION, docId, updates as unknown as Record<string, unknown>);
  } else {
    const now = Date.now();
    const doc: MigrationDocument = {
      uid,
      sourceInstance: 'hosted',
      targetInstance: 'self_hosted',
      phase: 'pending',
      status: 'failed',
      error,
      createdAt: now,
      updatedAt: now,
    };
    await getStorageAdapter().setDoc(MIGRATION_COLLECTION, getMigrationDocId(uid), doc as unknown as Record<string, unknown>);
  }
}
