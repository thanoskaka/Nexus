import React, { useEffect, useState, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Select } from './ui/select';
import { Key, CheckCircle, AlertCircle, Loader2, Trash2, Eye, EyeOff, ExternalLink, Shield, HardDrive } from 'lucide-react';
import {
  getAiCredentials,
  type AiCredentialsResponse,
} from '../lib/aiCredentialsApi';
import { fetchSetupStatus, type SetupStatusResponse } from '../lib/setupStatusApi';
import {
  getLocalCredential,
  saveLocalCredential,
  removeLocalCredential,
  getLocalPreference,
  setLocalPreference,
  maskApiKey,
} from '../lib/providerCredentialStore';
import {
  type ProviderCredentialId,
  type ProviderPreference,
  type ProviderStatus,
  ALL_PROVIDER_IDS,
  PROVIDER_DEFS,
} from '../lib/providerCredentialTypes';

type StatusType = 'success' | 'error' | 'info' | null;

export function ProviderCredentialsSection() {
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: StatusType; message: string }>({ type: null, message: '' });
  const [setupStatus, setSetupStatus] = useState<SetupStatusResponse | null>(null);
  const [aiCredentials, setAiCredentials] = useState<AiCredentialsResponse | null>(null);

  const [keys, setKeys] = useState<Record<ProviderCredentialId, string>>({
    gemini: '',
    deepseek: '',
    massive: '',
    alpha_vantage: '',
    logo_dev: '',
  });
  const [showKeys, setShowKeys] = useState<Record<ProviderCredentialId, boolean>>({
    gemini: false,
    deepseek: false,
    massive: false,
    alpha_vantage: false,
    logo_dev: false,
  });
  const [saving, setSaving] = useState<Record<ProviderCredentialId, boolean>>({
    gemini: false,
    deepseek: false,
    massive: false,
    alpha_vantage: false,
    logo_dev: false,
  });

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const [setup, ai] = await Promise.allSettled([
        fetchSetupStatus(),
        getAiCredentials(),
      ]);
      if (setup.status === 'fulfilled') setSetupStatus(setup.value);
      if (ai.status === 'fulfilled') setAiCredentials(ai.value);
    } catch { /* ignore individual failures */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  const hostedDefaults: Record<ProviderCredentialId, boolean> = {
    gemini: setupStatus?.ai?.serverKey?.configured ?? false,
    deepseek: false,
    massive: setupStatus?.pricing?.massive?.configured ?? false,
    alpha_vantage: setupStatus?.pricing?.alphaVantage?.configured ?? false,
    logo_dev: (setupStatus?.logoProvider?.serverKey?.configured || setupStatus?.logoProvider?.clientKey?.configured) ?? false,
  };

  const userKeyConfigured = (providerId: ProviderCredentialId): boolean => {
    if (providerId === 'gemini' || providerId === 'deepseek') {
      if (!aiCredentials?.provider) return false;
      const localEntry = getLocalCredential(providerId);
      return (aiCredentials.provider === providerId && !!aiCredentials.apiKeyLast4) || !!localEntry;
    }
    return !!getLocalCredential(providerId);
  };

  const userKeyLast4 = (providerId: ProviderCredentialId): string | null => {
    if (providerId === 'gemini' || providerId === 'deepseek') {
      if (aiCredentials?.provider === providerId && aiCredentials.apiKeyLast4) {
        return aiCredentials.apiKeyLast4;
      }
      const localEntry = getLocalCredential(providerId);
      return localEntry?.last4 ?? null;
    }
    const entry = getLocalCredential(providerId);
    return entry?.last4 ?? null;
  };

  const userKeyUpdatedAt = (providerId: ProviderCredentialId): number | null => {
    if (PROVIDER_DEFS[providerId].storageType === 'encrypted-server') {
      const localEntry = getLocalCredential(providerId);
      return localEntry?.updatedAt ?? null;
    }
    const entry = getLocalCredential(providerId);
    return entry?.updatedAt ?? null;
  };

  const providerStatuses = ALL_PROVIDER_IDS.map((id): ProviderStatus => {
    const def = PROVIDER_DEFS[id];
    return {
      providerId: id,
      label: def.label,
      description: def.description,
      hasHostedDefault: hostedDefaults[id],
      userKeyConfigured: userKeyConfigured(id),
      apiKeyLast4: userKeyLast4(id),
      lastUpdated: userKeyUpdatedAt(id),
      storageType: def.storageType,
      preference: getLocalPreference(id),
      signUpUrl: def.signUpUrl,
    };
  });

  const isLocalProvider = (providerId: ProviderCredentialId): boolean => {
    return PROVIDER_DEFS[providerId].storageType === 'local-only';
  };

  const getUserKeyLast4Display = (providerId: ProviderCredentialId): string | null => {
    if (providerId === 'gemini' || providerId === 'deepseek') {
      if (aiCredentials?.provider === providerId && aiCredentials.apiKeyLast4) {
        return aiCredentials.apiKeyLast4;
      }
    }
    const entry = getLocalCredential(providerId);
    return entry?.last4 ?? null;
  };

  const handleSaveLocal = useCallback(async (providerId: ProviderCredentialId) => {
    const trimmed = keys[providerId].trim();
    if (!trimmed) {
      setStatusMessage({ type: 'error', message: 'Enter an API key first.' });
      return;
    }
    setSaving((prev) => ({ ...prev, [providerId]: true }));
    try {
      saveLocalCredential(providerId, trimmed);
      setKeys((prev) => ({ ...prev, [providerId]: '' }));
      setShowKeys((prev) => ({ ...prev, [providerId]: false }));
      await refreshData();
      setStatusMessage({ type: 'success', message: `${PROVIDER_DEFS[providerId].label} key saved.` });
    } catch (error) {
      setStatusMessage({ type: 'error', message: error instanceof Error ? error.message : 'Failed to save key.' });
    } finally {
      setSaving((prev) => ({ ...prev, [providerId]: false }));
    }
  }, [keys, refreshData]);

  const handleRemoveLocal = useCallback(async (providerId: ProviderCredentialId) => {
    setSaving((prev) => ({ ...prev, [providerId]: true }));
    try {
      removeLocalCredential(providerId);
      setKeys((prev) => ({ ...prev, [providerId]: '' }));
      setShowKeys((prev) => ({ ...prev, [providerId]: false }));
      await refreshData();
      setStatusMessage({ type: 'info', message: `${PROVIDER_DEFS[providerId].label} key removed.` });
    } finally {
      setSaving((prev) => ({ ...prev, [providerId]: false }));
    }
  }, [refreshData]);

  const handlePreferenceChange = useCallback((providerId: ProviderCredentialId, pref: ProviderPreference) => {
    setLocalPreference(providerId, pref);
    void refreshData();
  }, [refreshData]);

  const formatTimestamp = (ts: number | null): string => {
    if (!ts) return '';
    return new Date(ts).toLocaleString();
  };

  if (loading) {
    return (
      <Card className="border-none shadow-sm rounded-2xl">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-sm rounded-2xl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Key className="h-5 w-5 text-slate-700 dark:text-slate-300" />
          <CardTitle>Provider Credentials</CardTitle>
        </div>
        <CardDescription>
          Configure your own API keys for each provider, or use Nexus-hosted defaults when available.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {statusMessage.type && (
          <div className={`rounded-xl border px-3 py-2 text-sm ${
            statusMessage.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200'
              : statusMessage.type === 'error'
                ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300'
                : 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-300'
          }`}>
            <div className="flex items-center gap-2">
              {statusMessage.type === 'success' && <CheckCircle className="h-4 w-4 shrink-0" />}
              {statusMessage.type === 'error' && <AlertCircle className="h-4 w-4 shrink-0" />}
              <span>{statusMessage.message}</span>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {providerStatuses.map((ps) => (
            <div
              key={ps.providerId}
              className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{ps.label}</h3>
                    {ps.hasHostedDefault && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                        <Shield className="h-3 w-3" />
                        Hosted available
                      </span>
                    )}
                    {ps.userKeyConfigured && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800 dark:bg-sky-950/40 dark:text-sky-200">
                        Your key
                      </span>
                    )}
                    {!ps.hasHostedDefault && !ps.userKeyConfigured && (
                      <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        Missing
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{ps.description}</p>
                </div>

                <div className="flex items-center gap-2">
                  <Select
                    value={ps.preference}
                    onChange={(e) => handlePreferenceChange(ps.providerId, e.target.value as ProviderPreference)}
                    className="min-w-[170px] text-xs"
                    aria-label={`Preference for ${ps.label}`}
                  >
                    <option value="hosted">Use Nexus hosted default</option>
                    <option value="user">Use my key</option>
                  </Select>
                  {ps.signUpUrl && (
                    <a
                      href={ps.signUpUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      aria-label={`Sign up for ${ps.label}`}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {isLocalProvider(ps.providerId) && (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={showKeys[ps.providerId] ? 'text' : 'password'}
                          value={keys[ps.providerId]}
                          onChange={(e) => setKeys((prev) => ({ ...prev, [ps.providerId]: e.target.value }))}
                          placeholder={
                            getUserKeyLast4Display(ps.providerId)
                              ? `${maskApiKey(getUserKeyLast4Display(ps.providerId))} (replace with new key)`
                              : `Enter ${ps.label} API key`
                          }
                          className="pr-10 font-mono text-sm"
                          aria-label={`${ps.label} API key`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowKeys((prev) => ({ ...prev, [ps.providerId]: !prev[ps.providerId] }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                          aria-label={showKeys[ps.providerId] ? 'Hide API key' : 'Show API key'}
                        >
                          {showKeys[ps.providerId] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    {getUserKeyLast4Display(ps.providerId) && !keys[ps.providerId] && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Key ending in <span className="font-mono">{getUserKeyLast4Display(ps.providerId)}</span> is saved. Enter a new key to replace it.
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        className="rounded-full bg-[#00875A] text-white hover:bg-[#007A51] text-xs"
                        disabled={saving[ps.providerId] || !keys[ps.providerId].trim()}
                        onClick={() => handleSaveLocal(ps.providerId)}
                      >
                        {saving[ps.providerId] ? (
                          <><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Saving</>
                        ) : (
                          'Save'
                        )}
                      </Button>
                      {isLocalProvider(ps.providerId) && !!getLocalCredential(ps.providerId) && (
                        <Button
                          variant="outline"
                          className="rounded-full text-red-600 hover:text-red-700 hover:border-red-300 dark:text-red-400 dark:hover:border-red-800 text-xs"
                          disabled={saving[ps.providerId]}
                          onClick={() => handleRemoveLocal(ps.providerId)}
                        >
                          <Trash2 className="mr-1 h-3 w-3" />
                          Remove
                        </Button>
                      )}
                    </div>
                    {ps.lastUpdated && (
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        Last updated: {formatTimestamp(ps.lastUpdated)}
                      </p>
                    )}
                  </>
                )}

                {!isLocalProvider(ps.providerId) && (
                  <>
                    {ps.userKeyConfigured && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Key ending in <span className="font-mono">{ps.apiKeyLast4}</span> is configured.
                      </p>
                    )}
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      AI keys are managed in the AI Provider card on the Pricing tab.
                    </p>
                  </>
                )}

                <div className="flex items-center gap-1.5 pt-1">
                  {ps.storageType === 'encrypted-server' ? (
                    <>
                      <Shield className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Encrypted on server
                      </span>
                    </>
                  ) : (
                    <>
                      <HardDrive className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Stored on this device only
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          <ul className="space-y-1.5 list-disc list-inside">
            <li>Keys stored on this device are saved in your browser&apos;s local storage and are not synced to the server.</li>
            <li>AI provider keys (Gemini, DeepSeek) are encrypted at rest on the server when saved through the AI Provider card.</li>
            <li>When a hosted default is available and you select &ldquo;Use Nexus hosted default,&rdquo; the app uses the server&apos;s shared API key.</li>
            <li>API keys are never displayed in full after saving and are never logged.</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
