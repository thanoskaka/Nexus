# Provider Guides

This guide gives practical setup notes for common Nexus providers. It does not replace the full env inventory. For complete capability and env status, see [Capability and Cost Posture](capability-cost-posture.md). For local, self-hosted, and hosted setup modes, see [Setup Modes](setup-modes.md).

## Firebase

Firebase powers sign-in and user data access.

Use Firebase when:

- You self-host Nexus.
- You run local development.
- You need authenticated server routes such as AI credentials, connected accounts, Splitwise, or screenshot import.

Create a Firebase project, enable Authentication, and add your app domain to authorized domains.

Browser-visible env vars:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_PORTFOLIO_ID`

Server-only Firebase Admin env vars:

- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`

Notes:

- `NEXT_PUBLIC_*` values are visible in the browser.
- Preserve newline escaping in `FIREBASE_ADMIN_PRIVATE_KEY`.
- Hosted Nexus may manage Firebase for you.

More detail: [Setup Modes](setup-modes.md#local-development), [Security and Privacy](security-privacy.md).

## Upstox

Upstox supports connected account flows for India holdings and can improve India stock pricing support when configured.

Create an Upstox developer app, then set its redirect URI to:

```text
{APP_BASE_URL}/api/connections/upstox/callback
```

Local example:

```text
http://localhost:6868/api/connections/upstox/callback
```

Production example:

```text
https://your-domain.example/api/connections/upstox/callback
```

Env vars:

- `APP_BASE_URL`
- `UPSTOX_CLIENT_ID`
- `UPSTOX_CLIENT_SECRET`
- `UPSTOX_REDIRECT_URI`
- `CONNECTED_ACCOUNTS_ENCRYPTION_KEY`
- `CONNECTED_ACCOUNTS_STATE_SECRET`

Keep `UPSTOX_CLIENT_SECRET`, encryption keys, and state secrets server-only.

More detail: [Capability and Cost Posture](capability-cost-posture.md#current-capabilities), [Troubleshooting](troubleshooting.md#oauth-integrations).

## Splitwise

Splitwise supports shared expense integration.

Create a Splitwise app, then set its redirect URI to:

```text
{APP_BASE_URL}/api/splitwise/callback
```

Local example:

```text
http://localhost:6868/api/splitwise/callback
```

Production example:

```text
https://your-domain.example/api/splitwise/callback
```

Env vars:

- `APP_BASE_URL`
- `SPLITWISE_CLIENT_ID`
- `SPLITWISE_CLIENT_SECRET`
- `SPLITWISE_REDIRECT_URI`
- `SPLITWISE_API_BASE_URL`
- `SPLITWISE_OAUTH_TOKEN_URL`
- `SPLITWISE_OAUTH_AUTHORIZE_URL`
- `SPLITWISE_STATE_SECRET`
- `INTEGRATION_TOKEN_ENCRYPTION_KEY`

Default provider URLs:

- `SPLITWISE_API_BASE_URL=https://secure.splitwise.com/api/v3.0`
- `SPLITWISE_OAUTH_TOKEN_URL=https://secure.splitwise.com/oauth/token`
- `SPLITWISE_OAUTH_AUTHORIZE_URL=https://secure.splitwise.com/oauth/authorize`

More detail: [Troubleshooting](troubleshooting.md#oauth-integrations), [Security and Privacy](security-privacy.md#credential-storage).

## CAS parser

CAS parser support is for India mutual fund CAS PDF imports.

Recommended self-hosted path:

- Run the parser service from `services/casparser-service/`.
- Point Nexus at that service with `CAS_PARSER_SERVICE_URL`.
- Keep the service private unless you intentionally expose it.

External fallback path:

- Use a casparser.in API key.
- Enable external fallback explicitly.
- Expect provider-side pricing or usage limits.

Env vars:

- `CAS_PARSER_SERVICE_URL`
- `CAS_PARSER_API_KEY`
- `CAS_PARSER_ALLOW_EXTERNAL_FALLBACK`

Use `CAS_PARSER_ALLOW_EXTERNAL_FALLBACK=true` only when you are comfortable sending CAS parsing requests to the external service.

More detail: [Capability and Cost Posture](capability-cost-posture.md#current-capabilities), [Troubleshooting](troubleshooting.md#cas-parser).

## Google Drive

Google Drive supports Drive sync, backup, or export workflows when configured.

Create a Google Cloud OAuth client for a browser application and allow your app origin.

Typical authorized JavaScript origins:

```text
http://localhost:6868
https://your-domain.example
```

Env var:

- `VITE_GOOGLE_CLIENT_ID`

Notes:

- `VITE_GOOGLE_CLIENT_ID` is browser-visible and is not a secret.
- The OAuth client should be scoped for the Drive behavior Nexus uses.
- Hosted users may still need to bring their own Google client ID.

More detail: [Capability and Cost Posture](capability-cost-posture.md#current-capabilities).

## AI credentials

AI is optional. Use it for assistant features, screenshot import, and AI-assisted parsing.

Supported paths:

- User-provided AI key stored in Nexus settings and encrypted at rest.
- Server-side key configured by a self-hoster or hosted operator.

Server-side env vars:

- `GEMINI_API_KEY`
- `GOOGLE_API_KEY`
- `NEXUS_AI_MODEL`

Credential storage support may require one of:

- `INTEGRATION_TOKEN_ENCRYPTION_KEY`
- `CONNECTED_ACCOUNTS_ENCRYPTION_KEY`
- `SETTINGS_ENCRYPTION_KEY`

Authenticated AI routes also need:

- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`

Notes:

- Do not put AI secrets in `NEXT_PUBLIC_*` or `VITE_*` variables.
- User-stored AI credentials are encrypted at rest.
- Nexus can work without AI.

More detail: [Troubleshooting](troubleshooting.md#ai-and-screenshot-import), [Security and Privacy](security-privacy.md#credential-storage).

## Pricing keys

Nexus can track manual assets without pricing keys. Pricing keys improve automated market refresh coverage.

Free or no-key paths:

- Manual prices.
- Yahoo Finance fallback for many tickers.
- AMFI NAV data for India mutual funds.

Optional provider keys:

- `MASSIVE_API_KEY` for US equity pricing.
- `ALPHA_VANTAGE_API_KEY` as fallback US equity pricing.
- `FINNHUB_API_KEY` is declared but currently unsupported.
- `LOGO_DEV_SECRET_KEY` for server-side logo resolution.
- `VITE_LOGO_DEV_PUBLISHABLE_KEY` for browser-visible logo lookup.

Provider-specific notes:

- Upstox credentials may be required for India stock pricing through Upstox-backed flows.
- Logo.dev keys are for branding, not prices.
- Server-only price keys should not be exposed in browser-visible variables.

More detail: [Capability and Cost Posture](capability-cost-posture.md#current-capabilities), [Troubleshooting](troubleshooting.md#price-refresh).
