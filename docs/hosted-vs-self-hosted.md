# Hosted vs Self-Hosted

Nexus Portfolio is open-source and user-owned first. Hosted mode is for convenience. Self-hosting is for control. Both modes should preserve the same product idea: your portfolio data should stay understandable, portable, and not locked behind a paid aggregator.

## What hosted gives

Hosted Nexus gives you the quickest path to a working portfolio.

You get:

- A managed Nexus deployment.
- Managed updates.
- Managed Firebase/auth setup when available.
- Preconfigured server environment for hosted-supported features.
- Less infrastructure work before you can add assets.

Hosted is best when you want to start tracking now and add provider keys only when you need them.

## What self-hosting gives

Self-hosting gives you direct control of the deployment and credentials.

You get:

- Your own Firebase project.
- Your own server environment variables.
- Your own deployment target, such as Vercel, Railway, Fly.io, or another Node.js host.
- Control over backups, retention, parser services, logs, and provider keys.
- The option to run companion services such as the CAS parser yourself.

Self-hosting is best when you want maximum control and are comfortable owning deployment work.

## Privacy and data ownership tradeoffs

Hosted mode reduces setup burden, but the hosted operator manages infrastructure. Depending on the feature, your portfolio records, encrypted provider tokens, logs, or diagnostic metadata may pass through hosted services.

Self-hosted mode gives you more control over where data lives, which providers receive requests, and how logs/backups are handled. You also become responsible for securing the deployment, rotating secrets, and keeping dependencies updated.

Important security model:

- Server-only secrets must stay on the server.
- Browser-visible values such as `NEXT_PUBLIC_*` and `VITE_*` are public by design.
- OAuth tokens and user API keys stored by Nexus should be encrypted at rest.
- AI, broker, Drive, and parser integrations may send data to those providers when used.

See [Security and Privacy](security-privacy.md) for credential handling and encryption notes.

## What users still need to bring

Even in hosted mode, some features may require your own provider account or key. Nexus does not aim to hide third-party costs behind a mandatory subscription.

Usually needed for hosted users:

- Provider accounts for optional integrations.
- AI API key if you want AI features and no hosted-managed AI key is available.
- Google Drive OAuth client ID for Drive sync/export.
- Broker developer credentials for connected account flows such as Upstox.
- CAS parser service URL or external CAS parser API key for CAS PDF imports.

Usually needed for self-hosters:

- Firebase project and Firebase Admin credentials.
- Deployment platform.
- `APP_BASE_URL` matching your deployed origin.
- Provider API keys for optional integrations.
- Encryption and OAuth state secrets.
- Optional CAS parser service.

See [Provider Guides](provider-guides.md) for practical setup notes.

## Recommended choice

Choose **hosted** if:

- You want the fastest start.
- You do not want to manage deployment infrastructure.
- You are comfortable using managed auth and hosted app infrastructure.
- You mainly need manual tracking, imports, exports, and optional BYO keys.

Choose **self-hosted** if:

- You want full control over where portfolio data and logs live.
- You want to manage your own Firebase project.
- You want to run your own CAS parser or keep provider traffic under your own deployment.
- You are comfortable maintaining env vars, secrets, deployments, and updates.

Choose **local development** if:

- You are contributing to Nexus.
- You want to test features before deploying.
- You want a private personal instance on your machine.

For a concrete setup checklist, start with [Getting Started](getting-started.md), then use [Setup Modes](setup-modes.md) for env requirements.
