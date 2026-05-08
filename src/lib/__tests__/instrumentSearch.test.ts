import { describe, expect, it } from 'vitest';
import { createApp } from '../../../server';
import request from 'supertest';

const app = createApp();

describe('GET /api/instruments/search', () => {
  describe('validation', () => {
    it('returns empty suggestions for empty query', async () => {
      const res = await request(app).get('/api/instruments/search?q=');
      expect(res.status).toBe(200);
      expect(res.body.suggestions).toEqual([]);
    });

    it('returns empty suggestions for single-char query', async () => {
      const res = await request(app).get('/api/instruments/search?q=a');
      expect(res.status).toBe(200);
      expect(res.body.suggestions).toEqual([]);
    });

    it('returns empty suggestions for missing query param', async () => {
      const res = await request(app).get('/api/instruments/search');
      expect(res.status).toBe(200);
      expect(res.body.suggestions).toEqual([]);
    });
  });

  describe('happy path', () => {
    it('returns suggestions for valid query (yahoo fallback)', async () => {
      const res = await request(app)
        .get('/api/instruments/search')
        .query({ q: 'Apple', country: 'Canada' });
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.suggestions)).toBe(true);
    });

    it('uses AMFI search for India mutual funds', async () => {
      const res = await request(app)
        .get('/api/instruments/search')
        .query({ q: 'SBI', country: 'India', assetClass: 'Mutual Funds' });
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.suggestions)).toBe(true);
    });

    it('returns gracefully on provider failure', async () => {
      const res = await request(app)
        .get('/api/instruments/search')
        .query({ q: 'xy', country: 'India', assetClass: 'Stocks' });
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.suggestions)).toBe(true);
    });
  });

  describe('suggestion structure', () => {
    it('suggestions have the correct shape', async () => {
      const res = await request(app)
        .get('/api/instruments/search')
        .query({ q: 'Apple', country: 'Canada' });
      expect(res.status).toBe(200);
      const { suggestions } = res.body;
      for (const s of suggestions) {
        expect(s).toHaveProperty('displayName');
        expect(s).toHaveProperty('ticker');
        expect(s).toHaveProperty('exchange');
        expect(s).toHaveProperty('instrumentType');
        expect(s).toHaveProperty('currency');
        expect(s).toHaveProperty('source');
        expect(s).toHaveProperty('confidence');
        expect(typeof s.confidence).toBe('number');
      }
    });
  });
});
