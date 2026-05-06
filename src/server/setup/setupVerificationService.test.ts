import { describe, expect, it } from 'vitest';
import {
  verifyFirebaseAuth,
  verifyFirebaseAdmin,
  verifyPriceProvider,
  verifyAiProvider,
  verifyLogoProvider,
  verifyCasParser,
  verifyUpstox,
  verifySplitwise,
  verifyCapability,
  verifyAllCapabilities,
} from './setupVerificationService.js';

describe('verifyFirebaseAuth', () => {
  it('returns working when all NEXT_PUBLIC_FIREBASE_* vars are present', () => {
    const result = verifyFirebaseAuth({
      NEXT_PUBLIC_FIREBASE_API_KEY: 'key',
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'domain',
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'pid',
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'bucket',
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: 'sid',
      NEXT_PUBLIC_FIREBASE_APP_ID: 'aid',
    });
    expect(result.status).toBe('working');
    expect(result.checkedAt).toBeTruthy();
  });

  it('returns not-configured when any var is missing', () => {
    const result = verifyFirebaseAuth({
      NEXT_PUBLIC_FIREBASE_API_KEY: 'key',
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'domain',
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'pid',
    });
    expect(result.status).toBe('not-configured');
    expect(result.errorCode).toBe('MISSING_ENV_KEYS');
    expect(result.guidance.missingEnvKeys.length).toBeGreaterThan(0);
  });

  it('returns not-configured for empty env', () => {
    const result = verifyFirebaseAuth({});
    expect(result.status).toBe('not-configured');
    expect(result.guidance.missingEnvKeys).toContain('NEXT_PUBLIC_FIREBASE_API_KEY');
  });
});

describe('verifyFirebaseAdmin', () => {
  it('returns working when all FIREBASE_ADMIN_* vars are present', () => {
    const result = verifyFirebaseAdmin({
      FIREBASE_ADMIN_PROJECT_ID: 'pid',
      FIREBASE_ADMIN_CLIENT_EMAIL: 'email',
      FIREBASE_ADMIN_PRIVATE_KEY: 'key',
    });
    expect(result.status).toBe('working');
  });

  it('returns not-configured when any var is missing', () => {
    const result = verifyFirebaseAdmin({
      FIREBASE_ADMIN_PROJECT_ID: 'pid',
    });
    expect(result.status).toBe('not-configured');
    expect(result.guidance.missingEnvKeys).toContain('FIREBASE_ADMIN_CLIENT_EMAIL');
    expect(result.guidance.missingEnvKeys).toContain('FIREBASE_ADMIN_PRIVATE_KEY');
  });

  it('does not leak secret value in error message', () => {
    const result = verifyFirebaseAdmin({
      FIREBASE_ADMIN_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\nSUPERSECRET\n-----END PRIVATE KEY-----\n',
    });
    expect(result.status).toBe('not-configured');
    expect(result.errorMessage).not.toContain('SUPERSECRET');
    expect(result.errorMessage).not.toContain('PRIVATE KEY');
  });
});

describe('verifyPriceProvider', () => {
  it('returns working when Massive key is present', () => {
    const result = verifyPriceProvider({ MASSIVE_API_KEY: 'key' });
    expect(result.status).toBe('working');
    expect(result.guidance.hint).toContain('MASSIVE_API_KEY');
  });

  it('returns working when Alpha Vantage key is present', () => {
    const result = verifyPriceProvider({ ALPHA_VANTAGE_API_KEY: 'key' });
    expect(result.status).toBe('working');
  });

  it('returns not-configured when no keys are present', () => {
    const result = verifyPriceProvider({});
    expect(result.status).toBe('not-configured');
    expect(result.guidance.missingEnvKeys).toContain('MASSIVE_API_KEY');
  });

  it('hints that Yahoo fallback always works', () => {
    const result = verifyPriceProvider({ MASSIVE_API_KEY: 'key' });
    expect(result.guidance.hint).toContain('Yahoo');
    expect(result.guidance.hint).toContain('No paid API call');
  });
});

describe('verifyAiProvider', () => {
  it('returns working with GEMINI_API_KEY', () => {
    const result = verifyAiProvider({
      GEMINI_API_KEY: 'key',
      FIREBASE_ADMIN_PROJECT_ID: 'pid',
      FIREBASE_ADMIN_CLIENT_EMAIL: 'email',
      FIREBASE_ADMIN_PRIVATE_KEY: 'key',
      INTEGRATION_TOKEN_ENCRYPTION_KEY: 'enc',
    });
    expect(result.status).toBe('working');
  });

  it('returns working with user credentials support', () => {
    const result = verifyAiProvider({
      FIREBASE_ADMIN_PROJECT_ID: 'pid',
      FIREBASE_ADMIN_CLIENT_EMAIL: 'email',
      FIREBASE_ADMIN_PRIVATE_KEY: 'key',
      INTEGRATION_TOKEN_ENCRYPTION_KEY: 'enc',
    });
    expect(result.status).toBe('working');
    expect(result.guidance.hint).toContain('User');
  });

  it('returns not-configured when nothing is set', () => {
    const result = verifyAiProvider({});
    expect(result.status).toBe('not-configured');
  });

  it('error message only lists env var names, never values', () => {
    const result = verifyAiProvider({});
    expect(result.status).toBe('not-configured');
    expect(result.errorMessage).toBeTruthy();
    expect(result.errorMessage).not.toContain('secret');
    expect(JSON.stringify(result)).not.toContain('my-api-key-value');
  });

  it('hints that no paid API call was made', () => {
    const result = verifyAiProvider({ GEMINI_API_KEY: 'key' });
    expect(result.guidance.hint).toContain('No paid API call');
  });
});

describe('verifyLogoProvider', () => {
  it('returns working with client key', () => {
    const result = verifyLogoProvider({}, { VITE_LOGO_DEV_PUBLISHABLE_KEY: 'pk_key' });
    expect(result.status).toBe('working');
  });

  it('returns working with server key', () => {
    const result = verifyLogoProvider({ LOGO_DEV_SECRET_KEY: 'sk_key' }, {});
    expect(result.status).toBe('working');
  });

  it('returns not-configured when no keys', () => {
    const result = verifyLogoProvider({}, {});
    expect(result.status).toBe('not-configured');
  });
});

describe('verifyCasParser', () => {
  it('returns working with service URL', () => {
    const result = verifyCasParser({ CAS_PARSER_SERVICE_URL: 'http://localhost:8000' });
    expect(result.status).toBe('working');
    expect(result.guidance.hint).toContain('Self-hosted');
  });

  it('returns working with external fallback enabled', () => {
    const result = verifyCasParser({
      CAS_PARSER_API_KEY: 'key',
      CAS_PARSER_ALLOW_EXTERNAL_FALLBACK: 'true',
    });
    expect(result.status).toBe('working');
    expect(result.guidance.hint).toContain('External fallback');
  });

  it('returns failed when API key is set but external fallback is not allowed', () => {
    const result = verifyCasParser({
      CAS_PARSER_API_KEY: 'key',
      CAS_PARSER_ALLOW_EXTERNAL_FALLBACK: 'false',
    });
    expect(result.status).toBe('failed');
    expect(result.errorCode).toBe('EXTERNAL_FALLBACK_NOT_ALLOWED');
    expect(result.guidance.missingEnvKeys).toContain('CAS_PARSER_ALLOW_EXTERNAL_FALLBACK');
  });

  it('returns not-configured when nothing is set', () => {
    const result = verifyCasParser({});
    expect(result.status).toBe('not-configured');
  });

  it('does not leak API key in error', () => {
    const result = verifyCasParser({ CAS_PARSER_API_KEY: 'super-secret-api-key' });
    expect(result.errorMessage).not.toContain('super-secret');
  });
});

describe('verifyUpstox', () => {
  it('returns working when all config is present', () => {
    const result = verifyUpstox({
      UPSTOX_CLIENT_ID: 'id',
      UPSTOX_CLIENT_SECRET: 'secret',
      UPSTOX_REDIRECT_URI: 'https://example.com/callback',
      INTEGRATION_TOKEN_ENCRYPTION_KEY: 'enc',
      CONNECTED_ACCOUNTS_STATE_SECRET: 'state',
    });
    expect(result.status).toBe('working');
    expect(result.guidance.hint).toContain('OAuth');
  });

  it('returns not-configured when client ID is missing', () => {
    const result = verifyUpstox({});
    expect(result.status).toBe('not-configured');
    expect(result.guidance.missingEnvKeys).toContain('UPSTOX_CLIENT_ID');
  });

  it('does not leak client secret in error', () => {
    const result = verifyUpstox({ UPSTOX_CLIENT_SECRET: 'super-secret-client-secret' });
    expect(result.errorMessage).not.toContain('super-secret');
  });

  it('reports all missing keys', () => {
    const result = verifyUpstox({});
    const allKeys = result.guidance.missingEnvKeys;
    expect(allKeys.some((k) => k.includes('UPSTOX_CLIENT_ID'))).toBe(true);
    expect(allKeys.some((k) => k.includes('UPSTOX_CLIENT_SECRET'))).toBe(true);
    expect(allKeys.some((k) => k.includes('UPSTOX_REDIRECT_URI'))).toBe(true);
    expect(allKeys.some((k) => k.includes('ENCRYPTION_KEY'))).toBe(true);
    expect(allKeys.some((k) => k.includes('STATE_SECRET'))).toBe(true);
  });
});

describe('verifySplitwise', () => {
  it('returns working when all config is present', () => {
    const result = verifySplitwise({
      SPLITWISE_CLIENT_ID: 'id',
      SPLITWISE_CLIENT_SECRET: 'secret',
      SPLITWISE_REDIRECT_URI: 'https://example.com/callback',
      INTEGRATION_TOKEN_ENCRYPTION_KEY: 'enc',
      SPLITWISE_STATE_SECRET: 'state',
    });
    expect(result.status).toBe('working');
    expect(result.guidance.hint).toContain('OAuth');
  });

  it('returns not-configured when client ID is missing', () => {
    const result = verifySplitwise({});
    expect(result.status).toBe('not-configured');
    expect(result.guidance.missingEnvKeys).toContain('SPLITWISE_CLIENT_ID');
  });

  it('does not leak client secret in error', () => {
    const result = verifySplitwise({ SPLITWISE_CLIENT_SECRET: 'super-secret-client-secret' });
    expect(result.errorMessage).not.toContain('super-secret');
  });
});

describe('verifyCapability', () => {
  it('dispatches to the correct handler', () => {
    const result = verifyCapability('firebase-auth', {}, {});
    expect(result.capabilityId).toBe('firebase-auth');
  });

  it('returns failed for unknown capability', () => {
    const result = verifyCapability('unknown-thing', {}, {});
    expect(result.status).toBe('failed');
    expect(result.errorCode).toBe('UNKNOWN_CAPABILITY');
  });
});

describe('verifyAllCapabilities', () => {
  it('returns results for all capabilities', () => {
    const results = verifyAllCapabilities({}, {});
    expect(results.length).toBeGreaterThanOrEqual(8);
    const ids = results.map((r) => r.capabilityId);
    expect(ids).toContain('firebase-auth');
    expect(ids).toContain('firebase-admin');
    expect(ids).toContain('price-provider');
    expect(ids).toContain('ai-provider');
    expect(ids).toContain('logo-provider');
    expect(ids).toContain('cas-parser');
    expect(ids).toContain('upstox');
    expect(ids).toContain('splitwise');
  });

  it('no result leaks secret values', () => {
    const results = verifyAllCapabilities({
      GEMINI_API_KEY: 'super-secret-gemini',
      UPSTOX_CLIENT_SECRET: 'super-secret-upstox',
      FIREBASE_ADMIN_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\nSUPERSECRET\n-----END PRIVATE KEY-----\n',
    }, {});
    for (const r of results) {
      const json = JSON.stringify(r);
      expect(json).not.toContain('super-secret');
      expect(json).not.toContain('SUPERSECRET');
    }
  });

  it('every result has a checkedAt timestamp', () => {
    const results = verifyAllCapabilities({}, {});
    for (const r of results) {
      expect(r.checkedAt).toBeTruthy();
    }
  });
});
