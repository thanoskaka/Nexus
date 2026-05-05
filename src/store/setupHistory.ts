export type SetupEventType =
  | 'workspace_mode_selected'
  | 'provider_preference_changed'
  | 'key_saved'
  | 'key_removed'
  | 'import_run'
  | 'export_run'
  | 'csv_import_run'
  | 'csv_export_run'
  | 'setup_verification_run'
  | 'checklist_item_completed'
  | 'checklist_item_skipped';

export type SetupEventStatus = 'success' | 'info' | 'skipped';

export interface SetupEvent {
  id: string;
  timestamp: number;
  type: SetupEventType;
  label: string;
  status: SetupEventStatus;
  details?: string;
}

const STORAGE_KEY = 'nexus.setup-history.v1';
const MAX_EVENTS = 200;

function getMemory(): Storage | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.localStorage;
}

function loadEvents(): SetupEvent[] {
  try {
    const store = getMemory();
    if (!store) return [];
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as SetupEvent[];
  } catch {
    return [];
  }
}

function saveEvents(events: SetupEvent[]): void {
  try {
    const store = getMemory();
    if (!store) return;
    store.setItem(STORAGE_KEY, JSON.stringify(events.slice(0, MAX_EVENTS)));
  } catch {
  }
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function recordEvent(
  type: SetupEventType,
  label: string,
  status: SetupEventStatus = 'info',
  details?: string,
): void {
  const events = loadEvents();
  const event: SetupEvent = {
    id: generateId(),
    timestamp: Date.now(),
    type,
    label,
    status,
    details: details || undefined,
  };
  events.unshift(event);
  saveEvents(events);
}

export function getSetupHistory(): SetupEvent[] {
  return loadEvents();
}

export function clearSetupHistory(): void {
  try {
    const store = getMemory();
    if (!store) return;
    store.removeItem(STORAGE_KEY);
  } catch {
  }
}
