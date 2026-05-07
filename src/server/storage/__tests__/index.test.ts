import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Storage adapter selection', () => {
  const origEnv = process.env;

  beforeEach(() => {
    process.env = { ...origEnv };
    delete process.env.NEXUS_STORAGE_DRIVER;
  });

  afterEach(() => {
    process.env = origEnv;
  });

  it('defaults to firebase driver when NEXUS_STORAGE_DRIVER is unset', async () => {
    const { getStorageDriver } = await import('../index');
    expect(getStorageDriver()).toBe('firebase');
  });

  it('reads NEXUS_STORAGE_DRIVER env var', async () => {
    process.env.NEXUS_STORAGE_DRIVER = 'sqlite';
    process.env.SQLITE_PATH = ':memory:';
    const { getStorageAdapterAsync, closeStorage } = await import('../index');
    const adapter = await getStorageAdapterAsync();
    await expect(adapter.ping()).resolves.toBe(true);
    await closeStorage();
  });
});
