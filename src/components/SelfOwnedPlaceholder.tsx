import React from 'react';
import { Wallet, Shield, ArrowRight, ExternalLink, BookOpen } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import type { FirebaseClientConfig } from '../store/workspaceOwnership';

interface SelfOwnedPlaceholderProps {
  firebaseConfig?: FirebaseClientConfig;
  onSwitchToHosted: () => void;
}

export function SelfOwnedPlaceholder({ firebaseConfig, onSwitchToHosted }: SelfOwnedPlaceholderProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8F9FA] dark:bg-slate-900 px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-950">
            <Shield className="h-7 w-7 text-amber-600 dark:text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Self-Owned Firebase &mdash; Draft Saved</h1>
          <p className="text-base text-slate-500 dark:text-slate-400">
            Your Firebase configuration has been saved as a draft. The self-owned data connection is not active yet.
          </p>
        </div>

        <Card className="shadow-sm mb-6">
          <CardContent className="pt-6 space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4">
              <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                Self-owned data connection is not active yet.
              </p>
              <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                Your Nexus portfolio is currently using the hosted data layer. True self-owned Firebase routing requires additional server-side configuration that is not yet implemented in this build.
              </p>
            </div>

            {firebaseConfig && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Saved Draft Configuration</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Project ID:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{firebaseConfig.projectId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Auth Domain:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{firebaseConfig.authDomain}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Storage Bucket:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{firebaseConfig.storageBucket}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-sky-200 bg-sky-50 dark:border-sky-800 dark:bg-sky-950/30 p-4">
              <div className="flex items-start gap-3">
                <BookOpen className="h-5 w-5 text-sky-600 dark:text-sky-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-sky-800 dark:text-sky-200">
                    Next steps for self-owned setup
                  </p>
                  <p className="mt-1 text-sm text-sky-700 dark:text-sky-300">
                    To fully activate self-owned data routing, you need to configure Firebase Admin credentials on the server. See the{' '}
                    <a href="/docs/development" className="underline font-medium">
                      setup documentation
                    </a>{' '}
                    for instructions.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Button
                onClick={onSwitchToHosted}
                className="w-full bg-[#00875A] hover:bg-emerald-700 text-white"
              >
                Use Nexus Hosted Instead
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>

            <p className="text-xs text-center text-slate-400 dark:text-slate-500">
              Switching to hosted clears your self-owned draft. Your saved data is not affected.
            </p>
          </CardContent>
        </Card>

        <div className="text-center">
          <a href="/docs" className="inline-flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400">
            <ExternalLink className="h-3.5 w-3.5" />
            View all documentation
          </a>
        </div>
      </div>
    </div>
  );
}
