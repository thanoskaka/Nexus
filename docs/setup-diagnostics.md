# Setup Diagnostics Endpoint

Blueprint for a backend diagnostics endpoint that reports feature availability without exposing secrets.

## Endpoint

`GET /api/setup/status`

No authentication required. Returns public-safe information only.

## Response Shape

```typescript
type SetupStatusResponse = {
  mode: 'local' | 'self-hosted' | 'hosted';
  app: {
    baseUrl: string;
  };
  firebase: {
    configured: boolean;
    projectId: string | null;
  };
  firebaseAdmin: {
    configured: boolean;
    hasProjectId: boolean;
    hasClientEmail: boolean;
    hasPrivateKey: boolean;
  };
  pricing: {
    massive: EnvCheck;
    alphaVantage: EnvCheck;
    finnhub: EnvCheck;
    upstoxSystem: EnvCheck;    // UPSTOX_CLIENT_ID + UPSTOX_CLIENT_SECRET
  };
  integrations: {
    upstox: CapabilityStatus;
    splitwise: CapabilityStatus;
  };
  ai: {
    serverKey: EnvCheck;       // GEMINI_API_KEY or GOOGLE_API_KEY present
    userCredentialsSupported: boolean;  // always true if firebase admin configured
  };
  casParser: {
    configured: boolean;       // CAS_PARSER_SERVICE_URL or CAS_PARSER_API_KEY
    hasServiceUrl: boolean;
    allowsExternalFallback: boolean;
  };
  logoProvider: {
    serverKey: EnvCheck;      // LOGO_DEV_SECRET_KEY
    clientKey: EnvCheck;      // VITE_LOGO_DEV_PUBLISHABLE_KEY (public)
  };
  googleDrive: {
    clientId: EnvCheck;       // VITE_GOOGLE_CLIENT_ID (public)
  };
  connectedAccounts: {
    encryptionConfigured: boolean;  // CONNECTED_ACCOUNTS_ENCRYPTION_KEY
    stateSecretConfigured: boolean; // CONNECTED_ACCOUNTS_STATE_SECRET
  };
  integrationTokens: {
    encryptionConfigured: boolean;  // any supported server encryption key
  };
  features: {
    manualAssets: boolean;     // always true
    dashboard: boolean;        // always true
    priceRefresh: boolean;     // true if any pricing provider or yahoo fallback
    firebaseAuth: boolean;     // true if firebase client configured
    upstoxConnectedAccounts: boolean;
    splitwise: boolean;
    casParser: boolean;
    screenshotImport: boolean; // true if ai configured (server key or user creds possible)
    googleDriveSync: boolean;
    aiAssistant: boolean;      // true if any AI path available
    logoProvider: boolean;     // true if client or server key present
  };
};

type EnvCheck = {
  configured: boolean;
  present: boolean;     // env var exists and is non-empty (does not reveal value)
};

type CapabilityStatus = {
  clientConfigured: boolean;   // OAuth client keys present
  encryptionConfigured: boolean;
  stateSecretConfigured: boolean;
  redirectConfigured: boolean; // redirect URI env var is set
};
```

## Safety Rules

1. **Never return secret values.** All `EnvCheck` types return `{ configured: boolean; present: boolean }` only.
2. **Never return OAuth tokens**, API keys, or encrypted data.
3. **Public-safe only.** This endpoint does not require auth. Do not expose user-specific state (use the existing authenticated endpoints for that).
4. **Mode detection** infers from `NODE_ENV`, `VERCEL_ENV`, `APP_BASE_URL`, and the presence of hosted-specific configuration.

## Feature Capability States

Each feature has a boolean `features.*` flag that is `true` when the feature *can* work:

| Feature | True When |
|---------|-----------|
| `manualAssets` | Always true |
| `dashboard` | Always true |
| `priceRefresh` | Always true (Yahoo fallback available with no keys) |
| `firebaseAuth` | Client Firebase env vars are set |
| `upstoxConnectedAccounts` | Firebase Admin + `UPSTOX_CLIENT_ID` + `UPSTOX_CLIENT_SECRET` + `UPSTOX_REDIRECT_URI` + encryption key + state secret |
| `splitwise` | Firebase Admin + `SPLITWISE_CLIENT_ID` + `SPLITWISE_CLIENT_SECRET` + `SPLITWISE_REDIRECT_URI` + state secret + encryption key |
| `casParser` | `CAS_PARSER_SERVICE_URL` or (`CAS_PARSER_API_KEY` + `CAS_PARSER_ALLOW_EXTERNAL_FALLBACK=true`) |
| `screenshotImport` | Firebase Admin + AI available through server key or encrypted user credentials |
| `googleDriveSync` | `VITE_GOOGLE_CLIENT_ID` is set |
| `aiAssistant` | Firebase Admin + AI available through server `GEMINI_API_KEY`/`GOOGLE_API_KEY` or encrypted user credentials |
| `logoProvider` | `VITE_LOGO_DEV_PUBLISHABLE_KEY` or `LOGO_DEV_SECRET_KEY` is set |

## Missing Env Reporting

The response lists individual env var presence so the UI can show specific guidance like:

- "Upstox connected accounts needs `UPSTOX_CLIENT_ID` and `UPSTOX_CLIENT_SECRET`."
- "Splitwise needs `SPLITWISE_CLIENT_ID` and `SPLITWISE_STATE_SECRET`."
- "Google Drive sync needs `VITE_GOOGLE_CLIENT_ID`."

Values are never returned. Only presence/absence booleans.

## Examples

### Local Dev with Firebase + Minimal Keys

```json
{
  "mode": "local",
  "firebase": { "configured": true, "projectId": "my-project" },
  "firebaseAdmin": { "configured": false, "hasProjectId": false, "hasClientEmail": false, "hasPrivateKey": false },
  "pricing": {
    "massive": { "configured": false, "present": false },
    "alphaVantage": { "configured": false, "present": false }
  },
  "integrations": {
    "upstox": {
      "clientConfigured": false,
      "encryptionConfigured": false,
      "stateSecretConfigured": false,
      "redirectConfigured": false
    },
    "splitwise": {
      "clientConfigured": false,
      "encryptionConfigured": false,
      "stateSecretConfigured": false,
      "redirectConfigured": false
    }
  },
  "features": {
    "manualAssets": true,
    "dashboard": true,
    "priceRefresh": true,
    "firebaseAuth": true,
    "upstoxConnectedAccounts": false,
    "splitwise": false,
    "casParser": false,
    "screenshotImport": false,
    "googleDriveSync": false,
    "aiAssistant": false,
    "logoProvider": false
  }
}
```

### Self-Hosted with Full Configuration

```json
{
  "mode": "self-hosted",
  "firebase": { "configured": true, "projectId": "my-project" },
  "firebaseAdmin": { "configured": true, "hasProjectId": true, "hasClientEmail": true, "hasPrivateKey": true },
  "pricing": {
    "massive": { "configured": true, "present": true },
    "alphaVantage": { "configured": false, "present": false }
  },
  "integrations": {
    "upstox": {
      "clientConfigured": true,
      "encryptionConfigured": true,
      "stateSecretConfigured": true,
      "redirectConfigured": true
    },
    "splitwise": {
      "clientConfigured": true,
      "encryptionConfigured": true,
      "stateSecretConfigured": true,
      "redirectConfigured": true
    }
  },
  "ai": {
    "serverKey": { "configured": true, "present": true },
    "userCredentialsSupported": true
  },
  "casParser": {
    "configured": true,
    "hasServiceUrl": true,
    "allowsExternalFallback": false
  },
  "features": {
    "manualAssets": true,
    "dashboard": true,
    "priceRefresh": true,
    "firebaseAuth": true,
    "upstoxConnectedAccounts": true,
    "splitwise": true,
    "casParser": true,
    "screenshotImport": true,
    "googleDriveSync": false,
    "aiAssistant": true,
    "logoProvider": false
  }
}
```

### Hosted Mode

```json
{
  "mode": "hosted",
  "firebase": { "configured": true, "projectId": "nexus-portfolio-50032" },
  "firebaseAdmin": { "configured": true, "hasProjectId": true, "hasClientEmail": true, "hasPrivateKey": true },
  "features": {
    "manualAssets": true,
    "dashboard": true,
    "priceRefresh": true,
    "firebaseAuth": true,
    "upstoxConnectedAccounts": true,
    "splitwise": true,
    "casParser": true,
    "screenshotImport": true,
    "googleDriveSync": false,
    "aiAssistant": true,
    "logoProvider": false
  }
}
```

## Implementation Plan

1. Create `src/server/setup/setupStatusService.ts` -- reads env vars, builds status map, no side effects.
2. Create `src/server/setup/setupStatusRoutes.ts` -- single GET handler calling the service.
3. Mount at `GET /api/setup/status` in `server.ts` and `api/setup/status.ts` for Vercel.
4. Write tests for all env combinations.

This endpoint is the foundation for the setup health UI in Settings and the getting-started checklist.
