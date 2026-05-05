import React from 'react';
import { Clock, Trash2, CheckCircle2, Info, MinusCircle } from 'lucide-react';
import { Button } from './ui/button';
import type { SetupEvent, SetupEventStatus } from '../store/setupHistory';

function EventStatusBadge({ status }: { status: SetupEventStatus }) {
  const config: Record<SetupEventStatus, { icon: React.ReactNode; label: string; classes: string }> = {
    success: {
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      label: 'Done',
      classes: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200',
    },
    info: {
      icon: <Info className="h-3.5 w-3.5" />,
      label: 'Info',
      classes: 'bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200',
    },
    skipped: {
      icon: <MinusCircle className="h-3.5 w-3.5" />,
      label: 'Skipped',
      classes: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
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

function formatTimestamp(value: number): string {
  return new Date(value).toLocaleString();
}

function EventRow({ event }: { event: SetupEvent }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-slate-100 bg-white p-3 text-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <EventStatusBadge status={event.status} />
          <span className="font-medium text-slate-900 dark:text-white text-sm">
            {event.label}
          </span>
        </div>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          <Clock className="mr-1 inline-block h-3 w-3 align-text-bottom" />
          {formatTimestamp(event.timestamp)}
        </span>
      </div>
      {event.details && (
        <p className="text-xs text-slate-500 dark:text-slate-400 ml-0">
          {event.details}
        </p>
      )}
    </div>
  );
}

export type SetupHistoryPanelProps = {
  events: SetupEvent[];
  onClear: () => void;
};

export function SetupHistoryPanel({ events, onClear }: SetupHistoryPanelProps) {
  const [confirmClear, setConfirmClear] = React.useState(false);
  const isEmpty = events.length === 0;

  const handleClear = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    onClear();
    setConfirmClear(false);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <Clock className="h-4 w-4" />
          Setup History
        </h3>
        <div className="flex items-center gap-2">
          {!isEmpty && (
            <Button
              variant={confirmClear ? 'destructive' : 'outline'}
              size="sm"
              onClick={handleClear}
              className="rounded-full text-xs"
              data-testid="clear-history-btn"
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              {confirmClear ? 'Confirm Clear' : 'Clear History'}
            </Button>
          )}
        </div>
      </div>

      {isEmpty ? (
        <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
          No setup events recorded yet. Actions like changing provider settings or running imports will appear here.
        </p>
      ) : (
        <div className="space-y-2">
          {events.map((event) => (
            <div key={event.id}>
              <EventRow event={event} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
