import React, { useEffect, useMemo, useState } from 'react';
import { fetchSetupStatus, type SetupStatusResponse } from '../lib/setupStatusApi';
import { computeNextActions, buildInput, type NextAction } from '../lib/nextAction';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { ChevronRight, ExternalLink, Lightbulb, Plus, TrendingUp, Upload, Shield, BookOpen, Key } from 'lucide-react';

const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'choose-workspace': Shield,
  'add-first-asset': Plus,
  'configure-firebase': Shield,
  'configure-price-provider': TrendingUp,
  'add-ai-key': Key,
  'setup-import': Upload,
  'review-docs': BookOpen,
};

export interface NextActionPanelProps {
  assetsCount: number;
  upstoxConnected: boolean;
  splitwiseConnected: boolean;
  aiKeyConfigured: boolean;
  userUid?: string;
  onNavigateToSettings: (section: string) => void;
  onNavigateToDocs: () => void;
  onAddAsset: () => void;
}

export function NextActionPanel({
  assetsCount,
  upstoxConnected,
  splitwiseConnected,
  aiKeyConfigured,
  userUid,
  onNavigateToSettings,
  onNavigateToDocs,
  onAddAsset,
}: NextActionPanelProps) {
  const [setupStatus, setSetupStatus] = useState<SetupStatusResponse | null>(null);
  const [statusError, setStatusError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchSetupStatus()
      .then((data) => {
        if (!cancelled) setSetupStatus(data);
      })
      .catch(() => {
        if (!cancelled) setStatusError(true);
      });
    return () => { cancelled = true; };
  }, []);

  const { primary, secondary } = useMemo(
    () => computeNextActions(
      buildInput(
        setupStatus,
        assetsCount,
        upstoxConnected,
        splitwiseConnected,
        aiKeyConfigured,
        userUid,
      ),
    ),
    [setupStatus, assetsCount, upstoxConnected, splitwiseConnected, aiKeyConfigured, userUid],
  );

  const handleAction = (action: NextAction) => {
    if (action.route.kind === 'docs') {
      onNavigateToDocs();
    } else if (action.route.kind === 'settings') {
      onNavigateToSettings(action.route.section);
    } else if (action.route.kind === 'add-asset') {
      onAddAsset();
    }
  };

  if (!primary && secondary.length === 0) return null;

  const Icon = primary ? ACTION_ICONS[primary.id] : Lightbulb;

  return (
    <Card className="border-none shadow-sm rounded-2xl mb-6 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-amber-500" />
          <CardTitle>What should I do next?</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {primary && (
          <div
            data-testid="next-action-primary"
            className="flex items-start gap-4 rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/40 dark:bg-amber-950/10"
          >
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Icon className="h-5 w-5 text-amber-700 dark:text-amber-400" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                {primary.title}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {primary.description}
              </div>
            </div>
            <Button
              size="sm"
              className="shrink-0 rounded-full bg-amber-600 text-white hover:bg-amber-700 h-8 px-3 text-xs"
              onClick={() => handleAction(primary)}
              data-testid={`next-action-go-${primary.id}`}
            >
              {primary.actionLabel}
              {primary.route.kind === 'docs' ? (
                <ExternalLink className="ml-1 h-3 w-3" />
              ) : (
                <ChevronRight className="ml-1 h-3 w-3" />
              )}
            </Button>
          </div>
        )}

        {secondary.map((action) => {
          const SecIcon = ACTION_ICONS[action.id] || Lightbulb;
          return (
            <div
              key={action.id}
              data-testid={`next-action-secondary-${action.id}`}
              className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                <SecIcon className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-slate-900 dark:text-white">
                  {action.title}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 h-7 px-2 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                onClick={() => handleAction(action)}
                data-testid={`next-action-go-${action.id}`}
              >
                {action.actionLabel}
                <ChevronRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
