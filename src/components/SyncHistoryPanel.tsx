import React from 'react';
import { RefreshCw, Clock, CheckCircle2, AlertTriangle, XCircle, Database, Users } from 'lucide-react';
import { Button } from './ui/button';
import type { UpstoxConnectionSummary } from '../lib/connectedAccountsApi';

type SyncRun = NonNullable<UpstoxConnectionSummary['syncRuns']>[number];

function SyncRunStatusBadge({ status }: { status: SyncRun['status'] }) {
  const config: Record<SyncRun['status'], { icon: React.ReactNode; label: string; classes: string }> = {
    success: {
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      label: 'Success',
      classes: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200',
    },
    partial: {
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      label: 'Partial',
      classes: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200',
    },
    failed: {
      icon: <XCircle className="h-3.5 w-3.5" />,
      label: 'Failed',
      classes: 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200',
    },
  };

  const { icon, label, classes } = config[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${classes}`}>
      {icon}
      {label}
    </span>
  );
}

function formatTimestamp(value?: number) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function SyncRunRow({ run }: { run: SyncRun }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-slate-100 bg-white p-3 text-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <SyncRunStatusBadge status={run.status} />
          <span className="text-xs text-slate-500 dark:text-slate-400">
            <Clock className="mr-1 inline-block h-3 w-3 align-text-bottom" />
            {formatTimestamp(run.startedAt)}
          </span>
        </div>
        {run.finishedAt && (
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Duration: {Math.round((run.finishedAt - run.startedAt) / 1000)}s
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
        <span className="inline-flex items-center gap-1">
          <Database className="h-3 w-3" />
          {run.metrics.holdingsUpserted} holdings
        </span>
        <span className="inline-flex items-center gap-1">
          <Users className="h-3 w-3" />
          {run.metrics.accountsUpserted} accounts
        </span>
        {run.metrics.holdingsDeactivated > 0 && (
          <span className="text-amber-600 dark:text-amber-400">
            {run.metrics.holdingsDeactivated} deactivated
          </span>
        )}
      </div>

      {run.errorSummary && (
        <p className="text-xs text-rose-600 dark:text-rose-400">{run.errorSummary}</p>
      )}
    </div>
  );
}

export type SyncHistoryPanelProps = {
  syncRuns: SyncRun[] | undefined;
  loading: boolean;
  onRefresh: () => void;
};

export function SyncHistoryPanel({ syncRuns, loading, onRefresh }: SyncHistoryPanelProps) {
  const isEmpty = !syncRuns || syncRuns.length === 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <Clock className="h-4 w-4" />
          Sync History
        </h3>
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading} className="rounded-full text-xs">
          <RefreshCw className={`mr-1 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {isEmpty ? (
        <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
          No sync has run yet. Connect your account and trigger a sync to see history here.
        </p>
      ) : (
        <div className="space-y-2">
          {syncRuns.map((run) => (
            <div key={run.id}>
              <SyncRunRow run={run} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
