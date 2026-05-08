import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createSqliteAdapter } from '../sqliteAdapter';
import type { StorageAdapter } from '../adapter';

describe('StorageAdapter — SQLite', () => {
  let adapter: StorageAdapter;

  beforeAll(() => {
    adapter = createSqliteAdapter(':memory:');
  });

  afterAll(async () => {
    await adapter.close();
  });

  it('ping returns true', async () => {
    await expect(adapter.ping()).resolves.toBe(true);
  });

  it('getDoc returns null for missing doc', async () => {
    const doc = await adapter.getDoc('test_collection', 'nonexistent');
    expect(doc).toBeNull();
  });

  it('setDoc creates a document', async () => {
    await adapter.setDoc('test_collection', 'doc1', { uid: 'user1', name: 'test' });
    const doc = await adapter.getDoc('test_collection', 'doc1');
    expect(doc).not.toBeNull();
    expect((doc as Record<string, unknown>).name).toBe('test');
    expect((doc as Record<string, unknown>).uid).toBe('user1');
  });

  it('setDoc with merge updates existing doc', async () => {
    await adapter.setDoc('test_collection', 'doc_merge', { uid: 'user1', name: 'original' });
    await adapter.setDoc('test_collection', 'doc_merge', { uid: 'user1', extra: 'added' }, true);
    const doc = await adapter.getDoc('test_collection', 'doc_merge');
    expect((doc as Record<string, unknown>).name).toBe('original');
    expect((doc as Record<string, unknown>).extra).toBe('added');
  });

  it('setDoc without merge replaces doc', async () => {
    await adapter.setDoc('test_collection', 'doc_replace', { uid: 'user1', name: 'original' });
    await adapter.setDoc('test_collection', 'doc_replace', { uid: 'user1', name: 'replaced' });
    const doc = await adapter.getDoc('test_collection', 'doc_replace');
    expect((doc as Record<string, unknown>).name).toBe('replaced');
  });

  it('deleteDoc removes document', async () => {
    await adapter.setDoc('test_collection', 'doc_delete', { uid: 'user1' });
    await adapter.deleteDoc('test_collection', 'doc_delete');
    const doc = await adapter.getDoc('test_collection', 'doc_delete');
    expect(doc).toBeNull();
  });

  it('queryWhere returns docs matching uid', async () => {
    await adapter.setDoc('query_uid_test', 'q1', { uid: 'user1', value: 'a' });
    await adapter.setDoc('query_uid_test', 'q2', { uid: 'user2', value: 'b' });
    await adapter.setDoc('query_uid_test', 'q3', { uid: 'user1', value: 'c' });

    const results = await adapter.queryWhere('query_uid_test', 'uid', '==', 'user1');
    expect(results).toHaveLength(2);
    const values = results.map((r: Record<string, unknown>) => r.value);
    expect(values).toContain('a');
    expect(values).toContain('c');
  });

  it('queryWhere with array-contains', async () => {
    await adapter.setDoc('test_list', 'l1', { uid: 'user1', tags: ['a', 'b'] });
    await adapter.setDoc('test_list', 'l2', { uid: 'user1', tags: ['b', 'c'] });
    await adapter.setDoc('test_list', 'l3', { uid: 'user2', tags: ['a'] });

    const results = await adapter.queryWhere('test_list', 'tags', 'array-contains', 'a');
    expect(results).toHaveLength(2);
  });

  it('batch set creates multiple docs atomically', async () => {
    const batch = adapter.batch();
    batch.set('batch_test', 'b1', { uid: 'user1', val: 1 });
    batch.set('batch_test', 'b2', { uid: 'user1', val: 2 });
    batch.set('batch_test', 'b3', { uid: 'user2', val: 3 });
    await batch.commit();

    const doc1 = await adapter.getDoc('batch_test', 'b1');
    const doc2 = await adapter.getDoc('batch_test', 'b2');
    const doc3 = await adapter.getDoc('batch_test', 'b3');
    expect(doc1).not.toBeNull();
    expect(doc2).not.toBeNull();
    expect(doc3).not.toBeNull();
  });

  it('batch delete removes docs', async () => {
    const batch = adapter.batch();
    batch.delete('batch_test', 'b1');
    batch.delete('batch_test', 'b2');
    await batch.commit();

    const doc1 = await adapter.getDoc('batch_test', 'b1');
    const doc2 = await adapter.getDoc('batch_test', 'b2');
    expect(doc1).toBeNull();
    expect(doc2).toBeNull();
  });

  it('updateDoc merges data', async () => {
    await adapter.setDoc('update_test', 'u1', { uid: 'user1', name: 'hello' });
    await adapter.updateDoc('update_test', 'u1', { extra: 'world' });
    const doc = await adapter.getDoc('update_test', 'u1');
    expect((doc as Record<string, unknown>).name).toBe('hello');
    expect((doc as Record<string, unknown>).extra).toBe('world');
  });

  it('updateDoc creates doc if not exists', async () => {
    await adapter.updateDoc('update_test', 'u2', { uid: 'user1', name: 'new' });
    const doc = await adapter.getDoc('update_test', 'u2');
    expect(doc).not.toBeNull();
    expect((doc as Record<string, unknown>).name).toBe('new');
  });

  it('deleteFieldSentinel is removed on setDoc', async () => {
    await adapter.setDoc('sentinel_test', 's1', { uid: 'user1', name: 'hello', secret: 'keep' });
    const sentinel = adapter.deleteFieldSentinel();
    await adapter.setDoc('sentinel_test', 's1', { uid: 'user1', secret: sentinel } as unknown as Record<string, unknown>, true);
    const doc = await adapter.getDoc('sentinel_test', 's1');
    expect((doc as Record<string, unknown>).name).toBe('hello');
    expect((doc as Record<string, unknown>).secret).toBeUndefined();
  });
});
