# Setup Modes

Nexus supports three setup modes. Each mode determines which features are available and which credentials you need to provide.

## Local Development

Run Nexus on your machine for development or personal use.

```bash
cp .env.example .env.local
npm install
npm run dev
```

The app runs at `http://localhost:6868` and the API at the same origin.

### Required Env Vars

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_FIREBASE_*` (6 vars) | Firebase client SDK -- project, auth domain, storage bucket, etc. |
| `APP_BASE_URL` | Base URL for OAuth redirect URIs |

### Optional Env Vars

| Variable | Purpose |
|----------|---------|
| `FIREBASE_ADMIN_*` (3 vars) | Firebase Admin SDK for server-side token verification. Needed for connected accounts, Splitwise, AI credentials, and other server endpoints that authenticate users. |
| `MASSIVE_API_KEY` | US equity pricing provider |
| `ALPHA_VANTAGE_API_KEY` | Fallback US equity pricing provider |
| `FINNHUB_API_KEY` | Reserved for future pricing provider |
| `LOGO_DEV_SECRET_KEY` | Server-side logo resolution for mutual funds |
| `VITE_LOGO_DEV_PUBLISHABLE_KEY` | Client-side logo resolution fallback |
| `UPSTOX_CLIENT_ID`, `UPSTOX_CLIENT_SECRET` | Upstox connected accounts for India holdings |
| `SPLITWISE_*` (8 vars) | Splitwise integration for shared expenses |
| `CONNECTED_ACCOUNTS_ENCRYPTION_KEY` | Encrypt OAuth tokens at rest |
| `CONNECTED_ACCOUNTS_STATE_SECRET` | Sign OAuth state parameters |
| `INTEGRATION_TOKEN_ENCRYPTION_KEY` | Encrypt integration tokens at rest |
| `SPLITWISE_STATE_SECRET` | Sign Splitwise OAuth state |
| `CAS_PARSER_SERVICE_URL` | URL for self-hosted CAS PDF parser service |
| `CAS_PARSER_API_KEY` | API key for casparser.in external fallback |
| `CAS_PARSER_ALLOW_EXTERNAL_FALLBACK` | Allow fallback to casparser.in cloud API |
| `GEMINI_API_KEY` / `GOOGLE_API_KEY` | Server-side AI assistant (Gemini) |
| `NEXUS_AI_MODEL` | AI model override (default: `gemini-2.5-flash`) |
| `VITE_GOOGLE_CLIENT_ID` | Google Drive sync/export |
| `VITE_LOCAL_TEST_MODE` | Test mode flag |

Some optional variables above are used by current backend/provider code but are not listed in `.env.example` yet. Treat this page as the broader setup inventory and `.env.example` as the quick-start template.

### What Works Without Paid Providers

- Manual asset tracking with manual prices
- Dashboard and ledger views
- Portfolio metrics and allocation
- Import/export flows (CSV)
- Price refresh via Yahoo Finance for many tickers
- Firebase auth (requires free Firebase project)
- Asset class branding

## Self-Hosted

Deploy your own Nexus instance anywhere that supports Node.js (Vercel, Railway, Fly.io, etc.).

You need to provide all the same env vars as local development, plus a production `APP_BASE_URL` and production Firebase configuration.

### Required

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_FIREBASE_*` (6 vars) | Your own Firebase project credentials |
| `FIREBASE_ADMIN_*` (3 vars) | Firebase Admin SDK credentials |
| `APP_BASE_URL` | Production URL for OAuth redirects |

### What Self-Hosted Requires

- Node.js 18+ or Vercel-compatible deployment
- A Firebase project (free tier works)
- Optional: provider API keys for pricing, broker connections, integrations
- Optional: Docker for the CAS parser service (`services/casparser-service/`)

### Build and Deploy

```bash
npm run build
npm start          # standalone Express server
# or: deploy to Vercel
npx vercel --prod
```

## Bring Your Own Firebase (Self-Owned Mode)

When you choose "Bring Your Own Firebase" in the ownership setup, Nexus uses your Firebase project for authentication and Firestore portfolio data instead of the hosted infrastructure.

### What Self-Owned Mode Activates

- Google sign-in authenticates against **your** Firebase Auth project
- All portfolio data (assets, settings, members) reads/writes to **your** Firestore database
- No portfolio data touches the hosted Firestore
- Your Firebase client config is stored in localStorage (keyed by your hosted user uid)

### Required Setup in Your Firebase Console

1. **Enable Authentication > Google provider**
   - Go to Firebase Console > Authentication > Sign-in method
   - Enable the Google provider
   - Add your app domain to **Authorized domains** (e.g., `localhost`, `nexus-phi-inky.vercel.app`)

2. **Create Firestore database**
   - Go to Firebase Console > Firestore Database > Create database
   - Choose a location and start in test mode (or locked mode if you want to configure rules first)

3. **Firestore security rules** (recommended for production):
   ```firestore
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /portfolios/{portfolioId} {
         allow read, write: if request.auth != null
           && request.auth.uid in resource.data.memberEmails
           || request.auth.token.email in resource.data.memberEmails;
         allow create: if request.auth != null;
       }
     }
   }
   ```

### Client Config vs Admin Credentials

| Credential Type | Where Used | Security Model |
|----------------|------------|----------------|
| `FirebaseClientConfig` (apiKey, authDomain, etc.) | Client-side browser | Public by design; safe to store in localStorage |
| `FIREBASE_ADMIN_*` (private key, client email) | Server-side only | **Never expose to browser** |

The Firebase client config values are public and safe in localStorage — they identify your Firebase project but do not authorize write access. Server Admin private keys must **never** be stored in the browser.

### Server-Side Limitations for Self-Owned Mode

Self-owned mode is currently **client-side only**. The following server integrations cannot use your self-owned Firebase Admin credentials:

| Feature | Behavior in Self-Owned Mode |
|---------|---------------------------|
| AI Chat (`/api/ai/chat`) | Token verification and Firestore reads use hosted Firebase Admin. Not compatible with self-owned. Returns 401. |
| Upstox connected accounts | Uses hosted Firebase Admin for token verification. Returns 401 for self-owned tokens. |
| Splitwise integration | Uses hosted Firebase Admin for token verification. Returns 401 for self-owned tokens. |
| AI credentials storage | Uses hosted Firebase Admin. Returns 401 for self-owned tokens. |
| CAS import | Uses hosted Firebase Admin. Returns 401 for self-owned tokens. |
| Screenshot import | Uses hosted Firebase Admin. Returns 401 for self-owned tokens. |
| Shared integrations | Uses hosted Firestore. Self-owned users should not use shared integrations until supported. |

**Workaround:** You can self-host the full Nexus backend with your Firebase Admin credentials. This provides server-side support for all integrations. See [Self-Hosted](#self-hosted).

**Future**: Once Nexus supports per-request Firebase Admin resolution (via the user's ID token tenant), these routes may become self-owned compatible.

## Hosted

The official managed Nexus deployment (`nexus-phi-inky.vercel.app`).

### What Hosted Provides

- Managed Firebase project with auth and Firestore
- Pre-configured OAuth redirect URIs
- Managed server environment with provider keys
- Automatic updates

### What the User Still Provides

- Their own Firebase project (optional -- hosted Nexus can use shared infrastructure)
- Provider API keys stored as user settings (encrypted at rest)
- Google Drive / Google client ID for sync features
- AI provider API keys (Gemini or DeepSeek) -- stored encrypted per-user

### Hosted-Specific Constraints

Some features require user-supplied credentials even in hosted mode because Nexus does not broker third-party paid services:
- AI assistant: user API key required (Gemini or DeepSeek)
- Google Drive sync: user Google Client ID
- Logos: user Logo.dev publishable key (client-side)
