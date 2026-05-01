import React, { useEffect, useState, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Select } from './ui/select';
import { Key, CheckCircle, AlertCircle, Loader2, Trash2, Eye, EyeOff, RefreshCw } from 'lucide-react';
import {
  type AiProvider,
  type AiCredentialsResponse,
  getAiCredentials,
  saveAiCredentials,
  deleteAiCredentials,
  testAiCredentials,
} from '../lib/aiCredentialsApi';

const PROVIDER_LABELS: Record<AiProvider, string> = {
  gemini: 'Google Gemini',
  deepseek: 'DeepSeek',
};

const PROVIDER_MODELS: Record<AiProvider, { label: string; value: string }[]> = {
  gemini: [
    { label: 'Gemini 2.5 Flash (fast, good accuracy)', value: 'gemini-2.5-flash' },
    { label: 'Gemini 2.5 Pro (best accuracy)', value: 'gemini-2.5-pro' },
    { label: 'Gemini 2.5 Flash Lite (fastest, text-only)', value: 'gemini-2.5-flash-lite' },
  ],
  deepseek: [
    { label: 'DeepSeek Chat (V3, general purpose)', value: 'deepseek-chat' },
    { label: 'DeepSeek Reasoner (R1, reasoning)', value: 'deepseek-reasoner' },
  ],
};

const DEFAULT_MODEL: Record<AiProvider, string> = {
  gemini: 'gemini-2.5-flash',
  deepseek: 'deepseek-chat',
};

type StatusType = 'success' | 'error' | 'info' | null;

export function AiSettingsCard() {
  const [savedConfig, setSavedConfig] = useState<AiCredentialsResponse | null>(null);
  const [provider, setProvider] = useState<AiProvider>('gemini');
  const [model, setModel] = useState(DEFAULT_MODEL.gemini);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<{ type: StatusType; message: string }>({ type: null, message: '' });
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getAiCredentials()
      .then((creds) => {
        if (cancelled) return;
        setSavedConfig(creds);
        if (creds.provider) {
          setProvider(creds.provider);
          setModel(creds.model || DEFAULT_MODEL[creds.provider]);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setSavedConfig(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const keyTrimmed = apiKey.trim();
    if (!savedConfig?.provider) {
      setHasChanges(keyTrimmed.length > 0);
    } else {
      setHasChanges(
        keyTrimmed.length > 0 ||
        provider !== savedConfig.provider ||
        model !== savedConfig.model,
      );
    }
  }, [provider, model, apiKey, savedConfig]);

  const handleProviderChange = useCallback((value: string) => {
    const p = value as AiProvider;
    setProvider(p);
    setModel(DEFAULT_MODEL[p]);
  }, []);

  const handleSave = useCallback(async () => {
    const trimmedKey = apiKey.trim();
    if (!trimmedKey && !savedConfig?.provider) {
      setStatus({ type: 'error', message: 'Enter an API key first.' });
      return;
    }

    setSaving(true);
    setStatus({ type: null, message: '' });
    try {
      const result = await saveAiCredentials({
        provider,
        model,
        apiKey: trimmedKey || 'placeholder',
      });
      setSavedConfig(result);
      setApiKey('');
      setShowKey(false);
      setStatus({ type: 'success', message: `AI configuration saved. Using ${PROVIDER_LABELS[provider]} (${model}).` });
    } catch (error) {
      setStatus({ type: 'error', message: error instanceof Error ? error.message : 'Failed to save AI configuration.' });
    } finally {
      setSaving(false);
    }
  }, [provider, model, apiKey, savedConfig]);

  const handleRemove = useCallback(async () => {
    setSaving(true);
    setStatus({ type: null, message: '' });
    try {
      await deleteAiCredentials();
      setSavedConfig(null);
      setApiKey('');
      setShowKey(false);
      setProvider('gemini');
      setModel(DEFAULT_MODEL.gemini);
      setStatus({ type: 'info', message: 'AI configuration cleared. Falling back to server env GEMINI_API_KEY if configured.' });
    } catch (error) {
      setStatus({ type: 'error', message: error instanceof Error ? error.message : 'Failed to remove AI configuration.' });
    } finally {
      setSaving(false);
    }
  }, []);

  const handleTest = useCallback(async () => {
    setTesting(true);
    setStatus({ type: null, message: '' });
    try {
      const result = await testAiCredentials();
      if (result.success) {
        setStatus({ type: 'success', message: result.message || 'Connection successful.' });
      } else {
        setStatus({ type: 'error', message: result.error || 'Connection test failed.' });
      }
    } catch (error) {
      setStatus({ type: 'error', message: error instanceof Error ? error.message : 'Connection test failed.' });
    } finally {
      setTesting(false);
    }
  }, []);

  const isDirty = hasChanges;
  const hasSavedKey = Boolean(savedConfig?.provider && savedConfig?.apiKeyLast4);

  return (
    <Card className="border-none shadow-sm rounded-2xl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Key className="h-5 w-5 text-slate-700 dark:text-slate-300" />
          <CardTitle>AI Provider & API Key</CardTitle>
        </div>
        <CardDescription>
          Configure which AI provider the app uses for portfolio Q&A and screenshot OCR.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  AI Provider
                </label>
                <Select value={provider} onChange={(e) => handleProviderChange(e.target.value)}>
                  {(Object.keys(PROVIDER_MODELS) as AiProvider[]).map((p) => (
                    <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Model
                </label>
                <Select value={model} onChange={(e) => setModel(e.target.value)}>
                  {(PROVIDER_MODELS[provider] || []).map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                API Key
              </label>
              <div className="relative">
                <Input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={
                    hasSavedKey
                      ? `${'•'.repeat(20)}${savedConfig!.apiKeyLast4}`
                      : `Enter your ${PROVIDER_LABELS[provider]} API key`
                  }
                  className="pr-10 font-mono text-sm"
                  aria-label="AI API Key"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  aria-label={showKey ? 'Hide API key' : 'Show API key'}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {hasSavedKey && !apiKey && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Key ending in <span className="font-mono">{savedConfig!.apiKeyLast4}</span> is saved. Enter a new key to replace it.
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                className="rounded-full bg-[#00875A] text-white hover:bg-[#007A51]"
                disabled={saving || testing || (!isDirty && !apiKey.trim())}
                onClick={handleSave}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Configuration'
                )}
              </Button>

              {hasSavedKey && (
                <Button
                  variant="outline"
                  className="rounded-full"
                  disabled={saving || testing}
                  onClick={handleTest}
                >
                  {testing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Test Connection
                </Button>
              )}

              {hasSavedKey && (
                <Button
                  variant="outline"
                  className="rounded-full text-red-600 hover:text-red-700 hover:border-red-300 dark:text-red-400 dark:hover:border-red-800"
                  disabled={saving || testing}
                  onClick={handleRemove}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove Key
                </Button>
              )}
            </div>

            {status.type && (
              <div className={`rounded-xl border px-3 py-2 text-sm ${
                status.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200'
                  : status.type === 'error'
                    ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300'
                    : 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-300'
              }`}>
                <div className="flex items-center gap-2">
                  {status.type === 'success' && <CheckCircle className="h-4 w-4 shrink-0" />}
                  {status.type === 'error' && <AlertCircle className="h-4 w-4 shrink-0" />}
                  <span>{status.message}</span>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              <ul className="space-y-1.5 list-disc list-inside">
                <li>The API key is encrypted at rest and never exposed to the client after save.</li>
                <li>If no user-level API key is saved, the server falls back to the GEMINI_API_KEY environment variable.</li>
                <li>Portfolio Q&amp;A uses the selected provider for all responses.</li>
                <li>Screenshot import uses the selected provider for OCR extraction.</li>
                <li>DeepSeek vision support depends on the model. For reliable OCR, Gemini is recommended.</li>
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
