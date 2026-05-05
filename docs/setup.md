# Nexus Portfolio — Local Setup Guide

## Prerequisites

- **Node.js 20+** and npm
- A **Firebase project** (only needed for real Firebase mode)
- For mock mode: nothing — just clone and run

---

## Quick Start (Mock Mode — No Firebase)

```bash
# 1. Clone and install
git clone <repo-url>
cd nexus-portfolio
npm install

# 2. Copy env template
cp .env.example .env.local

# 3. Set mock mode
# Edit .env.local and add:  VITE_MOCK_MODE="mock"
# Or just run:
npm run dev:mock
```

Open `http://localhost:6868` in your browser. You'll see a demo portfolio with realistic seed data — no Firebase account required.

**What works in mock mode:**
- Dashboard with portfolio overview, allocation charts, returns
- Assets ledger with filters and sorting
- Asset CRUD (add, edit, duplicate, delete)
- Portfolio selector
- Dark mode toggle
- Settings page

**What does NOT work in mock mode:**
- Google sign-in (pre-authenticated as demo user)
- Live price refresh (prices are static)
- Connected accounts (Upstox, Splitwise)
- Real data persistence (resets on page reload)

---

## Local with Real Firebase

### Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project (or use an existing one)
3. Enable **Authentication** → Sign-in method → **Google** provider
4. Enable **Cloud Firestore** → Create database (start in test mode, update rules later)

### Step 2: Register a Web App

In Project Settings → General → Your apps → **Add app** → **Web**:

Copy the Firebase config object — you'll use these values in `.env.local`.

### Step 3: Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Firebase values:

| Variable | Source |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Web App Config → `apiKey` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `{project_id}.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Your Firebase Project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `{project_id}.firebasestorage.app` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase Web App Config → `messagingSenderId` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase Web App Config → `appId` |

### Step 4: Authorize Localhost for Google Auth

In Firebase Console → Authentication → Settings → **Authorized domains**:

Add these domains:
- `localhost`
- `127.0.0.1`

Without this, Google sign-in will fail with `auth/unauthorized-domain`.

### Step 5: Start

```bash
npm run dev
```

Open `http://localhost:6868` and click **Sign in with Google**.

---

## Data Namespace

Nexus uses a data namespace concept to isolate data across environments:

| Environment | Default Namespace | Purpose |
|---|---|---|
| Local dev (`npm run dev`) | `local-dev` | Safe for development |
| Test (`vitest`) | `test` | Test isolation |
| Production | `prod` | Live data |

The namespace is resolved automatically:
1. `NEXT_PUBLIC_FIREBASE_DATA_NAMESPACE` env var (overrides everything)
2. `"test"` in test mode
3. `"local-dev"` in development
4. `"prod"` in production

Override for staging/preview:
```env
NEXT_PUBLIC_FIREBASE_DATA_NAMESPACE="staging"
FIREBASE_DATA_NAMESPACE="staging"
```

**Important:** Never set the namespace to `prod` in local or preview environments — you will accidentally read/write production data.

---

## Firebase Admin Setup (Optional)

Server-side features (connected accounts, AI chat) need Firebase Admin SDK:

1. Firebase Console → Project Settings → **Service accounts** → Generate new private key
2. Set these env vars:

```env
FIREBASE_ADMIN_PROJECT_ID="your-project-id"
FIREBASE_ADMIN_CLIENT_EMAIL="firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Note:** Firebase Admin is not required for basic local development. Only set this if you're working on connected accounts or AI features.

---

## Firestore Setup

### Indexes

No custom Firestore indexes are required for the current data model. The app uses:
- Collection group queries on `portfolios` (filtered by `memberEmails`)
- Direct document lookups by ID

### Security Rules

Deploy the included Firestore rules to enforce access control:

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules
```

If you don't have rules yet, start with test mode during development:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## Scripts Reference

| Script | Description |
|---|---|
| `npm run dev` | Normal development with Firebase |
| `npm run dev:mock` | Offline development with mock data (no Firebase) |
| `npm run start` | Production server (port 6868) |
| `npm run build` | Production build |
| `npm run lint` | TypeScript type checking |
| `npm run test` | Run tests in watch mode |
| `npm run test:run` | Run tests once |

---

## Troubleshooting

### "Missing Firebase environment variables" on startup

You're in real Firebase mode but haven't configured Firebase vars. Either:
- **Option A:** Fill in Firebase vars in `.env.local` (see Step 3 above)
- **Option B:** Set `VITE_MOCK_MODE=mock` in `.env.local` and use `npm run dev:mock`

### Google sign-in fails with "domain not authorized"

Add `localhost` to Firebase Authentication → Authorized domains.

### "Failed to fetch" for price refresh

Price endpoints (Yahoo, Massive, Alpha Vantage) work server-side. The local API server runs on port 6868. If you see fetch errors, check:
1. The server is running (`npm run dev` starts both the Vite dev server and API)
2. Network requests to `/api/finance*` are not blocked
