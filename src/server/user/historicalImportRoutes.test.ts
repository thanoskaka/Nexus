import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockVerifyIdToken = vi.fn();
const mockSaveHistoricalPrices = vi.fn();
const mockGetHistoricalPrices = vi.fn();
const mockDeleteHistoricalBatch = vi.fn();

vi.mock('../firebaseAdmin.js', () => ({
  getFirebaseAdminAuth: () => ({
    verifyIdToken: (...args: unknown[]) => mockVerifyIdToken(...args),
  }),
}));

vi.mock('./historicalImportStore.js', () => ({
  saveHistoricalPrices: (...args: unknown[]) => mockSaveHistoricalPrices(...args),
  getHistoricalPrices: (...args: unknown[]) => mockGetHistoricalPrices(...args),
  deleteHistoricalBatch: (...args: unknown[]) => mockDeleteHistoricalBatch(...args),
}));

import { createHistoricalImportRouter } from './historicalImportRoutes.js';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/user/history', createHistoricalImportRouter());
  return app;
}

describe('/api/user/history', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue({ uid: 'uid-1', email: 'user@example.com' });
  });

  it('requires authentication', async () => {
    const response = await request(makeApp()).post('/api/user/history/prices');
    expect(response.status).toBe(401);
  });

  describe('POST /prices', () => {
    it('saves historical prices', async () => {
      mockSaveHistoricalPrices.mockResolvedValue({ inserted: 2 });

      const response = await request(makeApp())
        .post('/api/user/history/prices')
        .set('Authorization', 'Bearer token')
        .send({
          prices: [
            { ticker: 'VTI', date: '2024-01-15', price: 245.50, currency: 'USD' },
            { ticker: 'VTI', date: '2024-02-15', price: 248.30, currency: 'USD' },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.inserted).toBe(2);
      expect(response.body.batchId).toBeDefined();
      expect(mockSaveHistoricalPrices).toHaveBeenCalledWith(
        'uid-1',
        expect.any(String),
        expect.arrayContaining([
          expect.objectContaining({ ticker: 'VTI', date: '2024-01-15', price: 245.50, currency: 'USD' }),
        ]),
      );
    });

    it('rejects empty price array', async () => {
      const response = await request(makeApp())
        .post('/api/user/history/prices')
        .set('Authorization', 'Bearer token')
        .send({ prices: [] });

      expect(response.status).toBe(400);
      expect(mockSaveHistoricalPrices).not.toHaveBeenCalled();
    });

    it('rejects invalid price entries', async () => {
      const response = await request(makeApp())
        .post('/api/user/history/prices')
        .set('Authorization', 'Bearer token')
        .send({
          prices: [{ ticker: 'VTI', date: '2024-01-15', price: -10 }],
        });

      expect(response.status).toBe(400);
      expect(mockSaveHistoricalPrices).not.toHaveBeenCalled();
    });

    it('requires ticker and date fields', async () => {
      const response = await request(makeApp())
        .post('/api/user/history/prices')
        .set('Authorization', 'Bearer token')
        .send({
          prices: [{ price: 100 }],
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /prices', () => {
    it('returns all historical prices for user', async () => {
      mockGetHistoricalPrices.mockResolvedValue([
        { id: '1', ticker: 'VTI', date: '2024-01-15', price: 245.50, currency: 'USD' },
      ]);

      const response = await request(makeApp())
        .get('/api/user/history/prices')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(200);
      expect(response.body.prices).toHaveLength(1);
    });

    it('filters by ticker if provided', async () => {
      mockGetHistoricalPrices.mockResolvedValue([
        { id: '1', ticker: 'VTI', date: '2024-01-15', price: 245.50, currency: 'USD' },
      ]);

      const response = await request(makeApp())
        .get('/api/user/history/prices')
        .set('Authorization', 'Bearer token')
        .query({ ticker: 'VTI' });

      expect(response.status).toBe(200);
      expect(mockGetHistoricalPrices).toHaveBeenCalledWith('uid-1', 'VTI');
    });
  });

  describe('DELETE /prices/:batchId', () => {
    it('deletes a batch of historical prices', async () => {
      mockDeleteHistoricalBatch.mockResolvedValue({ deleted: 2 });

      const response = await request(makeApp())
        .delete('/api/user/history/prices/batch-123')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.deleted).toBe(2);
    });

    it('returns 404 when batchId is missing', async () => {
      const response = await request(makeApp())
        .delete('/api/user/history/prices/')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(404);
    });
  });
});
