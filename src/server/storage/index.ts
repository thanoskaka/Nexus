import type { StorageAdapter, StorageDriver } from './adapter.js';
import { createFirebaseAdapter } from './firebaseAdapter.js';

let _adapter: StorageAdapter | null = null;
let _driver: StorageDriver = 'firebase';

export async function getStorageAdapterAsync(): Promise<StorageAdapter> {
  if (_adapter) return _adapter;

  const driver = (process.env.NEXUS_STORAGE_DRIVER || 'firebase').trim().toLowerCase() as StorageDriver;
  _driver = driver;

  switch (driver) {
    case 'sqlite': {
      const { createSqliteAdapter } = await import('./sqliteAdapter.js');
      const dbPath = process.env.SQLITE_PATH || './data/nexus.db';
      _adapter = createSqliteAdapter(dbPath);
      break;
    }
    case 'postgres': {
      const { createPostgresAdapter } = await import('./postgresAdapter.js');
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) {
        throw new Error('DATABASE_URL is required when NEXUS_STORAGE_DRIVER=postgres');
      }
      _adapter = createPostgresAdapter(dbUrl);
      break;
    }
    default: {
      _adapter = createFirebaseAdapter();
      break;
    }
  }

  return _adapter;
}

export function getStorageAdapter(): StorageAdapter {
  if (_adapter) return _adapter;

  const driver = (process.env.NEXUS_STORAGE_DRIVER || 'firebase').trim().toLowerCase() as StorageDriver;
  _driver = driver;

  if (driver === 'sqlite' || driver === 'postgres') {
    throw new Error(
      `Storage driver '${driver}' requires async initialization. Use getStorageAdapterAsync() instead.`,
    );
  }

  _adapter = createFirebaseAdapter();
  return _adapter;
}

export function getStorageDriver(): StorageDriver {
  return _driver;
}

export async function closeStorage(): Promise<void> {
  if (_adapter) {
    await _adapter.close();
    _adapter = null;
  }
}

export { type StorageAdapter, type StorageDriver } from './adapter.js';
