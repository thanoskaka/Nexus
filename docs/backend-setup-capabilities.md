# Backend Setup Capabilities Helper

Design document for a server-side `getSetupCapabilities()` helper that computes feature availability from the runtime environment.

## Purpose

Centralize the logic that answers "what works right now?" so it can be reused by:
- The `/api/setup/status` endpoint
- The settings UI setup health card
- The getting-started onboarding checklist
- Integration health UI
- Feature-specific error messages

## Signature

```typescript
type RuntimeMode = 'local' | 'self-hosted' | 'hosted';

type SetupCapabilitiesInput = {
  env: Record<string, string | undefined>;   // typically process.env
  publicEnv?: Record<string, string | undefined>;  // import.meta.env for Vite public vars
  mode: RuntimeMode;
};

type SetupCapabilitiesOutput = {
  mode: RuntimeMode;
  app: { baseUrl: string; detectedUrl: string };
  firebase: { configured: boolean; projectId: string | null };
  firebaseAdmin: FirebaseAdminStatus;
  pricing: PricingCapabilities;
  integrations: IntegrationCapabilities;
  ai: AiCapabilities;
  casParser: CasParserCapabilities;
  logoProvider: LogoCapabilities;
  googleDrive: GoogleDriveCapabilities;
  connectedAccounts: EncryptionCapabilities;
  features: FeatureFlags;
};
```

See [setup-diagnostics.md](setup-diagnostics.md) for the full type definitions.

## Inputs

### `env` (server-side, `process.env`)

Reads all `FIREBASE_ADMIN_*`, `MASSIVE_API_KEY`, `ALPHA_VANTAGE_API_KEY`, `UPSTOX_*`, `SPLITWISE_*`, `GEMINI_API_KEY`, `GOOGLE_API_KEY`, `CAS_PARSER_*`, `LOGO_DEV_SECRET_KEY`, `CONNECTED_ACCOUNTS_*`, `INTEGRATION_TOKEN_ENCRYPTION_KEY`, `APP_BASE_URL`, `NODE_ENV`.

### `publicEnv` (client-side, `import.meta.env`)

Reads `VITE_GOOGLE_CLIENT_ID`, `VITE_LOGO_DEV_PUBLISHABLE_KEY`, `NEXT_PUBLIC_FIREBASE_*` vars.

In the server endpoint context, these are accessed via Vite's `loadEnv()` during dev, or via injected env vars in production.

### `mode`

Detected automatically from `NODE_ENV`, `VERCEL_ENV`, `APP_BASE_URL`. Can be overridden for testing.

## Output Rules

### Secret Safety

- **Never return actual values of server-only env vars.**
- Return `{ configured: boolean; present: boolean }` for secret env vars.
- Public-safe vars (`NEXT_PUBLIC_*`, `VITE_*`) can return `{ configured: boolean; present: boolean; value?: string }` but only if explicitly marked public.

### Feature Flags

Each `features.*` boolean applies the following logic:

| Feature | Condition |
|---------|-----------|
| `manualAssets` | Always `true` |
| `dashboard` | Always `true` |
| `priceRefresh` | Always `true` (Yahoo free fallback) |
| `firebaseAuth` | All `NEXT_PUBLIC_FIREBASE_*` vars present |
| `firebaseAdmin` | All 3 `FIREBASE_ADMIN_*` vars present |
| `upstoxConnectedAccounts` | Firebase Admin + `UPSTOX_CLIENT_ID` + `UPSTOX_CLIENT_SECRET` + `UPSTOX_REDIRECT_URI` + encryption key + state secret |
| `splitwise` | Firebase Admin + `SPLITWISE_CLIENT_ID` + `SPLITWISE_CLIENT_SECRET` + state secret + encryption key + redirect URI |
| `casParser` | `CAS_PARSER_SERVICE_URL` or (`CAS_PARSER_API_KEY` + `CAS_PARSER_ALLOW_EXTERNAL_FALLBACK`) |
| `screenshotImport` | Firebase Admin + AI available (server key or user credentials store writable) |
| `googleDriveSync` | `VITE_GOOGLE_CLIENT_ID` present |
| `aiAssistant` | Firebase Admin + (`GEMINI_API_KEY` or `GOOGLE_API_KEY` present; OR encrypted user credentials are supported) |
| `logoProvider` | `VITE_LOGO_DEV_PUBLISHABLE_KEY` or `LOGO_DEV_SECRET_KEY` present |

## Test Cases

### 1. Empty env (local dev, no keys)

```typescript
getSetupCapabilities({ env: {}, publicEnv: {}, mode: 'local' })
// => features: { manualAssets: true, dashboard: true, priceRefresh: true, firebaseAuth: false, ...all false }
```

### 2. Firebase only (new local dev)

```typescript
getSetupCapabilities({
  env: {},
  publicEnv: {
    NEXT_PUBLIC_FIREBASE_API_KEY: 'key',
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'domain',
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'pid',
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'bucket',
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: 'sid',
    NEXT_PUBLIC_FIREBASE_APP_ID: 'aid',
  },
  mode: 'local',
})
// => features: { manualAssets: true, dashboard: true, priceRefresh: true, firebaseAuth: true, ...all false }
```

### 3. Full self-hosted

```typescript
getSetupCapabilities({
  env: {
    FIREBASE_ADMIN_PROJECT_ID: 'pid',
    FIREBASE_ADMIN_CLIENT_EMAIL: 'email',
    FIREBASE_ADMIN_PRIVATE_KEY: 'key',
    MASSIVE_API_KEY: 'key',
    UPSTOX_CLIENT_ID: 'id',
    UPSTOX_CLIENT_SECRET: 'secret',
    CONNECTED_ACCOUNTS_ENCRYPTION_KEY: 'key',
    CONNECTED_ACCOUNTS_STATE_SECRET: 'secret',
    SPLITWISE_CLIENT_ID: 'id',
    SPLITWISE_CLIENT_SECRET: 'secret',
    SPLITWISE_STATE_SECRET: 'secret',
    SPLITWISE_REDIRECT_URI: 'uri',
    INTEGRATION_TOKEN_ENCRYPTION_KEY: 'key',
    GEMINI_API_KEY: 'key',
    APP_BASE_URL: 'https://example.com',
  },
  publicEnv: {
    ...firebaseVars,
    VITE_GOOGLE_CLIENT_ID: 'id',
    VITE_LOGO_DEV_PUBLISHABLE_KEY: 'key',
  },
  mode: 'self-hosted',
})
// => features: { manualAssets: true, dashboard: true, priceRefresh: true, firebaseAuth: true,
//     upstoxConnectedAccounts: true, splitwise: true, casParser: false,
//     screenshotImport: true, googleDriveSync: true, aiAssistant: true, logoProvider: true }
```

### 4. No secret values leaked

```typescript
const result = getSetupCapabilities({ env: { GEMINI_API_KEY: 'super-secret-key' }, mode: 'local' });
// result.ai.serverKey => { configured: true, present: true }
// result.ai.serverKey.value => undefined (not present, never leaks)
```

### 5. Mode detection

```typescript
getSetupCapabilities({ mode: 'hosted' })
// => result.mode === 'hosted'
```

### 6. Partial Splitwise config

```typescript
getSetupCapabilities({
  env: { SPLITWISE_CLIENT_ID: 'id' },  // missing SPLITWISE_CLIENT_SECRET, SPLITWISE_STATE_SECRET, encryption key
  mode: 'local',
})
// => features.splitwise => false
// => integrations.splitwise.clientConfigured => true (CLIENT_ID present)
// => integrations.splitwise.stateSecretConfigured => false
// => integrations.splitwise.encryptionConfigured => false
```

## How the UI Should Consume This

The endpoint response is designed for a setup health card in Settings:

```typescript
// Pseudocode: client-side consumption
const status = await fetch('/api/setup/status').then(r => r.json());

// Show a checklist
const checklist = [
  { label: 'Firebase Auth', ok: status.firebase.configured },
  { label: 'Price Refresh', ok: status.features.priceRefresh },
  { label: 'Upstox', ok: status.features.upstoxConnectedAccounts },
  { label: 'Splitwise', ok: status.features.splitwise },
  { label: 'CAS Parser', ok: status.features.casParser },
  { label: 'AI Assistant', ok: status.features.aiAssistant },
  { label: 'Google Drive', ok: status.features.googleDriveSync },
  { label: 'Logos', ok: status.features.logoProvider },
];

// Missing env hints
const hints: string[] = [];
if (!status.integrations.upstox.clientConfigured) {
  hints.push('Set UPSTOX_CLIENT_ID and UPSTOX_CLIENT_SECRET to enable Upstox connected accounts.');
}
if (!status.integrations.splitwise.clientConfigured) {
  hints.push('Set SPLITWISE_CLIENT_ID and SPLITWISE_CLIENT_SECRET to enable Splitwise.');
}
// ... etc
```

The getting-started checklist can also use this to show/hide setup steps:
- If `firebaseAuth` is false, show "Configure Firebase" step
- If `upstoxConnectedAccounts` is false, show "Connect Upstox" step (optional)
- etc.
