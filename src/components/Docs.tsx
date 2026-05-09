import React, { useState, useEffect } from 'react';
import { Wallet, Menu, X, ChevronRight, ExternalLink, CheckCircle2, AlertTriangle, BookOpen, ArrowLeft, Wand2 } from 'lucide-react';

type DocSection =
  | 'getting-started'
  | 'firebase'
  | 'bring-firebase'
  | 'development'
  | 'production'
  | 'api-keys'
  | 'integrations'
  | 'user-guide'
  | 'data-portability'
  | 'troubleshooting';

interface DocNavItem {
  id: DocSection;
  label: string;
}

const NAV_ITEMS: DocNavItem[] = [
  { id: 'getting-started', label: 'Getting Started' },
  { id: 'firebase', label: 'Firebase Setup' },
  { id: 'bring-firebase', label: 'Bring Your Own Firebase' },
  { id: 'development', label: 'Development Setup' },
  { id: 'production', label: 'Production Deployment' },
  { id: 'api-keys', label: 'AI Assistant Keys' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'user-guide', label: 'User Guide' },
  { id: 'data-portability', label: 'Data Portability' },
  { id: 'troubleshooting', label: 'Troubleshooting' },
];

function DocsNav({ active, onSelect, mobileOpen, onMobileToggle }: {
  active: DocSection;
  onSelect: (id: DocSection) => void;
  mobileOpen: boolean;
  onMobileToggle: () => void;
}) {
  const nav = (
    <nav className="space-y-1">
      {NAV_ITEMS.map((item) => {
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => { onSelect(item.id); onMobileToggle(); }}
            className={`w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-left transition-all ${
              isActive
                ? 'bg-[#00875A]/10 text-[#00875A] dark:bg-[#00875A]/20 dark:text-emerald-300'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            <ChevronRight className={`h-3.5 w-3.5 shrink-0 transition-opacity ${isActive ? 'opacity-100' : 'opacity-0'}`} />
            {item.label}
          </button>
        );
      })}
    </nav>
  );

  return (
    <>
      <div className="hidden lg:block w-64 shrink-0">
        <div className="sticky top-24 space-y-1">
          <div className="flex items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <BookOpen className="h-3.5 w-3.5" />
            Documentation
          </div>
          {nav}
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onMobileToggle} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 p-4 pt-6 shadow-xl overflow-y-auto">
            <div className="flex items-center justify-between mb-6 px-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Navigation</span>
              <button type="button" onClick={onMobileToggle} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            {nav}
          </div>
        </div>
      )}
    </>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-sm font-mono text-slate-800 dark:text-slate-200">
      {children}
    </code>
  );
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <pre className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-mono text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
      {children}
    </pre>
  );
}

function EnvTable({ rows }: { rows: Array<{ var: string; description: string; required?: boolean }> }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-900">
            <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Variable</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Description</th>
            <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">Required</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {rows.map((row) => (
            <tr key={row.var} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
              <td className="px-4 py-3 font-mono text-xs text-slate-800 dark:text-slate-200">{row.var}</td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{row.description}</td>
              <td className="px-4 py-3 text-right">
                {row.required ? (
                  <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">Yes</span>
                ) : (
                  <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">Optional</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Checklist({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-400">
          <CheckCircle2 className="h-4 w-4 mt-0.5 text-[#00875A] shrink-0" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200">
      {children}
    </div>
  );
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
      <div className="flex items-center gap-2 font-semibold mb-1">
        <AlertTriangle className="h-4 w-4" />
        Warning
      </div>
      {children}
    </div>
  );
}

const sectionContent: Record<DocSection, { title: string; content: React.ReactNode }> = {
  'getting-started': {
    title: 'Getting Started',
    content: (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">What is Nexus?</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Nexus is a shared wealth tracker built for families managing money across India and Canada.
            Whether you have mutual funds in Mumbai and a TFSA in Toronto, Nexus shows everything in one
            place — in INR, CAD, and USD side by side. Invite your partner or family members so everyone
            sees the same picture.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Who is it for?</h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Families, couples, and NRIs who want one honest view of their total wealth across both countries —
            without spreadsheets.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Two ways to use Nexus</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
              <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Nexus Hosted</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                The fastest way to start. Visit{' '}
                <a href="https://nexus-phi-inky.vercel.app" target="_blank" rel="noopener noreferrer" className="text-[#00875A] hover:underline inline-flex items-center gap-1">
                  nexus-phi-inky.vercel.app <ExternalLink className="h-3 w-3" />
                </a>
                , sign in with Google, and you are tracking. Zero setup, no technical knowledge required.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
              <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Bring Your Own Firebase</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Connect your own free Google Firebase account and your data never touches Nexus servers —
                it lives entirely in your own storage. Great for families who want full data ownership.
                See the <strong>Bring Your Own Firebase</strong> guide to set this up in about 10 minutes.
              </p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">What you can track</h3>
          <ul className="list-disc list-inside space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
            <li>Indian stocks, mutual funds, and ETFs (live prices from NSE/BSE)</li>
            <li>Canadian and U.S. stocks and ETFs (live prices)</li>
            <li>Gold, fixed deposits, PPF, NPS, and EPF</li>
            <li>Real estate and other manual assets</li>
            <li>Loans and liabilities (to see your net worth, not just gross)</li>
            <li>Bank balances in INR, CAD, and USD</li>
            <li>Crypto holdings</li>
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">What Nexus does for you</h3>
          <Checklist items={[
            'Shows your total net worth in your chosen currency, updated with live prices',
            'Breaks down wealth by country, asset type, and family member',
            'Lets multiple family members share one portfolio — each with their own login',
            'Imports your Indian mutual fund holdings from a CAS PDF (a statement from CAMS or Karvy)',
            'Imports holdings from a broker screenshot using AI',
            'Auto-syncs your Upstox stock holdings (read-only — Nexus cannot place trades)',
            'Lets you ask the AI assistant questions about your portfolio in plain English',
            'Backs up your data to Google Drive and lets you export it anytime',
          ]} />
        </div>
      </div>
    ),
  },

  'firebase': {
    title: 'Firebase Setup',
    content: (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Firebase Project Creation</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
            Nexus uses Firebase for authentication, cloud Firestore database, and server-side admin operations.
            Follow these steps to create and configure your Firebase project.
          </p>
          <Checklist items={[
            <>Go to the <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-[#00875A] hover:underline">Firebase Console</a> and create a new project (or reuse an existing one).</>,
            'Enable Firestore Database in your project. Choose a location and start in test mode (you will tighten security later).',
            'Register a web app in Project Settings > General > Your apps > Add app. Copy the Firebase config values.',
            'Enable Authentication > Sign-in method > Google provider. You will need a support email for the consent screen.',
          ]} />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Firebase Config (Client)</h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
            Set these as <Code>NEXT_PUBLIC_*</Code> environment variables. These are safe to expose to the browser.
          </p>
          <EnvTable rows={[
            { var: 'NEXT_PUBLIC_FIREBASE_API_KEY', description: 'Web API key from Firebase project settings', required: true },
            { var: 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', description: 'Usually <project>.firebaseapp.com', required: true },
            { var: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID', description: 'Firebase project ID', required: true },
            { var: 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', description: '<project>.appspot.com', required: true },
            { var: 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', description: 'Sender ID from Firebase settings', required: true },
            { var: 'NEXT_PUBLIC_FIREBASE_APP_ID', description: 'Web app ID from Firebase settings', required: true },
            { var: 'NEXT_PUBLIC_FIREBASE_PORTFOLIO_ID', description: 'Firestore document ID for portfolio data. Defaults to "default-portfolio".', required: false },
          ]} />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Firebase Auth \u2014 Google Provider</h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
            In Firebase Console &gt; Authentication &gt; Sign-in method, enable the Google provider.
            Add a public-facing support email for the OAuth consent screen.
          </p>
          <Tip>Nexus uses <Code>signInWithPopup</Code> with <Code>signInWithRedirect</Code> fallback if the popup is blocked.</Tip>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Authorized Domains</h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
            In Firebase Console &gt; Authentication &gt; Settings &gt; Authorized domains, add every domain that will host Nexus:
          </p>
          <Checklist items={[
            <><Code>localhost</Code> \u2014 for local development</>,
            <><Code>127.0.0.1</Code> \u2014 for local development via IP</>,
            <>Your production domain (e.g., <Code>nexus-phi-inky.vercel.app</Code>)</>,
            'Any preview/Vercel deployment domains',
          ]} />
          <Warning>If you see &quot;unauthorized-domain&quot; in the sign-in popup, the current domain is not listed in Authorized domains.</Warning>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Firestore Database Setup</h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
            Nexus stores portfolio data in Firestore. The data structure uses the portfolio ID as a document
            namespace, allowing multiple independent portfolios under the same project.
          </p>
          <Checklist items={[
            'Create Firestore database in your Firebase project (choose a location).',
            'Start in test mode for development, then set up proper security rules for production.',
            <>The <Code>NEXT_PUBLIC_FIREBASE_PORTFOLIO_ID</Code> variable controls which document namespace is used.</>,
          ]} />
          <Tip>Data namespace strategy: Each portfolio is a separate document in the <Code>portfolios</Code> collection. This allows running multiple independent Nexus instances (e.g., personal + family) from the same Firebase project.</Tip>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Firebase Admin Service Account</h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
            Server-side features (connected accounts, Splitwise, AI credentials) verify Firebase ID tokens
            using <Code>firebase-admin</Code>. You need a service account for this.
          </p>
          <Checklist items={[
            'In Firebase Console > Project Settings > Service Accounts, click "Generate New Private Key".',
            <>Download the JSON file. It contains <Code>project_id</Code>, <Code>client_email</Code>, and <Code>private_key</Code>.</>,
            <>Set the private key as a single-line string with <Code>\n</Code> for line breaks.</>,
            'Store these as server-only environment variables (never expose to the client).',
          ]} />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Firebase Admin Environment Variables</h3>
          <EnvTable rows={[
            { var: 'FIREBASE_ADMIN_PROJECT_ID', description: 'Service account project ID', required: true },
            { var: 'FIREBASE_ADMIN_CLIENT_EMAIL', description: 'Service account client email', required: true },
            { var: 'FIREBASE_ADMIN_PRIVATE_KEY', description: 'Service account private key (with \\n for line breaks)', required: true },
          ]} />
          <Warning>
            Private key formatting: The raw key from the JSON has literal newlines. When stored in <Code>.env</Code>, replace newlines with <Code>\n</Code>.
            Example: <Code>{'FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n"'}</Code>
          </Warning>
          <Tip>On Google Cloud Platform (GCP) with workload identity, default credentials can be used instead of a service account file.</Tip>
        </div>
      </div>
    ),
  },

  'bring-firebase': {
    title: 'Bring Your Own Firebase',
    content: (
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Bring Your Own Firebase</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
            Nexus lets you use your own Firebase project for authentication and data storage. Your portfolio
            data never touches Nexus infrastructure — it lives entirely in your Firebase project.
            Follow these steps after signing in to Nexus for the first time.
          </p>
          <Tip>This is recommended if you want full data ownership, multi-family isolation, or plan to self-host the backend later.</Tip>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#00875A] text-white text-sm font-bold mr-2">1</span>
            Create a Firebase Project
          </h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
            Go to <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-[#00875A] hover:underline font-medium">console.firebase.google.com</a> and create a new project.
            Give it a name (e.g. <Code>nexus-myfamily</Code>). Google Analytics is optional — you can disable it.
          </p>
          <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-6 text-center text-slate-400 dark:text-slate-500 text-sm mb-3">
            📸 Screenshot: Firebase Console → "Add project" → project name field
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#00875A] text-white text-sm font-bold mr-2">2</span>
            Register a Web App & Copy Config
          </h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
            In your Firebase project, go to <strong>Project Settings → General → Your apps</strong> and click the web icon (<Code>&lt;/&gt;</Code>) to add a web app.
            After registering, Firebase shows you a config object — copy all 6 values.
          </p>
          <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-6 text-center text-slate-400 dark:text-slate-500 text-sm mb-3">
            📸 Screenshot: Project Settings → Your apps → web config block with apiKey, authDomain, projectId etc.
          </div>
          <CodeBlock>{`const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};`}</CodeBlock>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">You will paste these values into Nexus in Step 5.</p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#00875A] text-white text-sm font-bold mr-2">3</span>
            Enable Google Sign-in
          </h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
            Go to <strong>Authentication → Sign-in method</strong> and enable the <strong>Google</strong> provider.
            Enter a public-facing project name and a support email, then save.
          </p>
          <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-6 text-center text-slate-400 dark:text-slate-500 text-sm mb-3">
            📸 Screenshot: Authentication → Sign-in method → Google toggle enabled → support email field
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#00875A] text-white text-sm font-bold mr-2">4</span>
            Add Authorized Domain
          </h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
            Go to <strong>Authentication → Settings → Authorized domains</strong> and add the domain where Nexus is hosted.
          </p>
          <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-6 text-center text-slate-400 dark:text-slate-500 text-sm mb-3">
            📸 Screenshot: Authentication → Settings → Authorized domains → "Add domain" with nexus-phi-inky.vercel.app
          </div>
          <Checklist items={[
            <><Code>nexus-phi-inky.vercel.app</Code> — if using the hosted Nexus deployment</>,
            <><Code>localhost</Code> — for local testing</>,
            <>Your own domain — if self-hosting Nexus</>,
          ]} />
          <Warning>Missing this step causes "auth/unauthorized-domain" when signing in. Always add the exact domain you are using.</Warning>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#00875A] text-white text-sm font-bold mr-2">5</span>
            Create Firestore Database
          </h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
            Go to <strong>Databases & Storage → Firestore</strong> and click <strong>Create database</strong>.
            Choose a region close to you. Start in <strong>production mode</strong> (you will add rules in the next step).
          </p>
          <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-6 text-center text-slate-400 dark:text-slate-500 text-sm mb-3">
            📸 Screenshot: Firestore → Create database → region selector → production mode option
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#00875A] text-white text-sm font-bold mr-2">6</span>
            Set Firestore Security Rules
          </h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
            In Firestore, go to the <strong>Rules</strong> tab and replace the default rules with the following.
            This allows any signed-in Google user to read and write their own data.
          </p>
          <CodeBlock>{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}`}</CodeBlock>
          <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-6 text-center text-slate-400 dark:text-slate-500 text-sm my-3">
            📸 Screenshot: Firestore → Rules tab → rules editor → Publish button
          </div>
          <Tip>Rules take effect within ~60 seconds of publishing. If you see "Access denied by Firestore rules" immediately after publishing, wait a moment and reload.</Tip>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#00875A] text-white text-sm font-bold mr-2">7</span>
            Enter Config in Nexus
          </h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
            Back in Nexus, after signing in with Google, you are asked to choose your workspace mode.
            Select <strong>Bring Your Own Firebase</strong> and paste the 6 config values from Step 2.
          </p>
          <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-6 text-center text-slate-400 dark:text-slate-500 text-sm mb-3">
            📸 Screenshot: Nexus → workspace ownership screen → "Bring Your Own Firebase" selected → config fields filled in
          </div>
          <Checklist items={[
            'Paste apiKey from Firebase config',
            'Paste authDomain (usually your-project.firebaseapp.com)',
            'Paste projectId',
            'Paste storageBucket',
            'Paste messagingSenderId',
            'Paste appId',
          ]} />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#00875A] text-white text-sm font-bold mr-2">8</span>
            Sign in to Your Firebase & Done
          </h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
            Nexus will initialize your Firebase project and prompt you to sign in with Google one more time —
            this time against <em>your</em> Firebase project. After sign-in, your portfolio data lives entirely
            in your own Firestore database.
          </p>
          <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-6 text-center text-slate-400 dark:text-slate-500 text-sm mb-3">
            📸 Screenshot: Nexus dashboard loaded with user's own Firebase active
          </div>
          <Tip>Your config is stored in your browser's localStorage. If you clear browser data, you will need to re-enter the config. Nexus never sends your Firebase credentials to its servers.</Tip>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Troubleshooting</h3>
          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
              <p className="font-medium text-slate-800 dark:text-slate-200 text-sm mb-1"><Code>auth/configuration-not-found</Code></p>
              <p className="text-slate-600 dark:text-slate-400 text-sm">One or more config values are wrong or missing. Double-check all 6 fields from Project Settings.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
              <p className="font-medium text-slate-800 dark:text-slate-200 text-sm mb-1"><Code>auth/unauthorized-domain</Code></p>
              <p className="text-slate-600 dark:text-slate-400 text-sm">The current domain is not in Authorized domains. Add it in Authentication → Settings → Authorized domains.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
              <p className="font-medium text-slate-800 dark:text-slate-200 text-sm mb-1">Firestore database does not exist</p>
              <p className="text-slate-600 dark:text-slate-400 text-sm">You skipped Step 5. Go to Firebase Console → Databases & Storage → Firestore → Create database.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
              <p className="font-medium text-slate-800 dark:text-slate-200 text-sm mb-1">Access denied by Firestore rules</p>
              <p className="text-slate-600 dark:text-slate-400 text-sm">Rules not published yet or still propagating. Publish the rules from Step 6 and wait up to 60 seconds.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
              <p className="font-medium text-slate-800 dark:text-slate-200 text-sm mb-1">Stuck on "Sign in to your Firebase" screen</p>
              <p className="text-slate-600 dark:text-slate-400 text-sm">Your stored config may be invalid. Open browser DevTools → Console → run <Code>localStorage.clear()</Code> then reload.</p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">What Does Not Work in Self-Owned Mode</h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-3">
            Server-side features (AI chat, Upstox, Splitwise, CAS import) use the hosted Nexus backend and cannot
            verify tokens from your own Firebase project. These features return errors in self-owned mode.
          </p>
          <Tip>To use all server features with your own Firebase, self-host the full Nexus backend with your Firebase Admin credentials. See the <strong>Firebase Setup</strong> doc.</Tip>
        </div>
      </div>
    ),
  },

  'development': {
    title: 'Development Setup',
    content: (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Development Mode with Firebase</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
            To run Nexus with real Firebase integration in development, set up your Firebase credentials in <Code>.env.local</Code>.
          </p>
          <Checklist items={[
            <>Copy <Code>.env.example</Code> to <Code>.env.local</Code>.</>,
            <>Fill in all <Code>NEXT_PUBLIC_FIREBASE_*</Code> values from your Firebase project.</>,
            <>Fill in <Code>FIREBASE_ADMIN_*</Code> values for server-side features (connected accounts, AI, Splitwise).</>,
            <>Set <Code>APP_BASE_URL=http://localhost:6868</Code>.</>,
            <>Ensure <Code>localhost</Code> and <Code>127.0.0.1</Code> are in Firebase Authorized domains.</>,
            <>Run <Code>npm run dev</Code> to start the dev server on port 6868.</>,
          ]} />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Full .env.local Reference</h3>
          <EnvTable rows={[
            { var: 'NEXT_PUBLIC_FIREBASE_API_KEY', description: 'Firebase Web API key', required: true },
            { var: 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', description: 'Firebase auth domain', required: true },
            { var: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID', description: 'Firebase project ID', required: true },
            { var: 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', description: 'Firebase storage bucket', required: true },
            { var: 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', description: 'Firebase sender ID', required: true },
            { var: 'NEXT_PUBLIC_FIREBASE_APP_ID', description: 'Firebase app ID', required: true },
            { var: 'NEXT_PUBLIC_FIREBASE_PORTFOLIO_ID', description: 'Portfolio namespace (default: default-portfolio)', required: false },
            { var: 'APP_BASE_URL', description: 'App URL for OAuth callbacks (http://localhost:6868)', required: true },
            { var: 'FIREBASE_ADMIN_PROJECT_ID', description: 'Firebase Admin project ID', required: false },
            { var: 'FIREBASE_ADMIN_CLIENT_EMAIL', description: 'Firebase Admin client email', required: false },
            { var: 'FIREBASE_ADMIN_PRIVATE_KEY', description: 'Firebase Admin private key', required: false },
            { var: 'MASSIVE_API_KEY', description: 'Massive U.S. close-price API key (server-only)', required: false },
            { var: 'FINNHUB_API_KEY', description: 'Finnhub API key (server-only)', required: false },
            { var: 'ALPHA_VANTAGE_API_KEY', description: 'Alpha Vantage API key (server-only)', required: false },
            { var: 'LOGO_DEV_SECRET_KEY', description: 'Logo.dev API secret key (server-only)', required: false },
            { var: 'CAS_PARSER_API_KEY', description: 'CAS parser service API key', required: false },
            { var: 'CAS_PARSER_SERVICE_URL', description: 'Self-hosted CAS parser service URL', required: false },
            { var: 'VITE_GOOGLE_CLIENT_ID', description: 'Google OAuth client ID for Drive sync', required: false },
            { var: 'VITE_LOGO_DEV_PUBLISHABLE_KEY', description: 'Logo.dev publishable key (client-side)', required: false },
          ]} />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Useful Scripts</h3>
          <div className="space-y-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
              <CodeBlock>{`npm run dev      # Start dev server on port 6868
npm run build    # Production build
npm run lint     # TypeScript type checking (tsc --noEmit)
npm run test     # Run tests in watch mode
npm run test:run # Run tests once`}</CodeBlock>
            </div>
          </div>
        </div>
      </div>
    ),
  },

  'production': {
    title: 'Production Deployment',
    content: (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Production Deployment</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
            Nexus can be deployed on any Node.js host. The most common setup is on Vercel, using a Vite build with an Express API server
            running as a serverless function.
          </p>
          <Checklist items={[
            'Push your repository to GitHub (or another git provider).',
            'Import the repository in Vercel Dashboard.',
            'Set the following Vercel environment variables (all required for production Firebase).',
            <>Deploy. The build command is <Code>npm run build</Code> and output is the <Code>dist</Code> directory.</>,
            <>Configure Rewrites: Vercel rewrites <Code>/api/integrations/splitwise/*</Code> to <Code>/api/splitwise/*</Code> via <Code>vercel.json</Code>.</>,
          ]} />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Vercel Environment Variables</h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
            Set these in Vercel Project &gt; Settings &gt; Environment Variables:
          </p>
          <EnvTable rows={[
            { var: 'NEXT_PUBLIC_FIREBASE_API_KEY', description: 'Firebase Web API key', required: true },
            { var: 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', description: 'Firebase auth domain', required: true },
            { var: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID', description: 'Firebase project ID', required: true },
            { var: 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', description: 'Firebase storage bucket', required: true },
            { var: 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', description: 'Firebase sender ID', required: true },
            { var: 'NEXT_PUBLIC_FIREBASE_APP_ID', description: 'Firebase app ID', required: true },
            { var: 'NEXT_PUBLIC_FIREBASE_PORTFOLIO_ID', description: 'Portfolio namespace', required: false },
            { var: 'APP_BASE_URL', description: 'Production URL (e.g., https://your-app.vercel.app)', required: true },
            { var: 'FIREBASE_ADMIN_PROJECT_ID', description: 'Firebase Admin project ID', required: false },
            { var: 'FIREBASE_ADMIN_CLIENT_EMAIL', description: 'Firebase Admin client email', required: false },
            { var: 'FIREBASE_ADMIN_PRIVATE_KEY', description: 'Firebase Admin private key', required: false },
          ]} />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Preview vs Production Safety</h3>
          <Warning>
            Vercel automatically creates preview deployments for every PR. If your Firebase project has
            authorized domains set to allow all Vercel preview domains (*.vercel.app), these previews can
            access the same production Firebase data.
          </Warning>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mt-3">
            To keep preview environments isolated, consider:
          </p>
          <Checklist items={[
            'Using separate Firebase projects for production and development.',
            <>Using the <Code>NEXT_PUBLIC_FIREBASE_PORTFOLIO_ID</Code> namespace to isolate preview data.</>,
            'Setting preview environment variables to point to a dev Firebase project.',
          ]} />
        </div>
      </div>
    ),
  },

  'api-keys': {
    title: 'AI Assistant Keys',
    content: (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Setting up your AI assistant</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            The AI assistant lets you ask questions about your portfolio in plain English — things like
            "how concentrated are we in equities?" or "what percentage is in India?". To use it, you
            need a free key from one of the two supported AI providers below. The whole setup takes
            about 2 minutes.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Option 1 — Gemini (Google AI)</h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
            Gemini is Google&apos;s AI. The free tier is generous and works well for portfolio questions.
          </p>
          <Checklist items={[
            <>Go to <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-[#00875A] hover:underline">Google AI Studio <ExternalLink className="h-3 w-3 inline" /></a> and sign in with your Google account.</>,
            'Click "Get API Key" → "Create API key". Copy the key.',
            'In Nexus, go to Settings → Pricing → AI Assistant.',
            'Select "Gemini" as the provider, paste your key, and save.',
          ]} />
          <Tip>Gemini 2.5 Flash is the recommended model — it is fast and free for personal use.</Tip>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Option 2 — DeepSeek</h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
            DeepSeek is an alternative AI that works equally well. Some users prefer it for more detailed reasoning.
          </p>
          <Checklist items={[
            <>Go to <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener noreferrer" className="text-[#00875A] hover:underline">platform.deepseek.com <ExternalLink className="h-3 w-3 inline" /></a> and create a free account.</>,
            'Generate an API key from the dashboard. Copy it.',
            'In Nexus, go to Settings → Pricing → AI Assistant.',
            'Select "DeepSeek" as the provider, paste your key, and save.',
          ]} />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Stock price data</h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            You do not need to set up anything for stock prices. Nexus automatically fetches prices
            for Indian stocks (NSE/BSE), Indian mutual funds (AMFI), Canadian and U.S. equities, and gold.
            Price data works out of the box on Nexus Hosted.
          </p>
          <Tip>If you are running your own Nexus server and want to use premium price data providers, see the Firebase Setup and Vercel Deployment docs for advanced server configuration.</Tip>
        </div>
      </div>
    ),
  },

  'integrations': {
    title: 'Integrations',
    content: (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Connecting other services</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Nexus connects to a few external services to save you time. All integrations work out of the box
            on Nexus Hosted \u2014 just connect them from Settings.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Upstox \u2014 auto-import your Indian stocks</h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
            If you have an Upstox account, Nexus can pull your current stock holdings automatically.
            This is <strong>read-only</strong> \u2014 Nexus can see your holdings but cannot place, modify, or
            cancel any trades.
          </p>
          <Checklist items={[
            'Go to Settings \u2192 Integrations.',
            'Click "Connect Upstox" and sign in to your Upstox account.',
            'Nexus imports your current holdings. Click Refresh any time to sync the latest.',
          ]} />
          <Tip>On Nexus Hosted, Upstox is ready to connect immediately. If you are running your own Nexus server, ask your server admin to configure the Upstox credentials first.</Tip>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Splitwise \u2014 see shared expenses alongside your portfolio</h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
            Connect your Splitwise account to see your shared expense balances (what you are owed or owe)
            right alongside your portfolio. Useful for families or housemates who split costs.
          </p>
          <Checklist items={[
            'Go to Settings \u2192 Integrations.',
            'Click "Connect Splitwise" and approve access.',
            'Your group balances appear in the Integrations panel.',
          ]} />
          <Tip>Like Upstox, Splitwise works out of the box on Nexus Hosted. Self-hosters need server-side configuration \u2014 see the Vercel Deployment docs.</Tip>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Google Drive \u2014 back up your portfolio data</h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
            Save a copy of your portfolio to your own Google Drive. This gives you a personal backup
            you can restore from at any time, and makes it easy to move data between devices or Nexus setups.
          </p>
          <Checklist items={[
            'Go to Settings \u2192 Data \u2192 Google Drive Sync.',
            'Click "Connect Google Drive" and grant access.',
            'Use "Save to Drive" to backup, or "Restore from Drive" to bring data back.',
          ]} />
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-2">
            Nexus only accesses files it creates \u2014 it cannot see any other files in your Drive.
          </p>
        </div>
      </div>
    ),
  },

  'user-guide': {
    title: 'User Guide',
    content: (
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">How to use Nexus</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            A walkthrough of the main things you will do in Nexus \u2014 from signing in for the first time
            to importing your holdings and asking the AI about your portfolio.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#00875A] text-white text-xs font-bold mr-2">1</span>
            Sign in &amp; first-time setup
          </h3>
          <Checklist items={[
            'Open Nexus and click "Sign in with Google". Use any Google account.',
            'On your first visit, you will be asked how you want to store your data \u2014 choose "Nexus Hosted" for zero setup, or "Bring Your Own Firebase" for full data ownership.',
            "That's it. Your portfolio workspace is ready.",
          ]} />
          <Tip>If you were invited to a family portfolio, just sign in \u2014 your access is granted automatically based on your Google email.</Tip>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#00875A] text-white text-xs font-bold mr-2">2</span>
            Your dashboard
          </h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
            The dashboard is your bird&apos;s-eye view. It shows:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-sm text-slate-600 dark:text-slate-400 mb-3">
            <li><strong>Total net worth</strong> \u2014 all assets minus all liabilities, in your preferred currency</li>
            <li><strong>Allocation chart</strong> \u2014 how your money is spread across asset types (stocks, mutual funds, gold, etc.)</li>
            <li><strong>By family member</strong> \u2014 how much each person owns</li>
            <li><strong>By country</strong> \u2014 India vs Canada breakdown</li>
          </ul>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Use the <strong>All / India / Canada</strong> filter at the top to focus on one geography at a time.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#00875A] text-white text-xs font-bold mr-2">3</span>
            Adding an asset
          </h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
            Click <strong>Add Asset</strong> (on the dashboard or the Assets page) and fill in the form:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-sm text-slate-600 dark:text-slate-400 mb-3">
            <li><strong>Name</strong> \u2014 whatever you want to call it (e.g., "HDFC Mid-Cap Fund")</li>
            <li><strong>Owner</strong> \u2014 which family member holds this asset</li>
            <li><strong>Asset class</strong> \u2014 Mutual Fund, Stock, Gold, Real Estate, etc.</li>
            <li><strong>Quantity &amp; cost</strong> \u2014 how many units and what you paid</li>
            <li><strong>Ticker (optional)</strong> \u2014 the exchange symbol for live prices, e.g. <Code>NSE:RELIANCE</Code> or <Code>TSX:XIU</Code>. Leave blank to enter prices manually.</li>
          </ul>
          <Tip>Not sure of the ticker? Leave it blank for now. You can always add it later, and Nexus will start fetching live prices from that point.</Tip>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#00875A] text-white text-xs font-bold mr-2">4</span>
            Inviting family members
          </h3>
          <Checklist items={[
            'Go to Settings \u2192 Access.',
            'Enter their Google email address and click Invite.',
            'They sign in with that Google account \u2014 and your shared portfolio loads automatically.',
          ]} />
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-2">
            Each member gets their own login. Everyone sees the same data. You stay in control as the owner.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#00875A] text-white text-xs font-bold mr-2">5</span>
            Refreshing prices
          </h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-2">
            Click the <strong>refresh icon</strong> in the top bar (or go to Settings \u2192 Pricing \u2192 Refresh All Prices).
            Nexus fetches the latest prices for every asset that has a ticker.
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm text-slate-600 dark:text-slate-400">
            <li><strong>Auto-updated:</strong> Indian stocks (NSE/BSE), Indian mutual funds (AMFI NAV), Canadian and U.S. stocks</li>
            <li><strong>Manual:</strong> Real estate, fixed deposits, bank balances, and anything without a ticker \u2014 you update these yourself</li>
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#00875A] text-white text-xs font-bold mr-2">6</span>
            Import from a broker screenshot
          </h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-2">
            Take a screenshot of your broker app or portfolio page, then go to <strong>Settings \u2192 Data \u2192 Screenshot Import</strong>.
            Upload the image and the AI reads the holdings, quantities, and prices for you.
            Review the results and confirm which assets to add.
          </p>
          <Tip>This requires an AI assistant key (Gemini or DeepSeek). See the AI Keys section to set one up \u2014 it takes about 2 minutes and is free.</Tip>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#00875A] text-white text-xs font-bold mr-2">7</span>
            Import from a CAS PDF
          </h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-2">
            A <strong>CAS PDF</strong> (Consolidated Account Statement) is a single document listing all your Indian
            mutual fund holdings across all fund houses. You can download it from{' '}
            <a href="https://www.camsonline.com/InvestorServices/MF_PORTFOLIO_CAS.aspx" target="_blank" rel="noopener noreferrer" className="text-[#00875A] hover:underline">CAMS</a>
            {' '}or{' '}
            <a href="https://mfs.kfintech.com/investor/General/ConsolidatedAccountStatement" target="_blank" rel="noopener noreferrer" className="text-[#00875A] hover:underline">Karvy/KFintech</a>.
          </p>
          <Checklist items={[
            'Download your CAS PDF from CAMS or Karvy using your PAN number.',
            'Go to Settings \u2192 Data \u2192 CAS Import.',
            'Upload the PDF. Nexus reads all your folios, scheme names, units, and NAVs.',
            'Review and confirm the import.',
          ]} />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#00875A] text-white text-xs font-bold mr-2">8</span>
            AI assistant
          </h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-2">
            Ask the AI assistant anything about your portfolio in plain English. For example:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm text-slate-600 dark:text-slate-400 mb-3">
            <li>"How much of our wealth is in India vs Canada?"</li>
            <li>"Which asset class are we most concentrated in?"</li>
            <li>"What is our total mutual fund exposure?"</li>
          </ul>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            The AI sees your actual portfolio data. To enable it, add a free Gemini or DeepSeek key in{' '}
            <strong>Settings \u2192 Pricing \u2192 AI Assistant</strong>. See the <strong>AI Keys</strong> section for how to get one.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#00875A] text-white text-xs font-bold mr-2">9</span>
            Exporting &amp; migrating your data
          </h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            You can export your entire portfolio as a file at any time and import it into a different Nexus setup.
            This is useful if you switch from Nexus Hosted to your own Firebase, or just want a backup.
            See the <strong>Data Portability</strong> section for full details.
          </p>
        </div>
      </div>
    ),
  },

  'data-portability': {
    title: 'Data Portability',
    content: (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Your data, your way</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Your portfolio data always belongs to you. Nexus lets you export everything at any time
            and import it back — whether you are making a backup, switching from Nexus Hosted to your
            own Firebase, or just moving to a new device.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Exporting your data</h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
            Go to <strong>Settings → Data → Data Portability</strong> and click <strong>Export Data</strong>.
            Nexus downloads a file to your computer that includes:
          </p>
          <Checklist items={[
            'All your assets — names, quantities, cost, tickers, and which family member owns each',
            'Your asset class setup (e.g. custom categories you created)',
            'Your currency preferences',
          ]} />
          <Tip>The export file never contains passwords, API keys, or login credentials of any kind. It is safe to store alongside other financial documents.</Tip>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Importing your data</h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
            Go to <strong>Settings → Data → Data Portability</strong>, click <strong>Import Data</strong>,
            and select the file you exported. Nexus shows you a preview of what will be imported,
            then asks you to choose one of two modes:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400 mb-3">
            <li><strong>Merge</strong> — adds the imported assets alongside what you already have. Anything that already exists is left untouched. Safe to use at any time.</li>
            <li><strong>Replace</strong> — clears your current portfolio entirely and loads the imported data fresh. Use this when migrating to a new setup.</li>
          </ul>
          <Warning>
            Replace mode deletes your current data before importing. Export first so you have a backup.
          </Warning>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Moving from Nexus Hosted to your own Firebase</h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Ready to move your data to a self-owned Firebase project? Here is the two-step process:
          </p>
          <Checklist items={[
            'On Nexus Hosted: Settings → Data → Export Data. Save the file.',
            'Set up your own Firebase following the Bring Your Own Firebase guide. Sign in.',
            'On your new setup: Settings → Data → Import Data → select the file → Replace.',
          ]} />
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-2">
            After importing, you will need to reconnect Upstox, Splitwise, and Google Drive — those
            connections are not included in the export file.
          </p>
        </div>
      </div>
    ),
  },

  'troubleshooting': {
    title: 'Troubleshooting',
    content: (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Something not working?</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Here are fixes for the most common issues. If you are still stuck, file an issue on the{' '}
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-[#00875A] hover:underline">Nexus GitHub repository</a>.
          </p>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">I cannot sign in</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              If the sign-in popup closes without logging you in, there are two likely causes:
            </p>
            <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-400 space-y-1">
              <li><strong>Using your own Firebase?</strong> Your current web address needs to be added to the allowed domains list in your Firebase project. See the Bring Your Own Firebase guide, Step 4.</li>
              <li><strong>On Nexus Hosted?</strong> Try a different browser or disable any popup blockers.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">I am stuck on a Firebase sign-in screen and cannot get back</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              This usually means a previous Firebase setup was saved and is now misconfigured. To reset:
            </p>
            <ol className="list-decimal list-inside text-sm text-slate-600 dark:text-slate-400 space-y-1">
              <li>Open your browser&apos;s developer console (press F12 or right-click \u2192 Inspect \u2192 Console).</li>
              <li>Type <Code>localStorage.clear()</Code> and press Enter.</li>
              <li>Reload the page. You will be back at the sign-in screen.</li>
            </ol>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">My data is not loading / I see &quot;Access denied&quot;</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              If you are using your own Firebase and see an access error right after signing in,
              your Firebase database security rules may not be published yet. Go to your Firebase project,
              open the Firestore Rules tab, and make sure the rules are published. It can take up to
              60 seconds for changes to take effect. See the Bring Your Own Firebase guide, Step 6 for the exact rules to use.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Prices are not updating</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              A few things to check:
            </p>
            <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-400 space-y-1">
              <li>Assets without a ticker (stocks, funds, gold) need a ticker to get live prices. Edit the asset and add one.</li>
              <li>Manual assets like real estate, FDs, and bank balances always require a manual update \u2014 there is no live feed for these.</li>
              <li>If the refresh spinner spins but prices do not change, try again in a few minutes. Price sources occasionally have brief outages and Nexus retries automatically.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">The AI assistant is not working</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              The AI assistant needs a key before it can work. To set one up:
            </p>
            <ol className="list-decimal list-inside text-sm text-slate-600 dark:text-slate-400 space-y-1">
              <li>Go to Settings \u2192 Pricing \u2192 AI Assistant.</li>
              <li>Select a provider (Gemini or DeepSeek) and paste your API key.</li>
              <li>Click Save. The assistant should be available immediately.</li>
            </ol>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              See the <strong>AI Assistant Keys</strong> section for step-by-step instructions to get a free key.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">I imported data but nothing changed</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Make sure you are importing a file exported from Nexus itself (Settings \u2192 Data \u2192 Export Data).
              Nexus checks that the file is a valid Nexus export and will show an error for any other file type.
              If you chose <strong>Merge</strong> mode and already had the same assets, duplicates are skipped \u2014
              that is expected. Try <strong>Replace</strong> mode if you want the imported data to fully take over.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">I connected Upstox but my holdings are empty</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              Two things to try:
            </p>
            <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-400 space-y-1">
              <li>Go to Settings \u2192 Integrations and click <strong>Refresh</strong> next to Upstox. The first sync can take a moment.</li>
              <li>If it is still empty, disconnect and reconnect Upstox. This re-authorises the connection and often resolves stale permission issues.</li>
            </ul>
          </div>
        </div>
      </div>
    ),
  },
};

interface DocsProps {
  initialSection?: DocSection;
  onBack?: () => void;
  onStartSetupWizard?: () => void;
}

export function Docs({ initialSection, onBack, onStartSetupWizard }: DocsProps) {
  const [activeSection, setActiveSection] = useState<DocSection>(initialSection || 'getting-started');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection);
    }
  }, [initialSection]);

  const section = sectionContent[activeSection];

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-slate-900 text-slate-900 dark:text-slate-50 transition-colors duration-200 font-sans">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-start gap-8">
          <DocsNav
            active={activeSection}
            onSelect={setActiveSection}
            mobileOpen={mobileNavOpen}
            onMobileToggle={() => setMobileNavOpen(!mobileNavOpen)}
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {onBack ? 'Back' : 'Home'}
                </button>
                <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">{section.title}</h1>
              </div>
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                className="lg:hidden inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <Menu className="h-4 w-4" />
                Sections
              </button>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              {section.content}

              {activeSection === 'getting-started' && onStartSetupWizard && (
                <div className="mt-8 rounded-2xl border border-[#00875A]/20 bg-[#00875A]/5 p-5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Try the Guided Setup Wizard</h3>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Step-by-step walkthrough to configure all your providers, API keys, and integrations.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onStartSetupWizard}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#00875A] px-4 py-2 text-sm font-medium text-white hover:bg-[#007A51] transition-colors shrink-0"
                    >
                      <Wand2 className="h-4 w-4" />
                      Launch Setup Wizard
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 flex items-center justify-between text-sm text-slate-400 dark:text-slate-500">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Nexus Portfolio Documentation
              </div>
              <span>Last updated: April 2026</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
