import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Loader2, CheckCircle, XCircle, AlertCircle, RefreshCw, Server, Activity } from 'lucide-react';
import { fetchSetupStatus, type SetupStatusResponse } from '../lib/setupStatusApi';

type HealthItemStatus = 'configured' | 'partial' | 'missing';

type HealthItem = {
  key: string;
  label: string;
  status: HealthItemStatus;
  hint: string;
  docRef?: string;
};

function toStatus(configured: boolean): HealthItemStatus {
  return configured ? 'configured' : 'missing';
}

function buildItems(data: SetupStatusResponse): HealthItem[] {
  return [
    {
      key: 'firebase-auth',
      label: 'Firebase Auth',
      status: toStatus(data.features.firebaseAuth),
      hint: data.features.firebaseAuth
        ? `Project: ${data.firebase.projectId || 'set'}`
        : 'Set NEXT_PUBLIC_FIREBASE_* env vars',
      docRef: 'docs/setup-modes.md',
    },
    {
      key: 'firebase-admin',
      label: 'Firebase Admin',
      status: toStatus(data.features.firebaseAdmin),
      hint: adminHint(data.firebaseAdmin),
      docRef: 'docs/setup-modes.md',
    },
    {
      key: 'price-refresh',
      label: 'Price Refresh',
      status: toStatus(data.features.priceRefresh),
      hint: 'Yahoo fallback always works. Configure MASSIVE_API_KEY or ALPHA_VANTAGE_API_KEY for better coverage.',
      docRef: 'docs/capability-cost-posture.md',
    },
    {
      key: 'upstox',
      label: 'Upstox',
      status: upstoxStatus(data),
      hint: upstoxHint(data),
      docRef: 'docs/capability-cost-posture.md',
    },
    {
      key: 'splitwise',
      label: 'Splitwise',
      status: splitwiseStatus(data),
      hint: splitwiseHint(data),
      docRef: 'docs/capability-cost-posture.md',
    },
    {
      key: 'cas-parser',
      label: 'CAS Parser',
      status: toStatus(data.features.casParser),
      hint: data.features.casParser
        ? data.casParser.hasServiceUrl
          ? 'Self-hosted parser configured'
          : 'External fallback enabled (casparser.in)'
        : 'Set CAS_PARSER_SERVICE_URL or CAS_PARSER_API_KEY + ALLOW_EXTERNAL_FALLBACK',
      docRef: 'docs/capability-cost-posture.md',
    },
    {
      key: 'screenshot-import',
      label: 'Screenshot Import',
      status: toStatus(data.features.screenshotImport),
      hint: data.features.screenshotImport
        ? 'AI provider configured (server key or user credentials)'
        : 'Add a Gemini/DeepSeek API key in Settings > AI or set GEMINI_API_KEY env var',
    },
    {
      key: 'google-drive',
      label: 'Google Drive Sync',
      status: toStatus(data.features.googleDriveSync),
      hint: data.features.googleDriveSync
        ? 'VITE_GOOGLE_CLIENT_ID is set'
        : 'Set VITE_GOOGLE_CLIENT_ID in env',
      docRef: 'docs/capability-cost-posture.md',
    },
    {
      key: 'ai-assistant',
      label: 'AI Assistant',
      status: toStatus(data.features.aiAssistant),
      hint: data.features.aiAssistant
        ? data.ai.serverKey.configured
          ? 'Server-level Gemini key configured'
          : 'User credentials supported via Settings > AI'
        : 'Set GEMINI_API_KEY env var or add your own AI key in Settings > AI',
    },
    {
      key: 'logo-provider',
      label: 'Logo Provider',
      status: toStatus(data.features.logoProvider),
      hint: data.features.logoProvider
        ? 'Logo.dev key configured'
        : 'Set VITE_LOGO_DEV_PUBLISHABLE_KEY or LOGO_DEV_SECRET_KEY',
      docRef: 'docs/capability-cost-posture.md',
    },
  ];
}

function upstoxStatus(data: SetupStatusResponse): HealthItemStatus {
  if (data.features.upstoxConnectedAccounts) return 'configured';
  if (data.integrations.upstox.clientConfigured) return 'partial';
  return 'missing';
}

function splitwiseStatus(data: SetupStatusResponse): HealthItemStatus {
  if (data.features.splitwise) return 'configured';
  if (data.integrations.splitwise.clientConfigured) return 'partial';
  return 'missing';
}

function upstoxHint(data: SetupStatusResponse): string {
  if (data.features.upstoxConnectedAccounts) return 'Upstox connected accounts ready';
  const parts: string[] = [];
  if (!data.integrations.upstox.clientConfigured) parts.push('UPSTOX_CLIENT_ID');
  if (!data.integrations.upstox.redirectConfigured) parts.push('UPSTOX_REDIRECT_URI');
  if (!data.connectedAccounts.encryptionConfigured) parts.push('CONNECTED_ACCOUNTS_ENCRYPTION_KEY');
  if (!data.connectedAccounts.stateSecretConfigured) parts.push('CONNECTED_ACCOUNTS_STATE_SECRET');
  if (!data.firebaseAdmin.configured) parts.push('FIREBASE_ADMIN_*');
  return parts.length > 0 ? `Needs: ${parts.join(', ')}` : 'Partial config — check env vars';
}

function splitwiseHint(data: SetupStatusResponse): string {
  if (data.features.splitwise) return 'Splitwise integration ready';
  const parts: string[] = [];
  if (!data.integrations.splitwise.clientConfigured) parts.push('SPLITWISE_CLIENT_ID');
  if (!data.integrations.splitwise.redirectConfigured) parts.push('SPLITWISE_REDIRECT_URI');
  if (!data.integrationTokens.encryptionConfigured) parts.push('INTEGRATION_TOKEN_ENCRYPTION_KEY');
  if (!data.integrations.splitwise.stateSecretConfigured) parts.push('SPLITWISE_STATE_SECRET');
  if (!data.firebaseAdmin.configured) parts.push('FIREBASE_ADMIN_*');
  return parts.length > 0 ? `Needs: ${parts.join(', ')}` : 'Partial config — check env vars';
}

function adminHint(admin: SetupStatusResponse['firebaseAdmin']): string {
  if (admin.configured) return 'Firebase Admin SDK ready';
  const parts: string[] = [];
  if (!admin.hasProjectId) parts.push('FIREBASE_ADMIN_PROJECT_ID');
  if (!admin.hasClientEmail) parts.push('FIREBASE_ADMIN_CLIENT_EMAIL');
  if (!admin.hasPrivateKey) parts.push('FIREBASE_ADMIN_PRIVATE_KEY');
  return `Needs: ${parts.join(', ')}`;
}

function ModeBadge({ mode }: { mode: SetupStatusResponse['mode'] }) {
  const colors: Record<string, string> = {
    local: 'bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200',
    'self-hosted': 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200',
    hosted: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${colors[mode] || ''}`}>
      <Server className="h-3 w-3" />
      {mode}
    </span>
  );
}

function StatusIcon({ status }: { status: HealthItemStatus }) {
  switch (status) {
    case 'configured':
      return <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />;
    case 'partial':
      return <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />;
    case 'missing':
      return <XCircle className="h-4 w-4 text-slate-300 dark:text-slate-600 shrink-0 mt-0.5" />;
  }
}

function StatusBadge({ status }: { status: HealthItemStatus }) {
  const styles: Record<HealthItemStatus, string> = {
    configured: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    partial: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    missing: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}

export function SetupHealthCard() {
  const [data, setData] = useState<SetupStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchSetupStatus();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load setup status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Card className="border-none shadow-sm rounded-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-slate-700 dark:text-slate-300" />
            <CardTitle>Setup Health</CardTitle>
          </div>
          {data && <ModeBadge mode={data.mode} />}
        </div>
        <CardDescription>
          Environment diagnostics and feature availability
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="flex items-center gap-2 text-sm text-rose-600 dark:text-rose-400">
              <XCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
            <Button variant="outline" size="sm" onClick={load} className="rounded-full">
              <RefreshCw className="mr-2 h-3 w-3" />
              Retry
            </Button>
          </div>
        )}

        {data && !loading && (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {buildItems(data).map((item) => (
              <div
                key={item.key}
                className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-950"
              >
                <StatusIcon status={item.status} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {item.label}
                    </span>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {item.hint}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
