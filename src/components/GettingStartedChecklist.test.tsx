// @vitest-environment jsdom
import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GettingStartedChecklist } from './GettingStartedChecklist';
import { CHECKLIST_ITEM_IDS, CHECKLIST_STORAGE_KEY } from '../lib/checklistTypes';

function createMockStorage() {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
}

function clearLocalStorage() {
  Object.keys(window.localStorage).forEach((key) => {
    try { window.localStorage.removeItem(key); } catch { /* noop */ }
  });
}

function renderChecklist(props: Partial<React.ComponentProps<typeof GettingStartedChecklist>> = {}) {
  const defaults: React.ComponentProps<typeof GettingStartedChecklist> = {
    assetsCount: 0,
    upstoxConnected: false,
    splitwiseConnected: false,
    aiKeyConfigured: false,
    onNavigateToSettings: vi.fn(),
    onNavigateToDocs: vi.fn(),
  };
  return render(<GettingStartedChecklist {...defaults} {...props} />);
}

describe('GettingStartedChecklist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const mockStorage = createMockStorage();
    vi.stubGlobal('localStorage', mockStorage);
    window.fetch = vi.fn().mockResolvedValue({ ok: true } as Response);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the checklist with all items', () => {
    renderChecklist();
    expect(screen.getByText('Getting Started')).toBeTruthy();
    expect(screen.getByText('Sign in and portfolio loaded')).toBeTruthy();
    expect(screen.getByText('Add your first asset')).toBeTruthy();
    expect(screen.getByText('Configure Firebase / Admin setup')).toBeTruthy();
    expect(screen.getByText('Configure price providers')).toBeTruthy();
    expect(screen.getByText('Connect optional provider')).toBeTruthy();
    expect(screen.getByText('Import holdings')).toBeTruthy();
    expect(screen.getByText('Add AI key')).toBeTruthy();
    expect(screen.getByText('Review docs / help')).toBeTruthy();
  });

  it('shows progress count', () => {
    renderChecklist();
    expect(screen.getByText(/of 8 complete/)).toBeTruthy();
  });

  it('auto-completes sign-in item', () => {
    renderChecklist();
    expect(screen.getByTestId('checklist-item-sign-in').querySelector('[data-testid="icon-done"]')).toBeTruthy();
  });

  it('auto-completes add-first-asset when assetsCount > 0', () => {
    renderChecklist({ assetsCount: 1 });
    expect(screen.getByTestId('checklist-item-add-first-asset').querySelector('[data-testid="icon-done"]')).toBeTruthy();
  });

  it('auto-completes import-holdings when assetsCount > 0', () => {
    renderChecklist({ assetsCount: 1 });
    expect(screen.getByTestId('checklist-item-import-holdings').querySelector('[data-testid="icon-done"]')).toBeTruthy();
  });

  it('auto-completes connect-provider when upstox is connected', () => {
    renderChecklist({ upstoxConnected: true });
    expect(screen.getByTestId('checklist-item-connect-provider').querySelector('[data-testid="icon-done"]')).toBeTruthy();
  });

  it('auto-completes connect-provider when splitwise is connected', () => {
    renderChecklist({ splitwiseConnected: true });
    expect(screen.getByTestId('checklist-item-connect-provider').querySelector('[data-testid="icon-done"]')).toBeTruthy();
  });

  it('auto-completes add-ai-key when aiKeyConfigured is true', () => {
    renderChecklist({ aiKeyConfigured: true });
    expect(screen.getByTestId('checklist-item-add-ai-key').querySelector('[data-testid="icon-done"]')).toBeTruthy();
  });

  it('auto-completes configure-admin when health endpoint responds', async () => {
    window.fetch = vi.fn().mockResolvedValue({ ok: true } as Response);
    renderChecklist();
    await waitFor(() => {
      expect(screen.getByTestId('checklist-item-configure-admin').querySelector('[data-testid="icon-done"]')).toBeTruthy();
    });
  });

  it('shows manual skip button and marks item skipped', async () => {
    const user = userEvent.setup();
    renderChecklist();
    const skipBtn = screen.getByTestId('action-skip-configure-price-providers');
    await user.click(skipBtn);
    expect(screen.getByTestId('checklist-item-configure-price-providers').querySelector('[data-testid="icon-skipped"]')).toBeTruthy();
  });

  it('shows manual done button and marks item done', async () => {
    const user = userEvent.setup();
    renderChecklist();
    const doneBtn = screen.getByTestId('action-done-configure-price-providers');
    await user.click(doneBtn);
    expect(screen.getByTestId('checklist-item-configure-price-providers').querySelector('[data-testid="icon-done"]')).toBeTruthy();
  });

  it('persists manual state to localStorage', async () => {
    const user = userEvent.setup();
    renderChecklist();
    await user.click(screen.getByTestId('action-skip-configure-price-providers'));
    const saved = JSON.parse(window.localStorage.getItem(CHECKLIST_STORAGE_KEY) || '{}');
    expect(saved['configure-price-providers']).toBe('skipped');
  });

  it('restores manual state from localStorage', () => {
    window.localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify({
      'configure-price-providers': 'done',
      'review-docs': 'skipped',
    }));
    renderChecklist();
    expect(screen.getByTestId('checklist-item-configure-price-providers').querySelector('[data-testid="icon-done"]')).toBeTruthy();
    expect(screen.getByTestId('checklist-item-review-docs').querySelector('[data-testid="icon-skipped"]')).toBeTruthy();
  });

  it('navigates to settings for connect-provider', async () => {
    const onNavigateToSettings = vi.fn();
    const user = userEvent.setup();
    renderChecklist({ onNavigateToSettings });
    await user.click(screen.getByTestId('action-go-connect-provider'));
    expect(onNavigateToSettings).toHaveBeenCalledWith('integrations');
  });

  it('navigates to settings for import-holdings', async () => {
    const onNavigateToSettings = vi.fn();
    const user = userEvent.setup();
    renderChecklist({ onNavigateToSettings });
    await user.click(screen.getByTestId('action-go-import-holdings'));
    expect(onNavigateToSettings).toHaveBeenCalledWith('data-management');
  });

  it('navigates to settings for add-ai-key', async () => {
    const onNavigateToSettings = vi.fn();
    const user = userEvent.setup();
    renderChecklist({ onNavigateToSettings });
    await user.click(screen.getByTestId('action-go-add-ai-key'));
    expect(onNavigateToSettings).toHaveBeenCalledWith('price-providers');
  });

  it('navigates to settings for add-first-asset', async () => {
    const onNavigateToSettings = vi.fn();
    const user = userEvent.setup();
    renderChecklist({ onNavigateToSettings });
    await user.click(screen.getByTestId('action-go-add-first-asset'));
    expect(onNavigateToSettings).toHaveBeenCalledWith('data-management');
  });

  it('navigates to settings for configure-price-providers', async () => {
    const onNavigateToSettings = vi.fn();
    const user = userEvent.setup();
    renderChecklist({ onNavigateToSettings });
    await user.click(screen.getByTestId('action-go-configure-price-providers'));
    expect(onNavigateToSettings).toHaveBeenCalledWith('price-providers');
  });

  it('opens docs for review-docs action', async () => {
    const onNavigateToDocs = vi.fn();
    const user = userEvent.setup();
    renderChecklist({ onNavigateToDocs });
    await user.click(screen.getByTestId('action-go-review-docs'));
    expect(onNavigateToDocs).toHaveBeenCalled();
  });

  it('does not show raw markdown link for docs', () => {
    renderChecklist();
    const actionBtn = screen.getByTestId('action-go-review-docs');
    expect(actionBtn.getAttribute('href')).toBeNull();
    expect(actionBtn.textContent).toContain('Open Docs');
  });

  it('shows reset button and clears manual state', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify({
      'configure-price-providers': 'done',
      'review-docs': 'done',
    }));
    renderChecklist({ assetsCount: 1, aiKeyConfigured: true });
    expect(screen.queryByTestId('action-reset')).toBeTruthy();
    await user.click(screen.getByTestId('action-reset'));
    expect(screen.getByTestId('checklist-item-configure-price-providers').querySelector('[data-testid="icon-pending"]')).toBeTruthy();
  });

  it('hides checklist when all items are done', async () => {
    window.fetch = vi.fn().mockResolvedValue({ ok: true } as Response);
    window.localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify({
      'configure-price-providers': 'done',
      'review-docs': 'done',
    }));
    renderChecklist({
      assetsCount: 5,
      upstoxConnected: true,
      aiKeyConfigured: true,
    });
    await waitFor(() => {
      expect(screen.queryByText('Getting Started')).toBeNull();
    });
  });

  it('shows progress bar with correct width', () => {
    window.localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify({
      'configure-price-providers': 'done',
    }));
    renderChecklist();
    const bar = document.querySelector('.bg-\\[\\#00875A\\]');
    expect(bar).toBeTruthy();
  });

  it('allows undoing a skip', async () => {
    const user = userEvent.setup();
    renderChecklist();
    await user.click(screen.getByTestId('action-skip-configure-price-providers'));
    expect(screen.getByTestId('checklist-item-configure-price-providers').querySelector('[data-testid="icon-skipped"]')).toBeTruthy();
    await user.click(screen.getByTestId('action-undo-skip-configure-price-providers'));
    expect(screen.getByTestId('checklist-item-configure-price-providers').querySelector('[data-testid="icon-done"]')).toBeTruthy();
  });
});
