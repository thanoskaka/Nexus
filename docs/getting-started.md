# Getting Started

Nexus Portfolio is built for user-owned portfolio tracking. Start with manual assets, then add providers only when they make your workflow easier.

## 1. Choose hosted or self-hosted

Choose **hosted** if you want the fastest start:

- No deployment work.
- Managed app updates.
- Managed auth infrastructure.
- Optional bring-your-own provider keys for broker, AI, Drive, and pricing features.

Choose **self-hosted** if you want more control:

- Your own deployment and Firebase project.
- Your own server environment variables.
- Direct control over provider keys, parser services, backups, and retention.

For a fuller comparison, see [Hosted vs Self-Hosted](hosted-vs-self-hosted.md). For technical setup modes and env requirements, see [Setup Modes](setup-modes.md).

## 2. Sign in

Open Nexus and sign in with the configured Firebase auth provider. Hosted Nexus has auth managed for you. Self-hosted Nexus needs Firebase client config and, for authenticated server features, Firebase Admin credentials.

If sign-in does not work, check:

- `NEXT_PUBLIC_FIREBASE_*` values for browser auth.
- `FIREBASE_ADMIN_*` values for authenticated server routes.
- Authorized domains in Firebase Authentication.

See [Troubleshooting](troubleshooting.md#firebase-auth) for common Firebase fixes.

## 3. Create and name your portfolio

After sign-in, create your first portfolio and give it a name you will recognize, such as:

- Personal Portfolio
- Family Net Worth
- Retirement Tracker
- India Holdings

If your setup uses a default portfolio, the default id comes from `NEXT_PUBLIC_FIREBASE_PORTFOLIO_ID`. You can still use a human-friendly name in the app.

## 4. Add your first manual asset

Manual assets are the best first step because they work without paid services or provider keys.

Add one holding with:

- Asset name.
- Asset class.
- Ticker or symbol, if available.
- Quantity.
- Currency.
- Purchase value or current value.
- Manual price, if market refresh is not configured.

Good first examples:

- A stock or ETF you already know.
- A mutual fund with its current value.
- Cash balance.
- A private asset tracked manually.

Manual assets, dashboard views, allocation, and basic portfolio metrics work without broker connections.

## 5. Connect an optional provider

Provider connections are optional. Add them only when you want sync, import, or better automation.

Common next steps:

- **Upstox** for India broker-connected holdings and India stock pricing.
- **Splitwise** for shared expense context.
- **CAS parser** for India mutual fund CAS PDF imports.
- **Google Drive** for Drive sync or backup/export workflows.
- **Pricing keys** for stronger price refresh coverage.

Each provider has its own setup requirements. See [Provider Guides](provider-guides.md).

## 6. Add an AI key only if wanted

AI features are optional. Nexus can track portfolios without AI.

Add an AI key if you want:

- Assistant-style portfolio questions.
- Screenshot import.
- AI-assisted parsing or summaries.

Supported setup paths:

- User-supplied AI key stored in Nexus settings, encrypted at rest.
- Server-side key for self-hosters using `GEMINI_API_KEY` or `GOOGLE_API_KEY`.

User-stored credentials require an encryption key and Firebase Admin support. See [Provider Guides](provider-guides.md#ai-credentials) and [Security and Privacy](security-privacy.md#credential-storage).

## 7. Import and export basics

Use import when you want to bring existing records into Nexus:

- Manual CSV import for assets and ledger-style data.
- CAS PDF import for India mutual fund statements, when parser support is configured.
- Screenshot import, when AI credentials are configured.

Use export when you want a local copy or backup:

- Export portfolio data before major changes.
- Keep periodic offline backups if you self-host.
- Use Google Drive sync/export when configured.

Nexus direction is user-owned data. Provider connections and AI features should make tracking easier, but the core portfolio should remain understandable and portable.

## 8. Verify your setup

After configuring environment variables, verify each capability works from the **Setup Health** card in **Settings > Integrations**. Each card has a **Test** button for configured items:

1. **Verify All** — runs all capability checks at once.
2. **Test per capability** — individual check per item.
3. **Re-test** — re-run after configuration changes.

Verification results show one of:

- **verified** (checkmark) — configuration looks correct.
- **not-configured** — missing env vars with names listed.
- **failed** — config is present but has an issue (e.g., missing `ALLOW_EXTERNAL_FALLBACK` for CAS parser).

Each verification result includes:
- **Last tested** timestamp.
- **Guidance** with missing env var names.
- **Fix this** area with specific error messages.
- **Docs link** to the relevant setup guide.

Backend verification is safe and lightweight:
- Only checks environment variable presence — no secrets are returned.
- No paid API calls are made for cost-limited providers (AI, Logo.dev, CAS cloud).
- Real connection tests (e.g., Upstox OAuth, Splitwise) require user authorization at runtime.
