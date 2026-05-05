import type {
  VerifiableCapabilityId,
  VerificationResult,
} from './setupStatusTypes.js';

function envCheck(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

function nowISO(): string {
  return new Date().toISOString();
}

function working(capabilityId: string, guidance: { missingEnvKeys: string[]; docsPath?: string; hint?: string }): VerificationResult {
  return {
    capabilityId,
    status: 'working',
    checkedAt: nowISO(),
    guidance,
  };
}

function notConfigured(
  capabilityId: string,
  missingEnvKeys: string[],
  docsPath?: string,
): VerificationResult {
  return {
    capabilityId,
    status: 'not-configured',
    checkedAt: nowISO(),
    errorCode: 'MISSING_ENV_KEYS',
    errorMessage: `Missing required environment variables: ${missingEnvKeys.join(', ')}`,
    guidance: { missingEnvKeys, docsPath, hint: 'Set the required environment variables and restart the server.' },
  };
}

export function verifyFirebaseAuth(publicEnv: Record<string, string | undefined>): VerificationResult {
  const required = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
  ];
  const missing = required.filter((k) => !envCheck(publicEnv[k]));
  if (missing.length > 0) {
    return notConfigured('firebase-auth', missing, 'docs/setup-modes.md');
  }
  return working('firebase-auth', {
    missingEnvKeys: [],
    docsPath: 'docs/setup-modes.md',
    hint: `Firebase Auth is configured for project "${publicEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID}".`,
  });
}

export function verifyFirebaseAdmin(env: Record<string, string | undefined>): VerificationResult {
  const required = ['FIREBASE_ADMIN_PROJECT_ID', 'FIREBASE_ADMIN_CLIENT_EMAIL', 'FIREBASE_ADMIN_PRIVATE_KEY'];
  const missing = required.filter((k) => !envCheck(env[k]));
  if (missing.length > 0) {
    return notConfigured('firebase-admin', missing, 'docs/setup-modes.md');
  }
  return working('firebase-admin', {
    missingEnvKeys: [],
    docsPath: 'docs/setup-modes.md',
    hint: 'Firebase Admin SDK is configured. Token verification will be available at runtime.',
  });
}

export function verifyPriceProvider(env: Record<string, string | undefined>): VerificationResult {
  const hasMassive = envCheck(env.MASSIVE_API_KEY);
  const hasAlphaVantage = envCheck(env.ALPHA_VANTAGE_API_KEY);
  const hasFinnhub = envCheck(env.FINNHUB_API_KEY);

  const configuredKeys: string[] = [];
  if (hasMassive) configuredKeys.push('MASSIVE_API_KEY');
  if (hasAlphaVantage) configuredKeys.push('ALPHA_VANTAGE_API_KEY');
  if (hasFinnhub) configuredKeys.push('FINNHUB_API_KEY');

  if (configuredKeys.length === 0) {
    return notConfigured('price-provider', ['MASSIVE_API_KEY', 'ALPHA_VANTAGE_API_KEY', 'FINNHUB_API_KEY'], 'docs/capability-cost-posture.md');
  }

  return working('price-provider', {
    missingEnvKeys: [],
    docsPath: 'docs/capability-cost-posture.md',
    hint: `Price providers configured: ${configuredKeys.join(', ')}. Yahoo Finance fallback always works. No paid API calls made during verification.`,
  });
}

export function verifyAiProvider(env: Record<string, string | undefined>): VerificationResult {
  const hasServerKey = envCheck(env.GEMINI_API_KEY) || envCheck(env.GOOGLE_API_KEY);
  const hasFirebaseAdmin = envCheck(env.FIREBASE_ADMIN_PROJECT_ID) && envCheck(env.FIREBASE_ADMIN_CLIENT_EMAIL) && envCheck(env.FIREBASE_ADMIN_PRIVATE_KEY);
  const hasEncryption = envCheck(env.INTEGRATION_TOKEN_ENCRYPTION_KEY) || envCheck(env.CONNECTED_ACCOUNTS_ENCRYPTION_KEY) || envCheck(env.SETTINGS_ENCRYPTION_KEY);

  if (hasServerKey) {
    return working('ai-provider', {
      missingEnvKeys: [],
      docsPath: 'docs/capability-cost-posture.md',
      hint: 'Server-level AI key configured (GEMINI_API_KEY or GOOGLE_API_KEY). No paid API call made during verification.',
    });
  }

  const userCredentialsSupported = hasFirebaseAdmin && hasEncryption;
  if (userCredentialsSupported) {
    return working('ai-provider', {
      missingEnvKeys: [],
      docsPath: 'docs/capability-cost-posture.md',
      hint: 'User AI credentials are supported via Settings > AI. No paid API call made during verification.',
    });
  }

  const missing: string[] = [];
  const allKeys = ['GEMINI_API_KEY', 'GOOGLE_API_KEY'];
  missing.push(...allKeys.filter((k) => !envCheck(env[k])));
  if (!hasFirebaseAdmin) missing.push('FIREBASE_ADMIN_* (for user credentials)');
  if (!hasEncryption) missing.push('INTEGRATION_TOKEN_ENCRYPTION_KEY (for user credentials)');
  return notConfigured('ai-provider', missing, 'docs/capability-cost-posture.md');
}

export function verifyLogoProvider(
  env: Record<string, string | undefined>,
  publicEnv: Record<string, string | undefined>,
): VerificationResult {
  const hasClientKey = envCheck(publicEnv.VITE_LOGO_DEV_PUBLISHABLE_KEY);
  const hasServerKey = envCheck(env.LOGO_DEV_SECRET_KEY);

  if (hasClientKey || hasServerKey) {
    return working('logo-provider', {
      missingEnvKeys: [],
      docsPath: 'docs/capability-cost-posture.md',
      hint: `Logo.dev key configured (${hasServerKey ? 'server' : 'client'} key). No API call made during verification.`,
    });
  }

  return notConfigured('logo-provider', ['VITE_LOGO_DEV_PUBLISHABLE_KEY', 'LOGO_DEV_SECRET_KEY'], 'docs/capability-cost-posture.md');
}

export function verifyCasParser(env: Record<string, string | undefined>): VerificationResult {
  const hasServiceUrl = envCheck(env.CAS_PARSER_SERVICE_URL);
  const hasApiKey = envCheck(env.CAS_PARSER_API_KEY);
  const allowsExternal = env.CAS_PARSER_ALLOW_EXTERNAL_FALLBACK?.trim() === 'true';

  if (hasServiceUrl) {
    return working('cas-parser', {
      missingEnvKeys: [],
      docsPath: 'docs/capability-cost-posture.md',
      hint: 'Self-hosted CAS parser configured. No API call made during verification.',
    });
  }

  if (hasApiKey && allowsExternal) {
    return working('cas-parser', {
      missingEnvKeys: [],
      docsPath: 'docs/capability-cost-posture.md',
      hint: 'External fallback CAS parser configured (casparser.in). No paid API call made during verification.',
    });
  }

  if (hasApiKey && !allowsExternal) {
    return {
      capabilityId: 'cas-parser',
      status: 'failed',
      checkedAt: nowISO(),
      errorCode: 'EXTERNAL_FALLBACK_NOT_ALLOWED',
      errorMessage: 'CAS_PARSER_API_KEY is set but CAS_PARSER_ALLOW_EXTERNAL_FALLBACK is not set to "true".',
      guidance: {
        missingEnvKeys: ['CAS_PARSER_ALLOW_EXTERNAL_FALLBACK'],
        docsPath: 'docs/capability-cost-posture.md',
        hint: 'Set CAS_PARSER_ALLOW_EXTERNAL_FALLBACK=true to enable the cloud API, or set CAS_PARSER_SERVICE_URL for a self-hosted parser.',
      },
    };
  }

  return notConfigured('cas-parser', ['CAS_PARSER_SERVICE_URL', 'CAS_PARSER_API_KEY'], 'docs/capability-cost-posture.md');
}

export function verifyUpstox(env: Record<string, string | undefined>): VerificationResult {
  const missing: string[] = [];
  if (!envCheck(env.UPSTOX_CLIENT_ID)) missing.push('UPSTOX_CLIENT_ID');
  if (!envCheck(env.UPSTOX_CLIENT_SECRET)) missing.push('UPSTOX_CLIENT_SECRET');
  if (!envCheck(env.UPSTOX_REDIRECT_URI)) missing.push('UPSTOX_REDIRECT_URI');

  const hasEncryption = envCheck(env.INTEGRATION_TOKEN_ENCRYPTION_KEY) || envCheck(env.CONNECTED_ACCOUNTS_ENCRYPTION_KEY);
  if (!hasEncryption) missing.push('INTEGRATION_TOKEN_ENCRYPTION_KEY or CONNECTED_ACCOUNTS_ENCRYPTION_KEY');
  const hasStateSecret = envCheck(env.CONNECTED_ACCOUNTS_STATE_SECRET) || envCheck(env.SPLITWISE_STATE_SECRET);
  if (!hasStateSecret) missing.push('CONNECTED_ACCOUNTS_STATE_SECRET or SPLITWISE_STATE_SECRET');

  if (missing.length === 0) {
    return working('upstox', {
      missingEnvKeys: [],
      docsPath: 'docs/capability-cost-posture.md',
      hint: 'Upstox OAuth client is configured. Real connection requires a user to authorize via the OAuth flow.',
    });
  }

  return notConfigured('upstox', missing, 'docs/capability-cost-posture.md');
}

export function verifySplitwise(env: Record<string, string | undefined>): VerificationResult {
  const missing: string[] = [];
  if (!envCheck(env.SPLITWISE_CLIENT_ID)) missing.push('SPLITWISE_CLIENT_ID');
  if (!envCheck(env.SPLITWISE_CLIENT_SECRET)) missing.push('SPLITWISE_CLIENT_SECRET');
  if (!envCheck(env.SPLITWISE_REDIRECT_URI)) missing.push('SPLITWISE_REDIRECT_URI');

  const hasEncryption = envCheck(env.INTEGRATION_TOKEN_ENCRYPTION_KEY) || envCheck(env.CONNECTED_ACCOUNTS_ENCRYPTION_KEY) || envCheck(env.SETTINGS_ENCRYPTION_KEY);
  if (!hasEncryption) missing.push('INTEGRATION_TOKEN_ENCRYPTION_KEY');
  if (!envCheck(env.SPLITWISE_STATE_SECRET)) missing.push('SPLITWISE_STATE_SECRET');

  if (missing.length === 0) {
    return working('splitwise', {
      missingEnvKeys: [],
      docsPath: 'docs/capability-cost-posture.md',
      hint: 'Splitwise OAuth client is configured. Real connection requires a user to authorize via the OAuth flow.',
    });
  }

  return notConfigured('splitwise', missing, 'docs/capability-cost-posture.md');
}

const HANDLERS: Record<string, (env: Record<string, string | undefined>, publicEnv: Record<string, string | undefined>) => VerificationResult> = {
  'firebase-auth': (_env, publicEnv) => verifyFirebaseAuth(publicEnv),
  'firebase-admin': (env) => verifyFirebaseAdmin(env),
  'price-provider': (env) => verifyPriceProvider(env),
  'ai-provider': (env) => verifyAiProvider(env),
  'logo-provider': (env, publicEnv) => verifyLogoProvider(env, publicEnv),
  'cas-parser': (env) => verifyCasParser(env),
  upstox: (env) => verifyUpstox(env),
  splitwise: (env) => verifySplitwise(env),
};

export function verifyCapability(
  capabilityId: string,
  env: Record<string, string | undefined>,
  publicEnv?: Record<string, string | undefined>,
): VerificationResult {
  const handler = HANDLERS[capabilityId];
  if (!handler) {
    return {
      capabilityId,
      status: 'failed',
      checkedAt: nowISO(),
      errorCode: 'UNKNOWN_CAPABILITY',
      errorMessage: `Unknown capability: ${capabilityId}`,
      guidance: { missingEnvKeys: [] },
    };
  }
  return handler(env, publicEnv ?? env);
}

export function verifyAllCapabilities(
  env: Record<string, string | undefined>,
  publicEnv?: Record<string, string | undefined>,
): VerificationResult[] {
  const resolvedPublic = publicEnv ?? env;
  return Object.keys(HANDLERS).map((id) => verifyCapability(id, env, resolvedPublic));
}

export function isValidCapabilityId(id: string): id is VerifiableCapabilityId {
  return id in HANDLERS;
}
