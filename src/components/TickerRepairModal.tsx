import React from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, Coins, Loader2, Ruler, Search, Sigma } from 'lucide-react';
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
      <DialogHeader className="border-b border-slate-200/80 pb-5">
        <DialogTitle className="text-2xl font-black tracking-tight text-slate-950">Fix Ticker Protocol</DialogTitle>
        <DialogDescription className="max-w-3xl text-base leading-relaxed text-slate-600">
          Refine live financial instrument data through source verification, clinical unit transformation, and real-time currency reconciliation.
        </DialogDescription>
      </DialogHeader>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto py-4 pr-1">
        <div className="grid gap-5 xl:grid-cols-3">
          <ProtocolPanel
            step="Step 1"
            title="Source Fetch"
            icon={<Coins className="h-4 w-4" />}
          >
            <div className="space-y-5">
              <FieldLabel>Instrument Ticker</FieldLabel>
              <Input
                value={ticker}
                onChange={(event) => setTicker(event.target.value)}
                placeholder="e.g. GC=F, NSE:RELIANCE, NASDAQ:AAPL"
                className="h-14 rounded-2xl border-slate-200 bg-white text-lg"
              />

              <FieldLabel>Provider Source</FieldLabel>
              <Select value={provider} onChange={(event) => setProvider(event.target.value as PriceProvider)}>
                <option value="yahoo">Yahoo Finance</option>
                <option value="alphavantage">Alpha Vantage</option>
                <option value="finnhub">Finnhub</option>
              </Select>

              <Button
                type="button"
                onClick={() => void testTicker()}
                disabled={isChecking || !ticker.trim()}
                className="h-14 w-full rounded-2xl bg-[#6fbea4] text-lg font-semibold text-[#0b3b31] hover:bg-[#62b498]"
              >
                {isChecking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                Check Ticker
              </Button>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-[inset_4px_0_0_0_#0f7a5b]">
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Raw Quote Output</div>
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <span className="font-mono text-3xl font-bold tracking-tight text-[#0b6a53]">
                    {result?.price != null ? formatDecimal(result.price) : '--'}
                  </span>
                  <span className="pb-1 text-sm uppercase tracking-[0.18em] text-slate-500">
                    {result?.price != null ? `${quoteCurrency} / ${unitMode === 'ounce-to-gram' ? 'oz' : 'unit'}` : 'Awaiting quote'}
                  </span>
                </div>
                <div className="mt-3 text-sm text-slate-500">
                  {result?.price != null ? (result.normalizedTicker || ticker) : recommendation}
                </div>
                {result?.sourceUrl ? (
                  <a
                    href={result.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex text-sm font-medium text-emerald-700 underline decoration-emerald-400 underline-offset-4"
                  >
                    Open source page
                  </a>
                ) : null}
                {result?.price == null && result?.error ? (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
                    <AlertTriangle className="h-4 w-4" />
                    {result.error}
                  </div>
                ) : null}
              </div>
            </div>
          </ProtocolPanel>

          <ProtocolPanel
            step="Step 2"
            title="FX Conversion"
            icon={<ArrowRight className="h-4 w-4" />}
          >
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <FieldLabel>From</FieldLabel>
                  <Select value={fromCurrency} onChange={(event) => setFromCurrency(event.target.value as SupportedCurrency)}>
                    <option value="USD">USD</option>
                    <option value="CAD">CAD</option>
                    <option value="INR">INR</option>
                  </Select>
                </div>
                <div>
                  <FieldLabel>To</FieldLabel>
                  <Select value={toCurrency} onChange={(event) => setToCurrency(event.target.value as SupportedCurrency)}>
                    <option value="USD">USD</option>
                    <option value="CAD">CAD</option>
                    <option value="INR">INR</option>
                  </Select>
                </div>
              </div>

              <div className="rounded-[26px] border border-slate-200 bg-white p-6 text-center shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Institutional Rate</div>
                <div className="mt-4 text-3xl font-black tracking-tight text-slate-950">
                  1 {fromCurrency} = {formatDecimal(fxFactor, 4)} {toCurrency}
                </div>
                <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Live Feed
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Auto-filled from the fetched ticker currency, but editable if the provider metadata is wrong.
              </div>
            </div>
          </ProtocolPanel>

          <div className="space-y-5">
            <ProtocolPanel
              step="Step 3"
              title="Unit Transform"
              icon={<Ruler className="h-4 w-4" />}
            >
              <div className="space-y-4">
                <FieldLabel>Conversion Factor</FieldLabel>
                <Select value={unitMode} onChange={(event) => setUnitMode(event.target.value as UnitMode)}>
                  <option value="none">No unit conversion</option>
                  <option value="ounce-to-gram">Troy Ounce to Gram (31.1035)</option>
                  <option value="custom">Custom factor</option>
                </Select>

                {unitMode === 'custom' ? (
                  <div className="space-y-2">
                    <FieldLabel>Custom factor</FieldLabel>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      value={customUnitFactor}
                      onChange={(event) => setCustomUnitFactor(event.target.value)}
                      placeholder="e.g. 50"
                    />
                    <p className="text-xs text-slate-500">
                      This value becomes <code>{'{unit}'}</code> in formula mode, and guided mode divides the fetched quote by it.
                    </p>
                  </div>
                ) : null}

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  {unitMode === 'ounce-to-gram'
                    ? `Using 1 Troy Ounce = ${OUNCE_TO_GRAM_FACTOR} Grams.`
                    : unitMode === 'custom'
                      ? `Using custom factor ${formatDecimal(unitFactor, 4)}.`
                      : 'No unit transform is being applied.'}
                </div>
              </div>
            </ProtocolPanel>

            <div className="rounded-[30px] border border-emerald-200 bg-[linear-gradient(135deg,_rgba(111,190,164,0.96),_rgba(122,202,166,0.82))] p-6 text-[#083c31] shadow-[0_24px_60px_rgba(79,172,142,0.28)]">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em]">
                <Sigma className="h-4 w-4" />
                Live Calculation
              </div>
              <div className="mt-5">
                <div className="text-2xl font-bold tracking-tight text-slate-950">{asset.name}</div>
                <div className="mt-1 text-sm text-[#0e5c49]">
                  {(result?.normalizedTicker || ticker || asset.ticker || asset.name)} adjusted for {toCurrency}/{unitMode === 'ounce-to-gram' ? 'gram' : 'unit'}
                </div>
              </div>
              <div className="mt-8 grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#0e5c49]">Calculated Price</div>
                  <div className="mt-2 text-4xl font-black tracking-tight text-[#083c31]">
                    {finalConvertedPrice != null ? `${currencySymbol(toCurrency)}${formatDecimal(finalConvertedPrice)}` : '--'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#0e5c49]">Per Unit</div>
                  <div className="mt-2 text-lg font-semibold text-[#083c31]">{finalUnitLabel.replace('per ', '')}</div>
                </div>
              </div>
              <div className="mt-6 rounded-2xl bg-white/45 p-4 text-sm leading-relaxed text-[#0b4b3c]">
                {liveMath || 'Run a ticker check to see the full calculation.'}
              </div>
              <div className="mt-4 text-sm text-[#0b4b3c]">
                Current total preview: <span className="font-semibold">{finalConvertedPrice != null ? `${currencySymbol(toCurrency)}${formatDecimal(finalConvertedPrice * asset.quantity)}` : '--'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
          <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start">
            <div className="space-y-2">
              <FieldLabel>Calculation Mode</FieldLabel>
              <Select value={calculationMode} onChange={(event) => setCalculationMode(event.target.value as CalculationMode)}>
                <option value="guided">Guided conversion</option>
                <option value="formula">Formula</option>
              </Select>
            </div>
            <div className="space-y-2">
              {calculationMode === 'formula' ? (
                <>
                  <FieldLabel>Formula Editor</FieldLabel>
                  <Input
                    value={priceFormula}
                    onChange={(event) => setPriceFormula(event.target.value)}
                    placeholder="({price} / {unit}) * {fx}"
                  />
                  <p className="text-xs text-slate-500">
                    Use <code>{'{price}'}</code> for the raw quote, <code>{'{unit}'}</code> for the unit factor, and <code>{'{fx}'}</code> for the live FX rate. Example: <code>1.2*{'{price}'}/2</code>
                  </p>
                  {formulaResult?.resolvedExpression ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Resolved Formula</div>
                      <div className="mt-2 break-all font-mono text-slate-900">{formulaResult.resolvedExpression}</div>
                      {formulaResult.error ? <div className="mt-2 text-amber-700">{formulaResult.error}</div> : null}
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  <FieldLabel>Guided Conversion Logic</FieldLabel>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                    The modal calculates <code>(price / unit) * fx</code> using the verified provider quote, unit transform, and live FX rate.
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 flex items-center justify-between gap-4 rounded-t-[28px] border-t border-slate-200 bg-white/95 px-1 py-4 backdrop-blur">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            The precision editorial • clinical curator
          </div>
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-2xl px-6">
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-2xl bg-[#0aa06d] px-6 text-white hover:bg-[#089764]"
              onClick={() => void saveTicker()}
              disabled={!ticker.trim() || !canApply}
            >
              Save Ticker
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

function ProtocolPanel({
  step,
  title,
  icon,
  children,
}: {
  step: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-[#0b6a53]">{step}</div>
          <div className="mt-2 text-sm font-semibold uppercase tracking-[0.24em] text-slate-900">{title}</div>
        </div>
        <div className="text-slate-300">{icon}</div>
      </div>
      {children}
    </section>
  );
}

function FieldLabel({ children }: React.PropsWithChildren) {
  return <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-900">{children}</label>;
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
