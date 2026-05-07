import type Database from 'better-sqlite3';
import { createRequire } from 'node:module';
import type { StorageAdapter, BatchWriter } from './adapter.js';

const _require = createRequire(import.meta.url);
const DELETE_SENTINEL = { __deleteSentinel: true };

interface SqliteRow {
  id: string;
  uid: string | null;
  data: string;
}

class SqliteBatchWriter implements BatchWriter {
  private operations: Array<{
    type: 'set' | 'delete';
    collection: string;
    docId: string;
    data?: Record<string, unknown>;
  }> = [];

  constructor(private db: Database.Database) {}

  set(collection: string, docId: string, data: Record<string, unknown>): void {
    this.operations.push({ type: 'set', collection, docId, data });
  }

  delete(collection: string, docId: string): void {
    this.operations.push({ type: 'delete', collection, docId });
  }

  async commit(): Promise<void> {
    const stmt = this.db.transaction(() => {
      for (const op of this.operations) {
        if (op.type === 'set') {
          const uid = (op.data!.uid as string) || null;
          const stripped = stripSentinelDataMerge(op.data!);
          const payload = JSON.stringify(stripped);
          const timestamp = now();
          this.db
            .prepare(
              'INSERT OR REPLACE INTO collections (collection, id, uid, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
            )
            .run(op.collection, op.docId, uid, payload, timestamp, timestamp);
        } else {
          this.db
            .prepare('DELETE FROM collections WHERE collection = ? AND id = ?')
            .run(op.collection, op.docId);
        }
      }
    });
    stmt();
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

export function createSqliteAdapter(dbPath: string): StorageAdapter {
  let db: Database.Database;

  try {
    const BetterSqlite3 = _require('better-sqlite3');
    db = new BetterSqlite3(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    db.exec(`
      CREATE TABLE IF NOT EXISTS collections (
        collection TEXT NOT NULL,
        id TEXT NOT NULL,
        uid TEXT,
        data TEXT NOT NULL DEFAULT '{}',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (collection, id)
      )
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_collections_uid
      ON collections(collection, uid)
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_collections_collection
      ON collections(collection)
    `);
  } catch (err) {
    throw new Error(
      `Failed to initialize SQLite: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  return {
    async getDoc<T>(collection: string, docId: string): Promise<T | null> {
      const row = db
        .prepare('SELECT data FROM collections WHERE collection = ? AND id = ?')
        .get(collection, docId) as SqliteRow | undefined;
      if (!row) return null;
      return JSON.parse(row.data) as T;
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
        const existing = db
          .prepare('SELECT data FROM collections WHERE collection = ? AND id = ?')
          .get(collection, docId) as SqliteRow | undefined;

        const existingData = existing ? JSON.parse(existing.data) as Record<string, unknown> : {};
        const merged = stripSentinelDataWithDeletes(data, existingData);
        const payload = JSON.stringify(merged);

        if (existing) {
          db.prepare(
            'UPDATE collections SET data = ?, updated_at = ? WHERE collection = ? AND id = ?',
          ).run(payload, timestamp, collection, docId);
        } else {
          db.prepare(
            'INSERT INTO collections (collection, id, uid, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
          ).run(collection, docId, uid, payload, timestamp, timestamp);
        }
      } else {
        const stripped = stripSentinelDataMerge(data);
        const payload = JSON.stringify(stripped);
        db.prepare(
          'INSERT OR REPLACE INTO collections (collection, id, uid, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        ).run(collection, docId, uid, payload, timestamp, timestamp);
      }
    },

    async updateDoc(
      collection: string,
      docId: string,
      data: Record<string, unknown>,
    ): Promise<void> {
      const timestamp = now();
      const existing = db
        .prepare('SELECT data FROM collections WHERE collection = ? AND id = ?')
        .get(collection, docId) as SqliteRow | undefined;

      const existingData = existing ? JSON.parse(existing.data) as Record<string, unknown> : {};
      const merged = stripSentinelDataWithDeletes(data, existingData);

      let uid = merged.uid || null;
      if (typeof uid === 'string') uid = uid;

      const createdAt = existing
        ? (existingData.createdAt as number) || timestamp
        : timestamp;

      db.prepare(
        'INSERT OR REPLACE INTO collections (collection, id, uid, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      ).run(collection, docId, uid, JSON.stringify(merged), createdAt, timestamp);
    },

    async deleteDoc(collection: string, docId: string): Promise<void> {
      db.prepare('DELETE FROM collections WHERE collection = ? AND id = ?').run(
        collection,
        docId,
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
          const rows = db
            .prepare(
              'SELECT id, uid, data FROM collections WHERE collection = ? AND uid = ?',
            )
            .all(collection, value as string) as SqliteRow[];
          return rows.map((row) => {
            const data = JSON.parse(row.data) as Record<string, unknown>;
            return { id: row.id, ...data } as T;
          });
        }

        const rows = db
          .prepare('SELECT id, uid, data FROM collections WHERE collection = ?')
          .all(collection) as SqliteRow[];
        return rows
          .map((row) => {
            const data = JSON.parse(row.data) as Record<string, unknown>;
            return { id: row.id, ...data };
          })
          .filter((doc) => (doc as Record<string, unknown>)[field] === value) as T[];
      }

      if (op === 'array-contains') {
        const rows = db
          .prepare('SELECT id, uid, data FROM collections WHERE collection = ?')
          .all(collection) as SqliteRow[];
        return rows
          .map((row) => {
            const data = JSON.parse(row.data) as Record<string, unknown>;
            return { id: row.id, ...data };
          })
          .filter((doc) => {
            const arr = (doc as Record<string, unknown>)[field];
            return Array.isArray(arr) && arr.includes(value);
          }) as T[];
      }

      return [];
    },

    batch(): BatchWriter {
      return new SqliteBatchWriter(db);
    },

    deleteFieldSentinel(): object {
      return DELETE_SENTINEL;
    },

    async ping(): Promise<boolean> {
      try {
        db.prepare('SELECT 1').get();
        return true;
      } catch {
        return false;
      }
    },

    async close(): Promise<void> {
      db.close();
    },
  };
}
