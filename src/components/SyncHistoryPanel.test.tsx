// @vitest-environment happy-dom
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SyncHistoryPanel } from './SyncHistoryPanel';

const mockSuccessRuns = [
  {
    id: 'run-1',
    startedAt: 1700000000000,
    finishedAt: 1700000010000,
    status: 'success' as const,
    metrics: { accountsUpserted: 2, holdingsUpserted: 15, holdingsDeactivated: 1 },
  },
  {
    id: 'run-2',
    startedAt: 1699900000000,
    finishedAt: 1699900010000,
    status: 'success' as const,
    metrics: { accountsUpserted: 1, holdingsUpserted: 10, holdingsDeactivated: 0 },
  },
];

const mockFailedRuns = [
  {
    id: 'run-3',
    startedAt: 1700000000000,
    finishedAt: 1700000005000,
    status: 'failed' as const,
    metrics: { accountsUpserted: 0, holdingsUpserted: 0, holdingsDeactivated: 0 },
    errorSummary: 'Token expired. Please reconnect Upstox.',
  },
];

const mockPartialRuns = [
  {
    id: 'run-4',
    startedAt: 1700000000000,
    finishedAt: 1700000008000,
    status: 'partial' as const,
    metrics: { accountsUpserted: 1, holdingsUpserted: 3, holdingsDeactivated: 2 },
    errorSummary: 'Some holdings failed to sync due to rate limiting.',
  },
];

describe('SyncHistoryPanel', () => {
  it('shows empty state when syncRuns is undefined', () => {
    render(
      <SyncHistoryPanel syncRuns={undefined} loading={false} onRefresh={() => {}} />,
    );

    expect(screen.getByText('Sync History')).toBeTruthy();
    expect(
      screen.getByText(/No sync has run yet/),
    ).toBeTruthy();
  });

  it('shows empty state when syncRuns is empty array', () => {
    render(
      <SyncHistoryPanel syncRuns={[]} loading={false} onRefresh={() => {}} />,
    );

    expect(
      screen.getByText(/No sync has run yet/),
    ).toBeTruthy();
  });

  it('renders success sync runs', () => {
    render(
      <SyncHistoryPanel syncRuns={mockSuccessRuns} loading={false} onRefresh={() => {}} />,
    );

    expect(screen.getByText('Sync History')).toBeTruthy();
    expect(screen.getAllByText('Success')).toHaveLength(2);
    expect(screen.getByText(/15 holdings/)).toBeTruthy();
    expect(screen.getByText(/2 accounts/)).toBeTruthy();
    expect(screen.getByText(/10 holdings/)).toBeTruthy();
    expect(screen.getByText(/1 accounts/)).toBeTruthy();
    expect(screen.getByText(/1 deactivated/)).toBeTruthy();
    expect(screen.getAllByText(/10s/)).toHaveLength(2);
  });

  it('renders failed sync run with error summary', () => {
    render(
      <SyncHistoryPanel syncRuns={mockFailedRuns} loading={false} onRefresh={() => {}} />,
    );

    expect(screen.getByText('Failed')).toBeTruthy();
    expect(screen.getByText('Token expired. Please reconnect Upstox.')).toBeTruthy();
  });

  it('renders partial sync run with error summary', () => {
    render(
      <SyncHistoryPanel syncRuns={mockPartialRuns} loading={false} onRefresh={() => {}} />,
    );

    expect(screen.getByText('Partial')).toBeTruthy();
    expect(
      screen.getByText(/Some holdings failed to sync due to rate limiting/),
    ).toBeTruthy();
    expect(screen.getByText(/3 holdings/)).toBeTruthy();
    expect(screen.getByText(/2 deactivated/)).toBeTruthy();
  });

  it('calls onRefresh when Refresh button is clicked', async () => {
    const onRefresh = vi.fn();
    const user = userEvent.setup();

    render(
      <SyncHistoryPanel syncRuns={mockSuccessRuns} loading={false} onRefresh={onRefresh} />,
    );

    await user.click(screen.getByText('Refresh'));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('disables Refresh button while loading', () => {
    render(
      <SyncHistoryPanel syncRuns={mockSuccessRuns} loading={true} onRefresh={() => {}} />,
    );

    const button = screen.getByText('Refresh').closest('button');
    expect(button).toBeTruthy();
    expect(button!.hasAttribute('disabled')).toBe(true);
  });
});
