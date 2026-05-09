import React from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Upload, AlertTriangle, CheckCircle2, FileText } from 'lucide-react';
import { parseHistoricalCSV, type HistoricalImportParseResult } from '../lib/historicalImport';

interface HistoricalImportModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (rows: Array<{ ticker: string; date: string; price: number; currency: string }>) => Promise<void>;
  defaultCurrency: string;
}

export function HistoricalImportModal({
  open,
  onClose,
  onImport,
  defaultCurrency,
}: HistoricalImportModalProps) {
  const [parseResult, setParseResult] = React.useState<HistoricalImportParseResult | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setParseResult(null);
      setError(null);
      setSuccess(false);
    }
  }, [open]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setParseResult(null);
    setSuccess(false);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (!content) {
        setError('Could not read file');
        return;
      }

      const result = parseHistoricalCSV(content, defaultCurrency);
      if (result.errors.length > 0) {
        setError(result.errors.join('\n'));
        return;
      }

      setParseResult(result);
    };
    reader.onerror = () => setError('Failed to read file');
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!parseResult || parseResult.rows.length === 0) return;

    setBusy(true);
    setError(null);
    try {
      await onImport(parseResult.rows);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogHeader>
        <DialogTitle>Import Historical Data</DialogTitle>
        <DialogDescription>
          Upload a CSV file with historical prices for growth chart tracking.
          Required columns: date (YYYY-MM-DD), ticker, price. Optional: currency.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 p-4">
        {!parseResult && !success && (
          <div>
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-slate-500 hover:border-slate-400 hover:bg-slate-100">
              <Upload className="mb-2 h-8 w-8" />
              <span className="text-sm font-medium">Choose CSV file</span>
              <span className="mt-1 text-xs">or drag and drop</span>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <pre className="whitespace-pre-wrap font-sans text-sm">{error}</pre>
          </div>
        )}

        {parseResult && !success && (
          <div className="space-y-3">
            <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
              <div className="flex items-center gap-2 font-medium text-slate-900">
                <FileText className="h-4 w-4" />
                Preview
              </div>
              <div className="mt-2 space-y-1 text-slate-600">
                <div>{parseResult.summary.totalRows} price points</div>
                <div>{parseResult.summary.uniqueTickers} unique tickers</div>
                {parseResult.summary.dateRange && (
                  <div>
                    {parseResult.summary.dateRange.earliest} to {parseResult.summary.dateRange.latest}
                  </div>
                )}
              </div>
              {parseResult.warnings.length > 0 && (
                <div className="mt-2 text-xs text-amber-600">
                  {parseResult.warnings.length} warning(s)
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleImport} disabled={busy}>
                {busy ? 'Importing...' : `Import ${parseResult.rows.length} rows`}
              </Button>
            </div>
          </div>
        )}

        {success && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <div className="text-sm font-medium">Historical data imported successfully</div>
            </div>
            <Button onClick={onClose} className="w-full">Done</Button>
          </div>
        )}
      </div>
    </Dialog>
  );
}
