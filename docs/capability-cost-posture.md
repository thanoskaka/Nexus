# Capability and Cost Posture

Each feature in Nexus belongs to one of five cost categories:

| Posture | Meaning |
|---------|---------|
| **free** | Works with no paid service or API key required |
| **bring-your-own-key** | User supplies their own provider credentials (may have provider costs) |
| **hosted-managed** | Hosted Nexus manages the infrastructure; no user setup needed |
| **paid-third-party** | User must pay an external provider directly |
| **unsupported** | Not production-safe; stub or disabled |

## Current Capabilities

| Feature | Status | Cost Posture | Required Env Vars | User-Facing Setup Note | Self-Host Support | Hosted Support |
|---------|--------|-------------|-------------------|----------------------|-------------------|----------------|
| **Manual Assets** | live | free | none | Add assets manually in the ledger. Prices entered by hand or refreshed from market data. | Full | Full |
| **Dashboard** | live | free | none | Shows total wealth, allocation, returns, FX views. All computed client-side. | Full | Full |
| **Price Refresh** | live | bring-your-own-key | `MASSIVE_API_KEY`, `ALPHA_VANTAGE_API_KEY` | Yahoo Finance used as fallback. For US equities, Massive provides better data. Configure keys in server env. | Full with keys; Yahoo fallback works without keys | Requires user-supplied keys or hosted-managed provider keys |
| **Firebase Auth** | live | free | `NEXT_PUBLIC_FIREBASE_*` (6 vars), `FIREBASE_ADMIN_*` (3 vars) | Create a Firebase project (free tier). Copy config to env vars. | Full | Managed |
| **Upstox (Connected Accounts)** | live | bring-your-own-key | `UPSTOX_CLIENT_ID`, `UPSTOX_CLIENT_SECRET`, `CONNECTED_ACCOUNTS_ENCRYPTION_KEY`, `CONNECTED_ACCOUNTS_STATE_SECRET` | Create an Upstox developer app. Set redirect URI to `{APP_BASE_URL}/api/connections/upstox/callback`. | Full | Requires user to create Upstox app |
| **Splitwise** | live | bring-your-own-key | `SPLITWISE_CLIENT_ID`, `SPLITWISE_CLIENT_SECRET`, `SPLITWISE_STATE_SECRET`, `INTEGRATION_TOKEN_ENCRYPTION_KEY` | Create a Splitwise app. Set redirect URI to `{APP_BASE_URL}/api/splitwise/callback`. | Full | Requires user to create Splitwise app |
| **CAS Parser (India MF)** | live | bring-your-own-key / paid-third-party | `CAS_PARSER_SERVICE_URL`, `CAS_PARSER_API_KEY`, `CAS_PARSER_ALLOW_EXTERNAL_FALLBACK` | Self-host the CAS parser service (`services/casparser-service/`) or use casparser.in with API key. External fallback is a paid service. | Full (self-host parser) or paid fallback | Requires user to configure parser URL or API key |
| **Screenshot Import** | live | bring-your-own-key | `FIREBASE_ADMIN_*`; AI path via `GEMINI_API_KEY`/`GOOGLE_API_KEY` or user AI credentials; user credentials require `INTEGRATION_TOKEN_ENCRYPTION_KEY` or `CONNECTED_ACCOUNTS_ENCRYPTION_KEY` | Upload screenshots of holdings. Uses server AI key or your encrypted AI provider key (Gemini/DeepSeek) set in Settings. | Full with Firebase Admin + AI key path | Full with hosted auth + user/server AI key path |
| **Google Drive Sync** | live | bring-your-own-key | `VITE_GOOGLE_CLIENT_ID` | Create a Google OAuth client ID. Configure in Google Cloud Console. | Full | Requires user to provide client ID |
| **AI Assistant / User AI Credentials** | live | bring-your-own-key | `FIREBASE_ADMIN_*`; AI path via `GEMINI_API_KEY`/`GOOGLE_API_KEY` or user-set credentials; user credentials require `INTEGRATION_TOKEN_ENCRYPTION_KEY` or `CONNECTED_ACCOUNTS_ENCRYPTION_KEY` | Supply a Gemini or DeepSeek API key in Settings. Keys stored encrypted. Server-side env key also works. | Full with Firebase Admin + AI key path | Requires user API key or hosted-managed server key |
| **Logo Provider** | live | bring-your-own-key | `LOGO_DEV_SECRET_KEY`, `VITE_LOGO_DEV_PUBLISHABLE_KEY` | Sign up at Logo.dev. Set secret key server-side, publishable key client-side. | Full | Requires user key |
| **Massive Pricing** | live | bring-your-own-key | `MASSIVE_API_KEY` | Get a Massive API key. Configure server-side. Used for US equity price lookups. | Full with key | Requires user-supplied key or hosted-managed key |
| **Finnhub Pricing** | declared | unsupported | `FINNHUB_API_KEY` | Env var declared in `.env.example` but not wired in server code yet. | Not available | Not available |
| **Alpha Vantage Pricing** | live | bring-your-own-key | `ALPHA_VANTAGE_API_KEY` | Get an Alpha Vantage API key (free tier available). Used as fallback US equity provider. | Full with key | Requires user-supplied or hosted-managed key |
| **Groww (Connected Accounts)** | stub | unsupported | (stub, `GROWW_PROVIDER_ENABLED = false`) | Not enabled in current build. Requires paid Groww Trading API. | Not available | Not available |
| **Canada Aggregator** | stub | unsupported | (stub, `CANADA_AGGREGATOR_ENABLED = false`) | No live production-safe aggregator in this build. | Not available | Not available |

## Key Notes

- **Yahoo Finance** is the free fallback price source and works without any API key for many tickers.
- **AMFI** provides free India mutual fund NAV data (no key needed).
- **Upstox system pricing** uses the configured Upstox app credentials for India stock prices (required for NSE/BSE tickers).
- **AI credentials** can be set per-user via Settings (stored encrypted) or configured server-wide via `GEMINI_API_KEY` / `GOOGLE_API_KEY` env vars. User-stored credentials require Firebase Admin and an encryption key.
- **CAS parser** can run as a self-hosted Docker service (`services/casparser-service/`) at no cost beyond infrastructure, or use the paid casparser.in cloud API.
- **All OAuth tokens and user API keys** stored in Firestore are encrypted at rest with AES-256-GCM.
