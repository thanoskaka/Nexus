import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { computeNextActions, buildInput, checkWorkspaceChosen, type NextActionInput } from './nextAction';
import type { SetupStatusResponse } from './setupStatusApi';

function emptyStatus(): SetupStatusResponse {
  return {
    mode: 'local',
    app: { baseUrl: '' },
    firebase: { configured: false, projectId: null },
    firebaseAdmin: { configured: false, hasProjectId: false, hasClientEmail: false, hasPrivateKey: false },
    pricing: { massive: { configured: false, present: false }, alphaVantage: { configured: false, present: false }, finnhub: { configured: false, present: false }, upstoxSystem: { configured: false, present: false } },
    integrations: { upstox: { clientConfigured: false, encryptionConfigured: false, stateSecretConfigured: false, redirectConfigured: false }, splitwise: { clientConfigured: false, encryptionConfigured: false, stateSecretConfigured: false, redirectConfigured: false } },
    ai: { serverKey: { configured: false, present: false }, userCredentialsSupported: false },
    casParser: { configured: false, hasServiceUrl: false, allowsExternalFallback: false },
    logoProvider: { serverKey: { configured: false, present: false }, clientKey: { configured: false, present: false } },
    googleDrive: { clientId: { configured: false, present: false } },
    connectedAccounts: { encryptionConfigured: false, stateSecretConfigured: false },
    integrationTokens: { encryptionConfigured: false },
    features: { manualAssets: true, dashboard: true, priceRefresh: true, firebaseAuth: false, firebaseAdmin: false, upstoxConnectedAccounts: false, splitwise: false, casParser: false, screenshotImport: false, googleDriveSync: false, aiAssistant: false, logoProvider: false },
  };
}

function fullStatus(): SetupStatusResponse {
  const s = emptyStatus();
  s.firebase.configured = true;
  s.features.firebaseAdmin = true;
  s.features.firebaseAuth = true;
  s.pricing.massive = { configured: true, present: true };
  return s;
}

function allDoneInput(): NextActionInput {
  return {
    workspaceChosen: true,
    assetsCount: 5,
    firebaseConfigured: true,
    adminConfigured: true,
    priceProviderConfigured: true,
    aiKeyConfigured: true,
    importSetupDone: true,
    docsReviewed: true,
  };
}

describe('computeNextActions', () => {
  it('returns empty when all inputs are satisfied', () => {
    const result = computeNextActions(allDoneInput());
    expect(result.primary).toBeNull();
    expect(result.secondary).toHaveLength(0);
    expect(result.all).toHaveLength(0);
  });

  it('prioritizes workspace before assets', () => {
    const result = computeNextActions({
      workspaceChosen: false,
      assetsCount: 0,
      firebaseConfigured: true,
      adminConfigured: true,
      priceProviderConfigured: true,
      aiKeyConfigured: true,
      importSetupDone: true,
      docsReviewed: true,
    });
    expect(result.primary?.id).toBe('choose-workspace');
    expect(result.all.map((a) => a.id)).toEqual(['choose-workspace', 'add-first-asset']);
  });

  it('prioritizes assets before firebase', () => {
    const result = computeNextActions({
      workspaceChosen: true,
      assetsCount: 0,
      firebaseConfigured: false,
      adminConfigured: false,
      priceProviderConfigured: true,
      aiKeyConfigured: true,
      importSetupDone: true,
      docsReviewed: true,
    });
    expect(result.primary?.id).toBe('add-first-asset');
    expect(result.all.map((a) => a.id)).toEqual(['add-first-asset', 'configure-firebase']);
  });

  it('prioritizes firebase before price provider', () => {
    const result = computeNextActions({
      workspaceChosen: true,
      assetsCount: 5,
      firebaseConfigured: false,
      adminConfigured: false,
      priceProviderConfigured: false,
      aiKeyConfigured: true,
      importSetupDone: true,
      docsReviewed: true,
    });
    expect(result.primary?.id).toBe('configure-firebase');
    expect(result.all.map((a) => a.id)).toEqual(['configure-firebase', 'configure-price-provider']);
  });

  it('prioritizes price provider before AI key', () => {
    const result = computeNextActions({
      workspaceChosen: true,
      assetsCount: 5,
      firebaseConfigured: true,
      adminConfigured: true,
      priceProviderConfigured: false,
      aiKeyConfigured: false,
      importSetupDone: true,
      docsReviewed: true,
    });
    expect(result.primary?.id).toBe('configure-price-provider');
    expect(result.all.map((a) => a.id)).toEqual(['configure-price-provider', 'add-ai-key']);
  });

  it('prioritizes AI key before import setup', () => {
    const result = computeNextActions({
      workspaceChosen: true,
      assetsCount: 5,
      firebaseConfigured: true,
      adminConfigured: true,
      priceProviderConfigured: true,
      aiKeyConfigured: false,
      importSetupDone: false,
      docsReviewed: true,
    });
    expect(result.primary?.id).toBe('add-ai-key');
    expect(result.all.map((a) => a.id)).toEqual(['add-ai-key', 'setup-import']);
  });

  it('prioritizes import setup before docs review', () => {
    const result = computeNextActions({
      workspaceChosen: true,
      assetsCount: 5,
      firebaseConfigured: true,
      adminConfigured: true,
      priceProviderConfigured: true,
      aiKeyConfigured: true,
      importSetupDone: false,
      docsReviewed: false,
    });
    expect(result.primary?.id).toBe('setup-import');
    expect(result.all.map((a) => a.id)).toEqual(['setup-import', 'review-docs']);
  });

  it('returns only 2 secondary actions even when more are pending', () => {
    const result = computeNextActions({
      workspaceChosen: false,
      assetsCount: 0,
      firebaseConfigured: false,
      adminConfigured: false,
      priceProviderConfigured: false,
      aiKeyConfigured: false,
      importSetupDone: false,
      docsReviewed: false,
    });
    expect(result.primary).not.toBeNull();
    expect(result.secondary).toHaveLength(2);
    expect(result.all.length).toBeGreaterThan(2);
  });

  it('includes correct route for add-first-asset', () => {
    const result = computeNextActions({
      workspaceChosen: true,
      assetsCount: 5,
      firebaseConfigured: true,
      adminConfigured: true,
      priceProviderConfigured: true,
      aiKeyConfigured: true,
      importSetupDone: false,
      docsReviewed: true,
    });
    expect(result.all).toHaveLength(1);
    expect(result.all[0].id).toBe('setup-import');
    expect(result.all[0].route).toEqual({ kind: 'settings', section: 'integrations' });
  });
});

describe('buildInput', () => {
  it('uses setup status to build input', () => {
    const status = fullStatus();
    const input = buildInput(status, 3, false, false, true, 'user-1');
    expect(input.assetsCount).toBe(3);
    expect(input.firebaseConfigured).toBe(true);
    expect(input.adminConfigured).toBe(true);
    expect(input.priceProviderConfigured).toBe(true);
    expect(input.aiKeyConfigured).toBe(true);
    expect(input.importSetupDone).toBe(false);
  });

  it('marks import as done when upstox is connected', () => {
    const input = buildInput(null, 0, true, false, false);
    expect(input.importSetupDone).toBe(true);
  });

  it('marks import as done when splitwise is connected', () => {
    const input = buildInput(null, 0, false, true, false);
    expect(input.importSetupDone).toBe(true);
  });

  it('marks import as done when CAS parser is configured', () => {
    const status = emptyStatus();
    status.casParser.configured = true;
    const input = buildInput(status, 0, false, false, false);
    expect(input.importSetupDone).toBe(true);
  });

  it('falls back gracefully when status is null', () => {
    const input = buildInput(null, 0, false, false, false);
    expect(input.firebaseConfigured).toBe(false);
    expect(input.adminConfigured).toBe(false);
    expect(input.priceProviderConfigured).toBe(false);
    expect(input.importSetupDone).toBe(false);
  });
});
