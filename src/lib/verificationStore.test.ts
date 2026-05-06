import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  loadVerificationResults,
  saveVerificationResult,
  saveVerificationResults,
  clearVerificationResults,
  mergeResults,
  type ClientVerificationResult,
} from './verificationStore.js';

const mockStorage: Record<string, string> = {};
const mockGetItem = vi.fn((key: string) => mockStorage[key] ?? null);
const mockSetItem = vi.fn((key: string, value: string) => { mockStorage[key] = value; });
const mockRemoveItem = vi.fn((key: string) => { delete mockStorage[key]; });

beforeEach(() => {
  vi.clearAllMocks();
  Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  vi.stubGlobal('localStorage', {
    getItem: mockGetItem,
    setItem: mockSetItem,
    removeItem: mockRemoveItem,
  });
});

describe('loadVerificationResults', () => {
  it('returns empty object when no stored results', () => {
    const result = loadVerificationResults();
    expect(result).toEqual({});
  });

  it('returns parsed results from storage', () => {
    const stored = {
      'firebase-auth': {
        capabilityId: 'firebase-auth',
        status: 'working',
        checkedAt: '2025-01-01T00:00:00.000Z',
        guidance: { missingEnvKeys: [] },
      },
    };
    mockStorage['nexus-verify-results'] = JSON.stringify(stored);

    const result = loadVerificationResults();
    expect(result['firebase-auth']).toBeDefined();
    expect(result['firebase-auth'].status).toBe('working');
  });

  it('returns empty object on corrupt data', () => {
    mockStorage['nexus-verify-results'] = 'not-valid-json';
    const result = loadVerificationResults();
    expect(result).toEqual({});
  });
});

describe('saveVerificationResult', () => {
  it('saves a result to localStorage', () => {
    const result: ClientVerificationResult = {
      capabilityId: 'firebase-auth',
      status: 'working',
      checkedAt: '2025-01-01T00:00:00.000Z',
      guidance: { missingEnvKeys: [] },
    };

    saveVerificationResult(result);
    expect(mockSetItem).toHaveBeenCalledWith('nexus-verify-results', expect.any(String));

    const stored = JSON.parse(mockStorage['nexus-verify-results']);
    expect(stored['firebase-auth'].status).toBe('working');
  });

  it('merges with existing results', () => {
    mockStorage['nexus-verify-results'] = JSON.stringify({
      'firebase-auth': {
        capabilityId: 'firebase-auth',
        status: 'working',
        checkedAt: '2025-01-01T00:00:00.000Z',
        guidance: { missingEnvKeys: [] },
      },
    });

    const result: ClientVerificationResult = {
      capabilityId: 'firebase-admin',
      status: 'not-configured',
      checkedAt: '2025-01-01T00:00:00.000Z',
      errorCode: 'MISSING_ENV_KEYS',
      errorMessage: 'Missing: FIREBASE_ADMIN_PROJECT_ID',
      guidance: { missingEnvKeys: ['FIREBASE_ADMIN_PROJECT_ID'] },
    };

    saveVerificationResult(result);
    const stored = JSON.parse(mockStorage['nexus-verify-results']);
    expect(stored['firebase-auth']).toBeDefined();
    expect(stored['firebase-admin']).toBeDefined();
    expect(stored['firebase-admin'].status).toBe('not-configured');
  });
});

describe('saveVerificationResults', () => {
  it('saves multiple results replacing existing', () => {
    mockStorage['nexus-verify-results'] = JSON.stringify({
      'old-key': { capabilityId: 'old-key', status: 'working', checkedAt: '', guidance: { missingEnvKeys: [] } },
    });

    const results: ClientVerificationResult[] = [
      { capabilityId: 'firebase-auth', status: 'working', checkedAt: '2025-01-01T00:00:00.000Z', guidance: { missingEnvKeys: [] } },
      { capabilityId: 'firebase-admin', status: 'not-configured', checkedAt: '2025-01-01T00:00:00.000Z', errorCode: 'MISSING_ENV_KEYS', guidance: { missingEnvKeys: ['FIREBASE_ADMIN_PROJECT_ID'] } },
    ];

    saveVerificationResults(results);
    const stored = JSON.parse(mockStorage['nexus-verify-results']);
    expect(stored['firebase-auth']).toBeDefined();
    expect(stored['firebase-admin']).toBeDefined();
    expect(stored['old-key']).toBeUndefined();
  });
});

describe('clearVerificationResults', () => {
  it('removes the storage key', () => {
    mockStorage['nexus-verify-results'] = 'something';
    clearVerificationResults();
    expect(mockRemoveItem).toHaveBeenCalledWith('nexus-verify-results');
    expect(mockStorage['nexus-verify-results']).toBeUndefined();
  });
});

describe('mergeResults', () => {
  it('merges server results into stored results', () => {
    const stored: Record<string, ClientVerificationResult> = {
      'firebase-auth': { capabilityId: 'firebase-auth', status: 'working', checkedAt: '2025-01-01T00:00:00.000Z', guidance: { missingEnvKeys: [] } },
    };
    const serverResults: ClientVerificationResult[] = [
      { capabilityId: 'firebase-admin', status: 'not-configured', checkedAt: '2025-01-01T00:00:00.000Z', guidance: { missingEnvKeys: ['FIREBASE_ADMIN_PROJECT_ID'] } },
    ];

    const merged = mergeResults(serverResults, stored);
    expect(merged['firebase-auth']).toBeDefined();
    expect(merged['firebase-admin']).toBeDefined();
  });

  it('server results override stored results', () => {
    const stored: Record<string, ClientVerificationResult> = {
      'firebase-auth': { capabilityId: 'firebase-auth', status: 'working', checkedAt: 'old-date', guidance: { missingEnvKeys: [] } },
    };
    const serverResults: ClientVerificationResult[] = [
      { capabilityId: 'firebase-auth', status: 'not-configured', checkedAt: 'new-date', guidance: { missingEnvKeys: ['NEXT_PUBLIC_FIREBASE_API_KEY'] } },
    ];

    const merged = mergeResults(serverResults, stored);
    expect(merged['firebase-auth'].checkedAt).toBe('new-date');
    expect(merged['firebase-auth'].guidance.missingEnvKeys).toContain('NEXT_PUBLIC_FIREBASE_API_KEY');
  });
});
