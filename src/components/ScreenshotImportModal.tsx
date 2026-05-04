import React, { useCallback, useRef, useState } from 'react';
import { usePortfolio } from '../store/PortfolioContext';
import { Button } from './ui/button';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Select } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Upload, Image, AlertCircle, CheckCircle, HelpCircle, Loader2, ScanLine, Camera } from 'lucide-react';
import { extractAssetsFromScreenshots, type ExtractedAsset } from '../lib/screenshotImport';
import type { Asset } from '../store/db';

type MatchAction = 'add_new' | 'update';
type QuantityStrategy = 'replace' | 'add';

interface ImportCandidate {
  id: string;
  extracted: ExtractedAsset;
  excluded: boolean;
  matchAction: MatchAction;
  quantityStrategy: QuantityStrategy;
  matchedAsset: Asset | null;
  matchConfidence: 'exact' | 'fuzzy' | 'none';
}

function findBestMatch(
  extracted: ExtractedAsset,
  existingAssets: Asset[],
): { asset: Asset; confidence: 'exact' | 'fuzzy' } | null {
  const normalizedName = extracted.name.toLowerCase().trim();
  const normalizedTicker = (extracted.ticker || '').toLowerCase().trim();

  for (const asset of existingAssets) {
    const assetName = asset.name.toLowerCase().trim();
    const assetTicker = (asset.ticker || '').toLowerCase().trim();

    if (normalizedTicker && assetTicker && normalizedTicker === assetTicker) {
      return { asset, confidence: 'exact' };
    }

    if (normalizedName && assetName && normalizedName === assetName) {
      return { asset, confidence: 'exact' };
    }
  }

  for (const asset of existingAssets) {
    const assetName = asset.name.toLowerCase().trim();
    if (normalizedName && assetName && (normalizedName.includes(assetName) || assetName.includes(normalizedName))) {
      return { asset, confidence: 'fuzzy' };
    }
  }

  return null;
}

interface ScreenshotImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ScreenshotImportModal({ open, onOpenChange }: ScreenshotImportModalProps) {
  const { assets, addAsset, importAssets } = usePortfolio();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [candidates, setCandidates] = useState<ImportCandidate[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [isCommitting, setIsCommitting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const reset = useCallback(() => {
    setFiles([]);
    setCandidates([]);
    setErrors([]);
    setIsProcessing(false);
    setIsCommitting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...selected]);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const dropped: File[] = Array.from(e.dataTransfer.files || []);
    const imageFiles = dropped.filter((f) =>
      ['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif'].includes(f.type) ||
      f.name.match(/\.(png|jpe?g|webp|heic|heif)$/i),
    );
    if (imageFiles.length > 0) {
      setFiles((prev) => [...prev, ...imageFiles]);
    }
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleExtract = useCallback(async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setErrors([]);
    setCandidates([]);

    try {
      const result = await extractAssetsFromScreenshots(files, (progress) => {
        if (progress.status === 'error') {
          setErrors((prev) => [...prev, progress.message]);
        }
      });

      if (result.errors.length > 0) {
        setErrors(result.errors);
      }

      const existingManualAssets = assets.filter((a) => !a.sourceManaged);
      const mapped: ImportCandidate[] = result.candidates.map((extracted, index) => {
        const match = findBestMatch(extracted, existingManualAssets);
        return {
          id: `candidate-${Date.now()}-${index}`,
          extracted,
          excluded: false,
          matchAction: match ? 'update' : 'add_new',
          quantityStrategy: 'replace',
          matchedAsset: match?.asset || null,
          matchConfidence: match?.confidence || 'none',
        };
      });

      setCandidates(mapped);
    } catch (error) {
      setErrors((prev) => [...prev, error instanceof Error ? error.message : 'Extraction failed.']);
    } finally {
      setIsProcessing(false);
    }
  }, [files, assets]);

  const updateCandidate = useCallback((id: string, updates: Partial<ImportCandidate>) => {
    setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  }, []);

  const updateExtractedField = useCallback(<K extends keyof ExtractedAsset>(
    id: string,
    field: K,
    value: ExtractedAsset[K],
  ) => {
    setCandidates((prev) => prev.map((c) =>
      c.id === id ? { ...c, extracted: { ...c.extracted, [field]: value } } : c,
    ));
  }, []);

  const toggleExcluded = useCallback((id: string) => {
    setCandidates((prev) => prev.map((c) =>
      c.id === id ? { ...c, excluded: !c.excluded } : c,
    ));
  }, []);

  const handleCommit = useCallback(async () => {
    setIsCommitting(true);
    try {
      const selected = candidates.filter(
        (c) => !c.excluded && (c.matchAction === 'add_new' || (c.matchAction === 'update' && c.matchedAsset)),
      );
      const newAssets: Asset[] = [];
      const updatedAssets: Asset[] = [...assets];

      for (const candidate of selected) {
        const { extracted } = candidate;

        const quantity = Number.isFinite(extracted.quantity) ? extracted.quantity : 0;
        const price = Number.isFinite(extracted.price) ? extracted.price : 0;
        const costBasis = quantity * price;

        const currency = (extracted.currency === 'INR' || extracted.currency === 'USD')
          ? extracted.currency
          : (extracted.country === 'India' ? 'INR' : 'CAD') as Asset['currency'];
        const country = (extracted.country === 'India' || extracted.country === 'Canada')
          ? extracted.country
          : currency === 'INR' ? 'India' : 'Canada';
        const assetClass = extracted.assetClass || 'Other';

        if (candidate.matchAction === 'add_new') {
          newAssets.push({
            id: crypto.randomUUID(),
            name: extracted.name,
            ticker: extracted.ticker || undefined,
            quantity,
            costBasis,
            currency,
            owner: '',
            country: country as Asset['country'],
            assetClass,
            autoUpdate: Boolean(extracted.ticker),
            currentPrice: price > 0 ? price : undefined,
            lastUpdated: Date.now(),
            purchaseDate: undefined,
            holdingPlatform: undefined,
            comments: undefined,
          });
        } else if (candidate.matchAction === 'update' && candidate.matchedAsset) {
          const existing = updatedAssets.find((a) => a.id === candidate.matchedAsset!.id);
          if (existing) {
            const existingQty = Number.isFinite(existing.quantity) ? existing.quantity : 0;
            const mergeQty = candidate.quantityStrategy === 'add'
              ? existingQty + quantity
              : quantity;
            const newCostBasis = candidate.quantityStrategy === 'add'
              ? existing.costBasis + costBasis
              : costBasis;

            updatedAssets[updatedAssets.indexOf(existing)] = {
              ...existing,
              quantity: mergeQty,
              costBasis: newCostBasis > 0 ? newCostBasis : existing.costBasis,
              currentPrice: price > 0 ? price : existing.currentPrice,
              lastUpdated: Date.now(),
            };
          }
        }
      }

      const finalAssets = [...updatedAssets.filter((a) => !newAssets.some((n) => n.id === a.id)), ...newAssets];
      await importAssets(finalAssets);
      reset();
      onOpenChange(false);
    } catch (error) {
      setErrors((prev) => [...prev, error instanceof Error ? error.message : 'Commit failed.']);
    } finally {
      setIsCommitting(false);
    }
  }, [candidates, assets, importAssets, reset, onOpenChange]);

  const newCount = candidates.filter((c) => !c.excluded && c.matchAction === 'add_new').length;
  const updateCount = candidates.filter((c) => !c.excluded && c.matchAction === 'update' && c.matchedAsset).length;
  const excludedCount = candidates.filter((c) => c.excluded).length;
  const approvedCount = candidates.length - excludedCount;
  const totalImportable = newCount + updateCount;

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!isProcessing && !isCommitting) { onOpenChange(value); if (!value) reset(); } }}>
      <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800">
            <ScanLine className="h-5 w-5 text-slate-700 dark:text-slate-300" />
          </div>
          <div>
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">Screenshot Import</DialogTitle>
            <DialogDescription className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Upload screenshots of broker holdings or transaction receipts. AI extracts asset data for import.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="space-y-5">
        {candidates.length === 0 && !isProcessing && (
          <>
            <div
              className={`relative rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
                isDragOver
                  ? 'border-emerald-400 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/20'
                  : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center gap-3">
                <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800">
                  <Camera className="h-8 w-8 text-slate-500 dark:text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Drop screenshots here, or click to browse
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    PNG, JPEG, WebP, HEIC — up to 20MB each
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/heic,image/heif"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                  aria-label="Upload screenshot files"
                />
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Select Files
                </Button>
              </div>
            </div>

            {files.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Selected files ({files.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {files.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-2 text-sm"
                    >
                      <Image className="h-4 w-4 text-slate-500 shrink-0" />
                      <span className="text-slate-700 dark:text-slate-300 truncate max-w-[200px]">{file.name}</span>
                      <button
                        className="text-slate-400 hover:text-red-500 ml-1"
                        onClick={() => removeFile(index)}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                className="rounded-full bg-[#00875A] text-white hover:bg-[#007A51]"
                disabled={files.length === 0}
                onClick={handleExtract}
              >
                <ScanLine className="mr-2 h-4 w-4" />
                Extract Assets from Screenshots
              </Button>
            </div>
          </>
        )}

        {isProcessing && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-slate-400" />
            <div className="text-center">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">AI is analyzing your screenshots...</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Gemini Vision is extracting asset names, quantities, and prices
              </p>
            </div>
          </div>
        )}

        {candidates.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Found {candidates.length} asset{candidates.length !== 1 ? 's' : ''}
                </span>
                {excludedCount > 0 && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    {approvedCount} approved
                  </span>
                )}
                {newCount > 0 && (
                  <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-950/30 dark:text-sky-300">
                    {newCount} new
                  </span>
                )}
                {updateCount > 0 && (
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                    {updateCount} matches
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400">
                Review each candidate before importing
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-900">
                      <TableHead className="text-xs w-10">
                        <span className="sr-only">Include</span>
                      </TableHead>
                      <TableHead className="text-xs">Name</TableHead>
                      <TableHead className="text-xs">Ticker</TableHead>
                      <TableHead className="text-xs text-right w-20">Qty</TableHead>
                      <TableHead className="text-xs text-right w-20">Price</TableHead>
                      <TableHead className="text-xs w-20">Currency</TableHead>
                      <TableHead className="text-xs">Class</TableHead>
                      <TableHead className="text-xs w-20">Conf.</TableHead>
                      <TableHead className="text-xs w-24">Match</TableHead>
                      <TableHead className="text-xs w-28">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {candidates.map((candidate) => {
                      const { extracted } = candidate;
                      const confidencePct = Math.round(extracted.confidence * 100);
                      const confColor = confidencePct >= 80
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : confidencePct >= 50
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-rose-600 dark:text-rose-400';

                      const hasWarnings = extracted.warnings.length > 0;

                      return (
                        <TableRow
                          key={candidate.id}
                          className={`${
                            candidate.excluded
                              ? 'opacity-40 bg-slate-50 dark:bg-slate-900/50'
                              : 'hover:bg-slate-50/50 dark:hover:bg-slate-900/50'
                          }`}
                        >
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={!candidate.excluded}
                              onChange={() => toggleExcluded(candidate.id)}
                              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                              aria-label={candidate.excluded ? `Include ${extracted.name}` : `Exclude ${extracted.name}`}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={extracted.name}
                              onChange={(e) => updateExtractedField(candidate.id, 'name', e.target.value)}
                              className="h-8 text-sm min-w-[120px]"
                              aria-label={`Name for ${extracted.name}`}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={extracted.ticker || ''}
                              onChange={(e) => updateExtractedField(candidate.id, 'ticker', e.target.value || undefined)}
                              className="h-8 text-sm font-mono min-w-[80px]"
                              placeholder="—"
                              aria-label={`Ticker for ${extracted.name}`}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="any"
                              value={Number.isFinite(extracted.quantity) ? extracted.quantity : ''}
                              onChange={(e) => {
                                const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                updateExtractedField(candidate.id, 'quantity', Number.isFinite(val) ? val : 0);
                              }}
                              className="h-8 text-sm font-mono text-right"
                              aria-label={`Quantity for ${extracted.name}`}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="any"
                              value={Number.isFinite(extracted.price) ? extracted.price : ''}
                              onChange={(e) => {
                                const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                                updateExtractedField(candidate.id, 'price', val !== undefined && Number.isFinite(val) ? val : undefined);
                              }}
                              className="h-8 text-sm font-mono text-right"
                              aria-label={`Price for ${extracted.name}`}
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={extracted.currency || 'CAD'}
                              onChange={(e) => updateExtractedField(candidate.id, 'currency', e.target.value || undefined)}
                              className="h-8 text-xs"
                              aria-label={`Currency for ${extracted.name}`}
                            >
                              <option value="CAD">CAD</option>
                              <option value="INR">INR</option>
                              <option value="USD">USD</option>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              value={extracted.assetClass || ''}
                              onChange={(e) => updateExtractedField(candidate.id, 'assetClass', e.target.value || undefined)}
                              className="h-8 text-sm min-w-[90px]"
                              placeholder="Other"
                              aria-label={`Asset class for ${extracted.name}`}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-xs font-mono font-medium ${confColor}`}>
                                {confidencePct}%
                              </span>
                              {hasWarnings && (
                                <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" title={extracted.warnings.join('; ')} />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {candidate.matchConfidence === 'exact' && (
                              <div className="flex items-center gap-1.5">
                                <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                <span className="text-xs text-emerald-700 dark:text-emerald-400 truncate max-w-[80px]">{candidate.matchedAsset?.name || 'Matched'}</span>
                              </div>
                            )}
                            {candidate.matchConfidence === 'fuzzy' && (
                              <div className="flex items-center gap-1.5">
                                <HelpCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                <span className="text-xs text-amber-700 dark:text-amber-400 truncate max-w-[80px]">{candidate.matchedAsset?.name || 'Fuzzy'}</span>
                              </div>
                            )}
                            {candidate.matchConfidence === 'none' && (
                              <div className="flex items-center gap-1.5">
                                <AlertCircle className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <span className="text-xs text-slate-500">New</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={candidate.matchAction}
                              onChange={(e) => updateCandidate(candidate.id, { matchAction: e.target.value as MatchAction })}
                              className="h-8 text-xs min-w-[100px]"
                              aria-label={`Action for ${extracted.name}`}
                            >
                              <option value="add_new">Add new</option>
                              {candidate.matchedAsset && (
                                <option value="update">Update</option>
                              )}
                            </Select>
                            {candidate.matchAction === 'update' && candidate.matchedAsset && (
                              <Select
                                value={candidate.quantityStrategy}
                                onChange={(e) => updateCandidate(candidate.id, { quantityStrategy: e.target.value as QuantityStrategy })}
                                className="h-8 text-xs min-w-[80px] mt-1"
                                aria-label={`Strategy for ${extracted.name}`}
                              >
                                <option value="replace">Replace</option>
                                <option value="add">Add to</option>
                              </Select>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            {candidates.some((c) => c.extracted.warnings.length > 0) && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
                <p className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-1">Warnings</p>
                {candidates.filter((c) => c.extracted.warnings.length > 0).map((c) => (
                  c.extracted.warnings.map((w, i) => (
                    <p key={`${c.id}-warn-${i}`} className="text-xs text-amber-700 dark:text-amber-300">
                      {c.extracted.name}: {w}
                    </p>
                  ))
                ))}
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="text-xs text-slate-500">
                {excludedCount > 0
                  ? `${totalImportable} of ${approvedCount} approved will be imported`
                  : `${totalImportable} candidate${totalImportable !== 1 ? 's' : ''} will be imported`}
                {excludedCount > 0 && (
                  <span className="ml-2 text-slate-400">
                    ({excludedCount} excluded)
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="rounded-full" onClick={reset}>
                  Start over
                </Button>
                <Button
                  className="rounded-full bg-[#00875A] text-white hover:bg-[#007A51]"
                  disabled={isCommitting || totalImportable === 0}
                  onClick={handleCommit}
                >
                  {isCommitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Import {totalImportable} Asset{totalImportable !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}

        {errors.length > 0 && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 dark:border-rose-900/40 dark:bg-rose-950/20">
            <p className="text-xs font-medium text-rose-800 dark:text-rose-200 mb-1">Errors</p>
            {errors.map((error, index) => (
              <p key={`err-${index}`} className="text-xs text-rose-700 dark:text-rose-300">{error}</p>
            ))}
          </div>
        )}
      </div>
    </Dialog>
  );
}
