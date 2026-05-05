// @vitest-environment happy-dom
import { describe, expect, it, beforeEach } from 'vitest';
import { recordEvent, getSetupHistory, clearSetupHistory } from './setupHistory';

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
      get length() { return store.size; },
      key: (index: number) => Array.from(store.keys())[index] ?? null,
    },
    writable: true,
    configurable: true,
  });
});

describe('setupHistory store', () => {
  it('starts with empty history', () => {
    expect(getSetupHistory()).toEqual([]);
  });

  it('records an event and returns it in history', () => {
    recordEvent('workspace_mode_selected', 'Selected hosted mode', 'success', 'Nexus Hosted');
    const history = getSetupHistory();
    expect(history).toHaveLength(1);
    expect(history[0].type).toBe('workspace_mode_selected');
    expect(history[0].label).toBe('Selected hosted mode');
    expect(history[0].status).toBe('success');
    expect(history[0].details).toBe('Nexus Hosted');
    expect(typeof history[0].id).toBe('string');
    expect(history[0].id.length).toBeGreaterThan(0);
    expect(typeof history[0].timestamp).toBe('number');
  });

  it('stores most recent events first', () => {
    recordEvent('key_saved', 'Key A saved', 'success');
    recordEvent('key_removed', 'Key B removed', 'info');
    const history = getSetupHistory();
    expect(history[0].type).toBe('key_removed');
    expect(history[1].type).toBe('key_saved');
  });

  it('clears all history', () => {
    recordEvent('import_run', 'Imported 5 assets', 'success');
    recordEvent('export_run', 'Exported portfolio', 'success');
    expect(getSetupHistory()).toHaveLength(2);
    clearSetupHistory();
    expect(getSetupHistory()).toEqual([]);
  });

  it('caps history at MAX_EVENTS (200)', () => {
    for (let i = 0; i < 250; i++) {
      recordEvent('import_run', `Import ${i}`, 'success');
    }
    const history = getSetupHistory();
    expect(history.length).toBeLessThanOrEqual(200);
  });

  it('never logs secrets or raw env values', () => {
    recordEvent('key_saved', 'Alpha Vantage API key saved', 'success');
    recordEvent('key_saved', 'Finnhub API key saved', 'success');
    recordEvent('key_removed', 'Alpha Vantage API key removed', 'info');

    const history = getSetupHistory();
    const allText = JSON.stringify(history);

    expect(allText).not.toContain('sk-');
    expect(allText).not.toContain('AIza');
    expect(allText).not.toContain('Bearer');
    expect(allText).not.toContain('private_key');
    expect(allText).not.toContain('apiKey');
    expect(allText).not.toContain('client_secret');
    expect(allText).not.toContain('accessToken');
    expect(allText).not.toContain('GEMINI');
    expect(allText).not.toContain('FINNHUB');
  });

  it('stores details without sensitive content', () => {
    recordEvent('provider_preference_changed', 'Price provider changed', 'success', 'Primary: yahoo, Secondary: alphavantage');
    const history = getSetupHistory();
    expect(history[0].details).toBe('Primary: yahoo, Secondary: alphavantage');
    const allText = JSON.stringify(history);
    expect(allText).not.toContain('API_KEY');
  });

  it('returns a unique id for each event', () => {
    recordEvent('checklist_item_completed', 'Done', 'success');
    recordEvent('checklist_item_completed', 'Done again', 'success');
    const history = getSetupHistory();
    expect(history[0].id).not.toBe(history[1].id);
    expect(history[0].id).toBeTruthy();
    expect(history[1].id).toBeTruthy();
  });

  it('handles corrupted localStorage gracefully', () => {
    store.set('nexus.setup-history.v1', 'not-json{{}');
    const history = getSetupHistory();
    expect(history).toEqual([]);
  });

  it('handles non-array localStorage data gracefully', () => {
    store.set('nexus.setup-history.v1', JSON.stringify({ foo: 'bar' }));
    const history = getSetupHistory();
    expect(history).toEqual([]);
  });

  it('records checklist item events with proper statuses', () => {
    recordEvent('checklist_item_completed', 'Signed in and portfolio loaded', 'success', 'sign-in');
    recordEvent('checklist_item_skipped', 'Add AI key', 'skipped', 'add-ai-key');

    const history = getSetupHistory();
    expect(history[0].type).toBe('checklist_item_skipped');
    expect(history[0].status).toBe('skipped');
    expect(history[1].type).toBe('checklist_item_completed');
    expect(history[1].status).toBe('success');
  });
});
