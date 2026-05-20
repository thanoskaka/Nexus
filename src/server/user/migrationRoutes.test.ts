import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockVerifyIdToken = vi.fn();
const mockGetMigrationState = vi.fn();
const mockStartExport = vi.fn();
const mockCompleteExport = vi.fn();
const mockRecordImport = vi.fn();
const mockCompleteVerification = vi.fn();
const mockMarkDataDeleted = vi.fn();
const mockResetMigration = vi.fn();
const mockRecordError = vi.fn();

vi.mock('../firebaseAdmin.js', () => ({
  getFirebaseAdminAuth: () => ({
    verifyIdToken: (...args: unknown[]) => mockVerifyIdToken(...args),
  }),
}));

vi.mock('./migrationStore.js', () => ({
  getMigrationState: (...args: unknown[]) => mockGetMigrationState(...args),
  startExport: (...args: unknown[]) => mockStartExport(...args),
  completeExport: (...args: unknown[]) => mockCompleteExport(...args),
  recordImport: (...args: unknown[]) => mockRecordImport(...args),
  completeVerification: (...args: unknown[]) => mockCompleteVerification(...args),
  markDataDeleted: (...args: unknown[]) => mockMarkDataDeleted(...args),
  resetMigration: (...args: unknown[]) => mockResetMigration(...args),
  recordError: (...args: unknown[]) => mockRecordError(...args),
}));

import { createMigrationRouter } from './migrationRoutes.js';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/user/migration', createMigrationRouter());
  return app;
}

describe('/api/user/migration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue({ uid: 'uid-1', email: 'user@example.com' });
  });

  it('requires authentication', async () => {
    const response = await request(makeApp()).get('/api/user/migration');
    expect(response.status).toBe(401);
  });

  describe('GET /', () => {
    it('returns null when no migration exists', async () => {
      mockGetMigrationState.mockResolvedValue(null);
      const response = await request(makeApp())
        .get('/api/user/migration')
        .set('Authorization', 'Bearer token');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ migration: null });
    });

    it('returns existing migration state', async () => {
      mockGetMigrationState.mockResolvedValue({
        uid: 'uid-1',
        sourceInstance: 'hosted',
        targetInstance: 'self_hosted',
        phase: 'export_started',
        status: 'in_progress',
        createdAt: 1000,
        updatedAt: 1000,
      });
      const response = await request(makeApp())
        .get('/api/user/migration')
        .set('Authorization', 'Bearer token');
      expect(response.status).toBe(200);
      expect(response.body.migration).toBeDefined();
      expect(response.body.migration.phase).toBe('export_started');
    });
  });

  describe('POST /export/start', () => {
    it('starts export with asset count and checksum', async () => {
      mockStartExport.mockResolvedValue({
        uid: 'uid-1',
        phase: 'export_started',
        exportSnapshot: { assetCount: 10, assetClassCount: 3, connectedAccountCount: 1, exportedAt: 1000, exportVersion: 1, checksum: 'abc123' },
      });

      const response = await request(makeApp())
        .post('/api/user/migration/export/start')
        .set('Authorization', 'Bearer token')
        .send({ assetCount: 10, assetClassCount: 3, connectedAccountCount: 1, checksum: 'abc123' });

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.phase).toBe('export_started');
      expect(response.body.exportSnapshot.assetCount).toBe(10);
      expect(mockStartExport).toHaveBeenCalledWith('uid-1', {
        assetCount: 10,
        assetClassCount: 3,
        connectedAccountCount: 1,
        exportVersion: 1,
        checksum: 'abc123',
      });
    });

    it('rejects missing required fields', async () => {
      const response = await request(makeApp())
        .post('/api/user/migration/export/start')
        .set('Authorization', 'Bearer token')
        .send({ assetCount: 10 });

      expect(response.status).toBe(400);
      expect(mockStartExport).not.toHaveBeenCalled();
    });
  });

  describe('POST /export/complete', () => {
    it('completes export phase', async () => {
      mockCompleteExport.mockResolvedValue({ uid: 'uid-1', phase: 'export_complete' });

      const response = await request(makeApp())
        .post('/api/user/migration/export/complete')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.phase).toBe('export_complete');
    });
  });

  describe('POST /import/confirm', () => {
    it('records import with asset count', async () => {
      mockRecordImport.mockResolvedValue({
        uid: 'uid-1',
        phase: 'import_complete',
        importSnapshot: { assetCount: 10, assetClassCount: 3, importedAt: 1000, warnings: [] },
      });

      const response = await request(makeApp())
        .post('/api/user/migration/import/confirm')
        .set('Authorization', 'Bearer token')
        .send({ assetCount: 10, assetClassCount: 3 });

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.phase).toBe('import_complete');
      expect(response.body.importSnapshot.assetCount).toBe(10);
    });

    it('rejects missing asset count', async () => {
      const response = await request(makeApp())
        .post('/api/user/migration/import/confirm')
        .set('Authorization', 'Bearer token')
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('POST /verify', () => {
    it('verifies migration with checksum match', async () => {
      mockCompleteVerification.mockResolvedValue({
        uid: 'uid-1',
        phase: 'verified',
        exportSnapshot: { assetCount: 10, checksum: 'abc123' },
        importSnapshot: { assetCount: 10 },
      });

      const response = await request(makeApp())
        .post('/api/user/migration/verify')
        .set('Authorization', 'Bearer token')
        .send({ shasum: 'abc123' });

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.match).toBe(true);
    });

    it('reports mismatch when checksums differ', async () => {
      mockCompleteVerification.mockResolvedValue({
        uid: 'uid-1',
        phase: 'verified',
        exportSnapshot: { assetCount: 10, checksum: 'abc123' },
        importSnapshot: { assetCount: 9 },
      });

      const response = await request(makeApp())
        .post('/api/user/migration/verify')
        .set('Authorization', 'Bearer token')
        .send({ shasum: 'def456' });

      expect(response.status).toBe(200);
      expect(response.body.match).toBe(false);
    });

    it('rejects missing shasum', async () => {
      const response = await request(makeApp())
        .post('/api/user/migration/verify')
        .set('Authorization', 'Bearer token')
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('POST /data-deleted', () => {
    it('marks hosted data as deleted', async () => {
      mockMarkDataDeleted.mockResolvedValue({ uid: 'uid-1', phase: 'data_deleted', status: 'completed' });

      const response = await request(makeApp())
        .post('/api/user/migration/data-deleted')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.phase).toBe('data_deleted');
    });
  });

  describe('POST /reset', () => {
    it('resets migration state', async () => {
      mockResetMigration.mockResolvedValue(undefined);

      const response = await request(makeApp())
        .post('/api/user/migration/reset')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
    });
  });
});
