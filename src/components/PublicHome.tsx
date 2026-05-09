import React, { useEffect, useRef } from 'react';
import { Wallet, ArrowRight, Sparkles, Github, BookOpen, Shield, FileText, Users, LayoutDashboard, CheckCircle2, Globe2, Server, Cloud, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';

interface PublicHomeProps {
  authError: string | null;
  onLaunch: () => void;
  signedOut?: boolean;
}

const REPO_URL = 'https://github.com/shubhamg0406/Nexus';

const HOW_IT_WORKS = [
  { icon: FileText, title: 'Add your assets', desc: 'Import screenshots, enter manually, or connect Upstox and Splitwise. Sample mode to explore first.' },
  { icon: Users, title: 'Family workspace', desc: 'Invite household members into a shared portfolio book. One view for everyone.' },
  { icon: LayoutDashboard, title: 'Dashboard & AI insights', desc: 'Net worth across currencies, trends over time, and ask Gemini or DeepSeek about your holdings.' },
];

const PRIVACY_POINTS = [
  'Fully open source (MIT) \u2014 inspect every line of code.',
  'Self-owned Firebase mode keeps portfolio data in your Firebase project.',
  'Integration tokens are encrypted at rest on your server.',
  'No data mining. No tracking scripts. No analytics pings.',
];

const REGION_FEATURES = [
  { flag: 'CA', country: 'Canada', items: 'ETFs (XIC, VTI, VXUS), bonds, GICs, cash, 401k-style manual accounts', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  { flag: 'IN', country: 'India', items: 'Mutual funds, FDs, PPF, NPS, stocks, gold ETFs, physical gold, real estate, liabilities', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  { flag: 'US', country: 'United States', items: 'US equities, ETFs, manual accounts, properties, liabilities', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
];

const COMPARISON_ROWS = [
  { feature: 'Data location', self: 'Your infrastructure', hosted: 'Nexus Cloud (Firebase)' },
  { feature: 'Setup time', self: '~30 min (Docker)', hosted: 'Instant (Google sign-in)' },
  { feature: 'Monthly cost', self: 'Free', hosted: '$1.99/mo' },
  { feature: 'AI provider', self: 'BYOK (Gemini, DeepSeek)', hosted: 'BYOK (Gemini, DeepSeek)' },
  { feature: 'Price sync', self: 'Included', hosted: 'Included' },
  { feature: 'Data export', self: 'Full DB access', hosted: 'CSV export' },
  { feature: 'Source code', self: 'Full access (MIT)', hosted: 'Full access (MIT)' },
];

export function PublicHome({ authError, onLaunch, signedOut }: PublicHomeProps) {
  const pricingRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (window.location.pathname === '/pricing' && pricingRef.current) {
      const timer = setTimeout(() => {
        pricingRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  const handlePricingNav = (e: React.MouseEvent) => {
    e.preventDefault();
    window.history.pushState({}, '', '/pricing');
    pricingRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <a href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00875A] shadow-sm">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <span className="text-base font-bold tracking-tight">Nexus Portfolio</span>
          </a>
          <nav className="hidden items-center gap-6 md:flex">
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              GitHub
            </a>
            <a href="/docs" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Docs
            </a>
            <a href="/pricing" onClick={handlePricingNav} className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Pricing
            </a>
            <Button onClick={onLaunch} className="rounded-full bg-[#00875A] px-5 text-white hover:bg-[#007A51]">
              Get Started
            </Button>
          </nav>
          <Button onClick={onLaunch} className="rounded-full bg-[#00875A] px-4 text-white hover:bg-[#007A51] md:hidden">
            Get Started
          </Button>
        </div>
      </header>

      <main>
        {signedOut && (
          <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4 text-sm text-sky-800">
              <span className="font-semibold">Signed out.</span> You can sign back in anytime below.
            </div>
          </div>
        )}

        <section className="mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 lg:px-8 lg:pb-24 lg:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-sm font-medium text-slate-600">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Open-source, self-hostable wealth tracker
            </div>
            <h1 className="mt-6 text-4xl font-black leading-[1.08] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Your family's wealth.
              <br />
              Your server. Your rules.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              Open-source wealth tracking for families who don't trust black boxes.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button onClick={onLaunch} className="h-12 rounded-full bg-[#00875A] px-7 text-base text-white hover:bg-[#007A51]">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <a
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center gap-2 rounded-full border border-slate-200 bg-white px-6 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <Github className="h-4 w-4" />
                View GitHub
              </a>
              <a
                href="/docs"
                className="inline-flex h-12 items-center gap-2 rounded-full px-6 text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                <BookOpen className="h-4 w-4" />
                Read self-host guide
              </a>
            </div>
          </div>
        </section>

        {authError && (
          <div className="mx-auto max-w-6xl px-4 pb-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
              {authError}
            </div>
          </div>
        )}

        <section className="border-t border-slate-100 bg-slate-50/60">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <h2 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl">How it works</h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-slate-600">
              Import, connect, or manually enter your assets \u2014 then share them with your family in one workspace.
            </p>
            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              {HOW_IT_WORKS.map(({ icon: Icon, title, desc }, i) => (
                <div key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00875A]/10 text-[#00875A]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">
                      {i + 1}
                    </span>
                    <h3 className="font-semibold text-slate-900">{title}</h3>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-slate-100">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <div className="mx-auto max-w-3xl">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-emerald-600" />
                <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Privacy by design</h2>
              </div>
              <p className="mt-4 text-base leading-7 text-slate-600">
                Nexus Cloud server code only sees what hosted features require; self-owned mode keeps portfolio data in your Firebase project.
              </p>
              <ul className="mt-6 space-y-3">
                {PRIVACY_POINTS.map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                    <span className="text-sm leading-6 text-slate-700">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="border-t border-slate-100 bg-slate-50/60">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <div className="mx-auto max-w-3xl text-center">
              <div className="flex items-center justify-center gap-2">
                <Globe2 className="h-5 w-5 text-sky-600" />
                <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Built for global families</h2>
              </div>
              <p className="mt-3 text-slate-600">
                Track investments across India, Canada, and the U.S. in one view with automatic currency conversion.
              </p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {REGION_FEATURES.map(({ flag, country, items, badgeClass }) => (
                <div key={country} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-sm font-medium ${badgeClass}`}>
                    <span>{flag}</span>
                    <span>{country}</span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-600">{items}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-slate-100">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <h2 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl">Self-host vs Hosted</h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-slate-600">
              Choose the deployment that fits your privacy and convenience preferences.
            </p>
            <div className="mx-auto mt-10 max-w-3xl space-y-3">
              <div className="hidden items-center gap-3 px-4 py-2 sm:grid sm:grid-cols-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Feature</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Self-Host</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Hosted</span>
              </div>
              {COMPARISON_ROWS.map((row) => (
                <div key={row.feature} className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 p-4 sm:grid-cols-3">
                  <div className="text-sm font-medium text-slate-900">{row.feature}</div>
                  <div className="flex items-center gap-2">
                    <Server className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    <span className="text-sm text-slate-600">{row.self}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Cloud className="h-3.5 w-3.5 shrink-0 text-sky-600" />
                    <span className="text-sm text-slate-600">{row.hosted}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section ref={pricingRef} id="pricing" className="border-t border-slate-100 bg-slate-50/60">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <h2 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl">Pricing</h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-slate-600">
              No surprises. No hidden fees. Your AI keys are always yours.
            </p>
            <div className="mx-auto mt-10 grid max-w-3xl gap-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2">
                  <Server className="h-5 w-5 text-emerald-600" />
                  <h3 className="text-lg font-semibold text-slate-900">Self-Host</h3>
                </div>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-slate-900">Free</span>
                </div>
                <p className="mt-2 text-sm text-slate-600">Full control, all features, no limits.</p>
                <ul className="mt-6 space-y-2.5">
                  {['All features included', 'Full data control', 'Unlimited family members', 'BYOK AI (Gemini, DeepSeek)'].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-slate-700">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-sky-200 bg-white p-6 shadow-sm ring-1 ring-sky-200">
                <div className="flex items-center gap-2">
                  <Cloud className="h-5 w-5 text-sky-600" />
                  <h3 className="text-lg font-semibold text-slate-900">Hosted</h3>
                </div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-slate-900">$1.99</span>
                  <span className="text-sm text-slate-500">/month</span>
                </div>
                <p className="mt-2 text-sm text-slate-600">Cancel anytime \u2014 export and delete your data.</p>
                <ul className="mt-6 space-y-2.5">
                  {['Google sign-in', 'Automatic price sync', 'Family sharing', 'BYOK AI (Gemini, DeepSeek)'].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-slate-700">
                      <CheckCircle2 className="h-4 w-4 text-sky-600" />
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-xs text-slate-400">BYOK is a free add-on regardless of plan.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-slate-100">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Ready to take control?</h2>
              <p className="mt-3 text-base text-slate-600">
                Deploy via Docker in minutes, or sign in with Google for the hosted version.
              </p>
              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Button onClick={onLaunch} className="h-12 rounded-full bg-[#00875A] px-7 text-base text-white hover:bg-[#007A51]">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <a
                  href={REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 items-center gap-2 rounded-full border border-slate-200 bg-white px-6 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  <Github className="h-4 w-4" />
                  View on GitHub
                </a>
              </div>
              <p className="mt-6 text-xs text-slate-400">
                No credit card required. Open source under MIT license.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200/70 bg-slate-50/40">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Wallet className="h-4 w-4" />
              <span>Nexus Portfolio &mdash; open-source, self-hostable</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-slate-700">
                <Github className="h-3.5 w-3.5" />
                GitHub
              </a>
              <a href="/docs" className="hover:text-slate-700">Docs</a>
              <span className="text-slate-300">|</span>
              <span className="text-slate-400">MIT License</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
