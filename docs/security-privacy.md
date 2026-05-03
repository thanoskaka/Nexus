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

## Diagnostics Safety

Setup diagnostics should be public-safe:

- no OAuth tokens
- no API keys
- no encrypted blobs
- no user-specific connection state
- no account IDs
- no holdings data

Use authenticated endpoints for user-specific integration health.
