import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Server, Download, ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import type { Asset, AssetClassDef } from '../store/db';
import { buildExportPayload, downloadExportFile } from '../lib/dataPortability';
import { getMigrationState, startExport, completeExport } from '../lib/migrationApi';

interface MigrationFlowPanelProps {
  assets: Asset[];
  assetClasses: AssetClassDef[];
  baseCurrency: 'CAD' | 'INR' | 'USD' | 'ORIGINAL';
  primaryCurrency?: 'CAD' | 'INR' | 'USD';
  secondaryCurrency?: 'CAD' | 'INR' | 'USD';
}

type MigrationStep = 'not_started' | 'exporting' | 'exported' | 'importing' | 'imported' | 'verifying' | 'complete';

export function MigrationFlowPanel({
  assets,
  assetClasses,
  baseCurrency,
  primaryCurrency,
  secondaryCurrency,
}: MigrationFlowPanelProps) {
  const { user } = useAuth();
  const [step, setStep] = React.useState<MigrationStep>('not_started');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [checksum, setChecksum] = React.useState('');

  React.useEffect(() => {
    if (!user?.uid) return;
    void getMigrationState().then((state) => {
      if (!state) return;
      const phaseMap: Record<string, MigrationStep> = {
        pending: 'not_started',
        export_started: 'exporting',
        export_complete: 'exported',
        import_started: 'importing',
        import_complete: 'imported',
        verified: 'complete',
        data_deleted: 'complete',
      };
      setStep(phaseMap[state.phase] || 'not_started');
    }).catch(() => {});
  }, [user?.uid]);

  const handleExport = async () => {
    setBusy(true);
    setError(null);

    try {
      const exportData = buildExportPayload({
        assets,
        assetClasses,
        baseCurrency,
        primaryCurrency,
        secondaryCurrency,
      });

      const payloadStr = JSON.stringify(exportData);
      let hash = '';
      if (typeof crypto !== 'undefined' && crypto.subtle) {
        const encoder = new TextEncoder();
        const data = encoder.encode(payloadStr);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        hash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      }

      await startExport({
        assetCount: assets.length,
        assetClassCount: assetClasses.length,
        connectedAccountCount: 0,
        checksum: hash,
      });

      downloadExportFile(exportData);
      setChecksum(hash);

      await completeExport();
      setStep('exported');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async () => {
    setBusy(true);
    setError(null);
    try {
      const mod = await import('../lib/migrationApi');
      const result = await mod.verifyMigration(checksum);
      if (result.match) {
        setStep('complete');
      } else {
        setError(`Asset count mismatch: hosted has ${result.summary.hostedAssets}, self-hosted has ${result.summary.selfHostedAssets}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5" />
          Hosted to Self-Hosted Migration
        </CardTitle>
        <CardDescription>
          Export your portfolio from Nexus Hosted and import it into a self-hosted instance.
          No credentials cross the boundary.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-3">
          <StepRow
            number={1}
            title="Export Portfolio"
            description="Download your portfolio data as JSON"
            status={step === 'exporting' ? 'in_progress' : step === 'exported' || step === 'imported' || step === 'complete' ? 'done' : 'pending'}
            action={
              <Button
                size="sm"
                onClick={handleExport}
                disabled={busy || step !== 'not_started'}
              >
                {busy ? 'Exporting...' : 'Export JSON'}
                <Download className="ml-2 h-4 w-4" />
              </Button>
            }
          />

          <StepRow
            number={2}
            title="Set Up Self-Hosted Instance"
            description="Deploy Nexus on your own infrastructure"
            status={step === 'exported' || step === 'importing' || step === 'imported' || step === 'complete' ? 'done' : step === 'not_started' ? 'pending' : 'disabled'}
            action={
              <Button
                size="sm"
                variant="outline"
                disabled
              >
                <ArrowRight className="mr-2 h-4 w-4" />
                See Guide
              </Button>
            }
          />

          <StepRow
            number={3}
            title="Import Portfolio"
            description="Upload the exported JSON into your self-hosted instance"
            status={step === 'imported' || step === 'complete' ? 'done' : step === 'exported' ? 'pending' : 'disabled'}
            action={null}
          />

          <StepRow
            number={4}
            title="Verify Migration"
            description="Compare asset counts and checksums"
            status={step === 'complete' ? 'done' : step === 'imported' ? 'in_progress' : 'disabled'}
            action={
              step === 'imported' ? (
                <Button size="sm" onClick={handleVerify} disabled={busy}>
                  {busy ? 'Verifying...' : 'Verify'}
                  <CheckCircle2 className="ml-2 h-4 w-4" />
                </Button>
              ) : null
            }
          />
        </div>

        {step === 'complete' && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Migration verified. Your self-hosted instance is ready.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StepRow({
  number,
  title,
  description,
  status,
  action,
}: {
  number: number;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'done' | 'disabled';
  action: React.ReactNode | null;
}) {
  const statusIcon = status === 'done'
    ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
    : status === 'in_progress'
      ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      : <div className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${status === 'disabled' ? 'bg-slate-100 text-slate-300' : 'bg-slate-200 text-slate-500'}`}>{number}</div>;

  return (
    <div className={`flex items-center justify-between gap-4 rounded-lg border p-3 ${status === 'disabled' ? 'border-slate-100 bg-slate-50 opacity-50' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{statusIcon}</div>
        <div>
          <div className={`text-sm font-medium ${status === 'disabled' ? 'text-slate-400' : 'text-slate-900'}`}>{title}</div>
          <div className="text-xs text-slate-500">{description}</div>
        </div>
      </div>
      {action}
    </div>
  );
}
