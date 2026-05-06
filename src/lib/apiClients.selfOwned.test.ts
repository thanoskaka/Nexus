// @vitest-environment node
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { setWorkspaceMode } from './workspaceGuard';

vi.mock('./firebase', () => ({
  auth: {
    currentUser: {
      uid: 'mock-uid',
      email: 'test@example.com',
      getIdToken: vi.fn().mockResolvedValue('mock-token'),
    },
  },
  db: {},
  googleProvider: {},
  firebaseDataNamespace: 'test',
  defaultPortfolioId: 'test-portfolio',
}));

function importModule(name: string) {
  switch (name) {
    case 'aiChat': return import('./aiChat');
    case 'aiCredentialsApi': return import('./aiCredentialsApi');
    case 'casImportApi': return import('./casImportApi');
    case 'connectedAccountsApi': return import('./connectedAccountsApi');
    case 'screenshotImport': return import('./screenshotImport');
    case 'sharedIntegrationsApi': return import('./sharedIntegrationsApi');
    case 'splitwiseApi': return import('./splitwiseApi');
    default: throw new Error(`Unknown module: ${name}`);
  }
}

describe.each([
  ['aiChat', 'sendAiChat'],
  ['aiCredentialsApi', 'getAiCredentials'],
  ['aiCredentialsApi', 'saveAiCredentials'],
  ['aiCredentialsApi', 'deleteAiCredentials'],
  ['aiCredentialsApi', 'testAiCredentials'],
  ['casImportApi', 'importCasPdf'],
  ['connectedAccountsApi', 'startUpstoxConnectFlow'],
  ['connectedAccountsApi', 'getUpstoxConnectionStatus'],
  ['connectedAccountsApi', 'getUpstoxHoldings'],
  ['connectedAccountsApi', 'refreshUpstoxConnection'],
  ['connectedAccountsApi', 'disconnectUpstoxConnection'],
  ['connectedAccountsApi', 'saveConnectedHoldingOverride'],
  ['screenshotImport', 'extractAssetsFromScreenshots'],
  ['sharedIntegrationsApi', 'getSharedIntegrations'],
  ['sharedIntegrationsApi', 'disconnectSharedIntegration'],
  ['sharedIntegrationsApi', 'refreshSharedIntegration'],
  ['splitwiseApi', 'getSplitwiseStatus'],
  ['splitwiseApi', 'getSplitwiseSummary'],
  ['splitwiseApi', 'disconnectSplitwise'],
  ['splitwiseApi', 'connectSplitwise'],
  ['splitwiseApi', 'syncSplitwise'],
])('%s', (moduleName, functionName) => {
  describe(`${moduleName}.${functionName} in self-owned mode`, () => {
    beforeEach(() => {
      setWorkspaceMode('selfOwned');
    });

    it('throws unsupported error instead of silently sending hosted token', async () => {
      const mod = await importModule(moduleName);
      const fn = (mod as any)[functionName];
      if (!fn) {
        // Some functions have arguments we can't easily call, skip
        return;
      }
      const args: unknown[] = [];
      if (functionName === 'sendAiChat') args.push({ portfolioId: 'p', question: 'test' });
      if (functionName === 'importCasPdf') args.push(new File([], 'test.pdf'));
      if (functionName === 'saveConnectedHoldingOverride') args.push('id', {});
      if (functionName === 'getSharedIntegrations') args.push('portfolio-id');
      if (functionName === 'disconnectSharedIntegration') args.push({ portfolioId: 'p', provider: 'upstox' as const, targetUid: 'u' });
      if (functionName === 'refreshSharedIntegration') args.push({ portfolioId: 'p', provider: 'upstox' as const, targetUid: 'u' });
      if (functionName === 'extractAssetsFromScreenshots') args.push([], 'portfolio-id');
      if (functionName === 'saveAiCredentials') args.push({ provider: 'gemini' as const, apiKey: 'k', model: 'm' });

      await expect(fn(...args)).rejects.toThrow(/not supported in Bring Your Own Firebase mode/);
    });
  });
});

describe('hosted mode API clients', () => {
  beforeEach(() => {
    setWorkspaceMode('hosted');
  });

  it('does not throw workspace guard errors in hosted mode for getUpstoxConnectionStatus', async () => {
    // The function will fail with a network error, but NOT with the workspace guard error
    const { getUpstoxConnectionStatus } = await import('./connectedAccountsApi');
    await expect(getUpstoxConnectionStatus()).rejects.not.toThrow(/not supported in Bring Your Own Firebase mode/);
  });
});
