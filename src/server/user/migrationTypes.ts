export const MIGRATION_COLLECTION = 'user_migrations';

export type MigrationPhase = 'pending' | 'export_started' | 'export_complete' | 'import_started' | 'import_complete' | 'verified' | 'data_deleted';
export type MigrationStatus = 'not_started' | 'in_progress' | 'completed' | 'failed';

export interface MigrationDocument {
  uid: string;
  sourceInstance: 'hosted';
  targetInstance: 'self_hosted';
  phase: MigrationPhase;
  status: MigrationStatus;
  exportSnapshot?: {
    assetCount: number;
    assetClassCount: number;
    connectedAccountCount: number;
    exportedAt: number;
    exportVersion: number;
    checksum: string;
  };
  importSnapshot?: {
    assetCount: number;
    assetClassCount: number;
    importedAt: number;
    warnings: string[];
  };
  verificationShasum?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

export interface MigrationStateResponse {
  migration: MigrationDocument | null;
}

export interface StartExportResponse {
  ok: true;
  phase: MigrationPhase;
  exportSnapshot: MigrationDocument['exportSnapshot'];
}

export interface ConfirmImportResponse {
  ok: true;
  phase: MigrationPhase;
  importSnapshot: MigrationDocument['importSnapshot'];
}

export interface VerifyMigrationResponse {
  ok: true;
  phase: MigrationPhase;
  match: boolean;
  summary: {
    hostedAssets: number;
    selfHostedAssets: number;
  };
}
