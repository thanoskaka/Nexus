import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WORKSPACE_PREFERENCES,
  getWorkspacePreferencesKey,
  normalizeWorkspacePreferences,
  type WorkspacePreferences,
} from './userPreferences';

describe('workspace preferences', () => {
  it('provides sensible defaults', () => {
    expect(DEFAULT_WORKSPACE_PREFERENCES.workspaceName).toBe('');
    expect(DEFAULT_WORKSPACE_PREFERENCES.baseCurrency).toBe('CAD');
    expect(DEFAULT_WORKSPACE_PREFERENCES.primaryRegion).toBe('Canada');
    expect(DEFAULT_WORKSPACE_PREFERENCES.householdLabel).toBe('');
    expect(DEFAULT_WORKSPACE_PREFERENCES.defaultMarketPreference).toBe('Canada');
  });

  it('generates a scoped IndexedDB key per user', () => {
    expect(getWorkspacePreferencesKey('uid-1')).toBe('workspace-preferences:uid-1');
    expect(getWorkspacePreferencesKey('uid-2')).toBe('workspace-preferences:uid-2');
  });

  it('fills missing fields with defaults', () => {
    const result = normalizeWorkspacePreferences({ workspaceName: 'Family' });
    expect(result.workspaceName).toBe('Family');
    expect(result.baseCurrency).toBe('CAD');
    expect(result.primaryRegion).toBe('Canada');
    expect(result.householdLabel).toBe('');
    expect(result.defaultMarketPreference).toBe('Canada');
  });

  it('returns full defaults when given null', () => {
    const result = normalizeWorkspacePreferences(null as unknown as undefined);
    expect(result).toEqual(DEFAULT_WORKSPACE_PREFERENCES);
  });

  it('returns full defaults when given undefined', () => {
    const result = normalizeWorkspacePreferences(undefined);
    expect(result).toEqual(DEFAULT_WORKSPACE_PREFERENCES);
  });

  it('preserves all fields when given complete preferences', () => {
    const custom: WorkspacePreferences = {
      workspaceName: 'Smith Family Wealth',
      baseCurrency: 'USD',
      primaryRegion: 'US',
      householdLabel: 'The Smiths',
      defaultMarketPreference: 'Global',
    };
    const result = normalizeWorkspacePreferences(custom);
    expect(result).toEqual(custom);
  });
});
