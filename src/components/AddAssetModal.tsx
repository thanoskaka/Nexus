import React, { useMemo, useState, useEffect, useRef } from 'react';
import { usePortfolio } from '../store/PortfolioContext';
import { Asset } from '../store/db';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select } from './ui/select';
import { Calculator, Search, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { getSystemAssetClassesForCountry } from '../lib/systemAssetClasses';
import { PriceProvider, hasConfiguredNonYahooProvider } from '../lib/api';
import {
  getAssetCategory,
  getCurrencyOptionsForCountry,
  getDefaultCurrencyForCountry,
  getDisplayClasses,
  getOwnerOptions,
  legacyOwnerWarning,
  buildAssetFromForm,
  loadAssetIntoForm,
  getDefaultFormState,
  type AssetFormState,
  type AssetCategory,
  type InstrumentSuggestion,
} from './addAssetModalHelpers';
import { useInstrumentSearch } from '../lib/useInstrumentSearch';

interface AddAssetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetToEdit?: Asset;
}

type WizardStep = 1 | 2 | 3;

export function AddAssetModal({ open, onOpenChange, assetToEdit }: AddAssetModalProps) {
  const { addAsset, updateAsset, assetClasses: customAssetClasses, assets, members, priceProviderSettings } = usePortfolio();
  const [step, setStep] = useState<WizardStep>(1);
  const [form, setForm] = useState<AssetFormState>(() => getDefaultFormState());
  const [searchQuery, setSearchQuery] = useState('');
  const [showManualTicker, setShowManualTicker] = useState(false);
  const [ownerWarning, setOwnerWarning] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isSourceManagedEdit = Boolean(assetToEdit?.sourceManaged);
  const isSplitwiseCloudEdit = Boolean(assetToEdit?.sourceManaged && assetToEdit?.connectedProvider === 'splitwise');

  const category = getAssetCategory(form.assetClass);
  const currencyOptions = useMemo(() => getCurrencyOptionsForCountry(form.country), [form.country]);

  const displayClasses = useMemo(
    () => getDisplayClasses(form.country, customAssetClasses, getSystemAssetClassesForCountry(form.country)),
    [form.country, customAssetClasses],
  );

  const ownerOptions = useMemo(
    () => getOwnerOptions(members, assetToEdit?.owner),
    [members, assetToEdit?.owner],
  );

  const {
    suggestions,
    loading: searchLoading,
    highlightedIndex,
    setHighlightedIndex,
    isOpen: searchOpen,
    setIsOpen: setSearchOpen,
  } = useInstrumentSearch({
    query: searchQuery,
    country: form.country,
    assetClass: form.assetClass,
  });

  const defaultPreferredProvider =
    hasConfiguredNonYahooProvider(priceProviderSettings) && priceProviderSettings.primaryProvider === 'yahoo'
      ? (priceProviderSettings.finnhubApiKey?.trim() ? 'finnhub' : 'alphavantage')
      : priceProviderSettings.primaryProvider;

  useEffect(() => {
    if (assetToEdit && open) {
      const loaded = loadAssetIntoForm(assetToEdit);
      setForm(loaded);
      setSearchQuery(loaded.name);
      setOwnerWarning(legacyOwnerWarning(assetToEdit.owner, members));
      setStep(1);
      setShowManualTicker(Boolean(loaded.ticker));
    } else if (open && !assetToEdit) {
      resetForm();
    }
  }, [assetToEdit, open, members]);

  useEffect(() => {
    if (open && !assetToEdit) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [open, assetToEdit]);

  const resetForm = () => {
    setForm(getDefaultFormState());
    setSearchQuery('');
    setShowManualTicker(false);
    setOwnerWarning(null);
    setShowAdvanced(false);
    setStep(1);
    setSubmitting(false);
  };

  const updateField = <K extends keyof AssetFormState>(key: K, value: AssetFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSuggestionSelect = (suggestion: InstrumentSuggestion) => {
    setForm((prev) => ({
      ...prev,
      name: suggestion.displayName,
      ticker: suggestion.ticker,
      currency: suggestion.currency as any || prev.currency,
    }));
    setSearchQuery(suggestion.displayName);
    setSearchOpen(false);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (!assetToEdit) {
      updateField('name', val);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (!searchOpen || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(Math.min(highlightedIndex + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(Math.max(highlightedIndex - 1, 0));
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      handleSuggestionSelect(suggestions[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setSearchOpen(false);
    }
  };

  const isStep1Valid = form.name.trim().length > 0 && form.assetClass && form.owner;
  const isStep2Valid = validateStep2(form, category);
  const canGoToStep2 = isStep1Valid;
  const canGoToStep3 = canGoToStep2 && isStep2Valid;

  const handleNext = () => {
    if (step === 1 && canGoToStep2) setStep(2);
    else if (step === 2 && isStep2Valid) setStep(3);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1 as WizardStep);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const assetData = buildAssetFromForm(form);
      if (assetToEdit) {
        await updateAsset({
          ...assetToEdit,
          ...assetData,
          id: assetToEdit.id,
          originalCurrency: assetToEdit.originalCurrency,
          exchangeRate: assetToEdit.exchangeRate,
        });
      } else {
        await addAsset(assetData);
      }
      onOpenChange(false);
      resetForm();
    } finally {
      setSubmitting(false);
    }
  };

  const needsTicker = category === 'market-traded' && !assetToEdit;
  const canShowPriceProvider = needsTicker && (form.ticker.trim().length > 0 || showManualTicker);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div className="flex items-center gap-2 px-1 pt-1 pb-0">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-1">
            <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
              step === s
                ? 'bg-[#00875A] text-white'
                : step > s
                  ? 'bg-[#00875A]/20 text-[#00875A]'
                  : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
            }`}>
              {step > s ? '\u2713' : s}
            </div>
            <span className={`text-xs ${step === s ? 'font-medium text-slate-900 dark:text-white' : 'text-slate-400'}`}>
              {s === 1 ? 'Type & Name' : s === 2 ? 'Details' : 'Review'}
            </span>
            {s < 3 && <ChevronRight className="h-3 w-3 text-slate-300" />}
          </div>
        ))}
      </div>

      <DialogHeader className="space-y-0 pb-0">
        <DialogTitle>
          {assetToEdit ? 'Edit Asset' : step === 1 ? 'Choose Asset' : step === 2 ? 'Asset Details' : 'Review & Create'}
        </DialogTitle>
        <DialogDescription>
          {isSplitwiseCloudEdit
            ? 'This row is synced from Splitwise Cloud and is read-only.'
            : isSourceManagedEdit
              ? 'This connected holding is source-managed and read-only.'
              : step === 1
                ? 'Select the type and search for your asset.'
                : step === 2
                  ? 'Fill in the type-specific details.'
                  : 'Review all fields before creating the asset.'}
        </DialogDescription>
      </DialogHeader>

      {ownerWarning && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{ownerWarning}</span>
        </div>
      )}

      <div className="max-h-[70vh] space-y-4 overflow-y-auto py-2 pr-1">
        {isSplitwiseCloudEdit || isSourceManagedEdit ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
            {isSplitwiseCloudEdit
              ? 'Splitwise Cloud rows are generated automatically.'
              : 'This connected holding is source-managed and fully read-only in Nexus.'}
          </div>
        ) : null}

        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Country</label>
                <Select value={form.country} onChange={(e) => {
                  const next = e.target.value as 'India' | 'Canada';
                  updateField('country', next);
                  updateField('currency', getDefaultCurrencyForCountry(next));
                  const newClasses = getDisplayClasses(next, customAssetClasses, getSystemAssetClassesForCountry(next));
                  if (!newClasses.includes(form.assetClass)) {
                    updateField('assetClass', newClasses[0] || '');
                  }
                }} disabled={isSourceManagedEdit}>
                  <option value="India">India</option>
                  <option value="Canada">Canada</option>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Asset Type</label>
                <Select value={form.assetClass} onChange={(e) => {
                  updateField('assetClass', e.target.value);
                  setShowManualTicker(false);
                }} disabled={isSourceManagedEdit}>
                  {displayClasses.map((cls) => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Owner</label>
              <Select required value={form.owner} onChange={(e) => updateField('owner', e.target.value)} disabled={isSourceManagedEdit}>
                <option value="" disabled>Select owner...</option>
                {ownerOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </Select>
            </div>

            <div className="space-y-2 relative">
              <label className="text-sm font-medium">Search Asset</label>
              <div className="relative">
                <Input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onKeyDown={handleSearchKeyDown}
                  onFocus={() => suggestions.length > 0 && setSearchOpen(true)}
                  onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
                  placeholder="Search by name or symbol..."
                  className="pr-10"
                  disabled={isSourceManagedEdit}
                />
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  {searchLoading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-[#00875A]" />
                  ) : (
                    <Search className="h-4 w-4 text-slate-400" />
                  )}
                </div>
              </div>

              {searchOpen && suggestions.length > 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                  {suggestions.map((s, i) => (
                    <button
                      key={`${s.source}:${s.ticker}`}
                      type="button"
                      className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                        i === highlightedIndex
                          ? 'bg-slate-100 dark:bg-slate-800'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      } ${i === 0 ? 'rounded-t-lg' : ''} ${i === suggestions.length - 1 ? 'rounded-b-lg' : ''}`}
                      onMouseDown={(e) => { e.preventDefault(); handleSuggestionSelect(s); }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{s.displayName}</div>
                        <div className="text-xs text-slate-500">
                          {s.ticker} · {s.exchange} · {s.source.toUpperCase()}
                        </div>
                      </div>
                      <span className="shrink-0 text-xs text-slate-400">{s.currency}</span>
                    </button>
                  ))}
                </div>
              )}

              {!searchLoading && searchQuery.length >= 2 && suggestions.length === 0 && !showManualTicker && (
                <div className="mt-1">
                  <button
                    type="button"
                    className="text-xs text-[#00875A] hover:underline"
                    onClick={() => setShowManualTicker(true)}
                  >
                    No results found. Enter ticker manually?
                  </button>
                </div>
              )}

              {!searchLoading && searchQuery.length >= 2 && suggestions.length === 0 && !showManualTicker && (
                <p className="text-xs text-slate-400">Try a different search term.</p>
              )}

              {showManualTicker && (
                <div className="mt-2 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
                  <label className="text-xs font-medium">Ticker Symbol</label>
                  <Input
                    value={form.ticker}
                    onChange={(e) => updateField('ticker', e.target.value)}
                    placeholder="e.g. NASDAQ:AAPL, NSE:RELIANCE"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            {category === 'market-traded' && (
              <>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    <Calculator className="h-4 w-4" />
                    Purchase Details
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Quantity</label>
                      <Input required type="number" step="any" value={form.quantity}
                        onChange={(e) => updateField('quantity', e.target.value)}
                        placeholder="0.00" disabled={isSourceManagedEdit} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Avg Buy Price</label>
                      <Input required type="number" step="any" value={form.averagePurchasePrice}
                        onChange={(e) => updateField('averagePurchasePrice', e.target.value)}
                        placeholder="0.00" disabled={isSourceManagedEdit} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Purchase Value</label>
                      <Input required type="number" step="any" value={form.purchaseValue}
                        onChange={(e) => updateField('purchaseValue', e.target.value)}
                        placeholder="0.00" disabled={isSourceManagedEdit} />
                    </div>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">Enter any two and the third auto-calculates.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Purchase Date</label>
                    <Input type="date" value={form.purchaseDate}
                      onChange={(e) => updateField('purchaseDate', e.target.value)}
                      disabled={isSourceManagedEdit} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Currency</label>
                    <Select value={form.currency} onChange={(e) => updateField('currency', e.target.value as any)} disabled={isSourceManagedEdit}>
                      {currencyOptions.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
                  <input
                    type="checkbox"
                    id="autoUpdate"
                    checked={!form.autoUpdate}
                    onChange={(e) => updateField('autoUpdate', !e.target.checked)}
                    disabled={isSourceManagedEdit}
                    className="h-4 w-4 rounded border-gray-300 text-[#00875A] focus:ring-[#00875A]"
                  />
                  <label htmlFor="autoUpdate" className="text-sm font-medium">Manual price entry</label>
                </div>

                {!form.autoUpdate && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Current Price</label>
                      <Input type="number" step="any" value={form.currentPrice}
                        onChange={(e) => updateField('currentPrice', e.target.value)}
                        placeholder="0.00" disabled={isSourceManagedEdit} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Current Value</label>
                      <Input type="number" step="any" value={form.currentValue}
                        onChange={(e) => updateField('currentValue', e.target.value)}
                        placeholder="0.00" disabled={isSourceManagedEdit} />
                    </div>
                  </div>
                )}

                {needsTicker && (
                  <button
                    type="button"
                    className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                  >
                    {showAdvanced ? 'Hide' : 'Show'} advanced settings
                  </button>
                )}

                {showAdvanced && canShowPriceProvider && (
                  <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/40">
                    <label className="text-sm font-medium">Price Provider</label>
                    <Select value={form.preferredPriceProvider} onChange={(e) => updateField('preferredPriceProvider', e.target.value as PriceProvider)}>
                      <option value="yahoo">Yahoo Finance</option>
                      <option value="alphavantage">Alpha Vantage</option>
                      <option value="finnhub">Finnhub</option>
                    </Select>
                  </div>
                )}
              </>
            )}

            {category === 'cash-fixed-income' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount / Value</label>
                  <Input required type="number" step="any" value={form.amount}
                    onChange={(e) => updateField('amount', e.target.value)}
                    placeholder="0.00" disabled={isSourceManagedEdit} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Maturity Date (optional)</label>
                    <Input type="date" value={form.maturityDate}
                      onChange={(e) => updateField('maturityDate', e.target.value)}
                      disabled={isSourceManagedEdit} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Interest Rate % (optional)</label>
                    <Input type="number" step="any" value={form.rate}
                      onChange={(e) => updateField('rate', e.target.value)}
                      placeholder="e.g. 8.5" disabled={isSourceManagedEdit} />
                  </div>
                </div>
              </>
            )}

            {category === 'property' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Purchase Value</label>
                    <Input required type="number" step="any" value={form.purchaseValue}
                      onChange={(e) => updateField('purchaseValue', e.target.value)}
                      placeholder="0.00" disabled={isSourceManagedEdit} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Purchase Date</label>
                    <Input type="date" value={form.purchaseDate}
                      onChange={(e) => updateField('purchaseDate', e.target.value)}
                      disabled={isSourceManagedEdit} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Current Value (optional)</label>
                  <Input type="number" step="any" value={form.currentValue}
                    onChange={(e) => updateField('currentValue', e.target.value)}
                    placeholder="0.00" disabled={isSourceManagedEdit} />
                </div>
              </>
            )}

            {category === 'liability' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Outstanding Amount</label>
                  <Input required type="number" step="any" value={form.outstandingAmount}
                    onChange={(e) => updateField('outstandingAmount', e.target.value)}
                    placeholder="0.00" disabled={isSourceManagedEdit} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Interest Rate % (optional)</label>
                    <Input type="number" step="any" value={form.rate}
                      onChange={(e) => updateField('rate', e.target.value)}
                      placeholder="e.g. 18" disabled={isSourceManagedEdit} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Due Date (optional)</label>
                    <Input type="date" value={form.dueDate}
                      onChange={(e) => updateField('dueDate', e.target.value)}
                      disabled={isSourceManagedEdit} />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Holding Platform</label>
              <Input value={form.holdingPlatform}
                onChange={(e) => updateField('holdingPlatform', e.target.value)}
                placeholder="e.g. IBKR, Wealthsimple, Groww" disabled={isSourceManagedEdit} />
            </div>

            {assetToEdit && (
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
                <input
                  id="hideFromDashboard"
                  type="checkbox"
                  checked={form.hiddenFromDashboard}
                  onChange={(e) => updateField('hiddenFromDashboard', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-[#00875A] focus:ring-[#00875A]"
                />
                <label htmlFor="hideFromDashboard" className="text-sm text-slate-700 dark:text-slate-200">
                  Hide from dashboard totals
                </label>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/60">
              <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Summary</h3>
              <ReviewRow label="Name" value={form.name} />
              <ReviewRow label="Country" value={form.country} />
              <ReviewRow label="Type" value={form.assetClass} />
              <ReviewRow label="Owner" value={form.owner} />
              <ReviewRow label="Currency" value={form.currency} />
              {form.ticker && <ReviewRow label="Ticker" value={form.ticker} />}
              {category === 'market-traded' && (
                <>
                  {form.quantity && <ReviewRow label="Quantity" value={form.quantity} />}
                  {form.averagePurchasePrice && <ReviewRow label="Avg Price" value={form.averagePurchasePrice} />}
                  {form.purchaseValue && <ReviewRow label="Purchase Value" value={form.purchaseValue} />}
                  {form.purchaseDate && <ReviewRow label="Purchase Date" value={form.purchaseDate} />}
                  {!form.autoUpdate && form.currentPrice && <ReviewRow label="Current Price" value={form.currentPrice} />}
                </>
              )}
              {category === 'cash-fixed-income' && (
                <>
                  {form.amount && <ReviewRow label="Amount" value={form.amount} />}
                  {form.maturityDate && <ReviewRow label="Maturity" value={form.maturityDate} />}
                  {form.rate && <ReviewRow label="Rate" value={`${form.rate}%`} />}
                </>
              )}
              {category === 'property' && (
                <>
                  {form.purchaseValue && <ReviewRow label="Purchase Value" value={form.purchaseValue} />}
                  {form.purchaseDate && <ReviewRow label="Purchase Date" value={form.purchaseDate} />}
                  {form.currentValue && <ReviewRow label="Current Value" value={form.currentValue} />}
                </>
              )}
              {category === 'liability' && (
                <>
                  {form.outstandingAmount && <ReviewRow label="Outstanding" value={form.outstandingAmount} />}
                  {form.rate && <ReviewRow label="Rate" value={`${form.rate}%`} />}
                  {form.dueDate && <ReviewRow label="Due Date" value={form.dueDate} />}
                </>
              )}
              {form.holdingPlatform && <ReviewRow label="Platform" value={form.holdingPlatform} />}
              {form.comments && <ReviewRow label="Comments" value={form.comments} />}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
        <div>
          {step > 1 ? (
            <Button type="button" variant="outline" onClick={handleBack} className="rounded-full px-4">
              <ChevronLeft className="mr-1 h-4 w-4" /> Back
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-full px-6">Cancel</Button>
          )}
        </div>
        <div>
          {step < 3 ? (
            <Button type="button" onClick={handleNext} disabled={step === 1 ? !canGoToStep2 : !isStep2Valid} className="rounded-full bg-[#00875A] px-6 text-white hover:bg-[#007A51]">
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" onClick={handleSubmit} disabled={submitting || isSourceManagedEdit} className="rounded-full bg-[#00875A] px-6 text-white hover:bg-[#007A51]">
              {submitting ? 'Creating...' : assetToEdit ? 'Update' : 'Create'}
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900 dark:text-white">{value}</span>
    </div>
  );
}

function validateStep2(state: AssetFormState, category: AssetCategory): boolean {
  if (category === 'market-traded') {
    const q = parseFloat(state.quantity);
    const ap = parseFloat(state.averagePurchasePrice);
    const pv = parseFloat(state.purchaseValue);
    return (q > 0 && ap > 0) || (q > 0 && pv > 0) || (ap > 0 && pv > 0);
  }
  if (category === 'cash-fixed-income') {
    return parseFloat(state.amount) > 0;
  }
  if (category === 'property') {
    return parseFloat(state.purchaseValue) > 0;
  }
  if (category === 'liability') {
    return parseFloat(state.outstandingAmount) > 0;
  }
  return true;
}
