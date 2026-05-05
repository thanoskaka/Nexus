import type { LocalCredentialEntry, ProviderCredentialId, ProviderPreference } from './providerCredentialTypes';

const KEY_PREFIX = 'nexus:provider-key:';
const PREF_PREFIX = 'nexus:provider-pref:';

function keyFor(providerId: ProviderCredentialId): string {
  return `${KEY_PREFIX}${providerId}`;
}

function prefFor(providerId: ProviderCredentialId): string {
  return `${PREF_PREFIX}${providerId}`;
}

export function getLocalCredential(providerId: ProviderCredentialId): LocalCredentialEntry | null {
  try {
    const raw = localStorage.getItem(keyFor(providerId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalCredentialEntry;
    if (!parsed || typeof parsed.key !== 'string' || !parsed.key) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveLocalCredential(providerId: ProviderCredentialId, apiKey: string): LocalCredentialEntry {
  const trimmed = apiKey.trim();
  if (!trimmed) throw new Error('API key cannot be empty.');
  const entry: LocalCredentialEntry = {
    key: trimmed,
    last4: trimmed.slice(-4),
    updatedAt: Date.now(),
  };
  localStorage.setItem(keyFor(providerId), JSON.stringify(entry));
  return entry;
}

export function removeLocalCredential(providerId: ProviderCredentialId): void {
  localStorage.removeItem(keyFor(providerId));
}

export function getLocalPreference(providerId: ProviderCredentialId): ProviderPreference {
  try {
    const raw = localStorage.getItem(prefFor(providerId));
    if (raw === 'hosted' || raw === 'user') return raw;
  } catch { /* ignore */ }
  return 'hosted';
}

export function setLocalPreference(providerId: ProviderCredentialId, preference: ProviderPreference): void {
  localStorage.setItem(prefFor(providerId), preference);
}

export function maskApiKey(last4: string | null): string {
  if (!last4) return '';
  return `${'\u2022'.repeat(20)}${last4}`;
}
