import type { SetupStatusResponse } from './setupStatusApi';

export type CostPosture = 'free' | 'bring-your-own-key' | 'hosted-managed' | 'paid-third-party' | 'unsupported';

export type SetupStatus = 'ready' | 'needs-key' | 'needs-setup' | 'unavailable';

export interface ProviderCapabilityRow {
  key: string;
  capability: string;
  description: string;
  hostedAvailable: boolean;
  userKeySupported: boolean;
  costPosture: CostPosture;
  docsPath?: string;
  envVars?: string[];
}

export interface ProviderCapabilityDisplayRow extends ProviderCapabilityRow {
  setupStatus: SetupStatus;
  setupHint: string;
}

function postureLabel(posture: CostPosture): string {
  switch (posture) {
    case 'free': return 'Free';
    case 'bring-your-own-key': return 'BYO Key';
    case 'hosted-managed': return 'Hosted-Managed';
    case 'paid-third-party': return 'Paid 3rd Party';
    case 'unsupported': return 'Unsupported';
  }
}

export function postureBadgeStyle(posture: CostPosture): string {
  switch (posture) {
    case 'free':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300';
    case 'bring-your-own-key':
      return 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300';
    case 'hosted-managed':
      return 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300';
    case 'paid-third-party':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300';
    case 'unsupported':
      return 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';
  }
}

function statusBadgeStyle(status: SetupStatus): string {
  switch (status) {
    case 'ready':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300';
    case 'needs-key':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300';
    case 'needs-setup':
      return 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300';
    case 'unavailable':
      return 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';
  }
}

function statusLabel(status: SetupStatus): string {
  switch (status) {
    case 'ready': return 'Ready';
    case 'needs-key': return 'Needs Key';
    case 'needs-setup': return 'Needs Setup';
    case 'unavailable': return 'Unavailable';
  }
}

const PROVIDER_ROWS: ProviderCapabilityRow[] = [
  {
    key: 'yahoo',
    capability: 'Yahoo Finance (fallback)',
    description: 'Free price fallback for US/Canada equities. Works without any API key.',
    hostedAvailable: true,
    userKeySupported: false,
    costPosture: 'free',
    docsPath: 'docs/capability-cost-posture.md',
  },
  {
    key: 'massive',
    capability: 'Massive',
    description: 'US equity pricing with better coverage than Yahoo. Free tier available.',
    hostedAvailable: true,
    userKeySupported: true,
    costPosture: 'bring-your-own-key',
    docsPath: 'docs/capability-cost-posture.md',
    envVars: ['MASSIVE_API_KEY'],
  },
  {
    key: 'alpha-vantage',
    capability: 'Alpha Vantage',
    description: 'Canada equity fallback pricing. Free tier available.',
    hostedAvailable: true,
    userKeySupported: true,
    costPosture: 'bring-your-own-key',
    docsPath: 'docs/capability-cost-posture.md',
    envVars: ['ALPHA_VANTAGE_API_KEY'],
  },
  {
    key: 'gemini',
    capability: 'Gemini',
    description: 'AI-powered portfolio Q&A and screenshot OCR via Gemini models.',
    hostedAvailable: true,
    userKeySupported: true,
    costPosture: 'bring-your-own-key',
    docsPath: 'docs/capability-cost-posture.md',
    envVars: ['GEMINI_API_KEY', 'GOOGLE_API_KEY'],
  },
  {
    key: 'deepseek',
    capability: 'DeepSeek',
    description: 'AI-powered portfolio Q&A; vision OCR depends on model selection.',
    hostedAvailable: true,
    userKeySupported: true,
    costPosture: 'bring-your-own-key',
    docsPath: 'docs/capability-cost-posture.md',
  },
  {
    key: 'logo-dev',
    capability: 'Logo.dev',
    description: 'Mutual fund and stock logos in the asset list.',
    hostedAvailable: true,
    userKeySupported: true,
    costPosture: 'bring-your-own-key',
    docsPath: 'docs/capability-cost-posture.md',
    envVars: ['VITE_LOGO_DEV_PUBLISHABLE_KEY', 'LOGO_DEV_SECRET_KEY'],
  },
  {
    key: 'upstox',
    capability: 'Upstox',
    description: 'India stock pricing and connected-account portfolio sync.',
    hostedAvailable: true,
    userKeySupported: true,
    costPosture: 'bring-your-own-key',
    docsPath: 'docs/capability-cost-posture.md',
    envVars: ['UPSTOX_CLIENT_ID', 'UPSTOX_CLIENT_SECRET', 'UPSTOX_REDIRECT_URI'],
  },
  {
    key: 'splitwise',
    capability: 'Splitwise',
    description: 'Sync shared expenses and balances into your portfolio.',
    hostedAvailable: true,
    userKeySupported: true,
    costPosture: 'bring-your-own-key',
    docsPath: 'docs/capability-cost-posture.md',
    envVars: ['SPLITWISE_CLIENT_ID', 'SPLITWISE_CLIENT_SECRET'],
  },
  {
    key: 'cas-parser',
    capability: 'CAS Parser',
    description: 'Parse India mutual fund CAS PDFs for holdings import. Self-host or use paid cloud API.',
    hostedAvailable: false,
    userKeySupported: true,
    costPosture: 'paid-third-party',
    docsPath: 'docs/capability-cost-posture.md',
    envVars: ['CAS_PARSER_SERVICE_URL', 'CAS_PARSER_API_KEY', 'CAS_PARSER_ALLOW_EXTERNAL_FALLBACK'],
  },
];

function resolveStatus(row: ProviderCapabilityRow, data: SetupStatusResponse): { status: SetupStatus; hint: string } {
  switch (row.key) {
    case 'yahoo':
      return { status: 'ready', hint: 'Always available. No setup needed.' };

    case 'massive':
      if (data.pricing.massive.configured) {
        return { status: 'ready', hint: 'MASSIVE_API_KEY is configured.' };
      }
      return { status: 'needs-key', hint: 'Set MASSIVE_API_KEY in server env.' };

    case 'alpha-vantage':
      if (data.pricing.alphaVantage.configured) {
        return { status: 'ready', hint: 'ALPHA_VANTAGE_API_KEY is configured.' };
      }
      return { status: 'needs-key', hint: 'Set ALPHA_VANTAGE_API_KEY in server env.' };

    case 'gemini':
      if (data.ai.serverKey.configured) {
        return { status: 'ready', hint: 'Server-level Gemini key configured.' };
      }
      if (data.ai.userCredentialsSupported) {
        return { status: 'ready', hint: 'User key supported - add in Settings > AI.' };
      }
      return { status: 'needs-key', hint: 'Set GEMINI_API_KEY or add user key in Settings > AI.' };

    case 'deepseek':
      if (data.ai.userCredentialsSupported) {
        return { status: 'ready', hint: 'User key supported - add in Settings > AI.' };
      }
      return { status: 'needs-key', hint: 'Add a DeepSeek API key in Settings > AI Provider & API Key.' };

    case 'logo-dev':
      if (data.features.logoProvider) {
        return { status: 'ready', hint: 'Logo provider key configured.' };
      }
      return { status: 'needs-key', hint: 'Set VITE_LOGO_DEV_PUBLISHABLE_KEY or LOGO_DEV_SECRET_KEY.' };

    case 'upstox':
      if (data.features.upstoxConnectedAccounts) {
        return { status: 'ready', hint: 'Upstox connected accounts ready.' };
      }
      if (data.integrations.upstox.clientConfigured) {
        return { status: 'needs-setup', hint: 'Upstox client configured but missing encryption/state secrets.' };
      }
      return { status: 'needs-key', hint: 'Set UPSTOX_CLIENT_ID, UPSTOX_CLIENT_SECRET, and related env vars.' };

    case 'splitwise':
      if (data.features.splitwise) {
        return { status: 'ready', hint: 'Splitwise integration ready.' };
      }
      if (data.integrations.splitwise.clientConfigured) {
        return { status: 'needs-setup', hint: 'Splitwise client configured but missing state/encryption secrets.' };
      }
      return { status: 'needs-key', hint: 'Set SPLITWISE_CLIENT_ID, SPLITWISE_CLIENT_SECRET, and related env vars.' };

    case 'cas-parser':
      if (data.features.casParser) {
        return {
          status: 'ready',
          hint: data.casParser.hasServiceUrl
            ? 'Self-hosted parser configured.'
            : 'External fallback (casparser.in) enabled.',
        };
      }
      return { status: 'needs-key', hint: 'Set CAS_PARSER_SERVICE_URL or CAS_PARSER_API_KEY + ALLOW_EXTERNAL_FALLBACK.' };

    default:
      return { status: 'unavailable', hint: 'Status unknown.' };
  }
}

export function getProviderCapabilityRows(data: SetupStatusResponse): ProviderCapabilityDisplayRow[] {
  return PROVIDER_ROWS.map((row) => {
    const { status, hint } = resolveStatus(row, data);
    return { ...row, setupStatus: status, setupHint: hint };
  });
}

export {
  postureLabel,
  statusLabel,
  statusBadgeStyle,
  PROVIDER_ROWS,
};
