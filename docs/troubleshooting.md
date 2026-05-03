# Troubleshooting

This page tracks setup issues that should eventually power in-app diagnostics.

## Firebase Auth

- Confirm all `NEXT_PUBLIC_FIREBASE_*` values are set for browser auth.
- Confirm `FIREBASE_ADMIN_*` values are set for authenticated server routes.
- Preserve newline escaping in `FIREBASE_ADMIN_PRIVATE_KEY`.

## OAuth Integrations

- Confirm `APP_BASE_URL` matches the deployed origin.
- Confirm provider redirect URIs match the configured callback route.
- Upstox callback: `{APP_BASE_URL}/api/connections/upstox/callback`.
- Splitwise callback: `{APP_BASE_URL}/api/splitwise/callback`.
- Confirm state/encryption secrets are present before testing OAuth.

## AI and Screenshot Import

- AI chat and screenshot import require sign-in, Firebase Admin, and either a server AI key or encrypted user AI credentials.
- User AI credentials require `INTEGRATION_TOKEN_ENCRYPTION_KEY`, `CONNECTED_ACCOUNTS_ENCRYPTION_KEY`, or `SETTINGS_ENCRYPTION_KEY`.
- Server fallback reads `GEMINI_API_KEY` or `GOOGLE_API_KEY`.

## CAS Parser

- Prefer `CAS_PARSER_SERVICE_URL` for a self-hosted parser.
- External fallback requires `CAS_PARSER_API_KEY` and `CAS_PARSER_ALLOW_EXTERNAL_FALLBACK=true`.

## Price Refresh

- Yahoo fallback works for many tickers without keys.
- `MASSIVE_API_KEY` and `ALPHA_VANTAGE_API_KEY` improve US equity coverage.
- India stock pricing through Upstox requires configured Upstox credentials.
