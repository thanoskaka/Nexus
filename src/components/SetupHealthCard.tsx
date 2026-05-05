import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Loader2, CheckCircle, XCircle, AlertCircle, RefreshCw, Server, Activity, ExternalLink, Copy, Settings } from 'lucide-react';
import { fetchSetupStatus, type SetupStatusResponse } from '../lib/setupStatusApi';
import { recordEvent } from '../store/setupHistory';

type HealthItemStatus = 'configured' | 'partial' | 'missing';
type FeatureImportance = 'required' | 'recommended' | 'optional';

type HealthItem = {
  key: string;
  label: string;
  status: HealthItemStatus;
  importance: FeatureImportance;
  hint: string;
  docRef?: string;
};

type EnvSnippet = {
  vars: string[];
  template?: string;
};

type FeatureDetail = {
  summary: string;
  importance: 'Required' | 'Recommended' | 'Optional';
  envSnippets: EnvSnippet[];
  instructions: string[];
  redirectUri?: string;
  needsRestart: boolean;
  docsPath?: string;
  aiSettingsLink?: boolean;
};

const FEATURE_DETAILS: Record<string, FeatureDetail> = {
  'firebase-auth': {
    summary: 'Firebase Auth handles user sign-in and portfolio access.',
    importance: 'Required',
    envSnippets: [
      {
        vars: [
          'NEXT_PUBLIC_FIREBASE_API_KEY',
          'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
          'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
          'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
          'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
          'NEXT_PUBLIC_FIREBASE_APP_ID',
        ],
        template: 'NEXT_PUBLIC_FIREBASE_API_KEY="..."\nNEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="..."\nNEXT_PUBLIC_FIREBASE_PROJECT_ID="..."',
      },
    ],
    instructions: [
      'Go to Firebase Console → Create a project (free tier works).',
      'Enable Google sign-in under Authentication → Sign-in method.',
      'Register a web app under Project Settings → General → Your apps.',
      'Copy the Firebase config values into your .env.local or Vercel environment variables.',
    ],
    needsRestart: true,
    docsPath: 'docs/setup-modes.md',
  },
  'firebase-admin': {
    summary: 'Firebase Admin SDK verifies ID tokens server-side. Required for connected accounts, Splitwise, AI, and server endpoints.',
    importance: 'Required',
    envSnippets: [
      {
        vars: ['FIREBASE_ADMIN_PROJECT_ID', 'FIREBASE_ADMIN_CLIENT_EMAIL', 'FIREBASE_ADMIN_PRIVATE_KEY'],
        template: 'FIREBASE_ADMIN_PROJECT_ID="..."\nFIREBASE_ADMIN_CLIENT_EMAIL="..."\nFIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"',
      },
    ],
    instructions: [
      'Go to Firebase Console → Project Settings → Service Accounts.',
      'Click "Generate new private key" — this downloads a JSON file.',
      'Copy project_id, client_email, and private_key into env vars.',
      'The private key must have \\n for newlines if set as a single-line env var.',
      'On GCP with workload identity, default credentials can be used instead.',
    ],
    needsRestart: true,
    docsPath: 'docs/setup-modes.md',
  },
  'price-refresh': {
    summary: 'Automatic price updates for stocks, ETFs, and mutual funds. Yahoo Finance fallback works without any keys.',
    importance: 'Recommended',
    envSnippets: [
      {
        vars: ['MASSIVE_API_KEY', 'ALPHA_VANTAGE_API_KEY'],
        template: 'MASSIVE_API_KEY="..."\nALPHA_VANTAGE_API_KEY="..."',
      },
    ],
    instructions: [
      'Yahoo Finance provides free price data for many tickers without any API key.',
      'For better US equity coverage, sign up at Massive (free tier) and set MASSIVE_API_KEY.',
      'For Canada equity fallback, sign up at Alpha Vantage (free tier) and set ALPHA_VANTAGE_API_KEY.',
      'India mutual funds use AMFI (free, no key needed).',
      'India stocks use Upstox system pricing when connected.',
    ],
    needsRestart: true,
    docsPath: 'docs/capability-cost-posture.md',
  },
  upstox: {
    summary: 'Sync your Upstox portfolio as read-only connected holdings.',
    importance: 'Optional',
    envSnippets: [
      {
        vars: ['UPSTOX_CLIENT_ID', 'UPSTOX_CLIENT_SECRET', 'UPSTOX_REDIRECT_URI'],
        template: 'UPSTOX_CLIENT_ID="..."\nUPSTOX_CLIENT_SECRET="..."\nUPSTOX_REDIRECT_URI="https://your-domain.com/api/connections/upstox/callback"',
      },
      {
        vars: ['CONNECTED_ACCOUNTS_ENCRYPTION_KEY', 'CONNECTED_ACCOUNTS_STATE_SECRET'],
      },
    ],
    instructions: [
      'Go to Upstox Developer Console → Create App.',
      'Set redirect URI to: {APP_BASE_URL}/api/connections/upstox/callback',
      'Copy Client ID and Client Secret into env vars.',
      'Generate two long random strings for encryption key and state secret.',
    ],
    redirectUri: '{APP_BASE_URL}/api/connections/upstox/callback',
    needsRestart: true,
    docsPath: 'docs/capability-cost-posture.md',
  },
  splitwise: {
    summary: 'Sync shared expenses from Splitwise into your portfolio.',
    importance: 'Optional',
    envSnippets: [
      {
        vars: ['SPLITWISE_CLIENT_ID', 'SPLITWISE_CLIENT_SECRET', 'SPLITWISE_REDIRECT_URI'],
        template: 'SPLITWISE_CLIENT_ID="..."\nSPLITWISE_CLIENT_SECRET="..."\nSPLITWISE_REDIRECT_URI="https://your-domain.com/api/splitwise/callback"',
      },
      {
        vars: ['SPLITWISE_STATE_SECRET', 'INTEGRATION_TOKEN_ENCRYPTION_KEY'],
      },
    ],
    instructions: [
      'Go to Splitwise Developer → Register Your Application.',
      'Set redirect URI to: {APP_BASE_URL}/api/splitwise/callback',
      'Copy Consumer Key (Client ID) and Consumer Secret (Client Secret).',
      'Generate random strings for state secret and encryption key.',
    ],
    redirectUri: '{APP_BASE_URL}/api/splitwise/callback',
    needsRestart: true,
    docsPath: 'docs/capability-cost-posture.md',
  },
  'cas-parser': {
    summary: 'Parse CAS (Consolidated Account Statement) PDFs to import India mutual fund holdings.',
    importance: 'Optional',
    envSnippets: [
      {
        vars: ['CAS_PARSER_SERVICE_URL'],
        template: 'CAS_PARSER_SERVICE_URL="http://localhost:8000"',
      },
      {
        vars: ['CAS_PARSER_API_KEY', 'CAS_PARSER_ALLOW_EXTERNAL_FALLBACK'],
      },
    ],
    instructions: [
      'Option A: Self-host the parser service (docker) — run services/casparser-service/.',
      'Set CAS_PARSER_SERVICE_URL to your self-hosted endpoint (default: http://localhost:8000).',
      'Option B: Use casparser.in cloud API — set CAS_PARSER_API_KEY and CAS_PARSER_ALLOW_EXTERNAL_FALLBACK=true.',
      'The cloud API is a paid third-party service.',
    ],
    needsRestart: true,
    docsPath: 'docs/capability-cost-posture.md',
  },
  'screenshot-import': {
    summary: 'Upload screenshots of holdings for AI-powered OCR extraction.',
    importance: 'Optional',
    envSnippets: [],
    instructions: [
      'Screenshot import uses an AI provider (Gemini or DeepSeek) for OCR.',
      'You can set a server-wide GEMINI_API_KEY, or configure your own key in Settings.',
      'Go to Settings → AI Provider & API Key to add your personal API key.',
      'User-supplied keys are encrypted at rest in Firestore.',
    ],
    needsRestart: false,
    aiSettingsLink: true,
  },
  'google-drive': {
    summary: 'Backup and sync portfolio data with Google Drive.',
    importance: 'Optional',
    envSnippets: [
      {
        vars: ['VITE_GOOGLE_CLIENT_ID'],
        template: 'VITE_GOOGLE_CLIENT_ID="....apps.googleusercontent.com"',
      },
    ],
    instructions: [
      'Go to Google Cloud Console → APIs & Services → Credentials.',
      'Create an OAuth 2.0 Client ID for a Web application.',
      'Add authorized JavaScript origins and redirect URIs for your domain.',
      'Copy the Client ID into VITE_GOOGLE_CLIENT_ID env var.',
      'This is a client-safe public env variable (VITE_ prefix).',
    ],
    needsRestart: true,
    docsPath: 'docs/capability-cost-posture.md',
  },
  'ai-assistant': {
    summary: 'Ask questions about your portfolio using AI. Works with Gemini or DeepSeek.',
    importance: 'Optional',
    envSnippets: [
      {
        vars: ['GEMINI_API_KEY', 'GOOGLE_API_KEY', 'NEXUS_AI_MODEL'],
        template: 'GEMINI_API_KEY="..."',
      },
    ],
    instructions: [
      'Option A: Set GEMINI_API_KEY in server env for a system-wide AI provider.',
      'Option B: Go to Settings → AI Provider & API Key to add your own key.',
      'User keys are encrypted and stored per-user in Firestore.',
      'Supports Gemini (gemini-2.5-flash, gemini-2.5-pro) and DeepSeek models.',
    ],
    needsRestart: true,
    aiSettingsLink: true,
    docsPath: 'docs/capability-cost-posture.md',
  },
  'logo-provider': {
    summary: 'Show mutual fund and stock logos in the asset list.',
    importance: 'Optional',
    envSnippets: [
      {
        vars: ['VITE_LOGO_DEV_PUBLISHABLE_KEY', 'LOGO_DEV_SECRET_KEY'],
        template: 'VITE_LOGO_DEV_PUBLISHABLE_KEY="pk_..."',
      },
    ],
    instructions: [
      'Sign up at Logo.dev (free tier available).',
      'Copy your publishable key into VITE_LOGO_DEV_PUBLISHABLE_KEY (client-side).',
      'Optionally set LOGO_DEV_SECRET_KEY server-side for server-side logo resolution.',
    ],
    needsRestart: true,
    docsPath: 'docs/capability-cost-posture.md',
  },
};

function getImportance(item: HealthItem): FeatureImportance {
  return item.importance;
}

function toStatus(configured: boolean): HealthItemStatus {
  return configured ? 'configured' : 'missing';
}

function buildItems(data: SetupStatusResponse): HealthItem[] {
  return [
    {
      key: 'firebase-auth',
      label: 'Firebase Auth',
      status: toStatus(data.features.firebaseAuth),
      importance: 'required',
      hint: data.features.firebaseAuth
        ? `Project: ${data.firebase.projectId || 'set'}`
        : 'Set NEXT_PUBLIC_FIREBASE_* env vars',
      docRef: 'docs/setup-modes.md',
    },
    {
      key: 'firebase-admin',
      label: 'Firebase Admin',
      status: toStatus(data.features.firebaseAdmin),
      importance: 'required',
      hint: adminHint(data.firebaseAdmin),
      docRef: 'docs/setup-modes.md',
    },
    {
      key: 'price-refresh',
      label: 'Price Refresh',
      status: toStatus(data.features.priceRefresh),
      importance: 'recommended',
      hint: 'Yahoo fallback always works. Configure MASSIVE_API_KEY or ALPHA_VANTAGE_API_KEY for better coverage.',
      docRef: 'docs/capability-cost-posture.md',
    },
    {
      key: 'upstox',
      label: 'Upstox',
      status: upstoxStatus(data),
      importance: 'optional',
      hint: upstoxHint(data),
      docRef: 'docs/capability-cost-posture.md',
    },
    {
      key: 'splitwise',
      label: 'Splitwise',
      status: splitwiseStatus(data),
      importance: 'optional',
      hint: splitwiseHint(data),
      docRef: 'docs/capability-cost-posture.md',
    },
    {
      key: 'cas-parser',
      label: 'CAS Parser',
      status: toStatus(data.features.casParser),
      importance: 'optional',
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
      importance: 'optional',
      hint: data.features.screenshotImport
        ? 'AI provider configured (server key or user credentials)'
        : 'Add a Gemini/DeepSeek API key in Settings > AI or set GEMINI_API_KEY env var',
    },
    {
      key: 'google-drive',
      label: 'Google Drive Sync',
      status: toStatus(data.features.googleDriveSync),
      importance: 'optional',
      hint: data.features.googleDriveSync
        ? 'VITE_GOOGLE_CLIENT_ID is set'
        : 'Set VITE_GOOGLE_CLIENT_ID in env',
      docRef: 'docs/capability-cost-posture.md',
    },
    {
      key: 'ai-assistant',
      label: 'AI Assistant',
      status: toStatus(data.features.aiAssistant),
      importance: 'optional',
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
      importance: 'optional',
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

function ImportanceBadge({ importance }: { importance: FeatureImportance }) {
  const styles: Record<FeatureImportance, string> = {
    required: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
    recommended: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
    optional: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles[importance]}`}>
      {importance}
    </span>
  );
}

function EnvBlock({ snippet }: { snippet: EnvSnippet; key?: number }) {
  const [copied, setCopied] = useState(false);
  const text = snippet.template || snippet.vars.join(' ');
  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [text]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
          {snippet.vars.length === 1 ? 'Env var' : 'Env vars'}
        </span>
        <button type="button" onClick={handleCopy} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
          <Copy className="h-3 w-3" />
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <code className="block rounded-lg bg-slate-50 p-2.5 text-xs text-slate-800 dark:bg-slate-900 dark:text-slate-200 overflow-x-auto leading-relaxed">
        {snippet.template || snippet.vars.join('\n')}
      </code>
    </div>
  );
}

function SetupDetailPanel({ item, open, onClose }: { item: HealthItem; open: boolean; onClose: () => void }) {
  const detail = FEATURE_DETAILS[item.key];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <div className="space-y-5 p-1">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <DialogTitle>{item.label}</DialogTitle>
            <StatusBadge status={item.status} />
          </div>
          <DialogDescription>
            {detail?.summary || 'No additional details available.'}
          </DialogDescription>
        </DialogHeader>

        {detail && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                <AlertCircle className="h-3 w-3" />
                {detail.importance}
              </span>
              {detail.needsRestart && (
                <span className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                  <RefreshCw className="h-3 w-3" />
                  Restart or redeploy required
                </span>
              )}
            </div>

            <div className="space-y-3">
              {detail.envSnippets.map((snippet, idx) => (
                <EnvBlock key={idx} snippet={snippet} />
              ))}
            </div>

            {detail.redirectUri && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Redirect URI</p>
                <code className="text-xs text-slate-800 dark:text-slate-200 break-all">{detail.redirectUri}</code>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Setup steps</p>
              <ol className="space-y-2">
                {detail.instructions.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      {idx + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              {detail.aiSettingsLink && (
                <Button
                  variant="default"
                  size="sm"
                  className="rounded-full bg-[#00875A] text-white hover:bg-[#007A51]"
                  onClick={onClose}
                >
                  <Settings className="mr-1.5 h-3.5 w-3.5" />
                  Open AI Settings
                </Button>
              )}
              {detail.docsPath && (
                <Button variant="outline" size="sm" className="rounded-full" onClick={onClose}>
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  View docs
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}

export function SetupHealthCard() {
  const [data, setData] = useState<SetupStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<HealthItem | null>(null);

  const initialRecordedRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchSetupStatus();
      setData(result);
      if (!initialRecordedRef.current) {
        initialRecordedRef.current = true;
        const configuredCount = buildItems(result).filter((item) => item.status === 'configured').length;
        recordEvent('setup_verification_run', `Setup health verified (${configuredCount} features configured)`, 'success');
      }
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
            {buildItems(data).map((item) => {
              const isUnconfigured = item.status !== 'configured';
              const isOptional = item.importance === 'optional';
              return (
                <div
                  key={item.key}
                  className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-950"
                >
                  <div className="flex items-start gap-3">
                    <StatusIcon status={item.status} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
                          {item.label}
                        </span>
                        <StatusBadge status={item.status} />
                        {isUnconfigured && <ImportanceBadge importance={item.importance} />}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        {item.hint}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pl-7">
                    {item.status === 'configured' ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs rounded-full text-emerald-600 dark:text-emerald-400"
                        onClick={() => setDetailItem(item)}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        View setup
                      </Button>
                    ) : isOptional ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs rounded-full text-slate-500"
                          onClick={() => setDetailItem(item)}
                        >
                          View steps
                        </Button>
                        <span className="text-xs text-slate-400">Optional</span>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs rounded-full"
                        onClick={() => setDetailItem(item)}
                      >
                        Setup
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {detailItem && (
        <SetupDetailPanel
          item={detailItem}
          open={true}
          onClose={() => setDetailItem(null)}
        />
      )}
    </Card>
  );
}
