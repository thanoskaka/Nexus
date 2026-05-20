import type { VerifiableCapabilityId } from '../server/setup/setupStatusTypes.js';

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
  mode: 'development' | 'self-hosted' | 'hosted';
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

export type VerificationState = 'not-configured' | 'configured-not-tested' | 'testing' | 'working' | 'failed';

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

export type SetupVerificationResponse = {
  results: ClientVerificationResult[];
};

export async function fetchSetupStatus(): Promise<SetupStatusResponse> {
  const response = await fetch('/api/setup/status');
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Setup status request failed (${response.status}): ${text.slice(0, 200) || 'Unknown error'}`);
  }
  const contentType = response.headers?.get?.('content-type') ?? '';
  if (contentType && !contentType.toLowerCase().includes('application/json')) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `Setup diagnostics endpoint returned non-JSON response. Start API server and retry. ${text.slice(0, 120)}`,
    );
  }
  const data = await response.json() as SetupStatusResponse;
  return data;
}

export async function verifyCapability(capabilityId: VerifiableCapabilityId | string): Promise<ClientVerificationResult> {
  const response = await fetch(`/api/setup/verify/${encodeURIComponent(capabilityId)}`, {
    method: 'POST',
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Verification request failed (${response.status}): ${text.slice(0, 200) || 'Unknown error'}`);
  }
  const data = await response.json() as ClientVerificationResult;
  return data;
}

export async function verifyAllCapabilities(): Promise<ClientVerificationResult[]> {
  const response = await fetch('/api/setup/verify', {
    method: 'POST',
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Verification request failed (${response.status}): ${text.slice(0, 200) || 'Unknown error'}`);
  }
  const data = await response.json() as SetupVerificationResponse;
  return data.results;
}
