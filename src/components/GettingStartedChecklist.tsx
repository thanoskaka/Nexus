import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
  X,
  ListTodo,
  Plus,
  Link2,
  Settings,
  FileText,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import { fetchSetupStatus, type SetupStatusResponse } from '../lib/setupStatusApi';

type ChecklistCategory = 'required' | 'recommended' | 'optional';
type ChecklistItemStatus = 'done' | 'pending';

interface ChecklistItemDef {
  key: string;
  label: string;
  description: string;
  category: ChecklistCategory;
  status: ChecklistItemStatus;
  actionLabel: string;
  onAction: () => void;
  actionIcon?: React.ReactNode;
}

const DISMISS_STORAGE_KEY = 'nexus-checklist-dismissed';
const COLLAPSE_STORAGE_KEY = 'nexus-checklist-collapsed';

function getStored(key: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') return fallback;
  const val = localStorage.getItem(key);
  if (val === null) return fallback;
  return val === 'true';
}

function setStored(key: string, value: boolean) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, String(value));
}

export function GettingStartedChecklist({
  assetsLength,
  onNavigate,
  onAddAsset,
}: {
  assetsLength: number;
  onNavigate: (view: 'dashboard' | 'assets' | 'settings', tab?: string) => void;
  onAddAsset: () => void;
}) {
  const [collapsed, setCollapsed] = useState(() => getStored(COLLAPSE_STORAGE_KEY, false));
  const [dismissed, setDismissed] = useState(() => getStored(DISMISS_STORAGE_KEY, false));
  const [setupStatus, setSetupStatus] = useState<SetupStatusResponse | null>(null);

  useEffect(() => {
    setStored(COLLAPSE_STORAGE_KEY, collapsed);
  }, [collapsed]);

  useEffect(() => {
    setStored(DISMISS_STORAGE_KEY, dismissed);
  }, [dismissed]);

  useEffect(() => {
    if (dismissed) return;
    fetchSetupStatus()
      .then(setSetupStatus)
      .catch(() => setSetupStatus(null));
  }, [dismissed]);

  const handleDismiss = useCallback(() => setDismissed(true), []);
  const handleToggleCollapse = useCallback(() => setCollapsed((p) => !p), []);
  const handleReset = useCallback(() => {
    setDismissed(false);
    setCollapsed(false);
  }, []);

  if (dismissed) return null;

  const hasAssets = assetsLength > 0;

  const items: ChecklistItemDef[] = [
    {
      key: 'signed-in',
      label: 'Sign in & portfolio loaded',
      description: 'You are signed in and your portfolio workspace is ready.',
      category: 'required',
      status: 'done',
      actionLabel: '',
      onAction: () => {},
    },
    {
      key: 'add-asset',
      label: 'Add your first manual asset',
      description: 'Enter a holding manually to start populating your portfolio.',
      category: 'required',
      status: hasAssets ? 'done' : 'pending',
      actionLabel: 'Add Asset',
      onAction: onAddAsset,
      actionIcon: <Plus className="h-3 w-3 mr-1" />,
    },
    {
      key: 'firebase-setup',
      label: 'Configure base setup',
      description: setupStatus?.features.firebaseAdmin
        ? 'Firebase Admin SDK is configured.'
        : 'Set up Firebase Admin for server-side features (required for providers, AI).',
      category: 'required',
      status: setupStatus?.features.firebaseAdmin ? 'done' : 'pending',
      actionLabel: 'View Setup Guide',
      onAction: () => onNavigate('settings'),
    },
    {
      key: 'connect-provider',
      label: 'Connect an optional provider',
      description: 'Sync Upstox holdings or Splitwise shared expenses.',
      category: 'recommended',
      status:
        setupStatus?.features.upstoxConnectedAccounts || setupStatus?.features.splitwise
          ? 'done'
          : 'pending',
      actionLabel: 'Go to Integrations',
      onAction: () => onNavigate('settings', 'integrations'),
      actionIcon: <Link2 className="h-3 w-3 mr-1" />,
    },
    {
      key: 'import-holdings',
      label: 'Import holdings',
      description: 'Upload a CAS statement PDF or a screenshot for AI-powered import.',
      category: 'recommended',
      status: 'pending',
      actionLabel: 'Import',
      onAction: () => onNavigate('settings', 'data'),
      actionIcon: <FileText className="h-3 w-3 mr-1" />,
    },
    {
      key: 'ai-key',
      label: 'Add AI key (optional)',
      description: 'Connect Gemini or DeepSeek for the AI assistant and screenshot OCR.',
      category: 'optional',
      status: setupStatus?.features.aiAssistant ? 'done' : 'pending',
      actionLabel: 'AI Settings',
      onAction: () => onNavigate('settings'),
      actionIcon: <Sparkles className="h-3 w-3 mr-1" />,
    },
    {
      key: 'review-docs',
      label: 'Review setup guide',
      description: 'Read about deployment modes, pricing, and all features.',
      category: 'optional',
      status: 'pending',
      actionLabel: 'Open Docs',
      onAction: () => window.open('/docs/setup-modes.md', '_blank'),
      actionIcon: <BookOpen className="h-3 w-3 mr-1" />,
    },
  ];

  const doneCount = items.filter((i) => i.status === 'done').length;
  const totalCount = items.length;
  const allDone = doneCount === totalCount;

  const categoryOrder: ChecklistCategory[] = ['required', 'recommended', 'optional'];
  const grouped = categoryOrder.map((cat) => ({
    category: cat,
    items: items.filter((i) => i.category === cat),
  }));

  return (
    <Card className="border-none shadow-sm rounded-2xl mb-6 bg-white dark:bg-slate-950">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#00875A] shrink-0">
              <ListTodo className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base">Getting Started</CardTitle>
              <CardDescription className="text-xs">
                {allDone
                  ? 'All steps complete! Dismiss this card.'
                  : `${doneCount}/${totalCount} steps complete`}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleToggleCollapse}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              aria-label={collapsed ? 'Expand checklist' : 'Collapse checklist'}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              aria-label="Dismiss checklist"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </CardHeader>
      {!collapsed && (
        <CardContent>
          <div className="space-y-4">
            {grouped.map(
              (group) =>
                group.items.length > 0 && (
                  <div key={group.category}>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {group.category}
                    </h4>
                    <div className="space-y-2">
                      {group.items.map((item) => (
                        <div
                          key={item.key}
                          className={`flex items-start gap-3 rounded-xl border p-3 transition-colors ${
                            item.status === 'done'
                              ? 'border-emerald-100 bg-emerald-50/50 dark:border-emerald-900/30 dark:bg-emerald-950/20'
                              : 'border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-950'
                          }`}
                        >
                          {item.status === 'done' ? (
                            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                          ) : (
                            <Circle className="mt-0.5 h-5 w-5 shrink-0 text-slate-300 dark:text-slate-600" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-sm font-medium ${
                                  item.status === 'done'
                                    ? 'text-emerald-700 line-through dark:text-emerald-300'
                                    : 'text-slate-900 dark:text-white'
                                }`}
                              >
                                {item.label}
                              </span>
                              {item.status === 'done' && item.category === 'required' && (
                                <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                  Done
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                              {item.description}
                            </p>
                          </div>
                          {item.status !== 'done' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex h-7 shrink-0 items-center gap-0.5 rounded-full text-xs"
                              onClick={item.onAction}
                            >
                              {item.actionIcon}
                              {item.actionLabel}
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ),
            )}
            {allDone && (
              <div className="flex items-center justify-center pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-slate-400"
                  onClick={handleReset}
                >
                  Reset checklist
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
