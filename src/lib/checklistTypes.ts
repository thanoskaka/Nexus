export const CHECKLIST_ITEM_IDS = {
  SIGN_IN: 'sign-in',
  ADD_FIRST_ASSET: 'add-first-asset',
  CONFIGURE_ADMIN: 'configure-admin',
  CONFIGURE_PRICE_PROVIDERS: 'configure-price-providers',
  CONNECT_PROVIDER: 'connect-provider',
  IMPORT_HOLDINGS: 'import-holdings',
  ADD_AI_KEY: 'add-ai-key',
  REVIEW_DOCS: 'review-docs',
} as const;

export type ChecklistItemId = (typeof CHECKLIST_ITEM_IDS)[keyof typeof CHECKLIST_ITEM_IDS];

export type ChecklistItemState = 'pending' | 'done' | 'skipped';

export type ChecklistState = Record<ChecklistItemId, ChecklistItemState>;

export const CHECKLIST_ITEMS: ChecklistItemId[] = [
  CHECKLIST_ITEM_IDS.SIGN_IN,
  CHECKLIST_ITEM_IDS.ADD_FIRST_ASSET,
  CHECKLIST_ITEM_IDS.CONFIGURE_ADMIN,
  CHECKLIST_ITEM_IDS.CONFIGURE_PRICE_PROVIDERS,
  CHECKLIST_ITEM_IDS.CONNECT_PROVIDER,
  CHECKLIST_ITEM_IDS.IMPORT_HOLDINGS,
  CHECKLIST_ITEM_IDS.ADD_AI_KEY,
  CHECKLIST_ITEM_IDS.REVIEW_DOCS,
];

export type ChecklistActionId = 'integrations' | 'data' | 'ai-key' | 'docs';

export const CHECKLIST_STORAGE_KEY = 'nexus-checklist-state';
