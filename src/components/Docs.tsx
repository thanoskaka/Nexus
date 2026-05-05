import React, { useState, useEffect } from 'react';
import { Wallet, Menu, X, ChevronRight, ExternalLink, CheckCircle2, AlertTriangle, BookOpen, ArrowLeft } from 'lucide-react';

type DocSection =
  | 'getting-started'
  | 'firebase'
  | 'localhost'
  | 'vercel'
  | 'api-keys'
  | 'integrations'
  | 'user-guide'
  | 'troubleshooting';

interface DocNavItem {
  id: DocSection;
  label: string;
}

const NAV_ITEMS: DocNavItem[] = [
  { id: 'getting-started', label: 'Getting Started' },
  { id: 'firebase', label: 'Firebase Setup' },
  { id: 'localhost', label: 'Local Development' },
  { id: 'vercel', label: 'Vercel Deployment' },
  { id: 'api-keys', label: 'API Keys & Providers' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'user-guide', label: 'User Guide' },
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
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">What is Nexus Portfolio?</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Nexus Portfolio is a shared wealth tracker for families managing money across Canada and India.
            It combines market-linked investments, manual assets, liabilities, and read-only connected broker snapshots
            in one cloud-backed workspace. Nexus supports multiple family members in one shared portfolio with
            live-priced and manual-priced assets side by side.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Hosted vs Self-Hosted</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
              <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Hosted (Nexus Cloud)</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                The easiest way to use Nexus. Visit{' '}
                <a href="https://nexus-phi-inky.vercel.app" target="_blank" rel="noopener noreferrer" className="text-[#00875A] hover:underline inline-flex items-center gap-1">
                  nexus-phi-inky.vercel.app <ExternalLink className="h-3 w-3" />
                </a>
                , sign in with Google, and start tracking. No setup required.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
              <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Self-Hosted</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Run Nexus on your own infrastructure. You manage Firebase, Vercel, and API keys.
                Full control over data and costs. Follow the Firebase, Local, and Vercel guides below.
              </p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Local Mock / Demo Mode</h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
            Nexus works fully offline using IndexedDB. No Firebase credentials needed for the demo.
            The app launches in browser-local mode where you can import holdings, test features,
            and explore the UI. All data stays in your browser.
          </p>
          <Checklist items={[
            <>Run <Code>npm install</Code> to install dependencies.</>,
            <>Run <Code>npm run dev:mock</Code> to start the local mock server.</>,
            'Open http://localhost:6868 in your browser.',
            'Use the preloaded demo portfolio. No Firebase credentials are needed.',
            'Switch to real Firebase mode later by filling .env.local and running npm run dev.',
          ]} />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Core Features</h3>
          <ul className="list-disc list-inside space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
            <li>Canada and India holdings in one app</li>
            <li>Multiple family members in one shared portfolio</li>
            <li>Stocks, ETFs, mutual funds, gold, bank balances, PF/PPF/NPS/FD, real estate, and liabilities</li>
            <li>Live-priced and manual-priced assets side by side</li>
            <li>Cloud-backed connected holdings snapshots (Upstox)</li>
            <li>AI assistant for portfolio analysis</li>
            <li>CAS PDF import for Indian mutual funds</li>
            <li>Screenshot import for broker portfolios</li>
            <li>Splitwise integration for shared expense tracking</li>
            <li>Dark mode support</li>
          </ul>
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

  'localhost': {
    title: 'Local Development',
    content: (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Local Real Firebase Mode</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
            To run Nexus with real Firebase integration locally, set up your Firebase credentials in <Code>.env.local</Code>.
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

  'vercel': {
    title: 'Vercel Deployment',
    content: (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Deploying to Vercel</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
            Nexus is designed to deploy on Vercel. The app uses a Vite build with an Express API server
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
    title: 'API Keys & Providers',
    content: (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Provider / API Key Setup</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
            Nexus integrates with multiple data providers for pricing, AI analysis, and broker connectivity.
            Below is every API key and how to generate it.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Gemini (AI Assistant)</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Env: Server-side (stored per-user via API)</p>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
            Powers the AI assistant for portfolio analysis, natural-language queries, and screenshot data extraction.
          </p>
          <Checklist items={[
            <>Go to <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-[#00875A] hover:underline">Google AI Studio</a>.</>,
            'Click "Get API Key" and create a key for the Gemini API.',
            'In Nexus Settings > AI Assistant, enter the key and select a model (Gemini 2.5 Flash, Pro, or Flash Lite).',
            'The key is encrypted and stored server-side, associated with your Firebase user.',
          ]} />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">DeepSeek (AI Assistant)</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Env: Server-side (stored per-user via API)</p>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
            Alternative AI provider. Supports DeepSeek Chat (V3) and DeepSeek Reasoner (R1) models.
          </p>
          <Checklist items={[
            <>Visit <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener noreferrer" className="text-[#00875A] hover:underline">DeepSeek Platform</a>.</>,
            'Create an account and generate an API key.',
            'In Nexus Settings > AI Assistant, select DeepSeek as provider and enter your key.',
          ]} />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Massive (U.S. Close Prices)</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Env: <Code>MASSIVE_API_KEY</Code> (server-only)</p>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
            Massive provides U.S. equity close-price data. The server uses it for auto-matched U.S. ticker pricing.
          </p>
          <Checklist items={[
            'Go to the Massive website and sign up for an API key.',
            <>Copy the key and add it as <Code>MASSIVE_API_KEY</Code> in your server environment variables.</>,
            'The server uses this automatically when matching U.S. stocks (NASDAQ:, NYSE:, AMEX:).',
          ]} />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Alpha Vantage</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Env: <Code>ALPHA_VANTAGE_API_KEY</Code> (server-only) or user override</p>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
            Real-time and historical stock prices. Used as a secondary price provider.
          </p>
          <Checklist items={[
            <>Register at <a href="https://www.alphavantage.co/support/#api-key" target="_blank" rel="noopener noreferrer" className="text-[#00875A] hover:underline">Alpha Vantage</a>.</>,
            'Receive a free API key via email.',
            'Set as server env var or enter in Settings > Pricing > Override Credentials.',
            'The free tier is limited to 5 calls/minute and 500 calls/day.',
          ]} />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Finnhub</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Env: <Code>FINNHUB_API_KEY</Code> (server-only) or user override</p>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
            Alternative price provider. Can be used as primary or secondary fallback.
          </p>
          <Checklist items={[
            <>Register at <a href="https://finnhub.io/register" target="_blank" rel="noopener noreferrer" className="text-[#00875A] hover:underline">Finnhub</a>.</>,
            'Get your free API key from the dashboard.',
            'Set as server env var or enter in Settings > Pricing > Override Credentials.',
          ]} />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Logo.dev</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Env: <Code>LOGO_DEV_SECRET_KEY</Code> (server-only), <Code>VITE_LOGO_DEV_PUBLISHABLE_KEY</Code> (client)</p>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
            Fetches company logos for asset display in the dashboard and ledger.
          </p>
          <Checklist items={[
            <>Sign up at <a href="https://logo.dev" target="_blank" rel="noopener noreferrer" className="text-[#00875A] hover:underline">logo.dev</a>.</>,
            'Generate a secret API key for server-side use and a publishable key for client-side use.',
            <>Set <Code>LOGO_DEV_SECRET_KEY</Code> and <Code>VITE_LOGO_DEV_PUBLISHABLE_KEY</Code> in your environment.</>,
          ]} />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">CAS Parser Service</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Env: <Code>CAS_PARSER_API_KEY</Code>, <Code>CAS_PARSER_SERVICE_URL</Code></p>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
            Parses CAS (Consolidated Account Statement) PDFs from Indian mutual fund holdings.
          </p>
          <Checklist items={[
            <>Sign up at <a href="https://casparser.in" target="_blank" rel="noopener noreferrer" className="text-[#00875A] hover:underline">casparser.in</a> for an API key.</>,
            <>Alternatively, self-host the CAS parser and set <Code>CAS_PARSER_SERVICE_URL</Code>.</>,
            <>Set <Code>CAS_PARSER_API_KEY</Code> for the external API (or <Code>CASPARSER_API_KEY</Code> as fallback).</>,
            <>Set <Code>CAS_PARSER_ALLOW_EXTERNAL_FALLBACK=true</Code> to fall back to the hosted casparser.in API.</>,
            <>In production, the server requires <Code>CAS_PARSER_SERVICE_URL</Code> to be configured.</>,
            <>In development, defaults to <Code>http://localhost:8000</Code>.</>,
          ]} />
        </div>

        <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">
          For OAuth-based provider keys (Upstox, Splitwise, Google Drive), see the Integrations section.
        </p>
      </div>
    ),
  },

  'integrations': {
    title: 'Integrations',
    content: (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Integration Setup</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
            Nexus supports multiple OAuth-based integrations. These require server-side environment variables.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Upstox OAuth</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Connected Accounts \u2014 Read-only broker sync</p>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
            Sync India stock holdings and positions from Upstox as read-only snapshots.
          </p>
          <Checklist items={[
            <>Create an app in the <a href="https://developer.upstox.com" target="_blank" rel="noopener noreferrer" className="text-[#00875A] hover:underline">Upstox Developer Console</a>.</>,
            <>Configure redirect URI: <Code>http://localhost:6868/api/connections/upstox/callback</Code> (local) or <Code>https://your-domain.vercel.app/api/connections/upstox/callback</Code>.</>,
            'Set the following server env vars.',
          ]} />
          <EnvTable rows={[
            { var: 'UPSTOX_CLIENT_ID', description: 'Upstox app client ID', required: true },
            { var: 'UPSTOX_CLIENT_SECRET', description: 'Upstox app client secret', required: true },
            { var: 'UPSTOX_REDIRECT_URI', description: 'OAuth callback URL', required: true },
            { var: 'CONNECTED_ACCOUNTS_ENCRYPTION_KEY', description: 'Encryption key for stored tokens', required: true },
            { var: 'CONNECTED_ACCOUNTS_STATE_SECRET', description: 'State parameter signing secret', required: true },
            { var: 'APP_BASE_URL', description: 'Base URL of the app', required: true },
          ]} />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Splitwise OAuth</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Shared expense tracking</p>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
            Connect Splitwise to display shared-expense balances, group-level balances, and recent expenses in Nexus.
          </p>
          <Checklist items={[
            <>Register an app at <a href="https://secure.splitwise.com/apps" target="_blank" rel="noopener noreferrer" className="text-[#00875A] hover:underline">Splitwise Apps</a>.</>,
            'Configure callback URL to match your deployment.',
            'Set the following server env vars.',
          ]} />
          <EnvTable rows={[
            { var: 'SPLITWISE_CLIENT_ID', description: 'Splitwise app consumer key', required: true },
            { var: 'SPLITWISE_CLIENT_SECRET', description: 'Splitwise app consumer secret', required: true },
            { var: 'SPLITWISE_REDIRECT_URI', description: 'OAuth callback URL', required: true },
            { var: 'SPLITWISE_API_BASE_URL', description: 'Splitwise API base URL', required: false },
            { var: 'SPLITWISE_OAUTH_TOKEN_URL', description: 'OAuth token endpoint', required: false },
            { var: 'SPLITWISE_OAUTH_AUTHORIZE_URL', description: 'OAuth authorize endpoint', required: false },
            { var: 'SPLITWISE_STATE_SECRET', description: 'OAuth state signing secret', required: true },
            { var: 'INTEGRATION_TOKEN_ENCRYPTION_KEY', description: 'Encryption key for OAuth tokens', required: true },
          ]} />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Google Drive OAuth</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Cloud backup and sync</p>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
            Sync portfolio data to Google Drive for backup and cross-device transfer.
          </p>
          <Checklist items={[
            'Create a Google Cloud Console project and enable the Google Drive API.',
            'Create OAuth 2.0 credentials (Web application type).',
            'Add your app domain to Authorized JavaScript origins and Authorized redirect URIs.',
            <>Set <Code>VITE_GOOGLE_CLIENT_ID</Code> to your OAuth client ID.</>,
            <>Nexus uses <Code>https://www.googleapis.com/auth/drive.file</Code> scope for app-specific files.</>,
          ]} />
          <EnvTable rows={[
            { var: 'VITE_GOOGLE_CLIENT_ID', description: 'Google OAuth client ID for Drive API', required: true },
          ]} />
        </div>
      </div>
    ),
  },

  'user-guide': {
    title: 'User Guide',
    content: (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Using Nexus Portfolio</h2>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Sign In</h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Open Nexus and click &quot;Sign in with Google&quot;. Sign in with any Google account.
            If you are invited to a shared portfolio, the data loads automatically.
            First-time users get a personal portfolio created automatically.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Dashboard</h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            The dashboard shows total wealth, allocation charts (by country, currency, asset class),
            performance attribution, growth over time, and member contribution breakdowns.
            Use the scope filter (ALL / INDIA / CANADA) to focus on specific markets.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Assets Ledger</h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            The Assets view is a full-featured ledger with sorting, filtering, subtotals, and bulk refresh.
            Columns include name, owner, asset class, ticker, quantity, cost basis, current price, and value.
            Click any row to edit or delete the asset.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Add / Edit Assets</h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Click the Add Asset button (from the ledger or dashboard) to open the modal.
            Fill in name, owner, country, asset class, quantity, cost basis, currency, and ticker.
            If a ticker is provided, Nexus can auto-fetch live prices. Ticker format:
            <Code>EXCHANGE:SYMBOL</Code> (e.g., <Code>NASDAQ:AAPL</Code>, <Code>NSE:RELIANCE</Code>).
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Price Refresh</h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Click the refresh button (header icon or Settings &gt; Pricing &gt; Refresh All Prices).
            The app uses a multi-provider fallback chain: primary provider, then secondary, then Yahoo.
            India mutual funds use AMFI. U.S. stocks use Massive (if configured).
            Gold uses gold-api.com with exchange rate fallback.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Import Holdings</h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            In Settings &gt; Data, download CSV templates for India and Canada holdings.
            Fill in your data and upload. The importer handles flexible column headers
            and resolves purchase price / quantity triangles automatically.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Screenshot Import</h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Upload screenshots of broker portfolios or transaction receipts.
            The AI assistant extracts asset names, quantities, and prices,
            then matches against your existing holdings. Access from Settings &gt; Data or the quick action button.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">CAS Import</h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Upload a CAS (Consolidated Account Statement) PDF from Indian mutual fund providers.
            The server parses the PDF (via casparser.in or self-hosted parser) and extracts
            all folios, scheme names, units, NAVs, and values. Access from Settings &gt; Data.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Settings</h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Settings has five tabs:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-sm text-slate-600 dark:text-slate-400 mt-2">
            <li><strong>Access</strong> \u2014 Manage members, invite by email, assign roles (owner/partner)</li>
            <li><strong>Pricing</strong> \u2014 Price providers, currency preferences, AI assistant credentials, price refresh</li>
            <li><strong>Structure</strong> \u2014 Asset classes, add/edit/delete custom classes</li>
            <li><strong>Data</strong> \u2014 Import/export holdings, Google Drive sync, local-to-cloud migration</li>
            <li><strong>Integrations</strong> \u2014 Connected Accounts (Upstox), Splitwise, member integration views</li>
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Integrations</h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            In Settings &gt; Integrations, connect Upstox for read-only holdings sync and Splitwise for
            shared expense tracking. Each member can have their own connections.
            Owners can view and refresh other members&apos; integrations.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">AI Assistant</h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            The AI assistant is available in Settings &gt; Pricing or via the chat widget.
            Configure with a Gemini or DeepSeek API key. Ask questions about your portfolio,
            analyze allocation, identify concentration risks, or get market insights.
            The AI has access to your portfolio context including holdings, prices, and asset classes.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Shared Portfolio &amp; Member Access</h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Nexus supports shared portfolios. The owner can invite members via email.
            Members see the same portfolio data. Each member can set personal price provider overrides
            and broker connections (stored locally on their device).
            Owners can view and refresh connected accounts for all members.
          </p>
          <Tip>
            Member access is controlled via Firestore. When a user signs in with Google for the first time,
            a personal portfolio is created. Owners can invite additional members in Settings {'>'} Access.
          </Tip>
        </div>
      </div>
    ),
  },

  'troubleshooting': {
    title: 'Troubleshooting',
    content: (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Common Issues</h2>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Firebase env missing</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              If the app fails to load or shows Firebase errors, check that all <Code>NEXT_PUBLIC_FIREBASE_*</Code> variables are set.
              The app reads them from <Code>import.meta.env</Code> at runtime. Verify your <Code>.env.local</Code> or Vercel env settings.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">unauthorized-domain</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              The current domain is not in Firebase Authentication &gt; Authorized domains.
              Add <Code>localhost</Code>, <Code>127.0.0.1</Code>, or your production domain to the list.
              Wait a few minutes for the change to propagate.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Firestore permission denied</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Firestore security rules are blocking reads/writes. For development, set rules to allow
              all authenticated users. For production, implement proper per-portfolio access control.
              Nexus expects to read/write the <Code>{'portfolios/{portfolioId}'}</Code> document.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Firebase Admin missing</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Server-side features (connected accounts, Splitwise, AI credentials) require Firebase Admin setup.
              If you see &quot;Firebase Admin is not configured&quot; or 401 errors from API routes,
              ensure <Code>FIREBASE_ADMIN_PROJECT_ID</Code>, <Code>FIREBASE_ADMIN_CLIENT_EMAIL</Code>, and
              <Code>FIREBASE_ADMIN_PRIVATE_KEY</Code> are set in the server environment.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">OAuth redirect mismatch</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Upstox and Splitwise OAuth flows require exact redirect URI matching.
              Ensure the redirect URI configured in the provider console exactly matches
              what is set in your environment variables (including protocol, domain, port, and path).
              For local: <Code>http://localhost:6868/...</Code>. For production: <Code>https://your-domain.vercel.app/...</Code>.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">API key present but feature unavailable</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              If you set an API key but the feature still shows as unavailable:
            </p>
            <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-400 mt-2 space-y-1">
              <li>Server-only keys (e.g., <Code>MASSIVE_API_KEY</Code>) must be set in the server environment, not client-side.</li>
              <li>User-facing keys (e.g., Gemini) must be saved in Nexus Settings {'>'} AI Assistant, not just as env vars.</li>
              <li>Price provider keys can be either server env vars or user overrides in Settings {'>'} Pricing.</li>
              <li>Some features require both Firebase Admin AND the provider key to be configured.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Local works but production fails</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Common causes:
            </p>
            <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-400 mt-2 space-y-1">
              <li>Missing environment variables in Vercel (set them in Vercel Dashboard {'>'} Project Settings).</li>
              <li>Production domain not in Firebase Authorized domains.</li>
              <li>OAuth redirect URI points to <Code>localhost</Code> instead of production URL.</li>
              <li>Vercel preview deployment needs its own env vars or uses production Firebase data.</li>
              <li>CORS issues with the finance API route.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Production works but local fails</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Common causes:
            </p>
            <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-400 mt-2 space-y-1">
              <li>Missing <Code>.env.local</Code> file or empty Firebase values.</li>
              <li><Code>localhost</Code> and <Code>127.0.0.1</Code> not in Firebase Authorized domains.</li>
              <li>Firebase Admin private key not properly formatted with <Code>\n</Code> escape sequences.</li>
              <li>OAuth redirect URIs still pointing to production.</li>
              <li>Port 6868 already in use \u2014 check <Code>lsof -i :6868</Code>.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Empty states hidden because account already has data</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              If you set up Nexus with real data, the onboarding empty states (welcome messages,
              import prompts) will not appear. To reset, use Settings &gt; Data &gt; Danger Zone &gt;
              Erase All Holdings, or use the Local To Cloud Migration tool to replace cloud data.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Yahoo Finance rate limiting</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Yahoo Finance has aggressive rate limiting. If you see &quot;Yahoo is temporarily rate-limiting requests&quot;,
              the app automatically switches to secondary providers. The cooldown lasts 5 minutes.
              Configure a paid provider (Alpha Vantage or Finnhub) to avoid this.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Getting Help</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              For issues with self-hosting, check the project README and the docs in this section.
              For bugs or feature requests, file an issue on the Nexus GitHub repository.
            </p>
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
