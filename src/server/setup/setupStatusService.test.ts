import { describe, expect, it } from 'vitest';
import { getSetupCapabilities } from './setupStatusService.js';
import type { SetupCapabilitiesInput } from './setupStatusTypes.js';

function fullFirebasePublic() {
  return {
    NEXT_PUBLIC_FIREBASE_API_KEY: 'key',
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'domain',
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'pid',
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'bucket',
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: 'sid',
    NEXT_PUBLIC_FIREBASE_APP_ID: 'aid',
  };
}

describe('getSetupCapabilities', () => {
  it('returns all-false features for empty env', () => {
    const result = getSetupCapabilities({ env: {}, publicEnv: {}, mode: 'development' });

    expect(result.mode).toBe('development');
    expect(result.features.manualAssets).toBe(true);
    expect(result.features.dashboard).toBe(true);
    expect(result.features.priceRefresh).toBe(true);
    expect(result.features.firebaseAuth).toBe(false);
    expect(result.features.firebaseAdmin).toBe(false);
    expect(result.features.upstoxConnectedAccounts).toBe(false);
    expect(result.features.splitwise).toBe(false);
    expect(result.features.casParser).toBe(false);
    expect(result.features.screenshotImport).toBe(false);
    expect(result.features.googleDriveSync).toBe(false);
    expect(result.features.aiAssistant).toBe(false);
    expect(result.features.logoProvider).toBe(false);
  });

  it('enables firebaseAuth when all NEXT_PUBLIC_FIREBASE_* vars are present', () => {
    const result = getSetupCapabilities({
      env: {},
      publicEnv: fullFirebasePublic(),
      mode: 'development',
    });

    expect(result.firebase.configured).toBe(true);
    expect(result.firebase.projectId).toBe('pid');
    expect(result.features.firebaseAuth).toBe(true);
    expect(result.features.firebaseAdmin).toBe(false);
    expect(result.features.upstoxConnectedAccounts).toBe(false);
    expect(result.features.splitwise).toBe(false);
    expect(result.features.screenshotImport).toBe(false);
    expect(result.features.aiAssistant).toBe(false);
  });

  it('reads public env vars from env when publicEnv is omitted', () => {
    const result = getSetupCapabilities({
      env: {
        ...fullFirebasePublic(),
        VITE_GOOGLE_CLIENT_ID: 'google-id',
        VITE_LOGO_DEV_PUBLISHABLE_KEY: 'logo-key',
      },
      mode: 'development',
    });

    expect(result.firebase.configured).toBe(true);
    expect(result.features.firebaseAuth).toBe(true);
    expect(result.features.googleDriveSync).toBe(true);
    expect(result.features.logoProvider).toBe(true);
  });

  it('reports firebaseAuth false when any NEXT_PUBLIC_FIREBASE_* var is missing', () => {
    const partial = { ...fullFirebasePublic() };
    delete partial.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    const result = getSetupCapabilities({
      env: {},
      publicEnv: partial,
      mode: 'development',
    });

    expect(result.firebase.configured).toBe(false);
    expect(result.features.firebaseAuth).toBe(false);
  });

  it('enables all features for full self-hosted config', () => {
    const result = getSetupCapabilities({
      env: {
        FIREBASE_ADMIN_PROJECT_ID: 'pid',
        FIREBASE_ADMIN_CLIENT_EMAIL: 'email',
        FIREBASE_ADMIN_PRIVATE_KEY: 'key',
        MASSIVE_API_KEY: 'key',
        UPSTOX_CLIENT_ID: 'id',
        UPSTOX_CLIENT_SECRET: 'secret',
        UPSTOX_REDIRECT_URI: 'https://example.com/callback',
        CONNECTED_ACCOUNTS_ENCRYPTION_KEY: 'key',
        CONNECTED_ACCOUNTS_STATE_SECRET: 'secret',
        SPLITWISE_CLIENT_ID: 'id',
        SPLITWISE_CLIENT_SECRET: 'secret',
        SPLITWISE_STATE_SECRET: 'secret',
        SPLITWISE_REDIRECT_URI: 'https://example.com/splitwise/callback',
        INTEGRATION_TOKEN_ENCRYPTION_KEY: 'key',
        GEMINI_API_KEY: 'key',
        APP_BASE_URL: 'https://example.com',
      },
      publicEnv: {
        ...fullFirebasePublic(),
        VITE_GOOGLE_CLIENT_ID: 'google-id',
        VITE_LOGO_DEV_PUBLISHABLE_KEY: 'logo-key',
      },
      mode: 'self-hosted',
    });

    expect(result.mode).toBe('self-hosted');
    expect(result.app.baseUrl).toBe('https://example.com');
    expect(result.firebase.configured).toBe(true);
    expect(result.firebaseAdmin.configured).toBe(true);
    expect(result.pricing.massive.configured).toBe(true);

    expect(result.integrations.upstox.clientConfigured).toBe(true);
    expect(result.integrations.upstox.encryptionConfigured).toBe(true);
    expect(result.integrations.upstox.stateSecretConfigured).toBe(true);
    expect(result.integrations.upstox.redirectConfigured).toBe(true);

    expect(result.integrations.splitwise.clientConfigured).toBe(true);
    expect(result.integrations.splitwise.encryptionConfigured).toBe(true);
    expect(result.integrations.splitwise.stateSecretConfigured).toBe(true);
    expect(result.integrations.splitwise.redirectConfigured).toBe(true);

    expect(result.ai.serverKey.configured).toBe(true);
    expect(result.ai.userCredentialsSupported).toBe(true);

    expect(result.features.manualAssets).toBe(true);
    expect(result.features.dashboard).toBe(true);
    expect(result.features.priceRefresh).toBe(true);
    expect(result.features.firebaseAuth).toBe(true);
    expect(result.features.firebaseAdmin).toBe(true);
    expect(result.features.upstoxConnectedAccounts).toBe(true);
    expect(result.features.splitwise).toBe(true);
    expect(result.features.casParser).toBe(false);
    expect(result.features.screenshotImport).toBe(true);
    expect(result.features.googleDriveSync).toBe(true);
    expect(result.features.aiAssistant).toBe(true);
    expect(result.features.logoProvider).toBe(true);
  });

  it('never leaks secret values', () => {
    const result = getSetupCapabilities({
      env: { GEMINI_API_KEY: 'super-secret-key' },
      publicEnv: {},
      mode: 'development',
    });

    expect(result.ai.serverKey).toEqual({ configured: true, present: true });
    expect((result.ai.serverKey as Record<string, unknown>).value).toBeUndefined();
  });

  it('does not enable AI-backed features with only a server key and no Firebase Admin', () => {
    const result = getSetupCapabilities({
      env: { GEMINI_API_KEY: 'server-key' },
      publicEnv: {},
      mode: 'development',
    });

    expect(result.ai.serverKey.configured).toBe(true);
    expect(result.ai.userCredentialsSupported).toBe(false);
    expect(result.features.aiAssistant).toBe(false);
    expect(result.features.screenshotImport).toBe(false);
  });

  it('supports user AI credentials only when Firebase Admin and encryption are configured', () => {
    const result = getSetupCapabilities({
      env: {
        FIREBASE_ADMIN_PROJECT_ID: 'pid',
        FIREBASE_ADMIN_CLIENT_EMAIL: 'email',
        FIREBASE_ADMIN_PRIVATE_KEY: 'key',
        INTEGRATION_TOKEN_ENCRYPTION_KEY: 'encryption-key',
      },
      publicEnv: {},
      mode: 'development',
    });

    expect(result.ai.userCredentialsSupported).toBe(true);
    expect(result.features.aiAssistant).toBe(true);
    expect(result.features.screenshotImport).toBe(true);
    expect(result.integrationTokens.encryptionConfigured).toBe(true);
  });

  it('respects explicit mode override', () => {
    const hostResult = getSetupCapabilities({ env: {}, publicEnv: {}, mode: 'hosted' });
    expect(hostResult.mode).toBe('hosted');

    const selfResult = getSetupCapabilities({ env: {}, publicEnv: {}, mode: 'self-hosted' });
    expect(selfResult.mode).toBe('self-hosted');

    const localResult = getSetupCapabilities({ env: {}, publicEnv: {}, mode: 'development' });
    expect(localResult.mode).toBe('development');
  });

  it('detects hosted mode from VERCEL_ENV', () => {
    const result = getSetupCapabilities({ env: { VERCEL_ENV: 'production' }, publicEnv: {} });
    expect(result.mode).toBe('hosted');
  });

  it('detects self-hosted mode from NODE_ENV', () => {
    const result = getSetupCapabilities({ env: { NODE_ENV: 'production' }, publicEnv: {} });
    expect(result.mode).toBe('self-hosted');
  });

  it('shows partial splitwise client config as clientConfigured=true', () => {
    const result = getSetupCapabilities({
      env: { SPLITWISE_CLIENT_ID: 'id' },
      publicEnv: {},
      mode: 'development',
    });

    expect(result.features.splitwise).toBe(false);
    expect(result.integrations.splitwise.clientConfigured).toBe(true);
    expect(result.integrations.splitwise.stateSecretConfigured).toBe(false);
    expect(result.integrations.splitwise.encryptionConfigured).toBe(false);
    expect(result.integrations.splitwise.redirectConfigured).toBe(false);
  });

  it('reports integration encryption from any supported encryption key', () => {
    const result = getSetupCapabilities({
      env: {
        SPLITWISE_CLIENT_ID: 'id',
        CONNECTED_ACCOUNTS_ENCRYPTION_KEY: 'shared-encryption-key',
      },
      publicEnv: {},
      mode: 'development',
    });

    expect(result.integrations.splitwise.encryptionConfigured).toBe(true);
    expect(result.integrationTokens.encryptionConfigured).toBe(true);
  });

  it('supports Upstox state secret fallback from SPLITWISE_STATE_SECRET', () => {
    const result = getSetupCapabilities({
      env: {
        FIREBASE_ADMIN_PROJECT_ID: 'pid',
        FIREBASE_ADMIN_CLIENT_EMAIL: 'email',
        FIREBASE_ADMIN_PRIVATE_KEY: 'key',
        UPSTOX_CLIENT_ID: 'id',
        UPSTOX_CLIENT_SECRET: 'secret',
        UPSTOX_REDIRECT_URI: 'https://example.com/upstox/callback',
        INTEGRATION_TOKEN_ENCRYPTION_KEY: 'shared-encryption-key',
        SPLITWISE_STATE_SECRET: 'shared-state-secret',
      },
      publicEnv: {},
      mode: 'development',
    });

    expect(result.integrations.upstox.stateSecretConfigured).toBe(true);
    expect(result.connectedAccounts.stateSecretConfigured).toBe(true);
    expect(result.features.upstoxConnectedAccounts).toBe(true);
  });

  it('shows partial upstox client config as clientConfigured=true', () => {
    const result = getSetupCapabilities({
      env: { UPSTOX_CLIENT_ID: 'id' },
      publicEnv: {},
      mode: 'development',
    });

    expect(result.features.upstoxConnectedAccounts).toBe(false);
    expect(result.integrations.upstox.clientConfigured).toBe(true);
    expect(result.integrations.upstox.stateSecretConfigured).toBe(false);
    expect(result.integrations.upstox.encryptionConfigured).toBe(false);
    expect(result.integrations.upstox.redirectConfigured).toBe(false);
  });

  it('enables casParser when CAS_PARSER_SERVICE_URL is set', () => {
    const result = getSetupCapabilities({
      env: { CAS_PARSER_SERVICE_URL: 'http://localhost:8000' },
      publicEnv: {},
      mode: 'development',
    });

    expect(result.casParser.configured).toBe(true);
    expect(result.casParser.hasServiceUrl).toBe(true);
    expect(result.features.casParser).toBe(true);
  });

  it('enables casParser when external fallback is configured', () => {
    const result = getSetupCapabilities({
      env: {
        CAS_PARSER_API_KEY: 'api-key',
        CAS_PARSER_ALLOW_EXTERNAL_FALLBACK: 'true',
      },
      publicEnv: {},
      mode: 'development',
    });

    expect(result.casParser.configured).toBe(true);
    expect(result.casParser.hasServiceUrl).toBe(false);
    expect(result.casParser.allowsExternalFallback).toBe(true);
    expect(result.features.casParser).toBe(true);
  });

  it('enables logoProvider from client key', () => {
    const result = getSetupCapabilities({
      env: {},
      publicEnv: { VITE_LOGO_DEV_PUBLISHABLE_KEY: 'pk-key' },
      mode: 'development',
    });

    expect(result.features.logoProvider).toBe(true);
  });

  it('enables logoProvider from server key', () => {
    const result = getSetupCapabilities({
      env: { LOGO_DEV_SECRET_KEY: 'sk-key' },
      publicEnv: {},
      mode: 'development',
    });

    expect(result.features.logoProvider).toBe(true);
  });

  it('includes firebaseAdmin status details', () => {
    const result = getSetupCapabilities({
      env: {
        FIREBASE_ADMIN_PROJECT_ID: 'pid',
        FIREBASE_ADMIN_CLIENT_EMAIL: 'email',
      },
      publicEnv: {},
      mode: 'development',
    });

    expect(result.firebaseAdmin.configured).toBe(false);
    expect(result.firebaseAdmin.hasProjectId).toBe(true);
    expect(result.firebaseAdmin.hasClientEmail).toBe(true);
    expect(result.firebaseAdmin.hasPrivateKey).toBe(false);
  });
});
