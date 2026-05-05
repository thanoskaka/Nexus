import type { SetupStatusResponse } from './setupStatusApi';

export type CostPosture = 'free' | 'free-tier' | 'paid' | 'user-owned';

export type SetupStepId =
  | 'choose-path'
  | 'firebase-client'
  | 'firebase-admin'
  | 'gemini'
  | 'deepseek'
  | 'massive'
  | 'alpha-vantage'
  | 'logo-dev'
  | 'upstox'
  | 'splitwise'
  | 'cas-parser'
  | 'verify-setup';

export type SetupCategory =
  | 'getting-started'
  | 'firebase'
  | 'price-providers'
  | 'ai-providers'
  | 'import-providers'
  | 'connected-accounts'
  | 'logos'
  | 'verify';

export interface SetupStepConfig {
  id: SetupStepId;
  category: SetupCategory;
  title: string;
  description: string;
  whatItEnables: string;
  required: boolean;
  estimatedMinutes: number;
  costPosture: CostPosture;
  envKeys: string[];
  docsLinks: { label: string; url: string }[];
  appRoute?: { label: string; navigateTo: 'settings' | 'docs'; section?: string };
  verificationKey: keyof SetupStatusResponse['features'] | null;
  setupInstructionSteps: string[];
}

export const CATEGORY_ORDER: SetupCategory[] = [
  'getting-started',
  'firebase',
  'price-providers',
  'ai-providers',
  'import-providers',
  'logos',
  'connected-accounts',
  'verify',
];

export const CATEGORY_LABELS: Record<SetupCategory, string> = {
  'getting-started': 'Choose Setup Path',
  'firebase': 'Firebase',
  'price-providers': 'Price Providers',
  'ai-providers': 'AI Providers',
  'import-providers': 'Import Providers',
  'logos': 'Logo Provider',
  'connected-accounts': 'Connected Accounts',
  'verify': 'Verify Setup',
};

export const SETUP_STEPS: SetupStepConfig[] = [
  {
    id: 'choose-path',
    category: 'getting-started',
    title: 'Choose Your Setup Path',
    description: 'Decide how you want to run Nexus: hosted on our cloud, hosted with your own API keys, or fully self-hosted.',
    whatItEnables: 'Self-hosted gives full control over data, costs, and configuration. Hosted mode gets you started instantly.',
    required: true,
    estimatedMinutes: 2,
    costPosture: 'free',
    envKeys: [],
    docsLinks: [
      { label: 'Hosted vs Self-Hosted Guide', url: '/docs/setup-modes' },
    ],
    appRoute: { label: 'Read Docs', navigateTo: 'docs' },
    verificationKey: null,
    setupInstructionSteps: [
      'Hosted (Nexus Cloud): Visit the hosted app, sign in with Google, and start tracking. No setup required.',
      'Bring Your Own Keys: Use the hosted app but supply your own Firebase project and API keys.',
      'Self-Hosted: Clone the repo, set up Firebase, deploy on Vercel. Full data ownership.',
      'You can start with Hosted mode and migrate to Bring Your Own Keys or Self-Hosted later.',
    ],
  },
  {
    id: 'firebase-client',
    category: 'firebase',
    title: 'Firebase Client Config',
    description: 'Configure the Firebase web SDK for authentication and Firestore data storage.',
    whatItEnables: 'User sign-in (Google), shared portfolio access, cloud data sync, and multi-device support.',
    required: true,
    estimatedMinutes: 5,
    costPosture: 'free',
    envKeys: [
      'NEXT_PUBLIC_FIREBASE_API_KEY',
      'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
      'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
      'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
      'NEXT_PUBLIC_FIREBASE_APP_ID',
    ],
    docsLinks: [
      { label: 'Firebase Console', url: 'https://console.firebase.google.com' },
      { label: 'Firebase Setup Docs', url: '/docs/setup-modes' },
    ],
    appRoute: { label: 'Firebase Setup Docs', navigateTo: 'docs' },
    verificationKey: 'firebaseAuth',
    setupInstructionSteps: [
      'Go to Firebase Console → Create a project (free tier works).',
      'Enable Google sign-in under Authentication → Sign-in method.',
      'Register a web app under Project Settings → General → Your apps.',
      'Copy the Firebase config values into your .env.local or Vercel env vars.',
      'Add your deployment domain to Authentication → Settings → Authorized domains.',
    ],
  },
  {
    id: 'firebase-admin',
    category: 'firebase',
    title: 'Firebase Admin SDK',
    description: 'Configure Firebase Admin SDK for server-side operations like connected accounts and AI credentials.',
    whatItEnables: 'Server-side ID token verification, Upstox/Splitwise connected accounts, AI credentials, and shared integration management.',
    required: true,
    estimatedMinutes: 5,
    costPosture: 'free',
    envKeys: ['FIREBASE_ADMIN_PROJECT_ID', 'FIREBASE_ADMIN_CLIENT_EMAIL', 'FIREBASE_ADMIN_PRIVATE_KEY'],
    docsLinks: [
      { label: 'Firebase Service Accounts', url: 'https://console.firebase.google.com/project/_/settings/serviceaccounts/adminsdk' },
      { label: 'Admin SDK Setup Docs', url: '/docs/setup-modes' },
    ],
    appRoute: { label: 'Firebase Setup Docs', navigateTo: 'docs' },
    verificationKey: 'firebaseAdmin',
    setupInstructionSteps: [
      'Go to Firebase Console → Project Settings → Service Accounts.',
      'Click "Generate new private key" — this downloads a JSON file.',
      'Copy project_id, client_email, and private_key into env vars.',
      'The private key must have \\n for newlines if set as a single-line env var.',
    ],
  },
  {
    id: 'gemini',
    category: 'ai-providers',
    title: 'Google Gemini AI',
    description: 'Set up Gemini as your AI provider for portfolio Q&A and screenshot OCR extraction.',
    whatItEnables: 'AI portfolio assistant, natural language Q&A about your holdings, and AI-powered screenshot import.',
    required: false,
    estimatedMinutes: 5,
    costPosture: 'free-tier',
    envKeys: ['GEMINI_API_KEY', 'GOOGLE_API_KEY'],
    docsLinks: [
      { label: 'Google AI Studio', url: 'https://aistudio.google.com/apikey' },
      { label: 'API Keys Docs', url: '/docs/setup-modes' },
    ],
    appRoute: { label: 'Open AI Settings', navigateTo: 'settings', section: 'price-providers' },
    verificationKey: 'aiAssistant',
    setupInstructionSteps: [
      'Go to Google AI Studio → Get API key (free tier available).',
      'Add GEMINI_API_KEY to your server env vars, OR go to Settings → AI Provider & API Key.',
      'User keys are encrypted at rest in Firestore.',
    ],
  },
  {
    id: 'deepseek',
    category: 'ai-providers',
    title: 'DeepSeek AI',
    description: 'Configure DeepSeek as your AI provider (alternative to Gemini).',
    whatItEnables: 'Portfolio Q&A and AI-powered screenshot import using DeepSeek models.',
    required: false,
    estimatedMinutes: 5,
    costPosture: 'paid',
    envKeys: [],
    docsLinks: [
      { label: 'DeepSeek Platform', url: 'https://platform.deepseek.com/api_keys' },
      { label: 'API Keys Docs', url: '/docs/setup-modes' },
    ],
    appRoute: { label: 'Open AI Settings', navigateTo: 'settings', section: 'price-providers' },
    verificationKey: null,
    setupInstructionSteps: [
      'Go to DeepSeek Platform → Create an API key.',
      'Go to Settings → Pricing → AI Provider & API Key.',
      'Select "DeepSeek" as provider, paste your API key, and save.',
    ],
  },
  {
    id: 'massive',
    category: 'price-providers',
    title: 'Massive (US Equity Pricing)',
    description: 'Configure Massive API for better US equity coverage than the Yahoo Finance fallback.',
    whatItEnables: 'Accurate US stock and ETF prices, extending beyond Yahoo Finance free data coverage.',
    required: false,
    estimatedMinutes: 5,
    costPosture: 'free-tier',
    envKeys: ['MASSIVE_API_KEY'],
    docsLinks: [
      { label: 'Massive API', url: 'https://massive.com' },
      { label: 'Pricing Docs', url: '/docs/capability-cost-posture' },
    ],
    appRoute: { label: 'Price Provider Settings', navigateTo: 'settings', section: 'price-providers' },
    verificationKey: 'priceRefresh',
    setupInstructionSteps: [
      'Sign up at Massive (free tier available for personal use).',
      'Set MASSIVE_API_KEY in your server environment variables.',
      'Restart or redeploy for the env var to take effect.',
    ],
  },
  {
    id: 'alpha-vantage',
    category: 'price-providers',
    title: 'Alpha Vantage',
    description: 'Configure Alpha Vantage as an alternative US equity price provider.',
    whatItEnables: 'Additional US equity coverage and Canada equity fallback pricing.',
    required: false,
    estimatedMinutes: 5,
    costPosture: 'free-tier',
    envKeys: ['ALPHA_VANTAGE_API_KEY'],
    docsLinks: [
      { label: 'Alpha Vantage', url: 'https://www.alphavantage.co/support/#api-key' },
      { label: 'Pricing Docs', url: '/docs/capability-cost-posture' },
    ],
    appRoute: { label: 'Price Provider Settings', navigateTo: 'settings', section: 'price-providers' },
    verificationKey: 'priceRefresh',
    setupInstructionSteps: [
      'Go to Alpha Vantage → Get your free API key.',
      'Set ALPHA_VANTAGE_API_KEY in your server environment variables.',
      'Free tier allows 25 requests per day.',
    ],
  },
  {
    id: 'logo-dev',
    category: 'logos',
    title: 'Logo.dev (Asset Logos)',
    description: 'Enable mutual fund and stock logos in your asset list.',
    whatItEnables: 'Brand logos for stocks, ETFs, and mutual funds shown alongside your holdings.',
    required: false,
    estimatedMinutes: 5,
    costPosture: 'free-tier',
    envKeys: ['VITE_LOGO_DEV_PUBLISHABLE_KEY', 'LOGO_DEV_SECRET_KEY'],
    docsLinks: [
      { label: 'Logo.dev', url: 'https://logo.dev' },
      { label: 'Pricing Docs', url: '/docs/capability-cost-posture' },
    ],
    appRoute: { label: 'Pricing Settings', navigateTo: 'settings', section: 'price-providers' },
    verificationKey: 'logoProvider',
    setupInstructionSteps: [
      'Sign up at Logo.dev (free tier available).',
      'Set VITE_LOGO_DEV_PUBLISHABLE_KEY (client-side) and optionally LOGO_DEV_SECRET_KEY.',
      'Restart or redeploy for server-side key to take effect.',
    ],
  },
  {
    id: 'upstox',
    category: 'connected-accounts',
    title: 'Upstox (Broker Sync)',
    description: 'Connect your Upstox account for read-only portfolio sync of India stocks and mutual funds.',
    whatItEnables: 'Cloud-synced holdings from Upstox, India stock pricing, and cross-device portfolio access.',
    required: false,
    estimatedMinutes: 10,
    costPosture: 'user-owned',
    envKeys: ['UPSTOX_CLIENT_ID', 'UPSTOX_CLIENT_SECRET', 'UPSTOX_REDIRECT_URI', 'CONNECTED_ACCOUNTS_ENCRYPTION_KEY', 'CONNECTED_ACCOUNTS_STATE_SECRET'],
    docsLinks: [
      { label: 'Upstox Developer Console', url: 'https://upstox.com/developer/' },
      { label: 'Integration Docs', url: '/docs/capability-cost-posture' },
    ],
    appRoute: { label: 'Connected Accounts', navigateTo: 'settings', section: 'integrations' },
    verificationKey: 'upstoxConnectedAccounts',
    setupInstructionSteps: [
      'Go to Upstox Developer Console → Create App.',
      'Set redirect URI to: {APP_BASE_URL}/api/connections/upstox/callback',
      'Set UPSTOX_CLIENT_ID, UPSTOX_CLIENT_SECRET, and generate encryption keys.',
      'Go to Settings → Integrations → Connected Accounts to connect your Upstox account.',
    ],
  },
  {
    id: 'splitwise',
    category: 'connected-accounts',
    title: 'Splitwise (Expenses)',
    description: 'Connect Splitwise to sync shared expenses and balances into your portfolio.',
    whatItEnables: 'Shared expense tracking, group balances, and recent expenses visible in your portfolio.',
    required: false,
    estimatedMinutes: 10,
    costPosture: 'user-owned',
    envKeys: ['SPLITWISE_CLIENT_ID', 'SPLITWISE_CLIENT_SECRET', 'SPLITWISE_REDIRECT_URI', 'SPLITWISE_STATE_SECRET', 'INTEGRATION_TOKEN_ENCRYPTION_KEY'],
    docsLinks: [
      { label: 'Splitwise Developer', url: 'https://secure.splitwise.com/apps' },
      { label: 'Integration Docs', url: '/docs/capability-cost-posture' },
    ],
    appRoute: { label: 'Splitwise Settings', navigateTo: 'settings', section: 'integrations' },
    verificationKey: 'splitwise',
    setupInstructionSteps: [
      'Go to Splitwise Developer → Register Your Application.',
      'Set redirect URI to: {APP_BASE_URL}/api/splitwise/callback',
      'Set SPLITWISE_CLIENT_ID, SPLITWISE_CLIENT_SECRET, and generate secrets.',
      'Go to Settings → Integrations to connect your Splitwise account.',
    ],
  },
  {
    id: 'cas-parser',
    category: 'import-providers',
    title: 'CAS Parser (India MF Import)',
    description: 'Parse CAS PDFs to bulk-import Indian mutual fund holdings.',
    whatItEnables: 'Bulk import of India mutual funds from CAMS/KFintech CAS PDF statements.',
    required: false,
    estimatedMinutes: 5,
    costPosture: 'free-tier',
    envKeys: ['CAS_PARSER_SERVICE_URL', 'CAS_PARSER_API_KEY', 'CAS_PARSER_ALLOW_EXTERNAL_FALLBACK'],
    docsLinks: [
      { label: 'CAS Parser Setup', url: '/docs/capability-cost-posture' },
    ],
    appRoute: { label: 'Import Holdings', navigateTo: 'settings', section: 'data-management' },
    verificationKey: 'casParser',
    setupInstructionSteps: [
      'Self-host the parser service (Docker) or use casparser.in cloud API.',
      'Set CAS_PARSER_SERVICE_URL for self-hosted, or CAS_PARSER_API_KEY for cloud.',
      'Go to Settings → Data → Import to use CAS import after configuration.',
    ],
  },
  {
    id: 'verify-setup',
    category: 'verify',
    title: 'Verify Your Setup',
    description: 'Run a final check to ensure all critical components are working correctly.',
    whatItEnables: 'Confirms Firebase Auth, Admin SDK, price providers, integrations, and AI capabilities are operational.',
    required: true,
    estimatedMinutes: 2,
    costPosture: 'free',
    envKeys: [],
    docsLinks: [
      { label: 'Troubleshooting Docs', url: '/docs/troubleshooting' },
    ],
    appRoute: { label: 'Setup Health', navigateTo: 'settings', section: 'integrations' },
    verificationKey: null,
    setupInstructionSteps: [
      'Click "Check Status" to run a full setup health diagnostic.',
      'Green items are configured correctly. Amber items are partial.',
      'Missing items show which env vars or steps are still needed.',
    ],
  },
];

export function getStepConfig(id: SetupStepId): SetupStepConfig {
  const config = SETUP_STEPS.find((s) => s.id === id);
  if (!config) throw new Error(`Unknown setup step: ${id}`);
  return config;
}

export function getStepsByCategory(): Map<SetupCategory, SetupStepConfig[]> {
  const map = new Map<SetupCategory, SetupStepConfig[]>();
  for (const id of CATEGORY_ORDER) {
    const steps = SETUP_STEPS.filter((s) => s.category === id);
    if (steps.length > 0) {
      map.set(id, steps);
    }
  }
  return map;
}

export type WizardStepState = 'pending' | 'skipped' | 'done';

export interface WizardState {
  stepStates: Record<SetupStepId, WizardStepState>;
  currentStepIndex: number;
}

export const WIZARD_STORAGE_KEY = 'nexus-wizard-state';

export function loadWizardState(): WizardState | null {
  try {
    const raw = window.localStorage.getItem(WIZARD_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.stepStates === 'object' && typeof parsed.currentStepIndex === 'number') {
      return parsed as WizardState;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveWizardState(state: WizardState) {
  try {
    window.localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // noop
  }
}

export function getStepVerificationStatus(
  step: SetupStepConfig,
  setupStatus: SetupStatusResponse | null,
): 'configured' | 'missing' | 'unknown' {
  if (!setupStatus || !step.verificationKey) return 'unknown';
  const featureFlag = setupStatus.features[step.verificationKey];
  if (typeof featureFlag === 'boolean') {
    return featureFlag ? 'configured' : 'missing';
  }
  return 'unknown';
}
