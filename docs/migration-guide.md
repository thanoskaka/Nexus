# Migration Guide: Hosted to Self-Hosted

This guide documents the end-to-end flow for moving from Nexus Hosted to a
self-hosted setup.

## Overview

```
[Hosted]                  [Self-Hosted]
   │                           │
   ├─ Export portfolio         │
   │  (JSON + history CSVs)    │
   │                           │
   ├─ [Handoff] ───────────────┤
   │      Upload export into   │
   │      self-hosted instance │
   │                           │
   ├─ Verify                   │
   │  Compare asset count,     │
   │  totals, and dates        │
   │                           │
   ├─ Disconnect providers     │
   ├─ Delete hosted data  ─────┤
   │  (optional)               │
```

## Phase 1: Export

From your Nexus Hosted account, export your portfolio data:

1. Go to **Settings → Data Management**
2. Click **Export Portfolio** — downloads a JSON file with:
   - All assets with metadata (ticker, quantity, cost basis, currency)
   - Asset class definitions
   - Currency preferences (primary, secondary)
   - Price provider settings
   - Connected account metadata (provider, status, sync timestamps — **no secrets**)
   - Portfolio checklist preferences
3. Independently export historical data from each provider

### What is NOT included in the export

| Data | Why | Workaround |
|------|-----|-----------|
| OAuth tokens / API keys | Security boundary — never exported | Re-authenticate in self-hosted |
| Historical price snapshots | Provider-specific; large volume | Use historical import CSV |
| Provider sync logs | Operational detail | Re-sync in self-hosted |
| Firebase Auth user | Different Firebase project | Create new auth in self-hosted |

## Phase 2: Self-Hosted Setup

Before importing, set up your self-hosted instance:

1. Follow [Getting Started](getting-started.md) to deploy a self-hosted instance
2. Configure your own Firebase project with Auth and Firestore
3. Set up provider credentials (Upstox, Splitwise, AI, etc.)
4. Verify the instance is healthy via **Setup Health** diagnostics

## Phase 3: Import

Once your self-hosted instance is running:

1. Go to **Settings → Data Management → Import**
2. Upload the portfolio export JSON file
3. The import preview shows asset count, class count, currency settings
4. Choose **Merge** or **Replace**
5. Confirm the import

### Historical Data Import

For growth chart history, import CSV files:

1. Go to **Settings → Data Management → Import History**
2. Upload a CSV file with columns: `date`, `ticker`, `price`, `currency` (optional)
3. Preview the time series and confirm

**CSV Format:**

```csv
date,ticker,price,currency
2024-01-15,VTI,245.50,USD
2024-02-15,VTI,248.30,USD
2024-03-15,BND,72.10,USD
```

## Phase 4: Verification

After importing, verify the migration:

1. **Asset count**: Compare totals between hosted and self-hosted
2. **Portfolio totals**: Compare net worth and allocation breakdowns
3. **Connected accounts**: Re-authenticate each provider
4. **Historical data**: Verify growth chart data points
5. **Members**: Re-invite portfolio members

## Credential Boundary

| Credential | Hosted | Self-Hosted |
|------------|--------|-------------|
| Firebase Admin private key | Hosted operator | **Your** server env |
| Provider OAuth tokens | Encrypted in hosted Firestore | Encrypted in **your** Firestore |
| AI API keys | Encrypted per-user | Encrypted per-user |
| Firebase client config | Hosted project | **Your** project |

**No credentials cross the boundary during migration.** Each provider must be
re-authenticated in the self-hosted instance.

## Data Deletion

After verification, delete hosted data:

1. Go to **Settings → Workspace → Delete Account**
2. The modal shows: *"Cancel anytime, take an export of your data and delete
   from Nexus server."*
3. Confirm deletion — removes portfolio docs, connected accounts, AI credentials,
   onboarding state, workspace ownership, and Firebase Auth user
4. Deletion is irreversible

## Phase Plan (Follow-up)

### Phase 2 — Automation
- One-click migration bundle (export + instructions)
- Batch re-authentication flow for providers
- Migration status tracking

### Phase 3 — Cross-Instance Sync
- Live data forwarding during transition
- Incremental export (changes since last export)
- Automated verification script

### Phase 4 — Multi-Instance
- Migrate between self-hosted instances
- Merge two self-hosted portfolios
- Team/family migration orchestration
