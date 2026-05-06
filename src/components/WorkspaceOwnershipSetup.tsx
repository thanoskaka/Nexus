import React, { useState } from 'react';
import { Wallet, Globe2, Shield, ArrowRight, ArrowLeft, Key, ExternalLink, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Input } from './ui/input';
import type { FirebaseClientConfig, WorkspaceMode } from '../store/workspaceOwnership';
import { validateFirebaseConfigFields } from '../store/workspaceOwnership';

interface WorkspaceOwnershipSetupProps {
  onChooseMode: (mode: WorkspaceMode, firebaseConfig?: FirebaseClientConfig) => void;
}

const FIREBASE_CONFIG_FIELDS: { key: keyof FirebaseClientConfig; label: string; placeholder: string }[] = [
  { key: 'apiKey', label: 'API Key', placeholder: 'AIza...' },
  { key: 'authDomain', label: 'Auth Domain', placeholder: 'project.firebaseapp.com' },
  { key: 'projectId', label: 'Project ID', placeholder: 'my-project-id' },
  { key: 'storageBucket', label: 'Storage Bucket', placeholder: 'project.appspot.com' },
  { key: 'messagingSenderId', label: 'Messaging Sender ID', placeholder: '123456789' },
  { key: 'appId', label: 'App ID', placeholder: '1:123:web:abc' },
];

export function WorkspaceOwnershipSetup({ onChooseMode }: WorkspaceOwnershipSetupProps) {
  const [step, setStep] = useState<'choose' | 'selfOwned'>('choose');
  const [form, setForm] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const handleFieldChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (submitted) {
      const newErrors = validateFirebaseConfigFields({ ...form, [key]: value } as FirebaseClientConfig);
      setErrors(newErrors);
    }
  };

  const handleHostedChoice = () => {
    onChooseMode('hosted');
  };

  const handleSelfOwnedNext = () => {
    setStep('selfOwned');
  };

  const handleSelfOwnedBack = () => {
    setStep('choose');
  };

  const handleSubmit = () => {
    setSubmitted(true);
    const validationErrors = validateFirebaseConfigFields(form as FirebaseClientConfig);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    onChooseMode('selfOwned', form as FirebaseClientConfig);
  };

  if (step === 'selfOwned') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F9FA] dark:bg-slate-900 px-4 py-12">
        <div className="w-full max-w-xl">
          <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400">
            <Key className="h-6 w-6" />
          </div>
          <h1 className="text-center text-2xl font-bold text-slate-900 dark:text-white mb-2">Configure Your Firebase</h1>
          <p className="text-center text-sm text-slate-500 dark:text-slate-400 mb-8">
            Enter your Firebase project client configuration from the Firebase Console (Project Settings &gt; General &gt; Your apps &gt; Web app).
            These are public client-side values. You still sign into Nexus with Google &mdash; your portfolio data will connect to your Firebase project.
          </p>

          <Card className="shadow-sm">
            <CardContent className="pt-6 space-y-4">
              {FIREBASE_CONFIG_FIELDS.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    {field.label}
                  </label>
                  <Input
                    value={form[field.key] || ''}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className={errors[field.key] ? 'border-red-400 dark:border-red-500' : ''}
                    aria-invalid={!!errors[field.key]}
                  />
                  {errors[field.key] && (
                    <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors[field.key]}</p>
                  )}
                </div>
              ))}

              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950 p-4">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  These are public Firebase client configuration values.
                  Server-side Admin credentials are configured separately in{' '}
                  <strong>Settings &gt; Integrations</strong> or via setup docs.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <Button variant="outline" onClick={handleSelfOwnedBack} className="flex-1">
                  <ArrowLeft className="h-4 w-4 mr-1.5" />
                  Back
                </Button>
                <Button onClick={handleSubmit} className="flex-1 bg-sky-600 hover:bg-sky-700 text-white">
                  Save &amp; Continue
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
            Need help? See the{' '}
            <a href="/docs/localhost" className="text-sky-600 dark:text-sky-400 underline">
              setup docs
            </a>{' '}
            for Firebase configuration instructions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8F9FA] dark:bg-slate-900 px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00875A]">
            <Wallet className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">Welcome to Nexus Portfolio</h1>
          <p className="text-lg text-slate-500 dark:text-slate-400">
            You still sign into Nexus. Choose how your portfolio data is stored.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="relative shadow-sm border-emerald-200 dark:border-emerald-800 hover:shadow-md transition-shadow cursor-pointer" onClick={handleHostedChoice}>
            <CardContent className="pt-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                <Globe2 className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Use Nexus Hosted</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Your portfolio data is stored in Nexus-hosted infrastructure. No setup required &mdash; just sign in and start tracking.
              </p>
              <ul className="mt-4 space-y-2">
                {[
                  'Zero configuration required',
                  'Automatic backups and updates',
                  'Shared portfolio with family members',
                ].map((text) => (
                  <li key={text} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <Check className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <Button className="w-full bg-[#00875A] hover:bg-emerald-700 text-white" onClick={(e) => { e.stopPropagation(); handleHostedChoice(); }}>
                  Use Nexus Hosted
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="relative shadow-sm border-sky-200 dark:border-sky-800 hover:shadow-md transition-shadow cursor-pointer" onClick={handleSelfOwnedNext}>
            <CardContent className="pt-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400">
                <Shield className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Bring Your Own Firebase</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                You still sign into Nexus. Your portfolio data connects to your Firebase project under your control.
              </p>
              <ul className="mt-4 space-y-2">
                {[
                  'Full data ownership and privacy',
                  'Use your own Firebase project',
                  'Still use Nexus app and login',
                ].map((text) => (
                  <li key={text} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <Check className="h-4 w-4 mt-0.5 text-sky-500 shrink-0" />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <Button variant="outline" className="w-full border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-400" onClick={(e) => { e.stopPropagation(); handleSelfOwnedNext(); }}>
                  Configure My Firebase
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <a href="/docs/localhost" className="inline-flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400">
            <ExternalLink className="h-3.5 w-3.5" />
            Learn more about setup modes in the docs
          </a>
        </div>
      </div>
    </div>
  );
}
