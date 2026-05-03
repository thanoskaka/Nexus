import React from 'react';
import { Wallet } from 'lucide-react';

interface CenteredStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function CenteredState({ title, description, action }: CenteredStateProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8F9FA] px-4">
      <div className="w-full max-w-lg rounded-3xl border border-white/70 bg-white/85 p-8 text-center shadow-[0_30px_80px_rgba(15,23,42,0.10)] backdrop-blur">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00875A]">
          <Wallet className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
        <p className="mt-3 text-base text-slate-600">{description}</p>
        {action && <div className="mt-6 flex justify-center">{action}</div>}
      </div>
    </div>
  );
}
