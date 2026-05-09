import React, { useState } from 'react';
import { Wallet, ArrowRight, CheckCircle2, Sparkles, ChevronDown, Github, BookOpen, ExternalLink, Server, Cloud, Building2, Download, Shield } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';

interface PricingPageProps {
  onLaunch: () => void;
}

const REPO_URL = 'https://github.com/shubhamg0406/Nexus';

const TIERS = [
  {
    icon: Server,
    name: 'Self-Hosted',
    price: 'Free',
    period: 'forever',
    accent: 'sky',
    description: 'Full product, your own infrastructure.',
    features: [
      'Complete Nexus Portfolio feature set',
      'Your own Firebase project & data',
      'Self-managed updates & backups',
      'Docker + Postgres setup in progress',
      'MIT license — no restrictions',
    ],
    cta: 'Deploy self-hosted',
    href: REPO_URL,
    external: true,
  },
  {
    icon: Cloud,
    name: 'Nexus Cloud',
    price: '$1.99',
    period: '/month',
    accent: 'emerald',
    popular: true,
    description: 'Hosted, encrypted, managed.',
    features: [
      'Managed hosting & automatic updates',
      'Encrypted credential storage',
      'Google sign-in — no server setup',
      'Pricing near infrastructure cost',
      'Cancel anytime — export your data, delete from server',
    ],
    cta: 'Start hosted',
    onClick: true,
  },
  {
    icon: Building2,
    name: 'Enterprise / Custom',
    price: 'Contact us',
    period: '',
    accent: 'violet',
    description: 'For family offices & advisors.',
    features: [
      'Private deployment options',
      'Custom integration support',
      'Dedicated onboarding assistance',
      'White-label possibilities',
      'SLA & priority support available',
    ],
    cta: 'Get in touch',
    href: 'mailto:hello@nexusportfolio.app',
    external: true,
  },
];

const FAQS = [
  {
    q: 'Can I migrate from cloud to self-hosted?',
    a: 'Yes. Your data in Nexus Cloud is portable — you can export it and point a self-hosted instance at your own Firebase project at any time. No lock-in.',
  },
  {
    q: 'Who can see my data?',
    a: 'You control access entirely. In self-hosted mode, data lives in your Firebase — Nexus has zero visibility. In Nexus Cloud, data is encrypted at rest and in transit; we do not access or share your financial information.',
  },
  {
    q: 'Do I need to bring API keys?',
    a: 'Not for the free tier. Nexus includes built-in pricing sources at no extra cost. For redundancy or advanced coverage, you may optionally bring your own API keys (Gemini/DeepSeek for AI features, or premium market data providers).',
  },
  {
    q: 'Is Plaid supported?',
    a: 'Not yet. Plaid integration is on the roadmap but not currently implemented. Today we support manual asset entry, Upstox (India brokerage), and Splitwise (shared expenses).',
  },
  {
    q: 'What integrations exist today?',
    a: 'Upstox for Indian brokerage auto-sync, Splitwise for shared expense tracking, and manual asset entry for everything else. AI assistant supports BYOK with Gemini and DeepSeek.',
  },
  {
    q: 'Is this freemium?',
    a: 'No free tier limits, no artificial caps. Self-hosted is free forever with the full product. Nexus Cloud is $1.99/month — no feature gating, no upsells, cancel anytime.',
  },
];

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-slate-200/60 last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
      >
        <span className="text-sm font-medium text-slate-900">{question}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open && (
        <div className="pb-5">
          <p className="text-sm leading-7 text-slate-600">{answer}</p>
        </div>
      )}
    </div>
  );
}

export function PricingPage({ onLaunch }: PricingPageProps) {
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/80 via-white to-sky-50/40 text-slate-900">
      <header className="border-b border-slate-200/60 bg-white/70 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <a href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#00875A] shadow-sm">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <div className="text-lg font-bold tracking-tight">Nexus Portfolio</div>
              <div className="text-xs font-medium text-slate-500">Shared family wealth tracking</div>
            </div>
          </a>
          <nav className="flex items-center gap-6">
            <a href="/docs" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Docs
            </a>
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              GitHub
            </a>
            <Button onClick={onLaunch} className="rounded-full bg-[#00875A] px-5 text-white hover:bg-[#007A51]">
              Get Started
            </Button>
          </nav>
        </div>
      </header>

      <main>
        <section className="container mx-auto px-4 pt-16 pb-8 lg:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-4 py-2 text-sm font-medium text-emerald-800 shadow-sm">
              <Sparkles className="h-4 w-4" />
              Simple, transparent pricing
            </div>
            <h1 className="mt-6 text-4xl font-black leading-[1.08] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Self-host free forever.
              <br />
              Hosted for the cost of a coffee.
            </h1>
            <p className="mt-5 mx-auto max-w-2xl text-lg leading-8 text-slate-600">
              Nexus Portfolio is built to be accessible. Run it yourself at no cost, or let us handle the infrastructure for a small monthly fee.
            </p>
            <a href="/" className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700">
              <ArrowRight className="h-3.5 w-3.5 rotate-180" />
              Back to home
            </a>
          </div>
        </section>

        <section className="container mx-auto px-4 py-10">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-6 lg:grid-cols-3">
              {TIERS.map((tier, idx) => (
                <div
                  key={idx}
                  className={`relative rounded-3xl border bg-white/90 p-8 shadow-[0_8px_30px_rgba(15,23,42,0.04)] transition-shadow hover:shadow-[0_12px_40px_rgba(15,23,42,0.08)] ${
                    tier.popular
                      ? 'border-emerald-200 ring-1 ring-emerald-200'
                      : 'border-slate-200/80'
                  }`}
                >
                  {tier.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 px-4 py-1 text-xs font-semibold text-white shadow-sm">
                      Most accessible
                    </div>
                  )}
                  <div
                    className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${
                      tier.accent === 'emerald'
                        ? 'bg-emerald-50 text-emerald-600'
                        : tier.accent === 'sky'
                          ? 'bg-sky-50 text-sky-600'
                          : 'bg-violet-50 text-violet-600'
                    }`}
                  >
                    <tier.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">{tier.name}</h3>
                  <div className="mt-3">
                    <span className="text-3xl font-black text-slate-950">{tier.price}</span>
                    {tier.period && (
                      <span className="ml-1 text-sm text-slate-500">{tier.period}</span>
                    )}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{tier.description}</p>
                  <ul className="mt-6 space-y-3">
                    {tier.features.map((feature, fi) => (
                      <li key={fi} className="flex items-start gap-2.5 text-sm text-slate-700">
                        <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${
                          tier.accent === 'emerald'
                            ? 'text-emerald-500'
                            : tier.accent === 'sky'
                              ? 'text-sky-500'
                              : 'text-violet-500'
                        }`} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8">
                    {'onClick' in tier ? (
                      <Button
                        onClick={onLaunch}
                        className="w-full rounded-full bg-[#00875A] text-white hover:bg-[#007A51]"
                      >
                        {tier.cta}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    ) : (
                      <a
                        href={tier.href}
                        target={tier.external ? '_blank' : undefined}
                        rel={tier.external ? 'noopener noreferrer' : undefined}
                        className="inline-flex w-full items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                      >
                        {tier.cta}
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </a>
                    )}
                  </div>
                  {tier.popular && (
                    <div className="mt-4 text-center">
                      <button
                        onClick={() => setCancelDialogOpen(true)}
                        className="text-xs font-medium text-slate-400 underline underline-offset-2 hover:text-slate-600 transition-colors"
                      >
                        Cancel anytime
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-10 lg:py-16">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center text-2xl font-bold text-slate-900">
              Frequently asked questions
            </h2>
            <div className="mt-8 divide-y divide-slate-200/60 rounded-2xl border border-slate-200/80 bg-white/90 px-6">
              {FAQS.map((faq) => (
                <div key={faq.q}>
                  <FaqItem question={faq.q} answer={faq.a} />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-10 lg:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-slate-900">Ready to get started?</h2>
            <p className="mt-3 text-base text-slate-600">
              Create a Nexus account, then choose hosted or self-owned setup. No credit card required.
            </p>
            <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button onClick={onLaunch} className="h-12 rounded-full bg-[#00875A] px-7 text-base text-white hover:bg-[#007A51]">
                Get Started
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
              <a href="/docs" className="hover:text-slate-700">
                Docs
              </a>
              <a href="/pricing" className="hover:text-slate-700">
                Pricing
              </a>
              <span className="text-slate-300">|</span>
              <span className="text-slate-400">MIT License</span>
            </div>
          </div>
        </div>
      </footer>
      
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <div className="mx-auto max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel your subscription</DialogTitle>
            <DialogDescription>
              Cancel anytime, take an export of your data and delete from Nexus server.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 space-y-3">
              <div className="flex items-start gap-3">
                <Download className="h-4 w-4 mt-0.5 text-slate-500 shrink-0" />
                <span>Export your portfolio data (CSV) before cancelling so you have a copy of your records.</span>
              </div>
              <div className="flex items-start gap-3">
                <Shield className="h-4 w-4 mt-0.5 text-slate-500 shrink-0" />
                <span>Once cancelled, your portfolio data, connected accounts, and API credentials are permanently deleted from Nexus servers.</span>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCancelDialogOpen(false)} className="rounded-full">
                Keep my account
              </Button>
              <Button className="rounded-full bg-red-600 text-white hover:bg-red-700">
                Request cancellation
              </Button>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
