# Nexus Portfolio North Star and Strategy

## North Star

Nexus Portfolio is an open-source wealth workspace for households that want one calm, trustworthy place to understand money across countries, accounts, asset classes, and people.

The product should feel like it is built for users, by users:

- users own their data
- users can self-host or use a hosted version
- users can bring their own provider accounts and API keys
- core tracking should stay free or very low cost
- paid or quota-heavy capabilities should be optional, transparent, and user-configurable
- hosted convenience can be a product, but self-directed setup should stay first-class

Nexus should become the household finance cockpit: portfolio tracking, connected accounts, manual records, import flows, AI assistance, docs, setup guidance, and eventually mobile access.

## Product Principles

### User-Owned by Default

Users should be able to run Nexus with their own Firebase, broker credentials, pricing-provider keys, and integration keys. Any feature that depends on a paid service should expose a clear bring-your-own-key path before becoming hosted-only.

### Hosted for Ease

The hosted version exists for users who want Nexus without setup burden. Hosted Nexus can provide:

- managed deployment
- managed auth and storage
- guided onboarding
- safer default integrations
- product support
- docs and setup help
- opinionated defaults

Hosted convenience should not turn open-source Nexus into crippleware. The hosted product wins through reliability, polish, support, and reduced setup work.

### Seamless over Clever

Every setup flow should minimize context switching. If a user needs an external account or API key, Nexus should explain exactly why, where to get it, where to paste it, how to test it, and what remains private.

Preferred pattern:

1. Choose feature.
2. See cost/free status.
3. Connect provider or paste key.
4. Validate connection.
5. Import or sync.
6. Confirm result.

### Local-First Where Practical

Manual assets, exports, preference setup, and read-only views should work with as little hosted dependency as possible. Cloud sync and shared family access can require hosted infrastructure, but the design should not assume every user wants a managed account.

### Trust Before Automation

Financial automation should be explainable. Imports and connected accounts should show source, timestamp, provider, currency, and whether values are source-managed or user-managed. User overrides should be visible and reversible.

## Product Shape

### Core App

Current Nexus already covers:

- shared portfolio access with Google sign-in
- dashboard
- ledger
- manual assets and liabilities
- price refresh
- integrations settings
- Upstox connected accounts
- Splitwise integration
- AI settings and AI assistant foundation
- Google Drive sync/export surfaces

Future work should sharpen these into a coherent product journey rather than only adding features.

### Public Product Surface

Nexus needs product pages outside the authenticated app:

- landing page
- feature pages
- setup guides
- self-host guide
- hosted-version explanation
- docs index
- changelog
- privacy/security page
- support/help page

These pages should make Nexus feel understandable before sign-in. The landing page should sell the outcome: shared family wealth tracking across markets, with open-source ownership and hosted ease.

### Auth and Account Experience

Sign-in should feel deliberate, not abrupt. Public visitors should understand what happens before Google auth.

Target flow:

1. Land on public homepage.
2. Choose `Use Hosted Nexus`, `Self-Host Nexus`, or `View Docs`.
3. Hosted path explains account, data, and integrations.
4. User signs in.
5. Nexus creates or loads portfolio workspace.
6. User sees getting-started checklist.
7. User can add manual assets, invite household, connect provider, import file, or set API keys.

Sign-out should return to a friendly public state, not a dead end.

### Getting Started

The first signed-in session should provide a checklist:

- create or name household portfolio
- choose base currency
- add first manual asset
- connect optional provider
- import holdings
- invite household member
- configure price provider keys
- enable AI only if user wants it

Checklist should adapt. If env/provider setup is missing, show what is missing and whether user can continue without it.

### Docs as Product

Docs are part of the product, not just repo notes. They should support:

- hosted users
- self-hosters
- contributors
- provider setup
- security review
- troubleshooting
- migration between hosted and self-hosted

Docs can become a service layer:

- curated setup recipes
- provider-specific walkthroughs
- sample env files
- deployment guides
- support pages
- paid help or hosted onboarding later

Open-source docs should be useful. Hosted support can be more hands-on.

## Open Source and Business Model

### Open Source Promise

The repo should remain usable by someone technical enough to bring infrastructure and keys. Avoid locking basic portfolio tracking, manual records, imports, exports, and core dashboards behind hosted-only systems.

### Hosted Revenue

Hosted version can charge for convenience:

- managed hosting
- managed updates
- account recovery and support
- family sharing polish
- integration monitoring
- backups
- secure secret storage
- guided setup

### Support and Docs Revenue

Potential paid services:

- setup support
- migration from spreadsheets
- custom integration help
- portfolio import cleanup
- family onboarding
- private hosted instance setup
- documentation templates for providers

### Cost Boundaries

Each feature should declare cost posture:

- `free`: works without paid third-party services
- `bring-your-own-key`: user supplies provider credentials
- `hosted-managed`: hosted Nexus supplies or brokers infrastructure
- `paid-third-party`: user must pay external provider
- `unsupported`: not production-safe yet

This should show in docs and setup UI.

## Engineering Strategy

### Near-Term Architecture

Keep current Vite/React app moving while improving product shape:

- keep public pages and app shell in same frontend for now
- keep Express/Vercel API route compatibility
- keep Firebase as current auth/storage backbone
- centralize feature availability and setup status
- prefer provider adapters over provider-specific UI leaks
- keep secrets server-only
- keep user-supplied API keys encrypted at rest

### Setup Model

Nexus should support three setup modes:

- `local dev`: developer runs app and API locally
- `self-hosted`: user deploys their own instance and sets env vars
- `hosted`: official managed deployment

Each mode needs:

- env requirements
- optional envs
- missing-config diagnostics
- provider capability matrix
- setup health screen

### Feature Flags and Capability Checks

Features should not fail mysteriously when env vars are missing. Add a capability layer that answers:

- Is feature enabled?
- Is provider configured?
- Is user credential present?
- Is hosted fallback available?
- What action fixes missing setup?

This belongs in app settings and docs.

### Security Baselines

Financial app trust depends on boring security:

- server-only provider secrets
- encrypted user tokens and API keys
- no committed credentials
- clear data ownership language
- read-only integrations wherever possible
- audit-friendly sync runs
- least-privilege provider scopes
- simple export/delete story

### Testing Baselines

For strategy-aligned work, add tests around:

- auth state routing
- setup/capability detection
- provider availability messages
- import validation
- token/key storage behavior
- public page route parsing
- onboarding checklist state

## Mobile Strategy

Mobile should be planned in layers:

1. Responsive web app: make dashboard, ledger, settings, and onboarding usable on phones.
2. PWA: installable web app, icons, manifest, offline shell, safe caching.
3. Native wrapper: Capacitor or similar if notifications, biometric unlock, or store distribution becomes useful.
4. Native app: only if product needs deep mobile capabilities that web/PWA cannot provide well.

Do not start with native complexity. Start by making the existing product excellent on small screens.

## Sibling App Boundary

Another agent is working on canonical shared features with sibling app VibeBudget. This document intentionally avoids defining that shared feature contract.

For now, Nexus work should focus on:

- product north star
- open-source and hosted strategy
- onboarding and setup shape
- docs as product
- account/sign-in/sign-out experience
- mobile direction
- Nexus-specific finance setup and provider-cost posture

Defer shared canonical modules, shared schemas, shared UI primitives, and cross-app feature extraction to the sibling-app effort.

## Strategic Roadmap

### Phase 1: Product Baseline

Goal: make Nexus understandable and trustworthy before users enter the app.

Work:

- publish this north-star document
- add public landing route/page plan
- define docs information architecture
- document hosted vs self-hosted promise
- add capability/cost posture table
- clean README around setup modes

### Phase 2: Onboarding and Setup

Goal: first signed-in session gets user to value quickly.

Work:

- getting-started checklist
- portfolio naming and base currency setup
- missing env/provider diagnostics
- integration setup status cards
- clearer sign-in and sign-out states
- import-first and manual-first paths

### Phase 3: Docs and Support Surface

Goal: docs become product-grade.

Work:

- docs homepage
- self-host deployment guide
- hosted onboarding guide
- provider setup guides
- security/privacy page
- troubleshooting guide
- changelog

### Phase 4: Hosted Version Polish

Goal: hosted Nexus feels easier than self-hosting.

Work:

- hosted landing copy
- managed setup path
- support/contact page
- account settings
- data export/delete
- integration health monitoring
- backups story

### Phase 5: Mobile Readiness

Goal: Nexus works well from phone.

Work:

- responsive dashboard polish
- mobile ledger filters
- mobile settings and setup checklist
- PWA manifest and icons
- install prompts
- offline-safe app shell

## Decision Rules

Use these when choosing next work:

- If feature requires paid provider, add bring-your-own-key path.
- If setup requires docs, add in-app setup hints too.
- If hosted convenience adds value, keep self-host path viable.
- If data comes from external source, show source and sync time.
- If automation changes financial data, make it reviewable.
- If product flow feels fragmented, improve journey before adding another provider.
- If mobile breaks core flows, treat it as product debt.
- If change overlaps VibeBudget canonical work, pause and route to shared-feature owner.

## Immediate Next Plan

1. Add README link to this strategy document.
2. Create docs index with links to strategy, self-hosting, hosted setup, provider setup, and troubleshooting.
3. Add capability/cost posture matrix for current integrations.
4. Sketch onboarding checklist data model and UI states.
5. Improve public landing/sign-in/sign-out flow from current `PublicHome`.
6. Add first setup diagnostics endpoint or local capability helper.
7. Make mobile pass on public home, app header, dashboard, assets, and settings.
