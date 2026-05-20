import React from 'react';
import { saveConnectedHoldingOverride } from '../lib/connectedAccountsApi';
import { Button } from './ui/button';
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  holdingId: string | null;
  holdingName: string;
  currentLabel?: string;
  currentOwner?: string;
  currentAssetClass?: string;
  currentNotes?: string;
  onSaved?: () => void;
};

export function ConnectedHoldingOverrideModal({
  open,
  onOpenChange,
  holdingId,
  holdingName,
  currentLabel,
  currentOwner,
  currentAssetClass,
  currentNotes,
  onSaved,
}: Props) {
  const [customLabel, setCustomLabel] = React.useState('');
  const [ownerOverride, setOwnerOverride] = React.useState('');
  const [assetClassOverride, setAssetClassOverride] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setCustomLabel(currentLabel || '');
    setOwnerOverride(currentOwner || '');
    setAssetClassOverride(currentAssetClass || '');
    setNotes(currentNotes || '');
    setError(null);
  }, [open, currentAssetClass, currentLabel, currentNotes, currentOwner]);

  const handleSave = React.useCallback(async () => {
    if (!holdingId) return;
    setSaving(true);
    setError(null);
    try {
      await saveConnectedHoldingOverride(holdingId, {
        customLabel: customLabel.trim() || undefined,
        ownerOverride: ownerOverride.trim() || undefined,
        assetClassOverride: assetClassOverride.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onSaved?.();
      onOpenChange(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save override.');
    } finally {
      setSaving(false);
    }
  }, [assetClassOverride, customLabel, holdingId, notes, onOpenChange, onSaved, ownerOverride]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Override Connected Holding</DialogTitle>
        <DialogDescription>
          Adjust display metadata for <span className="font-medium">{holdingName || 'this holding'}</span> without breaking sync.
        </DialogDescription>
      </DialogHeader>

      <div className="mt-4 space-y-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Custom label</label>
          <Input value={customLabel} onChange={(event) => setCustomLabel(event.target.value)} placeholder="Optional custom display name" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Owner override</label>
          <Input value={ownerOverride} onChange={(event) => setOwnerOverride(event.target.value)} placeholder="Optional owner override" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Asset class override</label>
          <Input value={assetClassOverride} onChange={(event) => setAssetClassOverride(event.target.value)} placeholder="Optional asset class override" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Notes</label>
          <Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional note" />
        </div>

        {error ? (
          <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>
        ) : null}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={() => void handleSave()} disabled={!holdingId || saving}>
            {saving ? 'Saving...' : 'Save override'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
