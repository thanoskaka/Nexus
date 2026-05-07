# Nexus Portfolio

![Nexus demo](docs/assets/nexus-demo-placeholder.gif)

Nexus Portfolio is an open-source family wealth tracker for multi-country, multi-asset households.

It combines market-linked investments, manual assets, liabilities, and read-only connected broker snapshots in one cloud-backed workspace — designed for families with money across Canada, India, and the US.

---

## Why Nexus

- **Open source and auditable** — every line is visible. No black boxes.
- **Self-host or use hosted** — bring your own Firebase or use the managed instance.
- **Multi-country by design** — CAD, USD, INR in one portfolio with FX-aware views.
- **Family workspace** — shared access with Google sign-in, per-asset ownership.
- **BYOK AI** — bring your own API key for Gemini, DeepSeek, OpenAI, or Anthropic. Encrypted at rest.
- **No data mining** — no telemetry, no tracking scripts, no third-party data sale.

---

## Features

| Area | What's included |
|---|---|
| Dashboard | Net worth, allocation, returns, FX-aware views across currencies |
| Assets & Liabilities | Manual entry for any asset class: stocks, ETFs, mutual funds, gold, bank balances, PF/PPF/NPS/FD, real estate, credit cards, loans |
| CSV Import/Export | Bulk add and export assets with currency, owner, and category mapping |
| Screenshot Import | Snap a portfolio screenshot; AI extracts and matches assets (`src/components/ScreenshotImportModal.tsx`) |
| Sample Mode | Pre-populated demo portfolio — run `npm run dev:mock` and explore |
| Upstox | Read-only connected holdings for India stocks. Quantity, price, value sourced from Upstox snapshots; metadata overridable (label, owner, category, notes, hide toggle) |
| Splitwise | Shared expense/debt tracking as a portfolio liability line |
| AI Assistant | Portfolio Q&A and screenshot OCR. Providers: Gemini, DeepSeek (UI), OpenAI, Anthropic (server). User API keys encrypted with AES-256-GCM at rest; env fallback `GEMINI_API_KEY` / `GOOGLE_API_KEY` / `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` |
| Self-Owned Firebase | Use your own Firebase project. Client config stored in localStorage; all data goes to your Firestore, not Nexus servers |
| Hosted Mode | Managed deployment at [nexus-phi-inky.vercel.app](https://nexus-phi-inky.vercel.app) — Google sign-in, preconfigured server |

---

## Quick Start

### Mock demo (no Firebase, no setup)

```bash
npm install
npm run dev:mock
```

Open `http://localhost:6868` — pre-authenticated with a sample portfolio.

### Real Firebase (local dev)

```bash
npm install
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_FIREBASE_*` values from your Firebase project (Authentication + Firestore enabled), then:

```bash
npm run dev
```

### Docker

Not yet available. A Dockerfile and docker-compose.yml are planned for the launch preparation. For now, use `npm run dev` or `npm run dev:mock`.

---

## Self-Host Setup

The current self-hosting path uses **your own Firebase project**:

1. Create a Firebase project, enable Google Authentication and Firestore.
2. Copy `.env.example` to `.env.local` and fill in your `NEXT_PUBLIC_FIREBASE_*` values.
3. For server-side features (Upstox, Splitwise, AI credentials, screenshot import), generate a Firebase Admin private key and set `FIREBASE_ADMIN_*` env vars.
4. Deploy to any Node.js host (Vercel, Railway, Fly.io, etc.) or run locally.

See [docs/setup-modes.md](docs/setup-modes.md) and [docs/provider-guides.md](docs/provider-guides.md) for detailed env requirements.

Docker-based self-hosting is coming in launch preparation.

---

## BYOK (Bring Your Own Keys)

Nexus never bundles paid API keys. You bring your own for the features you want.

### AI Providers

| Provider | UI | Server | Env fallback |
|---|---|---|---|
| Gemini | Yes | Yes | `GEMINI_API_KEY` / `GOOGLE_API_KEY` |
| DeepSeek | Yes | Yes | — |
| OpenAI | Planned for UI | Yes | `OPENAI_API_KEY` |
| Anthropic | Planned for UI | Yes | `ANTHROPIC_API_KEY` |

User-provided AI keys are encrypted at rest with AES-256-GCM (`src/server/security/encryption.ts`).

### Pricing Data

| Key | Purpose | Optional? |
|---|---|---|
| `MASSIVE_API_KEY` | US equity pricing provider | Yes (Yahoo Finance fallback) |
| `ALPHA_VANTAGE_API_KEY` | US equity pricing fallback | Yes |

### Upstox

```
UPSTOX_CLIENT_ID
UPSTOX_CLIENT_SECRET
UPSTOX_REDIRECT_URI
CONNECTED_ACCOUNTS_ENCRYPTION_KEY
CONNECTED_ACCOUNTS_STATE_SECRET
```

See [docs/provider-guides.md](docs/provider-guides.md) for full setup.

### Splitwise

```
SPLITWISE_CLIENT_ID
SPLITWISE_CLIENT_SECRET
SPLITWISE_REDIRECT_URI
SPLITWISE_STATE_SECRET
INTEGRATION_TOKEN_ENCRYPTION_KEY
```

### Plaid

Plaid is **not implemented today**. It is under evaluation for a future BYOK-connected-accounts option.

---

## Self-Host vs Hosted

| | Self-Host | Hosted |
|---|---|---|
| Setup effort | Create Firebase project, configure env vars, deploy | Google sign-in, start tracking |
| Data storage | Your Firestore, your rules | Nexus-managed Firebase |
| Server features | Requires Firebase Admin credentials | Preconfigured |
| AI | Your API key | Your API key |
| Upstox / Splitwise | Your OAuth app credentials | Your OAuth app credentials |
| Cost to use | Self-host free forever | Hosted for the cost of a coffee |
| Control | Full — env, infra, keys, backups | Less — managed by operator |

---

## Privacy & Security

- **No tracking scripts.** No Google Analytics, no telemetry, no third-party beacons.
- **Server-only secrets.** `FIREBASE_ADMIN_*`, `UPSTOX_CLIENT_SECRET`, `SPLITWISE_CLIENT_SECRET`, `CONNECTED_ACCOUNTS_ENCRYPTION_KEY` and similar env vars are never exposed to the browser. `VITE_*` and `NEXT_PUBLIC_*` are browser-visible by design — keep them client-safe.
- **Encrypted user AI keys.** API keys are encrypted at rest with AES-256-GCM via `src/server/security/encryption.ts`. The encryption key is a server-only env var, never the user's key.
- **Firebase Admin token verification.** Server routes for connected accounts, Splitwise, AI credentials, and screenshot import verify Firebase ID tokens before serving requests.
- **Self-owned mode.** In self-owned Firebase mode, all data goes to your Firestore. The app's server never sees your data. The Firebase config is stored in your browser's localStorage, never sent to Nexus servers.
- **Secrets never committed.** `.env.local` is gitignored. `.env.example` contains placeholder values only.

See [docs/security-privacy.md](docs/security-privacy.md) for detailed credential handling.

---

## Scripts

```bash
npm run dev           # Development with Firebase
npm run dev:mock      # Mock mode (no Firebase)
npm run build
npm run lint          # TypeScript type-check
npm run test:run      # Run tests
```

---

## Documentation

- [Docs Index](docs/README.md)
- [Getting Started Guide](docs/getting-started.md)
- [Setup Modes](docs/setup-modes.md) — local dev, self-hosted, hosted
- [Hosted vs Self-Hosted](docs/hosted-vs-self-hosted.md)
- [Provider Guides](docs/provider-guides.md) — Firebase, Upstox, Splitwise, AI, pricing
- [Capability & Cost Posture](docs/capability-cost-posture.md)
- [Setup Diagnostics](docs/setup-diagnostics.md)
- [Security & Privacy](docs/security-privacy.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Product Strategy](docs/north-star-strategy.md)
- [Environment Template](.env.example)

---

## Roadmap

- **Docker hardening** — root Dockerfile + docker-compose for one-command self-host
- **Demo video / GIF** — replace placeholder with a real walkthrough
- **Plaid BYOK evaluation** — connected accounts for US/CAD financial institutions
- **Postgres / SQLite storage adapter** — first-class alternative to Firebase for self-hosters
- **Hosted billing / waitlist** — managed tier with minimal friction to support development

---

## Contributing

Contributing guidelines are coming soon.

---

## License

**License: TBD** — No LICENSE file is present in this repository. A decision on the open-source license is needed before the first public release.
