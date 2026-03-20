import React from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, Loader2, Search } from 'lucide-react';
import { Asset } from '../store/db';
import { usePortfolio } from '../store/PortfolioContext';
import { fetchStockPrice, getTickerRecommendation, inferCurrencyFromTicker, PriceFetchResult, PriceProvider } from '../lib/api';
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select } from './ui/select';
import { applyPriceFormula } from '../lib/priceFormula';

interface TickerRepairModalProps {
  asset?: Asset;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SupportedCurrency = 'USD' | 'CAD' | 'INR';
type UnitMode = 'none' | 'ounce-to-gram' | 'custom';
type CalculationMode = 'guided' | 'formula';

const OUNCE_TO_GRAM_FACTOR = 31.1035;

export function TickerRepairModal({ asset, open, onOpenChange }: TickerRepairModalProps) {
  const { updateAsset, priceProviderSettings, rates } = usePortfolio();
  const [provider, setProvider] = React.useState<PriceProvider>('yahoo');
  const [ticker, setTicker] = React.useState('');
  const [calculationMode, setCalculationMode] = React.useState<CalculationMode>('guided');
  const [unitMode, setUnitMode] = React.useState<UnitMode>('none');
  const [customUnitFactor, setCustomUnitFactor] = React.useState('');
  const [fromCurrency, setFromCurrency] = React.useState<SupportedCurrency>('USD');
  const [toCurrency, setToCurrency] = React.useState<SupportedCurrency>('USD');
  const [priceFormula, setPriceFormula] = React.useState('{price}');
  const [isChecking, setIsChecking] = React.useState(false);
  const [result, setResult] = React.useState<PriceFetchResult | null>(null);

  React.useEffect(() => {
    if (!asset || !open) return;

    setProvider(
      asset.preferredPriceProvider === 'alphavantage' || asset.preferredPriceProvider === 'finnhub' || asset.preferredPriceProvider === 'yahoo'
        ? asset.preferredPriceProvider
        : priceProviderSettings.primaryProvider
    );
    setTicker(asset.ticker || '');
    setCalculationMode(asset.priceFormula ? 'formula' : 'guided');
    if (asset.priceUnitConversionFactor && asset.priceUnitConversionFactor > 1) {
      if (Math.abs(asset.priceUnitConversionFactor - OUNCE_TO_GRAM_FACTOR) < 0.0001) {
        setUnitMode('ounce-to-gram');
        setCustomUnitFactor('');
      } else {
        setUnitMode('custom');
        setCustomUnitFactor(String(asset.priceUnitConversionFactor));
      }
    } else {
      setUnitMode('none');
      setCustomUnitFactor('');
    }
    setFromCurrency(asset.priceSourceCurrency || inferCurrencyFromTicker(asset.ticker || asset.name || ''));
    setToCurrency(asset.priceTargetCurrency || asset.currency);
    setPriceFormula(asset.priceFormula || '({price} / {unit}) * {fx}');
    setResult(null);
  }, [asset, open, priceProviderSettings.primaryProvider]);

  if (!asset) return null;

  const recommendation = getTickerRecommendation(ticker, provider);
  const quoteCurrency = getResolvedQuoteCurrency(result, ticker, asset, fromCurrency);
  const parsedCustomUnitFactor = Number(customUnitFactor);
  const unitFactor =
    unitMode === 'ounce-to-gram'
      ? OUNCE_TO_GRAM_FACTOR
      : unitMode === 'custom' && Number.isFinite(parsedCustomUnitFactor) && parsedCustomUnitFactor > 0
        ? parsedCustomUnitFactor
        : 1;
  const fxFactor = getFxConversionFactor(quoteCurrency, toCurrency, rates);
  const sourcePrice = result?.price ?? null;
  const unitConvertedPrice = sourcePrice != null ? sourcePrice / unitFactor : null;
  const formulaResult = sourcePrice != null
    ? applyPriceFormula(priceFormula, {
        price: sourcePrice,
        fx: fxFactor,
        unit: unitFactor,
      })
    : null;
  const guidedConvertedPrice = unitConvertedPrice != null ? unitConvertedPrice * fxFactor : null;
  const finalConvertedPrice = calculationMode === 'formula'
    ? formulaResult?.value ?? null
    : guidedConvertedPrice;
  const canApply = result?.price != null && (calculationMode === 'guided' || !formulaResult?.error);
  const finalUnitLabel = unitMode === 'ounce-to-gram' ? 'per gram' : 'per unit';
  const liveMath = buildLiveMath({
    calculationMode,
    sourcePrice,
    unitFactor,
    fxFactor,
    toCurrency,
    finalPrice: finalConvertedPrice,
    formulaResult: formulaResult?.resolvedExpression || '',
  });

  const testTicker = async () => {
    setIsChecking(true);
    try {
      const checked = await fetchStockPrice(ticker, provider, priceProviderSettings);
      setResult(checked);
      const resolvedCurrency = getResolvedQuoteCurrency(checked, ticker, asset, fromCurrency);
      setFromCurrency(resolvedCurrency);
    } finally {
      setIsChecking(false);
    }
  };

  const saveTicker = async () => {
    let nextPrice = asset.currentPrice;
    if (finalConvertedPrice != null) {
      nextPrice = finalConvertedPrice;
    }

    await updateAsset({
      ...asset,
      ticker: ticker.trim() || undefined,
      autoUpdate: Boolean(ticker.trim()),
      currentPrice: nextPrice,
      preferredPriceProvider: provider,
      priceProvider: provider,
      priceFetchStatus: result?.price != null ? 'success' : asset.priceFetchStatus,
      priceFetchMessage: result?.price != null ? undefined : result?.error || asset.priceFetchMessage,
      priceUnitConversionFactor: unitFactor !== 1 ? unitFactor : undefined,
      priceSourceCurrency: quoteCurrency,
      priceTargetCurrency: toCurrency,
      priceFormula: calculationMode === 'formula' ? priceFormula.trim() : undefined,
      // Backward-compatible final multiplier for existing refresh logic.
      priceConversionFactor: calculationMode === 'formula' ? undefined : buildStoredConversionFactor({
        unitFactor,
        fxFactor,
      }),
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Fix Ticker</DialogTitle>
        <DialogDescription>
          Test a ticker for {asset.name} with a specific provider before saving it to the asset.
        </DialogDescription>
      </DialogHeader>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto py-4 pr-1">
        <div className="rounded-[28px] border border-white/60 bg-white/70 px-5 py-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-2xl font-semibold text-slate-900">{asset.name}</div>
              <div className="mt-1 text-base text-slate-600">{asset.assetClass} • {asset.owner} • {asset.country}</div>
            </div>
            <div className="min-w-[320px] rounded-2xl border border-emerald-200 bg-emerald-50/85 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">Final Price Used</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">
                {finalConvertedPrice != null ? `${currencySymbol(toCurrency)}${formatDecimal(finalConvertedPrice)} ${finalUnitLabel}` : 'Waiting for source quote'}
              </div>
              <div className="mt-1 text-sm text-emerald-800/90">
                {finalConvertedPrice != null
                  ? `Current total preview: ${currencySymbol(toCurrency)}${formatDecimal(finalConvertedPrice * asset.quantity)}`
                  : 'Check the ticker and apply the conversion to lock this price.'}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  onClick={() => void saveTicker()}
                  disabled={!canApply}
                  className="bg-slate-900 text-white hover:bg-slate-800"
                >
                  Apply Conversion
                </Button>
                <span className="text-sm text-emerald-800/90">
                  {result?.price != null ? 'Applies this final price to the asset and closes the modal' : 'Main action after reviewing the math'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
          <GlassSection title="Service">
            <Select value={provider} onChange={(event) => {
              setProvider(event.target.value as PriceProvider);
            }}>
              <option value="yahoo">Yahoo Finance</option>
              <option value="alphavantage">Alpha Vantage</option>
              <option value="finnhub">Finnhub</option>
            </Select>
            <p className="mt-2 text-xs text-slate-500">
              Default app provider: {labelForProvider(priceProviderSettings.primaryProvider)}. This choice applies only to this asset.
            </p>
          </GlassSection>

          <GlassSection title="Ticker">
            <div className="flex flex-col gap-3 md:flex-row">
              <div className="relative min-w-0 flex-1">
                <Input
                  value={ticker}
                  onChange={(event) => {
                    setTicker(event.target.value);
                  }}
                  placeholder="e.g. NSE:RELIANCE, TSE:XEQT, NASDAQ:AAPL, GC=F"
                  className="pr-10"
                />
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  <Search className="h-4 w-4 text-slate-400" />
                </div>
              </div>
              <Button type="button" variant="outline" onClick={() => void testTicker()} disabled={isChecking || !ticker.trim()} className="md:self-start">
                {isChecking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                Check Ticker
              </Button>
            </div>
            <p className="mt-2 text-xs text-slate-500">{recommendation}</p>
          </GlassSection>
        </div>

        <GlassSection title="Calculation Mode">
          <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
            <div className="space-y-2">
              <label className="text-sm font-medium">Mode</label>
              <Select value={calculationMode} onChange={(event) => setCalculationMode(event.target.value as CalculationMode)}>
                <option value="guided">Guided conversion</option>
                <option value="formula">Formula</option>
              </Select>
            </div>
            <div className="space-y-2">
              {calculationMode === 'formula' ? (
                <>
                  <label className="text-sm font-medium">Formula</label>
                  <Input
                    value={priceFormula}
                    onChange={(event) => setPriceFormula(event.target.value)}
                    placeholder="({price} / {unit}) * {fx}"
                  />
                  <p className="text-xs text-slate-500">{'Use `{price}` for the API quote, `{unit}` for unit factor, and `{fx}` for the live FX rate. Example: `1.2*{price}/2`'}</p>
                </>
              ) : (
                <>
                  <label className="text-sm font-medium">How it works</label>
                  <div className="rounded-2xl border border-slate-200/80 bg-white/75 p-4 text-sm text-slate-600">
                    Use the guided unit and currency converters below. The app will calculate `(price / unit) * fx`.
                  </div>
                </>
              )}
            </div>
          </div>
        </GlassSection>

        <GlassSection title="Step 1 · Source Fetch">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <div className="rounded-2xl border border-slate-200/80 bg-white/75 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Raw Quote</div>
              <div className="mt-2 text-xl font-semibold text-slate-900">
                {result?.price != null
                  ? `${result.normalizedTicker || ticker} at ${quoteCurrency} ${formatDecimal(result.price)}`
                  : 'Check ticker to verify the source price'}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                <span>Provider: {labelForProvider(provider)}</span>
                <span>Currency: {quoteCurrency}</span>
                {result?.sourceUrl && (
                  <a
                    href={result.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-emerald-700 underline decoration-emerald-400 underline-offset-4 hover:text-emerald-800"
                  >
                    Open source page
                  </a>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-emerald-50/80 p-4 text-emerald-800">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.22em]">Verification</div>
                  <div className="mt-2 text-base font-medium">
                    {result?.price != null ? 'Verified quote received' : 'Waiting for a quote check'}
                  </div>
                  <div className="mt-1 text-sm text-emerald-700/90">
                    {result?.price != null
                      ? 'This step locks the raw provider price before any unit or FX math is applied.'
                      : 'Use Check Ticker to fetch the raw provider price and currency first.'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </GlassSection>

        <div className="grid gap-4 lg:grid-cols-2">
          <GlassSection title="Step 2 · Unit Conversion">
            <div className="space-y-3">
              <Select value={unitMode} onChange={(event) => {
                setUnitMode(event.target.value as UnitMode);
              }}>
                <option value="none">No unit conversion</option>
                <option value="ounce-to-gram">Troy Ounce to Gram</option>
                <option value="custom">Custom factor</option>
              </Select>
              {unitMode === 'custom' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Custom unit factor</label>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    value={customUnitFactor}
                    onChange={(event) => setCustomUnitFactor(event.target.value)}
                    placeholder="e.g. 50"
                  />
                  <p className="text-xs text-slate-500">
                    This number will be used as <code>{'{unit}'}</code> in your formula, and guided mode will divide the fetched price by it.
                  </p>
                </div>
              )}
              <div className="rounded-2xl border border-slate-200/80 bg-white/75 p-4 text-sm text-slate-600">
                {unitMode === 'ounce-to-gram'
                  ? `Using 1 Troy Ounce = ${OUNCE_TO_GRAM_FACTOR} Grams.`
                  : unitMode === 'custom'
                    ? `Using custom unit factor ${formatDecimal(unitFactor, 4)}.`
                    : 'Keep the fetched provider unit as-is.'}
              </div>
              <div className="text-sm text-slate-600">
                Result after unit conversion:{' '}
                <span className="font-semibold text-slate-900">
                  {unitConvertedPrice != null ? `${quoteCurrency} ${formatDecimal(unitConvertedPrice)}` : 'Waiting for source quote'}
                </span>
              </div>
            </div>
          </GlassSection>

          <GlassSection title="Step 3 · Currency Conversion">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">From</label>
                <Select value={fromCurrency} onChange={(event) => {
                  setFromCurrency(event.target.value as SupportedCurrency);
                }}>
                  <option value="USD">USD</option>
                  <option value="CAD">CAD</option>
                  <option value="INR">INR</option>
                </Select>
                <p className="text-xs text-slate-500">Auto-filled from the fetched ticker currency, but editable if the quote metadata is wrong.</p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">To</label>
                <Select value={toCurrency} onChange={(event) => {
                  setToCurrency(event.target.value as SupportedCurrency);
                }}>
                  <option value="USD">USD</option>
                  <option value="CAD">CAD</option>
                  <option value="INR">INR</option>
                </Select>
                <p className="text-xs text-slate-500">Choose the asset currency you want the saved current price to use.</p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200/80 bg-white/75 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <span>{fromCurrency}</span>
                <ArrowRight className="h-4 w-4 text-slate-400" />
                <span>{toCurrency}</span>
              </div>
              <div className="mt-2 text-lg font-semibold text-slate-900">
                1 {fromCurrency} = {formatDecimal(fxFactor, 4)} {toCurrency}
              </div>
            </div>
          </GlassSection>
        </div>

        <GlassSection title="Step 4 · Apply">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
              <div className="min-w-0">
                <div className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-700">Live Math</div>
                <div className="mt-2 text-lg font-semibold text-slate-900">
                  {liveMath || 'Run a ticker check to see the full price math.'}
                </div>
                {calculationMode === 'formula' && formulaResult?.resolvedExpression && (
                  <div className="mt-2 rounded-2xl border border-slate-200/80 bg-white/80 p-4 text-sm text-slate-600">
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Resolved Formula</div>
                    <div className="mt-2 font-mono text-slate-900 break-all">{formulaResult.resolvedExpression}</div>
                    {formulaResult.error && <div className="mt-2 text-amber-700">{formulaResult.error}</div>}
                  </div>
                )}
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-emerald-200/80 bg-white/80 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">Final Price Used</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-900">
                      {finalConvertedPrice != null ? `${currencySymbol(toCurrency)}${formatDecimal(finalConvertedPrice)} ${finalUnitLabel}` : 'Waiting for source quote'}
                    </div>
                    <div className="mt-1 text-sm text-emerald-800/90">This is the per-unit current price that will be multiplied by quantity.</div>
                  </div>
                  <div className="rounded-2xl border border-emerald-200/80 bg-white/80 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">Current Total Preview</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-900">
                      {finalConvertedPrice != null ? `${currencySymbol(toCurrency)}${formatDecimal(finalConvertedPrice * asset.quantity)}` : 'Waiting for source quote'}
                    </div>
                    <div className="mt-1 text-sm text-emerald-800/90">{`Quantity ${formatDecimal(asset.quantity, 4)} × final price`}</div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {result?.price == null && result?.error && (
                    <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
                      <AlertTriangle className="h-4 w-4" />
                      {result.error}
                    </div>
                  )}
                </div>
                <div className="mt-3 text-sm text-emerald-800/90">
                  {finalConvertedPrice != null
                    ? 'Apply Conversion will save this exact final price model and update the asset table.'
                    : 'The saved current price will update immediately after a successful check.'}
                </div>
              </div>
            </div>
          </div>
        </GlassSection>

        <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500">
          Save will update the asset ticker, preferred provider, and either the guided conversion model or your saved formula. Future refreshes will keep using the same model.
        </div>

        <div className="sticky bottom-0 flex justify-end gap-2 rounded-t-2xl border-t border-slate-200 bg-white/95 px-1 py-3 backdrop-blur">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            type="button"
            className="bg-[#00875A] text-white hover:bg-[#007A51]"
            onClick={() => void saveTicker()}
            disabled={!ticker.trim() || !canApply}
          >
            Save Ticker
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function GlassSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[28px] border border-white/60 bg-white/70 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
      <div className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">{title}</div>
      {children}
    </section>
  );
}

function labelForProvider(provider: PriceProvider) {
  if (provider === 'alphavantage') return 'Alpha Vantage';
  if (provider === 'finnhub') return 'Finnhub';
  return 'Yahoo Finance';
}

function getResolvedQuoteCurrency(
  result: PriceFetchResult | null,
  ticker: string,
  asset: Asset,
  currentFrom: SupportedCurrency,
): SupportedCurrency {
  const candidate = result?.currency || asset.priceSourceCurrency || inferCurrencyFromTicker(result?.normalizedTicker || ticker || asset.ticker || asset.name || '');
  if (candidate === 'USD' || candidate === 'CAD' || candidate === 'INR') {
    return candidate;
  }
  return currentFrom;
}

function getFxConversionFactor(
  fromCurrency: SupportedCurrency,
  toCurrency: SupportedCurrency,
  rates: Record<string, number> | null,
) {
  if (fromCurrency === toCurrency) return 1;
  if (!rates) return 1;

  const fromRate = fromCurrency === 'USD' ? 1 : rates[fromCurrency];
  const toRate = toCurrency === 'USD' ? 1 : rates[toCurrency];

  if (!fromRate || !toRate) return 1;
  return toRate / fromRate;
}

function buildStoredConversionFactor({ unitFactor, fxFactor }: { unitFactor: number; fxFactor: number }) {
  const safeUnitFactor = unitFactor > 0 ? unitFactor : 1;
  const safeFxFactor = fxFactor > 0 ? fxFactor : 1;
  return safeFxFactor / safeUnitFactor;
}

function buildLiveMath({
  calculationMode,
  sourcePrice,
  unitFactor,
  fxFactor,
  toCurrency,
  finalPrice,
  formulaResult,
}: {
  calculationMode: CalculationMode;
  sourcePrice: number | null;
  unitFactor: number;
  fxFactor: number;
  toCurrency: SupportedCurrency;
  finalPrice: number | null;
  formulaResult: string;
}) {
  if (sourcePrice == null || finalPrice == null) return '';

  if (calculationMode === 'formula') {
    return `${formulaResult} = ${currencySymbol(toCurrency)}${formatDecimal(finalPrice)}`;
  }

  const steps = [`${formatDecimal(sourcePrice)}`];
  if (unitFactor !== 1) {
    steps[0] = `(${steps[0]} / ${formatDecimal(unitFactor, 4)})`;
  }
  if (fxFactor !== 1) {
    steps.push(`* ${formatDecimal(fxFactor, 4)}`);
  }

  return `${steps.join(' ')} = ${currencySymbol(toCurrency)}${formatDecimal(finalPrice)}`;
}

function formatDecimal(value: number, maxFractionDigits: number = 2) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits,
  }).format(value);
}

function currencySymbol(currency: SupportedCurrency) {
  if (currency === 'INR') return '₹';
  if (currency === 'CAD') return 'CA$';
  return '$';
}
