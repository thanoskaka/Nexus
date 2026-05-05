import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CHECKLIST_ITEM_IDS,
  CHECKLIST_ITEMS,
  CHECKLIST_STORAGE_KEY,
  type ChecklistItemId,
  type ChecklistItemState,
  type ChecklistState,
} from '../lib/checklistTypes';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { CheckCircle2, Circle, ChevronRight, ExternalLink, Rocket, XCircle } from 'lucide-react';
import { recordEvent } from '../store/setupHistory';

const ITEM_LABELS: Record<ChecklistItemId, { title: string; description: string }> = {
  [CHECKLIST_ITEM_IDS.SIGN_IN]: {
    title: 'Sign in and portfolio loaded',
    description: 'Authenticate with Google and access your shared portfolio.',
  },
  [CHECKLIST_ITEM_IDS.ADD_FIRST_ASSET]: {
    title: 'Add your first asset',
    description: 'Track any holding manually — stocks, mutual funds, gold, and more.',
  },
  [CHECKLIST_ITEM_IDS.CONFIGURE_ADMIN]: {
    title: 'Configure Firebase / Admin setup',
    description: 'Set server-side credentials for connected accounts and AI features.',
  },
  [CHECKLIST_ITEM_IDS.CONFIGURE_PRICE_PROVIDERS]: {
    title: 'Configure price providers',
    description: 'Set up API keys for live market-data pricing.',
  },
  [CHECKLIST_ITEM_IDS.CONNECT_PROVIDER]: {
    title: 'Connect optional provider',
    description: 'Link Upstox or Splitwise for cloud-synced holdings and expenses.',
  },
  [CHECKLIST_ITEM_IDS.IMPORT_HOLDINGS]: {
    title: 'Import holdings',
    description: 'Bulk-import via CAS file, CSV, or screenshot with AI extraction.',
  },
  [CHECKLIST_ITEM_IDS.ADD_AI_KEY]: {
    title: 'Add AI key',
    description: 'Enable AI features: portfolio Q&A and screenshot OCR.',
  },
  [CHECKLIST_ITEM_IDS.REVIEW_DOCS]: {
    title: 'Review docs / help',
    description: 'Learn about workflows, providers, and configuration options.',
  },
};

const ITEM_ACTIONS: Record<ChecklistItemId, { label: string; target: 'settings' | 'docs' | null; section?: string } | null> = {
  [CHECKLIST_ITEM_IDS.SIGN_IN]: null,
  [CHECKLIST_ITEM_IDS.ADD_FIRST_ASSET]: { label: 'Go', target: 'settings', section: 'data-management' },
  [CHECKLIST_ITEM_IDS.CONFIGURE_ADMIN]: { label: 'Go', target: 'docs', section: undefined },
  [CHECKLIST_ITEM_IDS.CONFIGURE_PRICE_PROVIDERS]: { label: 'Go', target: 'settings', section: 'price-providers' },
  [CHECKLIST_ITEM_IDS.CONNECT_PROVIDER]: { label: 'Go', target: 'settings', section: 'integrations' },
  [CHECKLIST_ITEM_IDS.IMPORT_HOLDINGS]: { label: 'Go', target: 'settings', section: 'data-management' },
  [CHECKLIST_ITEM_IDS.ADD_AI_KEY]: { label: 'Go', target: 'settings', section: 'price-providers' },
  [CHECKLIST_ITEM_IDS.REVIEW_DOCS]: { label: 'Open Docs', target: 'docs', section: undefined },
};

function loadManualState(): ChecklistState {
  try {
    const raw = window.localStorage.getItem(CHECKLIST_STORAGE_KEY);
    if (!raw) return {} as ChecklistState;
    return JSON.parse(raw) as ChecklistState;
  } catch {
    return {} as ChecklistState;
  }
}

function saveManualState(state: ChecklistState) {
  try {
    window.localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(state));
  } catch {
  }
}

export interface GettingStartedChecklistProps {
  assetsCount: number;
  upstoxConnected: boolean;
  splitwiseConnected: boolean;
  aiKeyConfigured: boolean;
  onNavigateToSettings?: (section: string) => void;
  onNavigateToDocs?: () => void;
}

export function GettingStartedChecklist({
  assetsCount,
  upstoxConnected,
  splitwiseConnected,
  aiKeyConfigured,
  onNavigateToSettings,
  onNavigateToDocs,
}: GettingStartedChecklistProps) {
  const [manualState, setManualState] = useState<ChecklistState>(loadManualState);
  const [adminHealthChecked, setAdminHealthChecked] = useState(false);
  const [adminHealthy, setAdminHealthy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/health')
      .then((res) => {
        if (!cancelled) {
          setAdminHealthy(res.ok);
          setAdminHealthChecked(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAdminHealthy(false);
          setAdminHealthChecked(true);
        }
      });
    return () => { cancelled = true; };
  }, []);

  const autoComplete: Record<ChecklistItemId, boolean> = useMemo(() => ({
    [CHECKLIST_ITEM_IDS.SIGN_IN]: true,
    [CHECKLIST_ITEM_IDS.ADD_FIRST_ASSET]: assetsCount > 0,
    [CHECKLIST_ITEM_IDS.CONFIGURE_ADMIN]: adminHealthy,
    [CHECKLIST_ITEM_IDS.CONFIGURE_PRICE_PROVIDERS]: false,
    [CHECKLIST_ITEM_IDS.CONNECT_PROVIDER]: upstoxConnected || splitwiseConnected,
    [CHECKLIST_ITEM_IDS.IMPORT_HOLDINGS]: assetsCount > 0,
    [CHECKLIST_ITEM_IDS.ADD_AI_KEY]: aiKeyConfigured,
    [CHECKLIST_ITEM_IDS.REVIEW_DOCS]: false,
  }), [assetsCount, upstoxConnected, splitwiseConnected, aiKeyConfigured, adminHealthy]);

  const derivedState: Record<ChecklistItemId, ChecklistItemState> = useMemo(() => {
    const state: Record<string, ChecklistItemState> = {};
    for (const id of CHECKLIST_ITEMS) {
      const manual = manualState[id];
      if (manual === 'done') {
        state[id] = 'done';
      } else if (manual === 'skipped') {
        state[id] = 'skipped';
      } else if (autoComplete[id]) {
        state[id] = 'done';
      } else {
        state[id] = 'pending';
      }
    }
    return state as Record<ChecklistItemId, ChecklistItemState>;
  }, [manualState, autoComplete]);

  const doneCount = useMemo(
    () => CHECKLIST_ITEMS.filter((id) => derivedState[id] === 'done').length,
    [derivedState],
  );
  const allDone = doneCount === CHECKLIST_ITEMS.length;

  const handleSkip = useCallback((id: ChecklistItemId) => {
    setManualState((prev) => {
      const next = { ...prev, [id]: 'skipped' as ChecklistItemState };
      saveManualState(next);
      return next;
    });
  });
    const labels = ITEM_LABELS[id];
    recordEvent('checklist_item_skipped', `Skipped: ${labels.title}`, 'skipped', id);
  }, []);

  const handleDone = useCallback((id: ChecklistItemId) => {
    setManualState((prev) => {
      const next = { ...prev, [id]: 'done' as ChecklistItemState };
      saveManualState(next);
      return next;
    });
  });
    const labels = ITEM_LABELS[id];
    recordEvent('checklist_item_completed', `Completed: ${labels.title}`, 'success', id);
  }, []);

  const handleGo = useCallback((id: ChecklistItemId) => {
    const action = ITEM_ACTIONS[id];
    if (!action) return;
    if (action.target === 'docs') {
      onNavigateToDocs?.();
    } else if (action.target === 'settings' && action.section) {
      onNavigateToSettings?.(action.section);
    }
  }, [onNavigateToSettings, onNavigateToDocs]);

  const handleReset = useCallback(() => {
    setManualState({} as ChecklistState);
    saveManualState({} as ChecklistState);
  }, []);

  if (allDone) return null;

  return (
    <Card className="border-none shadow-sm rounded-2xl mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-[#00875A]" />
            <CardTitle>Getting Started</CardTitle>
          </div>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {doneCount} of {CHECKLIST_ITEMS.length} complete
          </span>
        </div>
        <div className="mt-3 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-2 rounded-full bg-[#00875A] transition-all duration-500"
            style={{ width: `${(doneCount / CHECKLIST_ITEMS.length) * 100}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {CHECKLIST_ITEMS.map((id) => {
          const state = derivedState[id];
          const action = ITEM_ACTIONS[id];
          const labels = ITEM_LABELS[id];

          return (
            <div
              key={id}
              data-testid={`checklist-item-${id}`}
              className={`flex items-start gap-3 rounded-xl border p-3 transition-colors ${
                state === 'done'
                  ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/10'
                  : state === 'skipped'
                    ? 'border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30'
                    : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {state === 'done' ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" data-testid="icon-done" />
                ) : state === 'skipped' ? (
                  <XCircle className="h-5 w-5 text-slate-400" data-testid="icon-skipped" />
                ) : (
                  <Circle className="h-5 w-5 text-slate-300 dark:text-slate-600" data-testid="icon-pending" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className={`text-sm font-semibold ${
                  state === 'done'
                    ? 'text-emerald-800 dark:text-emerald-200'
                    : state === 'skipped'
                      ? 'text-slate-400 dark:text-slate-500'
                      : 'text-slate-900 dark:text-white'
                }`}>
                  {labels.title}
                </div>
                <div className={`text-xs ${
                  state === 'skipped'
                    ? 'text-slate-400 dark:text-slate-500'
                    : 'text-slate-500 dark:text-slate-400'
                }`}>
                  {labels.description}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {state === 'pending' && action && (
                  <Button
                    size="sm"
                    className="rounded-full bg-[#00875A] text-white hover:bg-[#007A51] h-8 px-3 text-xs"
                    onClick={() => handleGo(id)}
                    data-testid={`action-go-${id}`}
                  >
                    {action.label}
                    {action.target === 'docs' ? (
                      <ExternalLink className="ml-1 h-3 w-3" />
                    ) : (
                      <ChevronRight className="ml-1 h-3 w-3" />
                    )}
                  </Button>
                )}
                {state === 'pending' && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                      onClick={() => handleSkip(id)}
                      data-testid={`action-skip-${id}`}
                    >
                      Skip
                    </Button>
                    {!autoComplete[id] && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs text-slate-500 hover:text-emerald-700 dark:text-slate-400 dark:hover:text-emerald-200"
                        onClick={() => handleDone(id)}
                        data-testid={`action-done-${id}`}
                      >
                        Done
                      </Button>
                    )}
                  </>
                )}
                {state === 'skipped' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs text-slate-500 dark:text-slate-400"
                    onClick={() => handleDone(id)}
                    data-testid={`action-undo-skip-${id}`}
                  >
                    Undo
                  </Button>
                )}
              </div>
            </div>
          );
        })}
        {doneCount > 0 && doneCount < CHECKLIST_ITEMS.length && (
          <div className="pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-slate-500 dark:text-slate-400"
              onClick={handleReset}
              data-testid="action-reset"
            >
              Reset checklist
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
