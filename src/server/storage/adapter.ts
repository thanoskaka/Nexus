export type StorageDriver = 'firebase' | 'sqlite' | 'postgres';

export interface BatchWriter {
  set(collection: string, docId: string, data: Record<string, unknown>): void;
  delete(collection: string, docId: string): void;
  commit(): Promise<void>;
}

export interface StorageAdapter {
  getDoc<T = Record<string, unknown>>(collection: string, docId: string): Promise<T | null>;
  setDoc(collection: string, docId: string, data: Record<string, unknown>, merge?: boolean): Promise<void>;
  updateDoc(collection: string, docId: string, data: Record<string, unknown>): Promise<void>;
  deleteDoc(collection: string, docId: string): Promise<void>;
  queryWhere<T = Record<string, unknown>>(
    collection: string,
    field: string,
    op: '==' | 'array-contains',
    value: unknown,
  ): Promise<T[]>;
  batch(): BatchWriter;
  deleteFieldSentinel(): object;
  ping(): Promise<boolean>;
  close(): Promise<void>;
}
