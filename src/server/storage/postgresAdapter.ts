import type { Pool, PoolClient } from 'pg';
import { createRequire } from 'node:module';
import type { StorageAdapter, BatchWriter } from './adapter.js';

const _require = createRequire(import.meta.url);
const DELETE_SENTINEL = { __deleteSentinel: true };

interface PgRow {
  id: string;
  uid: string | null;
  data: Record<string, unknown>;
}

class PgBatchWriter implements BatchWriter {
  private operations: Array<{
    type: 'set' | 'delete';
    collection: string;
    docId: string;
    data?: Record<string, unknown>;
  }> = [];

  constructor(private pool: Pool) {}

  set(collection: string, docId: string, data: Record<string, unknown>): void {
    this.operations.push({ type: 'set', collection, docId, data });
  }

  delete(collection: string, docId: string): void {
    this.operations.push({ type: 'delete', collection, docId });
  }

  async commit(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const timestamp = Math.floor(Date.now() / 1000);
      for (const op of this.operations) {
        if (op.type === 'set') {
          const uid = (op.data!.uid as string) || null;
          const stripped = stripSentinelDataMerge(op.data!);
          const payload = JSON.stringify(stripped);
          await client.query(
            `INSERT INTO collections (collection, id, uid, data, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (collection, id) DO UPDATE SET
               data = EXCLUDED.data,
               uid = EXCLUDED.uid,
               updated_at = EXCLUDED.updated_at`,
            [op.collection, op.docId, uid, payload, timestamp, timestamp],
          );
        } else {
          await client.query(
            'DELETE FROM collections WHERE collection = $1 AND id = $2',
            [op.collection, op.docId],
          );
        }
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

function now() {
  return Math.floor(Date.now() / 1000);
}

function stripSentinelData(data: Record<string, unknown>): { clean: Record<string, unknown>; deletedFields: string[] } {
  const clean: Record<string, unknown> = {};
  const deletedFields: string[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (isDeleteSentinel(value)) {
      deletedFields.push(key);
    } else {
      clean[key] = value;
    }
  }
  return { clean, deletedFields };
}

function stripSentinelDataMerge(data: Record<string, unknown>): Record<string, unknown> {
  return stripSentinelData(data).clean;
}

function stripSentinelDataWithDeletes(data: Record<string, unknown>, existing: Record<string, unknown>): Record<string, unknown> {
  const { clean, deletedFields } = stripSentinelData(data);
  const merged = { ...existing, ...clean };
  for (const field of deletedFields) {
    delete merged[field];
  }
  return merged;
}

function isDeleteSentinel(value: unknown): boolean {
  return (
    value !== null &&
    typeof value === 'object' &&
    (value as Record<string, unknown>).__deleteSentinel === true
  );
}

export function createPostgresAdapter(connectionString: string): StorageAdapter {
  let pool: Pool;

  try {
    const { Pool: PgPool } = _require('pg');
    pool = new PgPool({ connectionString });
  } catch {
    throw new Error(
      'Failed to initialize Postgres. Ensure pg is installed: npm install pg',
    );
  }

  (async () => {
    try {
      const client = await pool.connect();
      await client.query(`
        CREATE TABLE IF NOT EXISTS collections (
          collection TEXT NOT NULL,
          id TEXT NOT NULL,
          uid TEXT,
          data JSONB NOT NULL DEFAULT '{}',
          created_at BIGINT NOT NULL,
          updated_at BIGINT NOT NULL,
          PRIMARY KEY (collection, id)
        )
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_collections_uid
        ON collections(collection, uid)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_collections_collection
        ON collections(collection)
      `);

      client.release();
    } catch (err) {
      console.error('Postgres schema initialization failed:', err);
    }
  })();

  return {
    async getDoc<T>(collection: string, docId: string): Promise<T | null> {
      const result = await pool.query(
        'SELECT data FROM collections WHERE collection = $1 AND id = $2',
        [collection, docId],
      );
      if (result.rows.length === 0) return null;
      return result.rows[0].data as T;
    },

    async setDoc(
      collection: string,
      docId: string,
      data: Record<string, unknown>,
      merge?: boolean,
    ): Promise<void> {
      const uid = (data.uid as string) || null;
      const timestamp = now();

      if (merge) {
        const result = await pool.query(
          'SELECT data FROM collections WHERE collection = $1 AND id = $2',
          [collection, docId],
        );
        const existingData = result.rows.length > 0 ? result.rows[0].data as Record<string, unknown> : {};
        const mergedData = stripSentinelDataWithDeletes(data, existingData);
        const payload = JSON.stringify(mergedData);

        if (result.rows.length > 0) {
          await pool.query(
            'UPDATE collections SET data = $1, updated_at = $2 WHERE collection = $3 AND id = $4',
            [payload, timestamp, collection, docId],
          );
        } else {
          await pool.query(
            'INSERT INTO collections (collection, id, uid, data, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)',
            [collection, docId, uid, payload, timestamp, timestamp],
          );
        }
      } else {
        const stripped = stripSentinelDataMerge(data);
        const payload = JSON.stringify(stripped);
        await pool.query(
          `INSERT INTO collections (collection, id, uid, data, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (collection, id) DO UPDATE SET
             data = EXCLUDED.data,
             uid = EXCLUDED.uid,
             updated_at = EXCLUDED.updated_at`,
          [collection, docId, uid, payload, timestamp, timestamp],
        );
      }
    },

    async updateDoc(
      collection: string,
      docId: string,
      data: Record<string, unknown>,
    ): Promise<void> {
      const timestamp = now();
      const result = await pool.query(
        'SELECT data FROM collections WHERE collection = $1 AND id = $2',
        [collection, docId],
      );

      const existingData = result.rows.length > 0 ? result.rows[0].data as Record<string, unknown> : {};
      const mergedData = stripSentinelDataWithDeletes(data, existingData);

      const uid = typeof mergedData.uid === 'string' ? mergedData.uid : null;
      const createdAt = result.rows.length > 0
        ? (existingData.createdAt as number) || timestamp
        : timestamp;

      await pool.query(
        `INSERT INTO collections (collection, id, uid, data, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (collection, id) DO UPDATE SET
           data = EXCLUDED.data,
           uid = EXCLUDED.uid,
           updated_at = EXCLUDED.updated_at`,
        [collection, docId, uid, JSON.stringify(mergedData), createdAt, timestamp],
      );
    },

    async deleteDoc(collection: string, docId: string): Promise<void> {
      await pool.query(
        'DELETE FROM collections WHERE collection = $1 AND id = $2',
        [collection, docId],
      );
    },

    async queryWhere<T>(
      collection: string,
      field: string,
      op: '==' | 'array-contains',
      value: unknown,
    ): Promise<T[]> {
      if (op === '==') {
        if (field === 'uid') {
          const result = await pool.query(
            'SELECT id, uid, data FROM collections WHERE collection = $1 AND uid = $2',
            [collection, value as string],
          );
          return result.rows.map((row: PgRow) => {
            const data = row.data;
            return { id: row.id, ...data } as T;
          });
        }

        const result = await pool.query(
          'SELECT id, uid, data FROM collections WHERE collection = $1',
          [collection],
        );
        return result.rows
          .map((row: PgRow) => {
            const data = row.data;
            return { id: row.id, ...data };
          })
          .filter((doc: Record<string, unknown>) => doc[field] === value) as T[];
      }

      if (op === 'array-contains') {
        const result = await pool.query(
          'SELECT id, uid, data FROM collections WHERE collection = $1',
          [collection],
        );
        return result.rows
          .map((row: PgRow) => {
            const data = row.data;
            return { id: row.id, ...data };
          })
          .filter((doc: Record<string, unknown>) => {
            const arr = doc[field];
            return Array.isArray(arr) && arr.includes(value);
          }) as T[];
      }

      return [];
    },

    batch(): BatchWriter {
      return new PgBatchWriter(pool);
    },

    deleteFieldSentinel(): object {
      return DELETE_SENTINEL;
    },

    async ping(): Promise<boolean> {
      try {
        await pool.query('SELECT 1');
        return true;
      } catch {
        return false;
      }
    },

    async close(): Promise<void> {
      await pool.end();
    },
  };
}
