import {
  CHECKLIST_ITEM_IDS,
  CHECKLIST_ITEMS,
  CHECKLIST_STORAGE_KEY,
  type ChecklistItemId,
  type ChecklistItemState,
  type ChecklistState,
} from './checklistTypes';

export function loadChecklistManualState(): ChecklistState {
  try {
    const raw = window.localStorage.getItem(CHECKLIST_STORAGE_KEY);
    if (!raw) return {} as ChecklistState;
    return JSON.parse(raw) as ChecklistState;
  } catch {
    return {} as ChecklistState;
  }
}

export function computeAllResolved(params: {
  assetsCount: number;
  upstoxConnected: boolean;
  splitwiseConnected: boolean;
  aiKeyConfigured: boolean;
  adminHealthy: boolean;
}): boolean {
  const manualState = loadChecklistManualState();

  const autoComplete: Record<ChecklistItemId, boolean> = {
    [CHECKLIST_ITEM_IDS.SIGN_IN]: true,
    [CHECKLIST_ITEM_IDS.ADD_FIRST_ASSET]: params.assetsCount > 0,
    [CHECKLIST_ITEM_IDS.CONFIGURE_ADMIN]: params.adminHealthy,
    [CHECKLIST_ITEM_IDS.CONFIGURE_PRICE_PROVIDERS]: false,
    [CHECKLIST_ITEM_IDS.CONNECT_PROVIDER]: params.upstoxConnected || params.splitwiseConnected,
    [CHECKLIST_ITEM_IDS.IMPORT_HOLDINGS]: params.assetsCount > 0,
    [CHECKLIST_ITEM_IDS.ADD_AI_KEY]: params.aiKeyConfigured,
    [CHECKLIST_ITEM_IDS.REVIEW_DOCS]: false,
  };

  const resolvedCount = CHECKLIST_ITEMS.filter((id) => {
    const manual = manualState[id];
    if (manual === 'done' || manual === 'skipped') return true;
    if (autoComplete[id]) return true;
    return false;
  }).length;

  return resolvedCount === CHECKLIST_ITEMS.length;
}
