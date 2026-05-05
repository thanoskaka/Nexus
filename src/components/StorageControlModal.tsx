import React from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Globe2, Shield, LayoutGrid, Database, Key, HardDrive, Server } from 'lucide-react';
import type { StorageControlSnapshot, KeySourceMode } from '../lib/storageControlStatus';
import { ACTIVE_MODE_LABELS } from '../lib/storageControlStatus';

interface StorageControlModalProps {
  open: boolean;
  onClose: () => void;
  snapshot: StorageControlSnapshot;
}

const OVERALL_COLORS: Record<string, string> = {
  'nexus-hosted': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200',
  'self-owned': 'bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200',
  mixed: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200',
};

const ACTIVE_COLORS: Record<KeySourceMode, string> = {
  'hosted-default': 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  'user-key': 'bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300 border-sky-200 dark:border-sky-800',
  'local-only': 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  none: 'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
};

export function StorageControlModal({ open, onClose, snapshot }: StorageControlModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <div className="space-y-5 p-1">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <DialogTitle>Storage &amp; Control</DialogTitle>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${OVERALL_COLORS[snapshot.overall]}`}>
              {snapshot.overall === 'nexus-hosted' && <Globe2 className="h-3 w-3" />}
              {snapshot.overall === 'self-owned' && <Shield className="h-3 w-3" />}
              {snapshot.overall === 'mixed' && <LayoutGrid className="h-3 w-3" />}
              {snapshot.overall === 'nexus-hosted' ? 'Nexus Hosted' : snapshot.overall === 'self-owned' ? 'Self-Owned' : 'Mixed'}
            </span>
          </div>
          <DialogDescription>Understand where your portfolio data and API keys live, and what you control.</DialogDescription>
        </DialogHeader>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 mb-2">
            <Database className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Where your data lives</h3>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{snapshot.whereDataLives}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 mb-3">
            <Key className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Where your API keys live</h3>
          </div>
          <div className="space-y-2">
            {snapshot.providers.map((p) => (
              <div key={p.providerId} className="flex items-center justify-between gap-3 rounded-lg border bg-white p-2.5 dark:bg-slate-950">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-900 dark:text-white">{p.label}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{p.description}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${ACTIVE_COLORS[p.activeMode]}`}>
                    {p.storageLocation === 'encrypted-server' ? <Server className="h-3 w-3" /> : <HardDrive className="h-3 w-3" />}
                    {ACTIVE_MODE_LABELS[p.activeMode]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">What you control</h3>
          </div>
          <ul className="space-y-1.5">
            {snapshot.userControls.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">{i + 1}</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Dialog>
  );
}
