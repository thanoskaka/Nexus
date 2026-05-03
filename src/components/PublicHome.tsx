import { Wallet, ArrowRight, Sparkles, Globe2, Shield, CheckCircle2, RefreshCw, Users, BookOpen, Github, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';

interface PublicHomeProps {
  authError: string | null;
  onLaunch: () => void;
  signedOut?: boolean;
}

const REPO_URL = 'https://github.com/shubhamg0406/Nexus';

const VALUE_PROPS = [
  { icon: Users, title: 'Family wealth tracking', desc: 'Shared portfolios for households. Invite partners and family into one workspace.' },
  { icon: Globe2, title: 'Canada + India + US', desc: 'Multi-market support with auto-routed pricing across regions and currencies.' },
  { icon: RefreshCw, title: 'Manual + connected', desc: 'Track manual assets alongside auto-synced broker holdings in one view.' },
  { icon: Shield, title: 'Bring your own keys', desc: 'Use your own API keys for pricing, or rely on the built-in free tier.' },
];

const PATHS = [
  {
    icon: Sparkles,
    title: 'Hosted (cloud)',
    desc: 'Use the hosted version with Google sign-in and auto-synced pricing. No server setup required.',
    link: { label: 'Sign in to get started', onClick: null as null | (() => void) },
    accent: 'emerald',
  },
  {
    icon: Github,
    title: 'Self-host / open-source',
    desc: 'Self-host on your own infrastructure. Full data control, MIT license, deploy via Docker or Node.',
    link: { label: `${REPO_URL}`, href: REPO_URL, external: true as const },
    accent: 'sky',
  },
  {
    icon: BookOpen,
    title: 'Documentation',
    desc: 'Deployment guide, API reference, environment setup, and integration docs.',
    link: { label: `${REPO_URL}#readme`, href: `${REPO_URL}#readme`, external: true as const },
    accent: 'violet',
  },
];

function PathCard({ path, onLaunch }: { path: typeof PATHS[number]; onLaunch: () => void }) {
  const isCTA = path.link.onClick !== null;
  return (
    <div className="group relative rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-[0_8px_30px_rgba(15,23,42,0.04)] transition-shadow hover:shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
      <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${
        path.accent === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
        path.accent === 'sky' ? 'bg-sky-50 text-sky-600' :
        'bg-violet-50 text-violet-600'
      }`}>
        <path.icon className="h-5 w-5" />
      </div>
      <h3 className="text-base font-semibold text-slate-900">{path.title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{path.desc}</p>
      {isCTA ? (
        <button
          onClick={onLaunch}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-600"
        >
          {path.link.label}
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      ) : (
        <a
          href={path.link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 break-all"
        >
          {path.link.label}
          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
        </a>
      )}
    </div>
  );
}

export function PublicHome({ authError, onLaunch, signedOut }: PublicHomeProps) {
  const pathsWithCTA = PATHS.map((p) =>
    p.title === 'Hosted (cloud)' ? { ...p, link: { ...p.link, onClick: onLaunch } } : p
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/80 via-white to-sky-50/40 text-slate-900">
      <header className="border-b border-slate-200/60 bg-white/70 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#00875A] shadow-sm">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-lg font-bold tracking-tight">Nexus Portfolio</div>
              <div className="text-xs font-medium text-slate-500">Shared family wealth tracking</div>
            </div>
          </div>
          <Button onClick={onLaunch} className="rounded-full bg-[#00875A] px-5 text-white hover:bg-[#007A51]">
            Launch Portfolio
          </Button>
        </div>
      </header>

      <main>
        {signedOut && (
          <div className="container mx-auto px-4 pt-6">
            <div className="rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4 text-sm text-sky-800">
              <span className="font-semibold">Signed out.</span> You can sign back in anytime below.
            </div>
          </div>
        )}

        <section className="container mx-auto px-4 pt-16 pb-8 lg:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-4 py-2 text-sm font-medium text-emerald-800 shadow-sm">
              <Sparkles className="h-4 w-4" />
              Open-source shared wealth tracker
            </div>
            <h1 className="mt-6 text-4xl font-black leading-[1.08] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              One portfolio home for families investing across Canada, India, and the U.S.
            </h1>
            <p className="mt-5 mx-auto max-w-2xl text-lg leading-8 text-slate-600">
              Track holdings, sync live pricing across providers, organize assets cleanly, and let each household member work from the same shared workspace.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button onClick={onLaunch} className="h-12 rounded-full bg-[#00875A] px-7 text-base text-white hover:bg-[#007A51]">
                Launch Portfolio
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <span className="rounded-full border border-slate-200 bg-white/80 px-5 py-2.5 text-sm text-slate-500 shadow-sm">
                Google sign-in appears after launch
              </span>
            </div>
          </div>
        </section>

        {authError && (
          <section className="container mx-auto px-4 pb-4">
            <div className="mx-auto max-w-2xl rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
              {authError}
            </div>
          </section>
        )}

        <section className="container mx-auto px-4 py-10">
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-4 sm:grid-cols-3">
              {pathsWithCTA.map((path) => (
                <PathCard key={path.title} path={path} onLaunch={onLaunch} />
              ))}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-10 lg:py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-2xl font-bold text-slate-900">Why Nexus Portfolio</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {VALUE_PROPS.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#00875A]/10 text-[#00875A]">
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-slate-900">{title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-slate-600">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-10 lg:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-slate-900">Ready to get started?</h2>
            <p className="mt-3 text-base text-slate-600">
              No credit card required. Just a Google account and your portfolio data stays yours.
            </p>
            <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button onClick={onLaunch} className="h-12 rounded-full bg-[#00875A] px-7 text-base text-white hover:bg-[#007A51]">
                Launch Portfolio
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200/60 bg-white/50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Wallet className="h-4 w-4" />
              <span>Nexus Portfolio &mdash; open-source, self-hostable</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="hover:text-slate-700">
                GitHub
              </a>
              <a href={`${REPO_URL}#readme`} target="_blank" rel="noopener noreferrer" className="hover:text-slate-700">
                Docs
              </a>
              <span className="text-slate-300">|</span>
              <span className="text-slate-400">MIT License</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
