import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { SETUP_STEPS, CATEGORY_ORDER, CATEGORY_LABELS, loadWizardState, saveWizardState, getStepVerificationStatus, type SetupStepId, type SetupCategory, type WizardStepState, type WizardState, type CostPosture } from '../lib/setupGuideConfig';
import { fetchSetupStatus, type SetupStatusResponse } from '../lib/setupStatusApi';
import { Button } from './ui/button';
import { CheckCircle2, Circle, ChevronRight, ChevronLeft, ChevronDown, ExternalLink, Copy, Clock, Shield, AlertCircle, XCircle, Loader2, Zap, Wand2 } from 'lucide-react';

const RefreshCwIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>;

interface SetupWizardProps {
  open: boolean;
  onClose: () => void;
  onNavigateToSettings?: (section: string) => void;
  onNavigateToDocs?: () => void;
}

function CostBadge({ posture }: { posture: CostPosture }) {
  const styles: Record<CostPosture, string> = {
    'free': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    'free-tier': 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
    'paid': 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    'user-owned': 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
  };
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles[posture]}`}>{posture}</span>;
}

function StepIcon({ state }: { state: WizardStepState }) {
  switch (state) {
    case 'done': return <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />;
    case 'skipped': return <XCircle className="h-5 w-5 text-slate-300 dark:text-slate-600 shrink-0" />;
    case 'pending': return <Circle className="h-5 w-5 text-slate-300 dark:text-slate-600 shrink-0" />;
  }
}

function EnvKeyBlock({ keys }: { keys: string[] }) {
  const [copied, setCopied] = useState(false);
  const text = keys.join('\n');
  const handleCopy = useCallback(() => { void navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }, [text]);
  return <div className="space-y-1.5">
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Env {keys.length === 1 ? 'var' : 'vars'}</span>
      <button type="button" onClick={handleCopy} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><Copy className="h-3 w-3" />{copied ? 'Copied!' : 'Copy'}</button>
    </div>
    <code className="block rounded-lg bg-slate-50 p-2.5 text-xs text-slate-800 dark:bg-slate-900 dark:text-slate-200 overflow-x-auto leading-relaxed">
      {keys.map((k, i) => <React.Fragment key={k}>{i > 0 && '\n'}{k}</React.Fragment>)}
    </code>
  </div>;
}

export function SetupWizard({ open, onClose, onNavigateToSettings, onNavigateToDocs }: SetupWizardProps) {
  const [wizardState, setWizardState] = useState<WizardState>(() => {
    const saved = loadWizardState();
    if (saved) return saved;
    return { stepStates: Object.fromEntries(SETUP_STEPS.map((s) => [s.id, 'pending'] as const)) as Record<SetupStepId, WizardStepState>, currentStepIndex: 0 };
  });
  const [setupStatus, setSetupStatus] = useState<SetupStatusResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<SetupStepId>>(new Set());

  const currentStepIndex = wizardState.currentStepIndex;
  const currentStep = SETUP_STEPS[currentStepIndex];
  const isLastStep = currentStepIndex >= SETUP_STEPS.length - 1;
  const isFirstStep = currentStepIndex === 0;
  const stepState = wizardState.stepStates[currentStep.id] || 'pending';

  const verificationStatus = useMemo(() => getStepVerificationStatus(currentStep, setupStatus), [currentStep, setupStatus]);

  const loadStatus = useCallback(async () => {
    setStatusLoading(true); setStatusError(null);
    try { const result = await fetchSetupStatus(); setSetupStatus(result); }
    catch (err) { setStatusError(err instanceof Error ? err.message : 'Failed to load setup status'); }
    finally { setStatusLoading(false); }
  }, []);

  useEffect(() => { if (open) { void loadStatus(); } }, [open, loadStatus]);

  const updateStepState = useCallback((stepId: SetupStepId, state: WizardStepState) => {
    setWizardState((prev) => { const next = { ...prev, stepStates: { ...prev.stepStates, [stepId]: state } }; saveWizardState(next); return next; });
  }, []);

  const handleNext = useCallback(() => {
    setWizardState((prev) => {
      if (prev.currentStepIndex + 1 >= SETUP_STEPS.length) return prev;
      const next = { ...prev, currentStepIndex: prev.currentStepIndex + 1 }; saveWizardState(next); return next;
    });
  }, []);

  const handlePrev = useCallback(() => {
    setWizardState((prev) => {
      const next = { ...prev, currentStepIndex: Math.max(0, prev.currentStepIndex - 1) }; saveWizardState(next); return next;
    });
  }, []);

  const handleSkip = useCallback(() => updateStepState(currentStep.id, 'skipped'), [currentStep.id, updateStepState]);
  const handleDone = useCallback(() => updateStepState(currentStep.id, 'done'), [currentStep.id, updateStepState]);
  const handleUndo = useCallback(() => updateStepState(currentStep.id, 'pending'), [currentStep.id, updateStepState]);

  const toggleExpanded = useCallback((id: SetupStepId) => {
    setExpandedSteps((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }, []);

  const handleNavigate = useCallback(() => {
    if (currentStep.appRoute) {
      if (currentStep.appRoute.navigateTo === 'docs') onNavigateToDocs?.();
      else if (currentStep.appRoute.navigateTo === 'settings') onNavigateToSettings?.(currentStep.appRoute.section || 'integrations');
    }
  }, [currentStep, onNavigateToDocs, onNavigateToSettings]);

  const doneCount = useMemo(() => SETUP_STEPS.filter((s) => wizardState.stepStates[s.id] === 'done').length, [wizardState.stepStates]);
  const totalSteps = SETUP_STEPS.length;
  const progressPercent = (doneCount / totalSteps) * 100;
  const currentCategory: SetupCategory = currentStep?.category || 'getting-started';

  if (!open) return null;
  const expanded = expandedSteps.has(currentStep.id);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-3 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} data-testid="setup-wizard-overlay">
      <div className="relative mx-auto my-2 flex max-h-[calc(100vh-1rem)] w-[min(95vw,44rem)] flex-col overflow-hidden border border-slate-200 bg-white shadow-lg sm:rounded-xl dark:border-slate-800 dark:bg-slate-950">
        <div className="shrink-0 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-3">
            <Wand2 className="h-5 w-5 text-[#00875A]" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Guided Setup</h2>
            <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">{doneCount} of {totalSteps}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 flex-1 rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-2 rounded-full bg-[#00875A] transition-all duration-500" style={{ width: `${progressPercent}%` }} />
            </div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{Math.round(progressPercent)}%</span>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-1.5 overflow-x-auto border-b border-slate-100 px-4 py-2 dark:border-slate-800">
          {CATEGORY_ORDER.map((cat) => {
            const catSteps = SETUP_STEPS.filter((s) => s.category === cat);
            if (catSteps.length === 0) return null;
            const isCurrentCat = cat === currentCategory;
            const allDone = catSteps.every((s) => wizardState.stepStates[s.id] === 'done');
            return (
              <button key={cat} type="button" onClick={() => {
                const firstIdx = SETUP_STEPS.findIndex((s) => s.category === cat);
                if (firstIdx >= 0) { setWizardState((prev) => { const next = { ...prev, currentStepIndex: firstIdx }; saveWizardState(next); return next; }); }
              }}
                className={`flex items-center gap-1 shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${isCurrentCat ? 'bg-[#00875A]/10 text-[#00875A] dark:bg-[#00875A]/20 dark:text-emerald-300' : allDone ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
                data-testid={`wizard-cat-${cat}`}>
                {allDone ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
                {CATEGORY_LABELS[cat]}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="flex items-start gap-3">
            <div className="mt-1"><StepIcon state={stepState} /></div>
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white" data-testid="wizard-step-title">{currentStep.title}</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400" data-testid="wizard-step-description">{currentStep.description}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {currentStep.required ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"><Shield className="h-3 w-3" />Required</span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">Optional</span>
                )}
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400"><Clock className="h-3 w-3" />~{currentStep.estimatedMinutes}m</span>
                <CostBadge posture={currentStep.costPosture} />
                {verificationStatus !== 'unknown' && (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${verificationStatus === 'configured' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'}`}
                    data-testid="wizard-verify-badge">
                    {verificationStatus === 'configured' ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {verificationStatus === 'configured' ? 'Configured' : 'Missing'}
                  </span>
                )}
                {statusLoading && verificationStatus === 'unknown' && currentStep.verificationKey && (
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-slate-400"><Loader2 className="h-3 w-3 animate-spin" />Checking...</span>
                )}
                {statusError && (
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-rose-500"><AlertCircle className="h-3 w-3" />Status unavailable</span>
                )}
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="flex items-center gap-2 mb-2"><Zap className="h-4 w-4 text-amber-500" /><span className="text-sm font-semibold text-slate-800 dark:text-slate-200">What this enables</span></div>
                <p className="text-sm text-slate-600 dark:text-slate-400" data-testid="wizard-what-enables">{currentStep.whatItEnables}</p>
              </div>

              {currentStep.envKeys.length > 0 && <EnvKeyBlock keys={currentStep.envKeys} />}

              <div>
                <button type="button" onClick={() => toggleExpanded(currentStep.id)}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900 transition-colors"
                  data-testid="wizard-toggle-detail">
                  <span>Setup instructions ({currentStep.setupInstructionSteps.length} steps)</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                </button>
                {expanded && (
                  <div className="mt-2 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950" data-testid="wizard-step-detail">
                    <ol className="space-y-2.5">
                      {currentStep.setupInstructionSteps.map((s, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-400">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">{idx + 1}</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                {currentStep.docsLinks.map((link, idx) => (
                  <a key={idx} href={link.url} target={link.url.startsWith('http') ? '_blank' : undefined} rel={link.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900 transition-colors"
                    data-testid={`wizard-docs-link-${idx}`}>
                    <ExternalLink className="h-3 w-3" />{link.label}
                  </a>
                ))}
                {currentStep.appRoute && (
                  <button type="button" onClick={handleNavigate}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#00875A]/10 px-3 py-1.5 text-xs font-medium text-[#00875A] hover:bg-[#00875A]/20 dark:text-emerald-300 dark:hover:bg-emerald-900/30 transition-colors"
                    data-testid="wizard-app-route">
                    <ChevronRight className="h-3 w-3" />{currentStep.appRoute.label}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2 border-t border-slate-100 px-5 py-4 dark:border-slate-800">
          <Button variant="outline" size="sm" className="rounded-full" onClick={onClose} data-testid="wizard-close">Close</Button>

          {verificationStatus !== 'unknown' && (
            <Button variant="ghost" size="sm" className="rounded-full text-xs" onClick={loadStatus} disabled={statusLoading} data-testid="wizard-check-status">
              {statusLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCwIcon />}Check Status
            </Button>
          )}

          <div className="flex-1" />

          {stepState === 'pending' && (
            <>
              {!currentStep.required && <Button variant="ghost" size="sm" className="rounded-full text-xs text-slate-500 dark:text-slate-400" onClick={handleSkip} data-testid="wizard-skip">Skip</Button>}
              <Button variant="ghost" size="sm" className="rounded-full text-xs text-slate-500 dark:text-slate-400" onClick={handleDone} data-testid="wizard-done">Done</Button>
            </>
          )}
          {stepState === 'skipped' && <Button variant="ghost" size="sm" className="rounded-full text-xs text-slate-500 dark:text-slate-400" onClick={handleUndo} data-testid="wizard-undo-skip">Undo Skip</Button>}
          {stepState === 'done' && <Button variant="ghost" size="sm" className="rounded-full text-xs text-slate-500 dark:text-slate-400" onClick={handleUndo} data-testid="wizard-undo-done">Undo</Button>}

          <div className="flex items-center gap-1.5">
            {!isFirstStep && <Button variant="outline" size="sm" className="rounded-full" onClick={handlePrev} data-testid="wizard-prev"><ChevronLeft className="h-4 w-4 mr-1" />Back</Button>}
            <Button size="sm" className="rounded-full bg-[#00875A] text-white hover:bg-[#007A51]" onClick={isLastStep ? onClose : handleNext} data-testid="wizard-next">
              {isLastStep ? <>Finish</> : <>Next<ChevronRight className="h-4 w-4 ml-1" /></>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
