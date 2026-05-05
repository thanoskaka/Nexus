import { describe, expect, it } from 'vitest';
import {
  getKeySourceDetails, getOverallStorageControl, getWhereDataLives,
  getWhereKeysLive, getUserControls, computeStorageControlSnapshot,
} from './storageControlStatus';
import type { ProviderStatusInput } from './storageControlStatus';

const hostedDefaults: ProviderStatusInput[] = [
  { providerId: 'gemini', hasHostedDefault: true, userKeyConfigured: false, preference: 'hosted' },
  { providerId: 'deepseek', hasHostedDefault: false, userKeyConfigured: false, preference: 'hosted' },
  { providerId: 'massive', hasHostedDefault: true, userKeyConfigured: false, preference: 'hosted' },
  { providerId: 'alpha_vantage', hasHostedDefault: true, userKeyConfigured: false, preference: 'hosted' },
  { providerId: 'logo_dev', hasHostedDefault: true, userKeyConfigured: false, preference: 'hosted' },
];

const withUserKey: ProviderStatusInput[] = [
  { providerId: 'gemini', hasHostedDefault: true, userKeyConfigured: true, preference: 'user' },
  { providerId: 'deepseek', hasHostedDefault: false, userKeyConfigured: false, preference: 'hosted' },
  { providerId: 'massive', hasHostedDefault: true, userKeyConfigured: false, preference: 'hosted' },
  { providerId: 'alpha_vantage', hasHostedDefault: true, userKeyConfigured: false, preference: 'hosted' },
  { providerId: 'logo_dev', hasHostedDefault: true, userKeyConfigured: false, preference: 'hosted' },
];

describe('getOverallStorageControl', () => {
  it('nexus-hosted when hosted + no user keys', () => {
    const details = getKeySourceDetails('hosted', hostedDefaults);
    expect(getOverallStorageControl('hosted', details)).toBe('nexus-hosted');
  });
  it('mixed when hosted + some user keys', () => {
    const details = getKeySourceDetails('hosted', withUserKey);
    expect(getOverallStorageControl('hosted', details)).toBe('mixed');
  });
  it('self-owned when selfOwned', () => {
    const details = getKeySourceDetails('selfOwned', hostedDefaults);
    expect(getOverallStorageControl('selfOwned', details)).toBe('self-owned');
  });
  it('self-owned when selfOwned even with user keys', () => {
    const details = getKeySourceDetails('selfOwned', withUserKey);
    expect(getOverallStorageControl('selfOwned', details)).toBe('self-owned');
  });
});

describe('getKeySourceDetails', () => {
  it('hosted-default mode for hosted with defaults', () => {
    const gemini = getKeySourceDetails('hosted', hostedDefaults).find(d => d.providerId === 'gemini')!;
    expect(gemini.activeMode).toBe('hosted-default');
  });
  it('user-key mode when user key configured', () => {
    const gemini = getKeySourceDetails('hosted', withUserKey).find(d => d.providerId === 'gemini')!;
    expect(gemini.activeMode).toBe('user-key');
  });
  it('no hosted defaults in selfOwned mode', () => {
    for (const d of getKeySourceDetails('selfOwned', hostedDefaults)) {
      expect(d.hasHostedDefault).toBe(false);
    }
  });
  it('none mode for selfOwned without user key', () => {
    for (const d of getKeySourceDetails('selfOwned', hostedDefaults)) {
      expect(d.activeMode).toBe('none');
    }
  });
});

describe('getWhereDataLives', () => {
  it('describes hosted for hosted mode', () => {
    expect(getWhereDataLives('hosted')).toContain('Nexus-hosted Firebase');
  });
  it('describes own for self-owned', () => {
    expect(getWhereDataLives('selfOwned')).toContain('your own Firebase');
  });
});

describe('getWhereKeysLive', () => {
  it('mentions hosted defaults', () => {
    expect(getWhereKeysLive(getKeySourceDetails('hosted', hostedDefaults))).toContain('Nexus-hosted API keys');
  });
  it('mentions user keys', () => {
    expect(getWhereKeysLive(getKeySourceDetails('hosted', withUserKey))).toContain('encrypted on the server');
  });
});

describe('getUserControls', () => {
  it('mentions own Firebase for self-owned', () => {
    expect(getUserControls('selfOwned').some(c => c.includes('your own Firebase project'))).toBe(true);
  });
  it('mentions Nexus-hosted Firebase for hosted', () => {
    expect(getUserControls('hosted').some(c => c.includes('Nexus-hosted Firebase'))).toBe(true);
  });
});

describe('computeStorageControlSnapshot', () => {
  it('nexus-hosted snapshot for hosted + all defaults', () => {
    const s = computeStorageControlSnapshot('hosted', hostedDefaults);
    expect(s.overall).toBe('nexus-hosted');
    expect(s.providers.length).toBe(5);
  });
  it('mixed snapshot for hosted + user key', () => {
    expect(computeStorageControlSnapshot('hosted', withUserKey).overall).toBe('mixed');
  });
  it('self-owned snapshot', () => {
    expect(computeStorageControlSnapshot('selfOwned', hostedDefaults).overall).toBe('self-owned');
  });
  it('snapshot includes all providers', () => {
    const ids = computeStorageControlSnapshot('hosted', hostedDefaults).providers.map(p => p.providerId);
    expect(ids).toEqual(['gemini', 'deepseek', 'massive', 'alpha_vantage', 'logo_dev']);
  });
});
