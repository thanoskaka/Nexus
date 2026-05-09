import type {
  CapabilityStatus,
  EnvCheck,
  FeatureFlags,
  FirebaseAdminStatus,
  RuntimeMode,
  SetupCapabilitiesInput,
  SetupStatusResponse,
} from './setupStatusTypes.js';

function envCheck(value: string | undefined): EnvCheck {
  const present = Boolean(value?.trim());
  return { configured: present, present };
}

function firebaseAdminStatus(env: Record<string, string | undefined>): FirebaseAdminStatus {
  const hasProjectId = Boolean(env.FIREBASE_ADMIN_PROJECT_ID?.trim());
  const hasClientEmail = Boolean(env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim());
  const hasPrivateKey = Boolean(env.FIREBASE_ADMIN_PRIVATE_KEY?.trim());
  return {
    configured: hasProjectId && hasClientEmail && hasPrivateKey,
    hasProjectId,
    hasClientEmail,
    hasPrivateKey,
  };
}

function tokenEncryptionConfigured(env: Record<string, string | undefined>) {
  return Boolean(
    env.INTEGRATION_TOKEN_ENCRYPTION_KEY?.trim() ||
    env.CONNECTED_ACCOUNTS_ENCRYPTION_KEY?.trim() ||
    env.SETTINGS_ENCRYPTION_KEY?.trim(),
  );
}

function upstoxCapabilityStatus(env: Record<string, string | undefined>): CapabilityStatus {
  return {
    clientConfigured: Boolean(env.UPSTOX_CLIENT_ID?.trim()),
    encryptionConfigured: tokenEncryptionConfigured(env),
    stateSecretConfigured: Boolean(env.CONNECTED_ACCOUNTS_STATE_SECRET?.trim() || env.SPLITWISE_STATE_SECRET?.trim()),
    redirectConfigured: Boolean(env.UPSTOX_REDIRECT_URI?.trim()),
  };
}

function splitwiseCapabilityStatus(env: Record<string, string | undefined>): CapabilityStatus {
  return {
    clientConfigured: Boolean(env.SPLITWISE_CLIENT_ID?.trim()),
    encryptionConfigured: tokenEncryptionConfigured(env),
    stateSecretConfigured: Boolean(env.SPLITWISE_STATE_SECRET?.trim()),
    redirectConfigured: Boolean(env.SPLITWISE_REDIRECT_URI?.trim()),
  };
}

function detectMode(env: Record<string, string | undefined>, explicit?: RuntimeMode): RuntimeMode {
  if (explicit) return explicit;
  if (env.VERCEL_ENV === 'production') return 'hosted';
  if (env.NODE_ENV === 'production') return 'self-hosted';
  return 'development';
}

export function getSetupCapabilities(input: SetupCapabilitiesInput): SetupStatusResponse {
  const { env, mode } = input;
  const publicEnv = input.publicEnv ?? env;
  const resolvedMode = detectMode(env, mode);

  const admin = firebaseAdminStatus(env);
  const upstox = upstoxCapabilityStatus(env);
  const splitwise = splitwiseCapabilityStatus(env);

  const hasServerAiKey = Boolean(env.GEMINI_API_KEY?.trim() || env.GOOGLE_API_KEY?.trim());
  const credentialEncryptionConfigured = tokenEncryptionConfigured(env);
  const userCredentialsSupported = admin.configured && credentialEncryptionConfigured;
  const aiAvailable = admin.configured && (hasServerAiKey || userCredentialsSupported);

  const firebaseClientConfigured = Boolean(
    publicEnv.NEXT_PUBLIC_FIREBASE_API_KEY?.trim() &&
    publicEnv.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim() &&
    publicEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() &&
    publicEnv.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim() &&
    publicEnv.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim() &&
    publicEnv.NEXT_PUBLIC_FIREBASE_APP_ID?.trim(),
  );

  const firebaseProjectId = publicEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() || env.FIREBASE_ADMIN_PROJECT_ID?.trim() || null;

  const casConfigured = Boolean(env.CAS_PARSER_SERVICE_URL?.trim()) ||
    (Boolean(env.CAS_PARSER_API_KEY?.trim()) && env.CAS_PARSER_ALLOW_EXTERNAL_FALLBACK?.trim() === 'true');

  const features: FeatureFlags = {
    manualAssets: true,
    dashboard: true,
    priceRefresh: true,
    firebaseAuth: firebaseClientConfigured,
    firebaseAdmin: admin.configured,
    upstoxConnectedAccounts: admin.configured &&
      Boolean(env.UPSTOX_CLIENT_ID?.trim()) &&
      Boolean(env.UPSTOX_CLIENT_SECRET?.trim()) &&
      upstox.encryptionConfigured &&
      upstox.stateSecretConfigured &&
      upstox.redirectConfigured,
    splitwise: admin.configured &&
      Boolean(env.SPLITWISE_CLIENT_ID?.trim()) &&
      Boolean(env.SPLITWISE_CLIENT_SECRET?.trim()) &&
      splitwise.encryptionConfigured &&
      splitwise.stateSecretConfigured &&
      splitwise.redirectConfigured,
    casParser: casConfigured,
    screenshotImport: aiAvailable,
    googleDriveSync: Boolean(publicEnv.VITE_GOOGLE_CLIENT_ID?.trim()),
    aiAssistant: aiAvailable,
    logoProvider: Boolean(publicEnv.VITE_LOGO_DEV_PUBLISHABLE_KEY?.trim()) ||
      Boolean(env.LOGO_DEV_SECRET_KEY?.trim()),
  };

  return {
    mode: resolvedMode,
    app: {
      baseUrl: env.APP_BASE_URL?.trim() || '',
    },
    firebase: {
      configured: firebaseClientConfigured,
      projectId: firebaseProjectId,
    },
    firebaseAdmin: admin,
    pricing: {
      massive: envCheck(env.MASSIVE_API_KEY),
      alphaVantage: envCheck(env.ALPHA_VANTAGE_API_KEY),
      finnhub: envCheck(env.FINNHUB_API_KEY),
      upstoxSystem: envCheck(env.UPSTOX_CLIENT_ID?.trim() && env.UPSTOX_CLIENT_SECRET?.trim() ? 'present' : undefined),
    },
    integrations: {
      upstox,
      splitwise,
    },
    ai: {
      serverKey: envCheck(env.GEMINI_API_KEY?.trim() || env.GOOGLE_API_KEY?.trim() || undefined),
      userCredentialsSupported,
    },
    casParser: {
      configured: casConfigured,
      hasServiceUrl: Boolean(env.CAS_PARSER_SERVICE_URL?.trim()),
      allowsExternalFallback: env.CAS_PARSER_ALLOW_EXTERNAL_FALLBACK?.trim() === 'true',
    },
    logoProvider: {
      serverKey: envCheck(env.LOGO_DEV_SECRET_KEY),
      clientKey: envCheck(publicEnv.VITE_LOGO_DEV_PUBLISHABLE_KEY),
    },
    googleDrive: {
      clientId: envCheck(publicEnv.VITE_GOOGLE_CLIENT_ID),
    },
    connectedAccounts: {
      encryptionConfigured: credentialEncryptionConfigured,
      stateSecretConfigured: Boolean(env.CONNECTED_ACCOUNTS_STATE_SECRET?.trim() || env.SPLITWISE_STATE_SECRET?.trim()),
    },
    integrationTokens: {
      encryptionConfigured: credentialEncryptionConfigured,
    },
    features,
  };
}
