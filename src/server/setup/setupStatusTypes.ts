export type RuntimeMode = 'development' | 'self-hosted' | 'hosted';

export type EnvCheck = {
  configured: boolean;
  present: boolean;
};

export type CapabilityStatus = {
  clientConfigured: boolean;
  encryptionConfigured: boolean;
  stateSecretConfigured: boolean;
  redirectConfigured: boolean;
};

export type FirebaseAdminStatus = {
  configured: boolean;
  hasProjectId: boolean;
  hasClientEmail: boolean;
  hasPrivateKey: boolean;
};

export type PricingCapabilities = {
  massive: EnvCheck;
  alphaVantage: EnvCheck;
  finnhub: EnvCheck;
  upstoxSystem: EnvCheck;
};

export type IntegrationCapabilities = {
  upstox: CapabilityStatus;
  splitwise: CapabilityStatus;
};

export type AiCapabilities = {
  serverKey: EnvCheck;
  userCredentialsSupported: boolean;
};

export type CasParserCapabilities = {
  configured: boolean;
  hasServiceUrl: boolean;
  allowsExternalFallback: boolean;
};

export type LogoCapabilities = {
  serverKey: EnvCheck;
  clientKey: EnvCheck;
};

export type GoogleDriveCapabilities = {
  clientId: EnvCheck;
};

export type EncryptionCapabilities = {
  encryptionConfigured: boolean;
  stateSecretConfigured: boolean;
};

export type FeatureFlags = {
  manualAssets: boolean;
  dashboard: boolean;
  priceRefresh: boolean;
  firebaseAuth: boolean;
  firebaseAdmin: boolean;
  upstoxConnectedAccounts: boolean;
  splitwise: boolean;
  casParser: boolean;
  screenshotImport: boolean;
  googleDriveSync: boolean;
  aiAssistant: boolean;
  logoProvider: boolean;
};

export type SetupStatusResponse = {
  mode: RuntimeMode;
  app: {
    baseUrl: string;
  };
  firebase: {
    configured: boolean;
    projectId: string | null;
  };
  firebaseAdmin: FirebaseAdminStatus;
  pricing: PricingCapabilities;
  integrations: IntegrationCapabilities;
  ai: AiCapabilities;
  casParser: CasParserCapabilities;
  logoProvider: LogoCapabilities;
  googleDrive: GoogleDriveCapabilities;
  connectedAccounts: EncryptionCapabilities;
  integrationTokens: {
    encryptionConfigured: boolean;
  };
  features: FeatureFlags;
};

export type SetupCapabilitiesInput = {
  env: Record<string, string | undefined>;
  publicEnv?: Record<string, string | undefined>;
  mode?: RuntimeMode;
};

export type VerificationState = 'not-configured' | 'configured-not-tested' | 'testing' | 'working' | 'failed';

export type VerificationGuidance = {
  missingEnvKeys: string[];
  docsPath?: string;
  hint?: string;
};

export type VerificationResult = {
  capabilityId: string;
  status: VerificationState;
  checkedAt: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  guidance: VerificationGuidance;
};

export const VERIFIABLE_CAPABILITIES = [
  'firebase-auth',
  'firebase-admin',
  'price-provider',
  'ai-provider',
  'logo-provider',
  'cas-parser',
  'upstox',
  'splitwise',
] as const;

export type VerifiableCapabilityId = typeof VERIFIABLE_CAPABILITIES[number];
