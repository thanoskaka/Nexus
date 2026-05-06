import { CHECKLIST_STORAGE_KEY } from './checklistTypes';
import type { SetupStatusResponse } from './setupStatusApi';

export type NextActionId =
  | 'choose-workspace'
  | 'add-first-asset'
  | 'configure-firebase'
  | 'configure-price-provider'
  | 'add-ai-key'
  | 'setup-import'
  | 'review-docs';

export type NextActionRoute =
  | { kind: 'settings'; section: string }
  | { kind: 'docs' }
  | { kind: 'add-asset' };

export interface NextAction {
  id: NextActionId;
  title: string;
  description: string;
  actionLabel: string;
  route: NextActionRoute;
}

const ACTION_DEFS: Record<NextActionId, Omit<NextAction, 'id'>> = {
  'choose-workspace': {
    title: 'Choose workspace mode',
    description: 'Pick hosted or self-owned mode.',
    actionLabel: 'Set up',
    route: { kind: 'settings', section: 'workspace' },
  },
  'add-first-asset': {
    title: 'Add your first asset',
    description: 'Start tracking your portfolio.',
    actionLabel: 'Add asset',
    route: { kind: 'add-asset' },
  },
  'configure-firebase': {
    title: 'Configure Firebase & Admin',
    description: 'Set server credentials for sync and AI features.',
    actionLabel: 'Set up',
    route: { kind: 'docs' },
  },
  'configure-price-provider': {
    title: 'Add price provider',
    description: 'Get live market data for your holdings.',
    actionLabel: 'Add key',
    route: { kind: 'settings', section: 'price-providers' },
  },
  'add-ai-key': {
    title: 'Add AI key',
    description: 'Enable portfolio Q&A and screenshot OCR.',
    actionLabel: 'Add key',
    route: { kind: 'settings', section: 'price-providers' },
  },
  'setup-import': {
    title: 'Set up import',
    description: 'Connect Upstox, Splitwise, or CAS parser.',
    actionLabel: 'Connect',
    route: { kind: 'settings', section: 'integrations' },
  },
  'review-docs': {
    title: 'Review docs',
    description: 'Learn about workflows, providers, and config.',
    actionLabel: 'Open docs',
    route: { kind: 'docs' },
  },
};

const PRIORITY_ORDER: NextActionId[] = [
  'choose-workspace',
  'add-first-asset',
  'configure-firebase',
  'configure-price-provider',
  'add-ai-key',
  'setup-import',
  'review-docs',
];

export interface NextActionInput {
  workspaceChosen: boolean;
  assetsCount: number;
  firebaseConfigured: boolean;
  adminConfigured: boolean;
  priceProviderConfigured: boolean;
  aiKeyConfigured: boolean;
  importSetupDone: boolean;
  docsReviewed: boolean;
}

function readDocsReviewedFromStorage(): boolean {
  try {
    const raw = window.localStorage.getItem(CHECKLIST_STORAGE_KEY);
    if (!raw) return false;
    const state = JSON.parse(raw);
    return state['review-docs'] === 'done';
  } catch {
    return false;
  }
}

export function checkWorkspaceChosen(userUid?: string): boolean {
  try {
    const key = userUid ? `nexus.workspaceOwnership.v1:${userUid}` : 'nexus.workspaceOwnership.v1';
    const raw = window.localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.mode === 'hosted' || parsed.mode === 'selfOwned') return true;
    }
    // Self-owned mode: ownership saved under hosted uid but app runs under self-owned uid.
    // Scan all keys for any valid ownership entry.
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k?.startsWith('nexus.workspaceOwnership.v1')) {
        const r = window.localStorage.getItem(k);
        if (r) {
          const p = JSON.parse(r);
          if (p.mode === 'hosted' || p.mode === 'selfOwned') return true;
        }
      }
    }
    return false;
  } catch {
    return false;
  }
}

function anyPriceProviderConfigured(status: SetupStatusResponse): boolean {
  return (
    status.pricing.massive.configured ||
    status.pricing.alphaVantage.configured ||
    status.pricing.finnhub.configured ||
    status.pricing.upstoxSystem.configured
  );
}

export interface ComputedActions {
  primary: NextAction | null;
  secondary: NextAction[];
  all: NextAction[];
}

export function computeNextActions(input: NextActionInput): ComputedActions {
  const pending: Record<NextActionId, boolean> = {
    'choose-workspace': !input.workspaceChosen,
    'add-first-asset': input.assetsCount === 0,
    'configure-firebase': !input.firebaseConfigured || !input.adminConfigured,
    'configure-price-provider': !input.priceProviderConfigured,
    'add-ai-key': !input.aiKeyConfigured,
    'setup-import': !input.importSetupDone,
    'review-docs': !input.docsReviewed,
  };

  const all: NextAction[] = [];
  for (const id of PRIORITY_ORDER) {
    if (pending[id]) {
      all.push({ id, ...ACTION_DEFS[id] });
    }
  }

  return {
    primary: all[0] ?? null,
    secondary: all.slice(1, 3),
    all,
  };
}

export function buildInput(
  status: SetupStatusResponse | null,
  assetsCount: number,
  upstoxConnected: boolean,
  splitwiseConnected: boolean,
  aiKeyConfigured: boolean,
  userUid?: string,
): NextActionInput {
  const adminConfigured = status?.features.firebaseAdmin ?? false;
  const firebaseConfigured = status?.firebase.configured ?? false;
  const priceProviderConfigured = status ? anyPriceProviderConfigured(status) : false;
  const importSetupDone = upstoxConnected || splitwiseConnected || (status?.casParser.configured ?? false);
  const docsReviewed = readDocsReviewedFromStorage();
  const workspaceChosen = checkWorkspaceChosen(userUid);

  return {
    workspaceChosen,
    assetsCount,
    firebaseConfigured,
    adminConfigured,
    priceProviderConfigured,
    aiKeyConfigured,
    importSetupDone,
    docsReviewed,
  };
}
