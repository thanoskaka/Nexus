# Security and Privacy

Nexus handles financial data and provider credentials, so setup guidance should stay conservative.

## Secret Handling

- Server-only secrets must stay out of browser-visible env vars.
- `NEXT_PUBLIC_*` and `VITE_*` values are browser-visible and must be treated as public.
- The future setup diagnostics endpoint must return presence booleans only, never secret values.

## Credential Storage

User API keys and OAuth tokens are encrypted at rest with AES-256-GCM through `src/server/security/encryption.ts`.

Encryption key lookup order:

1. `INTEGRATION_TOKEN_ENCRYPTION_KEY`
2. `CONNECTED_ACCOUNTS_ENCRYPTION_KEY`
3. `SETTINGS_ENCRYPTION_KEY`

## Authenticated Server Routes

Routes that read or mutate user-specific finance data should require Firebase ID token verification through Firebase Admin.

Examples:

- AI chat
- AI credential storage
- screenshot import
- Upstox connected accounts
- Splitwise integration

## Self-Owned Firebase Security Model

When using "Bring Your Own Firebase" mode:

- **FirebaseClientConfig is public by design.** The apiKey, authDomain, projectId, storageBucket, messagingSenderId, and appId values are browser-visible in any Firebase web app. They identify your Firebase project but do not authorize access — Firestore security rules gate reads/writes based on authenticated user identity.

- **The config is stored in localStorage** keyed by your hosted Nexus user uid. This is the same pattern as Firebase SDK persistence. The config is not sent to any server.

- **Google sign-in happens against your Firebase project.** The ID token is issued by your project's Firebase Auth, and Firestore security rules use this token to authorize requests.

- **Server-side Admin credentials are separate.** The server's `FIREBASE_ADMIN_*` env vars are never exposed to the client. Self-owned mode does not use the server's Firebase Admin — all data operations happen client-side via the Firebase Web SDK.

### What Self-Owned Does NOT Protect Against

- The app (Nexus hosted deployment) still serves the JavaScript that reads/writes your Firestore. If you do not trust the hosted deployment, self-host Nexus instead.
- The workspace ownership choice (hosted vs self-owned) is stored in your browser's localStorage. Clearing localStorage or using a different device will reset this choice.

## Diagnostics Safety

Setup diagnostics should be public-safe:

- no OAuth tokens
- no API keys
- no encrypted blobs
- no user-specific connection state
- no account IDs
- no holdings data

Use authenticated endpoints for user-specific integration health.
