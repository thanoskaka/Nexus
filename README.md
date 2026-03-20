# Nexus Portfolio

A shared household portfolio tracker for India and Canada holdings. The app now uses Firebase Authentication and Firestore so multiple authorized members can sign in, collaborate, and see updates in real time.

## Stack

- React 19 + TypeScript
- Vite
- Firebase Auth + Firestore
- Express + local Yahoo finance proxy
- Tailwind CSS v4

## Run Locally

1. Install dependencies with `npm install`
2. Copy `.env.example` to `.env.local`
3. Fill in your Firebase config values
4. Start the app with `npm run dev`
5. Open the local URL shown in the terminal

## Environment Variables

These are the values you should add locally and in hosting providers like Vercel:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_PORTFOLIO_ID`
- `VITE_GOOGLE_CLIENT_ID` optional, only for Google Drive backup/export

This Vite app is configured to accept both `VITE_*` and `NEXT_PUBLIC_*` public variables, so the `NEXT_PUBLIC_*` names from Firebase/Next.js-style setups work here too.

## Firebase Behavior

- Users must sign in with Google before they can access the app
- Portfolio data is stored in `portfolios/{portfolioId}`
- The app listens with Firestore `onSnapshot`, so edits sync live across members
- Access is controlled by the `members` array on the portfolio document
- Owners can manage members from the Settings page

## Firestore Document Shape

```json
{
  "baseCurrency": "ORIGINAL",
  "members": [
    { "email": "owner@example.com", "role": "owner" },
    { "email": "partner@example.com", "role": "partner" }
  ],
  "memberEmails": ["owner@example.com", "partner@example.com"],
  "priceProviderSettings": {
    "alphaVantageApiKey": "",
    "finnhubApiKey": "",
    "primaryProvider": "yahoo",
    "secondaryProvider": "alphavantage"
  },
  "assets": [],
  "assetClasses": []
}
```

## Firestore Security Rules

Use these rules to ensure only authorized members can read or write the portfolio:

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() {
      return request.auth != null;
    }

    function isMember(data) {
      return isSignedIn() && request.auth.token.email in data.memberEmails;
    }

    match /portfolios/{portfolioId} {
      allow create: if isSignedIn();
      allow read: if isMember(resource.data);
      allow update, delete: if isMember(resource.data);
    }
  }
}
```

If you want only owners to manage member lists, move member changes behind a callable function or add stricter field-level validation in rules.

## Scripts

- `npm run dev`: start the local app server
- `npm run build`: build the app
- `npm run preview`: preview the production build
- `npm run lint`: TypeScript type check
