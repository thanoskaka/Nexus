import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { SETUP_STEPS, CATEGORY_ORDER, CATEGORY_LABELS, loadWizardState, saveWizardState, getStepVerificationStatus, type SetupStepId, type SetupCategory, type WizardStepState, type WizardState, type CostPosture } from '../lib/setupGuideConfig';
import { fetchSetupStatus, type SetupStatusResponse } from '../lib/setupStatusApi';
import { Button } from './ui/button';
import { CheckCircle2, Circle, ChevronRight, ChevronLeft, ChevronDown, ExternalLink, Copy, Clock, Shield, AlertCircle, XCircle, Loader2, Zap, Wand2 } from 'lucide-react';
const RefreshCwIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>;
interface SetupWizardProps { open: boolean; onClose: () => void; onNavigateToSettings?: (section: string) => void; onNavigateToDocs?: () => void; }
function CostBadge({ posture }: { posture: CostPosture }) {
  const s: Record<CostPosture, string> = { 'free': 'bg-emerald-100 text-emerald-700', 'free-tier': 'bg-sky-100 text-sky-700', 'paid': 'bg-amber-100 text-amber-700', 'user-owned': 'bg-violet-100 text-violet-700' };
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${s[posture]}`}>{posture}</span>;
}
function StepIcon({ state }: { state: WizardStepState }) {
  switch (state) { case 'done': return <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />; case 'skipped': return <XCircle className="h-5 w-5 text-slate-300 shrink-0" />; case 'pending': return <Circle className="h-5 w-5 text-slate-300 shrink-0" />; }
}
function EnvKeyBlock({ keys }: { keys: string[] }) {
  const [copied, setCopied] = useState(false); const text = keys.join('\n');
  const handleCopy = useCallback(() => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }, [text]);
  return <div className="space-y-1.5"><div className="flex items-center justify-between"><span className="text-xs font-medium text-slate-600">Env {keys.length === 1 ? 'var' : 'vars'}</span><button type="button" onClick={handleCopy} className="flex items-center gap-1 text-xs text-slate-400"><Copy className="h-3 w-3" />{copied ? 'Copied!' : 'Copy'}</button></div><code className="block rounded-lg bg-slate-50 p-2.5 text-xs text-slate-800 overflow-x-auto leading-relaxed">{keys.map((k, i) => <React.Fragment key={k}>{i > 0 && '\n'}{k}</React.Fragment>)}</code></div>;
}
export function SetupWizard({ open, onClose, onNavigateToSettings, onNavigateToDocs }: SetupWizardProps) {
  const [wizardState, setWizardState] = useState<WizardState>(() => { const sv = loadWizardState(); return sv || { stepStates: Object.fromEntries(SETUP_STEPS.map((s) => [s.id, 'pending'] as const)) as Record<SetupStepId, WizardStepState>, currentStepIndex: 0 }; });
  const [setupStatus, setSetupStatus] = useState<SetupStatusResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<SetupStepId>>(new Set());
  const currentStepIndex = wizardState.currentStepIndex;
  const currentStep = SETUP_STEPS[currentStepIndex];
  const isLastStep = currentStepIndex >= SETUP_STEPS.length - 1;
  const isFirstStep = currentStepIndex === 0;
  const stepState = wizardState.stepStates[currentStep?.id] || 'pending';
  const verificationStatus = useMemo(() => getStepVerificationStatus(currentStep, setupStatus), [currentStep, setupStatus]);
  const loadStatus = useCallback(async () => { setStatusLoading(true); setStatusError(null); try { const r = await fetchSetupStatus(); setSetupStatus(r); } catch (e) { setStatusError(e instanceof Error ? e.message : 'Failed'); } finally { setStatusLoading(false); } }, []);
  useEffect(() => { if (open) { loadStatus(); } }, [open, loadStatus]);
  const updateStepState = useCallback((id: SetupStepId, st: WizardStepState) => { setWizardState((p) => { const n = { ...p, stepStates: { ...p.stepStates, [id]: st } }; saveWizardState(n); return n; }); }, []);
  const handleNext = useCallback(() => { setWizardState((p) => { if (p.currentStepIndex + 1 >= SETUP_STEPS.length) return p; const n = { ...p, currentStepIndex: p.currentStepIndex + 1 }; saveWizardState(n); return n; }); }, []);
  const handlePrev = useCallback(() => { setWizardState((p) => { const n = { ...p, currentStepIndex: Math.max(0, p.currentStepIndex - 1) }; saveWizardState(n); return n; }); }, []);
  const handleSkip = useCallback(() => updateStepState(currentStep.id, 'skipped'), [currentStep?.id, updateStepState]);
  const handleDone = useCallback(() => updateStepState(currentStep.id, 'done'), [currentStep?.id, updateStepState]);
  const handleUndo = useCallback(() => updateStepState(currentStep.id, 'pending'), [currentStep?.id, updateStepState]);
  const toggleExpanded = useCallback((id: SetupStepId) => { setExpandedSteps((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }); }, []);
  const handleNavigate = useCallback(() => { if (currentStep?.appRoute) { if (currentStep.appRoute.navigateTo === 'docs') onNavigateToDocs?.(); else onNavigateToSettings?.(currentStep.appRoute.section || 'integrations'); } }, [currentStep, onNavigateToDocs, onNavigateToSettings]);
  const doneCount = useMemo(() => SETUP_STEPS.filter((s) => wizardState.stepStates[s.id] === 'done').length, [wizardState.stepStates]);
  const totalSteps = SETUP_STEPS.length;
  if (!open) return null;
  const expanded = expandedSteps.has(currentStep.id);
  return (<div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-3 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} data-testid="setup-wizard-overlay"><div className="relative mx-auto my-2 flex max-h-[calc(100vh-1rem)] w-[min(95vw,44rem)] flex-col overflow-hidden border border-slate-200 bg-white shadow-lg sm:rounded-xl dark:border-slate-800 dark:bg-slate-950">
<div className="shrink-0 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
<div className="flex items-center gap-2 mb-3"><Wand2 className="h-5 w-5 text-[#00875A]" /><h2 className="text-lg font-bold text-slate-900 dark:text-white">Guided Setup</h2><span className="ml-auto text-xs text-slate-400 dark:text-slate-500">{doneCount} of {totalSteps}</span></div>
<div className="flex items-center gap-2"><div className="h-2 flex-1 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-2 rounded-full bg-[#00875A] transition-all duration-500" style={{ width: `${(doneCount / totalSteps) * 100}%` }} /></div><span className="text-xs font-medium text-slate-500">{Math.round((doneCount / totalSteps) * 100)}%</span></div>
</div>
<div className="shrink-0 flex items-center gap-1.5 overflow-x-auto border-b border-slate-100 px-4 py-2 dark:border-slate-800">
{CATEGORY_ORDER.map((cat) => { const cs = SETUP_STEPS.filter((s) => s.category === cat); if (cs.length === 0) return null; const active = cat === currentStep?.category; const allDone = cs.every((s) => wizardState.stepStates[s.id] === 'done'); return (<button key={cat} type="button" onClick={() => { const fi = SETUP_STEPS.findIndex((s) => s.category === cat); if (fi >= 0) { setWizardState((p) => { const n = { ...p, currentStepIndex: fi }; saveWizardState(n); return n; }); } }} className={`flex items-center gap-1 shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${active ? 'bg-[#00875A]/10 text-[#00875A]' : allDone ? 'text-emerald-600' : 'text-slate-400'}`} data-testid={`wizard-cat-${cat}`}>{allDone ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}{CATEGORY_LABELS[cat]}</button>); })}
</div>
<div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
<div className="flex items-start gap-3"><div className="mt-1"><StepIcon state={stepState} /></div><div className="min-w-0 flex-1 space-y-3">
<div><h3 className="text-base font-semibold text-slate-900 dark:text-white" data-testid="wizard-step-title">{currentStep.title}</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400" data-testid="wizard-step-description">{currentStep.description}</p></div>
<div className="flex flex-wrap items-center gap-2">
{currentStep.required ? <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700"><Shield className="h-3 w-3" />Required</span> : <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">Optional</span>}
<span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500"><Clock className="h-3 w-3" />~{currentStep.estimatedMinutes}m</span>
<CostBadge posture={currentStep.costPosture} />
{verificationStatus !== 'unknown' && <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${verificationStatus === 'configured' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`} data-testid="wizard-verify-badge">{verificationStatus === 'configured' ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}{verificationStatus === 'configured' ? 'Configured' : 'Missing'}</span>}
{statusLoading && verificationStatus === 'unknown' && currentStep.verificationKey && <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-slate-400"><Loader2 className="h-3 w-3 animate-spin" />Checking...</span>}
{statusError && <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-rose-500"><AlertCircle className="h-3 w-3" />Status unavailable</span>}
</div>
<div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3"><div className="flex items-center gap-2 mb-2"><Zap className="h-4 w-4 text-amber-500" /><span className="text-sm font-semibold text-slate-800">What this enables</span></div><p className="text-sm text-slate-600" data-testid="wizard-what-enables">{currentStep.whatItEnables}</p></div>
{currentStep.envKeys.length > 0 && <EnvKeyBlock keys={currentStep.envKeys} />}
<div><button type="button" onClick={() => toggleExpanded(currentStep.id)} className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50" data-testid="wizard-toggle-detail"><span>Setup instructions ({currentStep.setupInstructionSteps.length} steps)</span><ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} /></button>{expanded && <div className="mt-2 rounded-xl border border-slate-200 bg-white p-4" data-testid="wizard-step-detail"><ol className="space-y-2.5">{currentStep.setupInstructionSteps.map((st, i) => <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-500">{i + 1}</span><span>{st}</span></li>)}</ol></div>}</div>
<div className="flex flex-wrap items-center gap-3 pt-1">
{currentStep.docsLinks.map((lnk, i) => <a key={i} href={lnk.url} target={lnk.url.startsWith('http') ? '_blank' : undefined} rel={lnk.url.startsWith('http') ? 'noopener noreferrer' : undefined} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50" data-testid={`wizard-docs-link-${i}`}><ExternalLink className="h-3 w-3" />{lnk.label}</a>)}
{currentStep.appRoute && <button type="button" onClick={handleNavigate} className="inline-flex items-center gap-1.5 rounded-full bg-[#00875A]/10 px-3 py-1.5 text-xs font-medium text-[#00875A] hover:bg-[#00875A]/20" data-testid="wizard-app-route"><ChevronRight className="h-3 w-3" />{currentStep.appRoute.label}</button>}
</div>
</div></div>
</div>
<div className="shrink-0 flex items-center gap-2 border-t border-slate-100 px-5 py-4 dark:border-slate-800">
<Button variant="outline" size="sm" className="rounded-full" onClick={onClose} data-testid="wizard-close">Close</Button>
{verificationStatus !== 'unknown' && <Button variant="ghost" size="sm" className="rounded-full text-xs" onClick={loadStatus} disabled={statusLoading} data-testid="wizard-check-status">{statusLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCwIcon />}Check Status</Button>}
<div className="flex-1" />
{stepState === 'pending' && (<>{!currentStep.required && <Button variant="ghost" size="sm" className="rounded-full text-xs text-slate-500" onClick={handleSkip} data-testid="wizard-skip">Skip</Button>}<Button variant="ghost" size="sm" className="rounded-full text-xs text-slate-500" onClick={handleDone} data-testid="wizard-done">Done</Button></>)}
{stepState === 'skipped' && <Button variant="ghost" size="sm" className="rounded-full text-xs text-slate-500" onClick={handleUndo} data-testid="wizard-undo-skip">Undo Skip</Button>}
{stepState === 'done' && <Button variant="ghost" size="sm" className="rounded-full text-xs text-slate-500" onClick={handleUndo} data-testid="wizard-undo-done">Undo</Button>}
<div className="flex items-center gap-1.5">{!isFirstStep && <Button variant="outline" size="sm" className="rounded-full" onClick={handlePrev} data-testid="wizard-prev"><ChevronLeft className="h-4 w-4 mr-1" />Back</Button>}<Button size="sm" className="rounded-full bg-[#00875A] text-white hover:bg-[#007A51]" onClick={isLastStep ? onClose : handleNext} data-testid="wizard-next">{isLastStep ? <>Finish</> : <>Next<ChevronRight className="h-4 w-4 ml-1" /></>}</Button></div>
</div>
</div></div>);
}
