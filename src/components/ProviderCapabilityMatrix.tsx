import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Button } from './ui/button';
import { Loader2, CheckCircle, XCircle, ExternalLink, AlertCircle, Grid3X3 } from 'lucide-react';
import { fetchSetupStatus, type SetupStatusResponse } from '../lib/setupStatusApi';
import {
  getProviderCapabilityRows,
  postureBadgeStyle,
  statusBadgeStyle,
  statusLabel,
  postureLabel,
  type ProviderCapabilityDisplayRow,
} from '../lib/providerCapabilities';

function SetupStatusBadge({ status }: { status: ProviderCapabilityDisplayRow['setupStatus'] }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeStyle(status)}`}>
      {statusLabel(status)}
    </span>
  );
}

function CostPostureBadge({ posture }: { posture: ProviderCapabilityDisplayRow['costPosture'] }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${postureBadgeStyle(posture)}`}>
      {postureLabel(posture)}
    </span>
  );
}

function BooleanBadge({ value }: { value: boolean }) {
  if (value) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
        <CheckCircle className="h-3 w-3" />
        Yes
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
      <XCircle className="h-3 w-3" />
      No
    </span>
  );
}

export function ProviderCapabilityMatrix() {
  const [data, setData] = useState<SetupStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchSetupStatus();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load setup status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = data ? getProviderCapabilityRows(data) : [];

  return (
    <Card className="border-none shadow-sm rounded-2xl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Grid3X3 className="h-5 w-5 text-slate-700 dark:text-slate-300" />
          <CardTitle>Provider Capability Matrix</CardTitle>
        </div>
        <CardDescription>
          Overview of every provider, its cost model, and current setup state in this deployment.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="flex items-center gap-2 text-sm text-rose-600 dark:text-rose-400">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
            <Button variant="outline" size="sm" onClick={load} className="rounded-full">
              Retry
            </Button>
          </div>
        )}

        {!loading && !error && rows.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Capability</TableHead>
                  <TableHead>Hosted Available</TableHead>
                  <TableHead>User Key Supported</TableHead>
                  <TableHead>Cost Posture</TableHead>
                  <TableHead>Setup Status</TableHead>
                  <TableHead className="pr-4 text-right">Docs / Setup</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell className="pl-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{row.capability}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{row.description}</div>
                    </TableCell>
                    <TableCell>
                      <BooleanBadge value={row.hostedAvailable} />
                    </TableCell>
                    <TableCell>
                      <BooleanBadge value={row.userKeySupported} />
                    </TableCell>
                    <TableCell>
                      <CostPostureBadge posture={row.costPosture} />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <SetupStatusBadge status={row.setupStatus} />
                        <div className="text-xs text-slate-500 dark:text-slate-400">{row.setupHint}</div>
                      </div>
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      {row.docsPath && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs rounded-full"
                          onClick={() => {
                            window.location.href = '/?view=docs';
                          }}
                        >
                          <ExternalLink className="mr-1 h-3 w-3" />
                          {row.setupStatus === 'ready' ? 'View docs' : 'Setup guide'}
                        </Button>
                      )}
                      {!row.docsPath && (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {!loading && !error && rows.length === 0 && (
          <div className="flex items-center justify-center py-8 text-sm text-slate-500 dark:text-slate-400">
            No provider data available.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
