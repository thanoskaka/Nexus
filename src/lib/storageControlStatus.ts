import type { WorkspaceMode } from '../store/workspaceOwnership';
import type {
  ProviderCredentialId,
  ProviderPreference,
  StorageType,
} from './providerCredentialTypes';
import { PROVIDER_DEFS, ALL_PROVIDER_IDS } from './providerCredentialTypes';

export type OverallStorageControl = 'nexus-hosted' | 'self-owned' | 'mixed';

export type KeySourceMode = 'hosted-default' | 'user-key' | 'local-only' | 'none';

export interface KeySourceDetail {
  providerId: ProviderCredentialId;
  label: string;
  description: string;
  hasHostedDefault: boolean;
  userKeyConfigured: boolean;
  storageLocation: StorageType;
  activeMode: KeySourceMode;
  preference: ProviderPreference;
}

export interface ProviderStatusInput {
  providerId: ProviderCredentialId;
  hasHostedDefault: boolean;
  userKeyConfigured: boolean;
  preference: ProviderPreference;
}

export interface StorageControlSnapshot {
  overall: OverallStorageControl;
  whereDataLives: string;
  workspaceMode: WorkspaceMode;
  providers: KeySourceDetail[];
  userControls: string[];
}

function deriveActiveMode(
  workspaceMode: WorkspaceMode,
  userKeyConfigured: boolean,
  hasHostedDefault: boolean,
  storageLocation: StorageType,
): KeySourceMode {
  if (workspaceMode === 'selfOwned') {
    return userKeyConfigured ? 'user-key' : 'none';
  }
  if (userKeyConfigured) return 'user-key';
  if (hasHostedDefault) return 'hosted-default';
  if (storageLocation === 'local-only') return 'local-only';
  return 'none';
}

export function getKeySourceDetails(
  workspaceMode: WorkspaceMode,
  providerStatuses: ProviderStatusInput[],
): KeySourceDetail[] {
  const statusMap = new Map(providerStatuses.map((p) => [p.providerId, p]));
  return ALL_PROVIDER_IDS.map((id) => {
    const def = PROVIDER_DEFS[id];
    const status = statusMap.get(id);
    const userKeyConfigured = status?.userKeyConfigured ?? false;
    const hasHostedDefault = workspaceMode === 'selfOwned' ? false : (status?.hasHostedDefault ?? false);
    const preference = status?.preference ?? 'hosted';
    return {
      providerId: id,
      label: def.label,
      description: def.description,
      hasHostedDefault,
      userKeyConfigured,
      storageLocation: def.storageType,
      activeMode: deriveActiveMode(workspaceMode, userKeyConfigured, hasHostedDefault, def.storageType),
      preference,
    };
  });
}

export function getOverallStorageControl(workspaceMode: WorkspaceMode, keySourceDetails: KeySourceDetail[]): OverallStorageControl {
  if (workspaceMode === 'selfOwned') return 'self-owned';
  const hasAnyUserKeys = keySourceDetails.some((k) => k.activeMode === 'user-key');
  return hasAnyUserKeys ? 'mixed' : 'nexus-hosted';
}

export function getWhereDataLives(workspaceMode: WorkspaceMode): string {
  if (workspaceMode === 'hosted') {
    return 'Your portfolio data is stored in Nexus-hosted Firebase infrastructure. Your sign-in and family sharing are handled through the Nexus Firebase project.';
  }
  return 'Your portfolio data is stored in your own Firebase project. You control authentication, data storage, and Firestore rules.';
}

export function getWhereKeysLive(details: KeySourceDetail[]): string {
  const encrypted = details.filter((d) => d.storageLocation === 'encrypted-server' && d.activeMode === 'user-key');
  const local = details.filter((d) => d.storageLocation === 'local-only' && d.activeMode === 'user-key');
  const hosted = details.filter((d) => d.activeMode === 'hosted-default');
  const parts: string[] = [];
  if (hosted.length > 0) parts.push(`${hosted.length} provider(s) use Nexus-hosted API keys`);
  if (encrypted.length > 0) parts.push(`${encrypted.length} provider key(s) are encrypted on the server`);
  if (local.length > 0) parts.push(`${local.length} provider key(s) are stored only in your browser`);
  return parts.length > 0 ? parts.join('; ') : 'No API keys configured.';
}

export function getUserControls(workspaceMode: WorkspaceMode): string[] {
  if (workspaceMode === 'selfOwned') {
    return [
      'Full data ownership: your own Firebase project',
      'Full API key control: configure all keys yourself',
      'You can migrate to Nexus-hosted infrastructure at any time',
      'You can export your portfolio data at any time',
    ];
  }
  return [
    'Your portfolio data lives in Nexus-hosted Firebase',
    'You can provide your own API keys for any provider in Settings',
    'You can migrate to self-owned infrastructure at any time',
    'You can export your portfolio data at any time',
  ];
}

export function computeStorageControlSnapshot(workspaceMode: WorkspaceMode, providerStatuses: ProviderStatusInput[]): StorageControlSnapshot {
  const details = getKeySourceDetails(workspaceMode, providerStatuses);
  const overall = getOverallStorageControl(workspaceMode, details);
  return { overall, whereDataLives: getWhereDataLives(workspaceMode), workspaceMode, providers: details, userControls: getUserControls(workspaceMode) };
}

export const OVERALL_LABELS: Record<OverallStorageControl, string> = {
  'nexus-hosted': 'Nexus Hosted',
  'self-owned': 'Self-Owned / Local',
  mixed: 'Mixed Setup',
};

export const ACTIVE_MODE_LABELS: Record<KeySourceMode, string> = {
  'hosted-default': 'Using hosted default',
  'user-key': 'Using your key',
  'local-only': 'Local only',
  none: 'Not configured',
};
