import React, { useEffect, useState, useCallback } from 'react';
import { Globe2, Shield, LayoutGrid, Info, Loader2 } from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { getWorkspaceOwnership, type WorkspaceMode } from '../store/workspaceOwnership';
import { fetchSetupStatus, type SetupStatusResponse } from '../lib/setupStatusApi';
import { getAiCredentials, type AiCredentialsResponse } from '../lib/aiCredentialsApi';
import { getLocalCredential, getLocalPreference } from '../lib/providerCredentialStore';
import { type OverallStorageControl, type ProviderStatusInput, type StorageControlSnapshot, computeStorageControlSnapshot, OVERALL_LABELS } from '../lib/storageControlStatus';
import type { ProviderCredentialId, ProviderPreference } from '../lib/providerCredentialTypes';
import { ALL_PROVIDER_IDS } from '../lib/providerCredentialTypes';
import { StorageControlModal } from './StorageControlModal';

const OVERALL_COLORS: Record<OverallStorageControl, string> = {
  'nexus-hosted': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200',
  'self-owned': 'bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200',
  mixed: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200',
};

interface StorageControlIndicatorProps { compact?: boolean; className?: string; }

export function StorageControlIndicator({ compact = false, className = '' }: StorageControlIndicatorProps) {
  const { user } = useAuth();
  const [snapshot, setSnapshot] = useState<StorageControlSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const compute = useCallback(async () => {
    if (!user) { setSnapshot(null); setLoading(false); return; }
    setLoading(true);
    try {
      const workspace = getWorkspaceOwnership(user.uid);
      const workspaceMode: WorkspaceMode = workspace?.mode ?? 'hosted';
      const [setupResult, aiResult] = await Promise.allSettled([fetchSetupStatus(), getAiCredentials()]);
      const setupStatus: SetupStatusResponse | null = setupResult.status === 'fulfilled' ? setupResult.value : null;
      const aiCreds: AiCredentialsResponse | null = aiResult.status === 'fulfilled' ? aiResult.value : null;
      const hostedDefaults: Record<ProviderCredentialId, boolean> = {
        gemini: setupStatus?.ai?.serverKey?.configured ?? false,
        deepseek: false,
        massive: setupStatus?.pricing?.massive?.configured ?? false,
        alpha_vantage: setupStatus?.pricing?.alphaVantage?.configured ?? false,
        logo_dev: (setupStatus?.logoProvider?.serverKey?.configured || setupStatus?.logoProvider?.clientKey?.configured) ?? false,
      };
      const providerStatuses: ProviderStatusInput[] = ALL_PROVIDER_IDS.map((id) => {
        let userKeyConfigured = false;
        if (id === 'gemini' || id === 'deepseek') {
          if (aiCreds?.provider === id && aiCreds.apiKeyLast4) userKeyConfigured = true;
          else userKeyConfigured = !!getLocalCredential(id);
        } else { userKeyConfigured = !!getLocalCredential(id); }
        const pref: ProviderPreference = getLocalPreference(id);
        return { providerId: id, hasHostedDefault: hostedDefaults[id], userKeyConfigured, preference: pref };
      });
      setSnapshot(computeStorageControlSnapshot(workspaceMode, providerStatuses));
    } catch { setSnapshot(null); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { void compute(); }, [compute]);

  if (loading) return <span className={`inline-flex items-center gap-1 text-xs text-slate-400 ${className}`}><Loader2 className="h-3 w-3 animate-spin" />{!compact && 'Loading storage info...'}</span>;
  if (!snapshot) return null;

  return (<>
    <button type="button" onClick={() => setModalOpen(true)}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors hover:opacity-80 cursor-pointer ${OVERALL_COLORS[snapshot.overall]} ${className}`}
      aria-label={`Storage: ${OVERALL_LABELS[snapshot.overall]}. Click for details.`}>
      {snapshot.overall === 'nexus-hosted' && <Globe2 className="h-3 w-3" />}
      {snapshot.overall === 'self-owned' && <Shield className="h-3 w-3" />}
      {snapshot.overall === 'mixed' && <LayoutGrid className="h-3 w-3" />}
      {!compact && <span>{OVERALL_LABELS[snapshot.overall]}</span>}
      <Info className="h-3 w-3 opacity-60" />
    </button>
    {modalOpen && <StorageControlModal open={modalOpen} onClose={() => setModalOpen(false)} snapshot={snapshot} />}
  </>);
}
