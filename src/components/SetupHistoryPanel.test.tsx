// @vitest-environment happy-dom
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SetupHistoryPanel } from './SetupHistoryPanel';
import type { SetupEvent } from '../store/setupHistory';

const mockEvents: SetupEvent[] = [
  {
    id: 'evt-1',
    timestamp: 1700000000000,
    type: 'workspace_mode_selected',
    label: 'Selected hosted mode',
    status: 'success',
    details: 'Nexus Hosted',
  },
  {
    id: 'evt-2',
    timestamp: 1700000001000,
    type: 'provider_preference_changed',
    label: 'Provider changed',
    status: 'info',
    details: 'Primary: yahoo, Secondary: alphavantage',
  },
  {
    id: 'evt-3',
    timestamp: 1700000002000,
    type: 'checklist_item_skipped',
    label: 'Skipped: Add AI key',
    status: 'skipped',
    details: 'add-ai-key',
  },
];

const mockEventsNoDetails: SetupEvent[] = [
  {
    id: 'evt-4',
    timestamp: 1700000003000,
    type: 'import_run',
    label: 'Imported 10 assets',
    status: 'success',
  },
];

describe('SetupHistoryPanel', () => {
  it('shows empty state when no events', () => {
    render(<SetupHistoryPanel events={[]} onClear={() => {}} />);
    expect(screen.getByText('Setup History')).toBeTruthy();
    expect(screen.getByText(/No setup events recorded yet/)).toBeTruthy();
  });

  it('hides Clear History button when empty', () => {
    render(<SetupHistoryPanel events={[]} onClear={() => {}} />);
    expect(screen.queryByTestId('clear-history-btn')).toBeNull();
  });

  it('renders events with their details', () => {
    render(<SetupHistoryPanel events={mockEvents} onClear={() => {}} />);
    expect(screen.getByText('Setup History')).toBeTruthy();
    expect(screen.getByText('Selected hosted mode')).toBeTruthy();
    expect(screen.getByText('Provider changed')).toBeTruthy();
    expect(screen.getByText('Skipped: Add AI key')).toBeTruthy();
    expect(screen.getByText('Nexus Hosted')).toBeTruthy();
    expect(screen.getByText('Primary: yahoo, Secondary: alphavantage')).toBeTruthy();
    expect(screen.getByText('add-ai-key')).toBeTruthy();
  });

  it('renders status badges correctly', () => {
    render(<SetupHistoryPanel events={mockEvents} onClear={() => {}} />);
    expect(screen.getByText('Done')).toBeTruthy();
    expect(screen.getByText('Info')).toBeTruthy();
    expect(screen.getByText('Skipped')).toBeTruthy();
  });

  it('renders events without details', () => {
    render(<SetupHistoryPanel events={mockEventsNoDetails} onClear={() => {}} />);
    expect(screen.getByText('Imported 10 assets')).toBeTruthy();
    expect(screen.getByText('Done')).toBeTruthy();
  });

  it('shows clear button when events exist', () => {
    render(<SetupHistoryPanel events={mockEvents} onClear={() => {}} />);
    expect(screen.getByTestId('clear-history-btn')).toBeTruthy();
  });

  it('shows confirm state on first clear click', async () => {
    const user = userEvent.setup();
    render(<SetupHistoryPanel events={mockEvents} onClear={() => {}} />);
    await user.click(screen.getByTestId('clear-history-btn'));
    expect(screen.getByText('Confirm Clear')).toBeTruthy();
  });

  it('calls onClear on second click (confirm)', async () => {
    const onClear = vi.fn();
    const user = userEvent.setup();
    render(<SetupHistoryPanel events={mockEvents} onClear={onClear} />);
    await user.click(screen.getByTestId('clear-history-btn'));
    await user.click(screen.getByTestId('clear-history-btn'));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('does not call onClear on first click', async () => {
    const onClear = vi.fn();
    const user = userEvent.setup();
    render(<SetupHistoryPanel events={mockEvents} onClear={onClear} />);
    await user.click(screen.getByTestId('clear-history-btn'));
    expect(onClear).toHaveBeenCalledTimes(0);
  });
});
