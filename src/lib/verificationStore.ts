import type { VerificationState } from '../server/setup/setupStatusTypes.js';

export type ClientVerificationResult = {
  capabilityId: string;
  status: VerificationState;
  checkedAt: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  guidance: {
    missingEnvKeys: string[];
    docsPath?: string;
    hint?: string;
  };
};

const STORAGE_KEY = 'nexus-verify-results';

export function loadVerificationResults(): Record<string, ClientVerificationResult> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, ClientVerificationResult>;
  } catch {
    return {};
  }
}

export function saveVerificationResult(result: ClientVerificationResult): void {
  try {
    const existing = loadVerificationResults();
    existing[result.capabilityId] = result;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch {
  }
}

export function saveVerificationResults(results: ClientVerificationResult[]): void {
  try {
    const existing: Record<string, ClientVerificationResult> = {};
    for (const r of results) {
      existing[r.capabilityId] = r;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch {
  }
}

export function clearVerificationResults(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
  }
}

export function mergeResults(
  serverResults: ClientVerificationResult[],
  storedResults: Record<string, ClientVerificationResult>,
): Record<string, ClientVerificationResult> {
  const merged = { ...storedResults };
  for (const r of serverResults) {
    if (r) {
      merged[r.capabilityId] = r;
    }
  }
  return merged;
}
