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

export type SetupStatusResponse = {
  mode: 'local' | 'self-hosted' | 'hosted';
  app: { baseUrl: string };
  firebase: { configured: boolean; projectId: string | null };
  firebaseAdmin: FirebaseAdminStatus;
  pricing: {
    massive: EnvCheck;
    alphaVantage: EnvCheck;
    finnhub: EnvCheck;
    upstoxSystem: EnvCheck;
  };
  integrations: {
    upstox: CapabilityStatus;
    splitwise: CapabilityStatus;
  };
  ai: {
    serverKey: EnvCheck;
    userCredentialsSupported: boolean;
  };
  casParser: {
    configured: boolean;
    hasServiceUrl: boolean;
    allowsExternalFallback: boolean;
  };
  logoProvider: {
    serverKey: EnvCheck;
    clientKey: EnvCheck;
  };
  googleDrive: {
    clientId: EnvCheck;
  };
  connectedAccounts: {
    encryptionConfigured: boolean;
    stateSecretConfigured: boolean;
  };
  integrationTokens: {
    encryptionConfigured: boolean;
  };
  features: {
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
};

export async function fetchSetupStatus(): Promise<SetupStatusResponse> {
  const response = await fetch('/api/setup/status');
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Setup status request failed (${response.status}): ${text.slice(0, 200) || 'Unknown error'}`);
  }
  const data = await response.json() as SetupStatusResponse;
  return data;
}
