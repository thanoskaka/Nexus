import React, { useEffect, useMemo, useState } from 'react';
import { usePortfolio } from '../store/PortfolioContext';
import { Card, CardContent } from './ui/card';
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowUpRight,
  Eye,
  Filter,
  Globe,
  Info,
  Maximize2,
  Plus,
  BarChart3,
  TrendingUp,
  Wallet,
  WalletCards,
} from 'lucide-react';
import { Button } from './ui/button';
import { Select } from './ui/select';
import {
  convertAmount,
  DisplayCurrency,
  formatCurrency,
  getCurrentTotal,
  getInvestmentTotal,
  getOriginalDisplayCurrency,
  getStableColor,
} from '../lib/portfolioMetrics';
import { Asset } from '../store/db';
import { useSampleMode } from '../lib/samplePortfolio';
import { ContributionRoomSummary } from './ContributionRoomSummary';

const COLORS = ['#00875A', '#00B8D9', '#FFAB00', '#FF5630', '#6554C0', '#36B37E', '#FF8B00', '#4C9AFF'];
const WATERFALL_COLORS = {
  deposits: '#00875A',
  market: '#4C9AFF',
  fx: '#FFAB00',
  current: '#172B4D',
};

type DashboardScope = 'ALL' | 'INDIA' | 'CANADA';
type CurrencySelection = 'ORIGINAL' | DisplayCurrency;
type ChartSlice = { name: string; value: number; currency?: DisplayCurrency };
type GrowthPoint = { key: string; label: string; invested: number; current: number; growth: number };
type SunburstInnerSlice = { name: string; value: number; fill: string };
type SunburstOuterSlice = { name: string; value: number; currency: string; fill: string };
type AttributionStep = { name: string; value: number; fill: string };
type MemberContributionRow = { name: string } & Record<string, string | number>;
type ExpandableChartKey =
  | 'country'
  | 'growth'
  | 'currency'
  | 'attribution'
  | 'memberContribution';
type ExpandedChartState = { key: ExpandableChartKey; currency: DisplayCurrency };
type ChartAnalytics = {
  subtitleLabel: string;
  countryData: ChartSlice[];
  countryLegend: Array<ChartSlice & { color: string; percentage: number }>;
  growthData: GrowthPoint[];
  currencySunburstData: {
    inner: SunburstInnerSlice[];
    outer: SunburstOuterSlice[];
  };
  performanceAttribution: {
    currentBalance: number;
    steps: AttributionStep[];
  };
  memberContributionData: {
    classNames: string[];
    classColors: Record<string, string>;
    rows: MemberContributionRow[];
  };
};

export function Dashboard({ onAddAsset, onManageLimits }: { onAddAsset?: () => void; onManageLimits?: () => void } = {}) {
  const { assets: realAssets, rates, refreshQueue, primaryCurrency } = usePortfolio();
  const { isSampleMode, sampleData, enableSampleMode } = useSampleMode();
  const assets = isSampleMode ? sampleData.assets : realAssets;
  const showEmptyState = !isSampleMode && realAssets.length === 0;
  const visibleAssets = useMemo(() => assets.filter((asset) => !asset.hiddenFromDashboard), [assets]);
  const [scope, setScope] = useState<DashboardScope>('ALL');
  const [memberFilter, setMemberFilter] = useState('ALL');
  const [currencySelection, setCurrencySelection] = useState<CurrencySelection>(primaryCurrency);
  const [expandedChart, setExpandedChart] = useState<ExpandedChartState | null>(null);
  const [growthWindowMonths, setGrowthWindowMonths] = useState(6);
  const relevantRates: Array<{ label: string; value: number }> = [];
  const fxTrendCopy: Record<string, string> = {};

  useEffect(() => {
    setCurrencySelection(primaryCurrency);
  }, [primaryCurrency]);

  const scopeAssets = useMemo(() => {
    if (scope === 'INDIA') return visibleAssets.filter((asset) => asset.country === 'India');
    if (scope === 'CANADA') return visibleAssets.filter((asset) => asset.country === 'Canada');
    return visibleAssets;
  }, [scope, visibleAssets]);

  const members = useMemo(
    () => Array.from(new Set(assets.map((asset) => asset.owner).filter(Boolean))).map(String).sort(),
    [assets],
  );

  const memberChipOptions = useMemo(() => {
    const ownerOne = members[0] || '';
    const ownerTwo = members[1] || '';

    return [
      { value: ownerOne || 'OWNER_ONE', label: ownerOne || 'Owner 1', disabled: !ownerOne },
      { value: ownerTwo || 'OWNER_TWO', label: ownerTwo || 'Owner 2', disabled: !ownerTwo },
      { value: 'ALL', label: 'Both', disabled: false },
    ];
  }, [members]);

  useEffect(() => {
    if (memberFilter !== 'ALL' && !members.includes(memberFilter)) {
      setMemberFilter('ALL');
    }
  }, [memberFilter, members]);

  const filteredAssets = useMemo(
    () => (memberFilter === 'ALL' ? scopeAssets : scopeAssets.filter((asset) => asset.owner === memberFilter)),
    [memberFilter, scopeAssets],
  );
  const chartEligibleAssets = useMemo(
    () =>
      filteredAssets.filter((asset) => {
        if (asset.holdingKind !== 'position') return true;
        return !asset.assetClass.toLowerCase().includes('derivative');
      }),
    [filteredAssets],
  );

  const summaryCurrencies: DisplayCurrency[] = useMemo(() => {
    if (currencySelection !== 'ORIGINAL') return [currencySelection];

    return Array.from(new Set(filteredAssets.map((asset) => getOriginalDisplayCurrency(asset)))) as DisplayCurrency[];
  }, [currencySelection, filteredAssets]);

  const heroCurrency: DisplayCurrency = primaryCurrency;
  const chartCurrencies = useMemo<DisplayCurrency[]>(
    () => (currencySelection === 'ORIGINAL' ? summaryCurrencies : [currencySelection]),
    [currencySelection, summaryCurrencies],
  );

  const getConvertedValue = React.useCallback(
    (amount: number, assetCurrency: string, currency: DisplayCurrency) => convertAmount(amount, assetCurrency, currency, rates),
    [rates],
  );

  const getStats = React.useCallback(
    (currency: DisplayCurrency, selectedAssets: Asset[]) => {
      const invested = selectedAssets.reduce(
        (sum, asset) => sum + getConvertedValue(getInvestmentTotal(asset), asset.currency, currency),
        0,
      );
      const current = selectedAssets.reduce(
        (sum, asset) => sum + getConvertedValue(getCurrentTotal(asset), asset.currency, currency),
        0,
      );
      const todayChange = selectedAssets.reduce((sum, asset) => {
        const previousClose = getPreviousClose(asset);
        if (previousClose == null || asset.currentPrice == null) return sum;
        return sum + getConvertedValue((asset.currentPrice - previousClose) * asset.quantity, asset.currency, currency);
      }, 0);
      const returns = current - invested;
      const retPct = invested > 0 ? (returns / invested) * 100 : 0;

      return { invested, current, todayChange, returns, retPct };
    },
    [getConvertedValue],
  );

  const getStatsForSelection = React.useCallback(
    (currency: DisplayCurrency, selectedAssets: Asset[]) => {
      if (currencySelection !== 'ORIGINAL') return getStats(currency, selectedAssets);
      const relevantAssets = selectedAssets.filter((asset) => getOriginalDisplayCurrency(asset) === currency);
      return getStats(currency, relevantAssets);
    },
    [currencySelection, getStats],
  );

  const heroStats = useMemo(() => getStats(heroCurrency, filteredAssets), [filteredAssets, getStats, heroCurrency]);

  const summaryCards = useMemo(
    () =>
      summaryCurrencies.map((currency) => {
        const stats = getStatsForSelection(currency, filteredAssets);
        const cardTitle =
          currencySelection === 'ORIGINAL'
            ? scope === 'ALL'
              ? `${currency === 'INR' ? 'India' : 'Canada'} Holdings`
              : `${scope === 'INDIA' ? 'India' : 'Canada'} Holdings`
            : `${scope === 'ALL' ? 'All Holdings' : scope === 'INDIA' ? 'India Holdings' : 'Canada Holdings'} in ${currency}`;

        return { currency, stats, cardTitle };
      }),
    [currencySelection, filteredAssets, getStatsForSelection, scope, summaryCurrencies],
  );

  const ownerStats = useMemo(() => {
    const owners = Array.from(new Set(filteredAssets.map((asset) => asset.owner)));
    return owners.map((owner) => {
      const ownerAssets = filteredAssets.filter((asset) => asset.owner === owner);
      return {
        name: String(owner),
        assetCount: ownerAssets.length,
        valuesByCurrency: summaryCurrencies.map((currency) => ({
          currency,
          ...getStatsForSelection(currency, ownerAssets),
        })),
      };
    });
  }, [filteredAssets, getStatsForSelection, summaryCurrencies]);

  const maxGrowthWindowMonths = useMemo(() => {
    const referenceDates = filteredAssets
      .map((asset) => {
        const purchaseDate = asset.purchaseDate ? new Date(asset.purchaseDate) : null;
        if (purchaseDate && !Number.isNaN(purchaseDate.getTime())) return purchaseDate;
        const updatedDate = asset.lastUpdated ? new Date(asset.lastUpdated) : null;
        return updatedDate && !Number.isNaN(updatedDate.getTime()) ? updatedDate : null;
      })
      .filter((value): value is Date => value instanceof Date);

    if (referenceDates.length === 0) return 6;

    const firstDate = new Date(Math.min(...referenceDates.map((date) => date.getTime())));
    return Math.max(differenceInCalendarMonths(new Date(), new Date(firstDate.getFullYear(), firstDate.getMonth(), 1)) + 1, 1);
  }, [filteredAssets]);

  useEffect(() => {
    setGrowthWindowMonths((current) => Math.min(Math.max(current, 1), maxGrowthWindowMonths));
  }, [maxGrowthWindowMonths]);

  const chartDataByCurrency = useMemo<Record<DisplayCurrency, ChartAnalytics>>(() => {
    const buildGrowthData = (selectedAssets: Asset[], currency: DisplayCurrency) => {
      const monthBuckets = selectedAssets.reduce((acc, asset) => {
        const referenceDate = asset.purchaseDate ? new Date(asset.purchaseDate) : null;
        const date = referenceDate && !Number.isNaN(referenceDate.getTime())
          ? referenceDate
          : asset.lastUpdated
            ? new Date(asset.lastUpdated)
            : null;
        if (!date || Number.isNaN(date.getTime())) return acc;
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const label = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        if (!acc[key]) {
          acc[key] = { key, label, invested: 0, current: 0 };
        }
        acc[key].invested += getConvertedValue(getInvestmentTotal(asset), asset.currency, currency);
        acc[key].current += getConvertedValue(getCurrentTotal(asset), asset.currency, currency);
        return acc;
      }, {} as Record<string, { key: string; label: string; invested: number; current: number }>);

      const referenceDates = selectedAssets
        .map((asset) => {
          const purchaseDate = asset.purchaseDate ? new Date(asset.purchaseDate) : null;
          if (purchaseDate && !Number.isNaN(purchaseDate.getTime())) return purchaseDate;
          const updatedDate = asset.lastUpdated ? new Date(asset.lastUpdated) : null;
          return updatedDate && !Number.isNaN(updatedDate.getTime()) ? updatedDate : null;
        })
        .filter((value): value is Date => value instanceof Date);

      if (referenceDates.length === 0) return [];

      const firstDate = new Date(Math.min(...referenceDates.map((date) => date.getTime())));
      const startMonth = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
      const endMonth = new Date();
      const monthCount = differenceInCalendarMonths(endMonth, startMonth) + 1;
      const boundedWindow = Math.min(Math.max(growthWindowMonths, 1), monthCount);
      const visibleStartIndex = Math.max(monthCount - boundedWindow, 0);

      return Array.from({ length: monthCount }, (_, index) => {
        const monthDate = new Date(startMonth.getFullYear(), startMonth.getMonth() + index, 1);
        const key = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
        const label = monthDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        return monthBuckets[key] || { key, label, invested: 0, current: 0 };
      })
        .slice(visibleStartIndex)
        .map(
          (entry): GrowthPoint => ({
            ...entry,
            growth: entry.current - entry.invested,
          }),
        );
    };

    return Object.fromEntries(
      chartCurrencies.map((currency) => {
        const selectedAssets =
          currencySelection === 'ORIGINAL'
            ? chartEligibleAssets.filter((asset) => getOriginalDisplayCurrency(asset) === currency)
            : chartEligibleAssets;

        const countryData = Object.entries(
          selectedAssets.reduce((acc, asset) => {
            const convertedValue = convertAmount(getCurrentTotal(asset), asset.currency, currency, rates);
            const key = asset.country;
            if (!acc[key]) {
              acc[key] = { value: 0, currency };
            }
            acc[key].value += convertedValue;
            return acc;
          }, {} as Record<string, { value: number; currency: DisplayCurrency }>),
        )
          .map((entry): ChartSlice => {
            const [name, payload] = entry as [string, { value: number; currency: DisplayCurrency }];
            return { name, value: Number(payload.value), currency: payload.currency };
          })
          .sort((a, b) => b.value - a.value);

        const countryTotal = countryData.reduce((sum, entry) => sum + entry.value, 0);
        const countryLegend = countryData.map((item, index) => ({
          ...item,
          color: COLORS[(index + 2) % COLORS.length],
          percentage: countryTotal > 0
            ? (item.value / countryTotal) * 100
            : 0,
        }));

        const totalsByCurrency = selectedAssets.reduce((acc, asset) => {
          const originalCurrency = getOriginalDisplayCurrency(asset);
          const classKey = asset.assetClass || 'Unknown';
          const value = convertAmount(getCurrentTotal(asset), asset.currency, currency, rates);

          if (!acc[originalCurrency]) {
            acc[originalCurrency] = { total: 0, classes: {} as Record<string, number> };
          }
          acc[originalCurrency].total += value;
          acc[originalCurrency].classes[classKey] = (acc[originalCurrency].classes[classKey] || 0) + value;
          return acc;
        }, {} as Record<string, { total: number; classes: Record<string, number> }>);

        const currencySunburstData = {
          inner: Object.entries(totalsByCurrency).map((entry, index): SunburstInnerSlice => {
            const [name, payload] = entry as [string, { total: number; classes: Record<string, number> }];
            return {
              name,
              value: payload.total,
              fill: COLORS[index % COLORS.length],
            };
          }),
          outer: Object.entries(totalsByCurrency).flatMap((entry, currencyIndex): SunburstOuterSlice[] => {
            const [originalCurrency, payload] = entry as [string, { total: number; classes: Record<string, number> }];
            return Object.entries(payload.classes)
              .sort((a, b) => b[1] - a[1])
              .map(([name, value], classIndex): SunburstOuterSlice => ({
                name: `${originalCurrency} · ${name}`,
                value: Number(value),
                currency: originalCurrency,
                fill: COLORS[(currencyIndex + classIndex + 1) % COLORS.length],
              }));
          }),
        };

        const newDeposits = selectedAssets.reduce(
          (sum, asset) => sum + getConvertedValue(getInvestmentTotal(asset), asset.currency, currency),
          0,
        );
        const currentBalance = selectedAssets.reduce(
          (sum, asset) => sum + getConvertedValue(getCurrentTotal(asset), asset.currency, currency),
          0,
        );
        const fxImpact = selectedAssets.reduce((sum, asset) => {
          if (!rates || !asset.originalCurrency || !asset.exchangeRate || asset.originalCurrency === asset.currency) return sum;
          const currentFxRate = convertAmount(1, asset.originalCurrency, asset.currency, rates as Record<string, number>);
          const originalInvested = asset.costBasis / asset.exchangeRate;
          const impactInStoredCurrency = originalInvested * (currentFxRate - asset.exchangeRate);
          return sum + getConvertedValue(impactInStoredCurrency, asset.currency, currency);
        }, 0);
        const marketGains = currentBalance - newDeposits - fxImpact;

        const classNames: string[] = Array.from(
          new Set(selectedAssets.map((asset) => String(asset.assetClass || 'Unknown'))),
        );
        const classColors: Record<string, string> = {};
        classNames.forEach((name) => {
          classColors[name] = getStableColor(name);
        });
        const owners: string[] = Array.from(
          new Set(selectedAssets.map((asset) => String(asset.owner)).filter(Boolean)),
        );
        const memberContributionData = {
          classNames,
          classColors,
          rows: owners.map((owner) => {
            const ownerAssets = selectedAssets.filter((asset) => asset.owner === owner);
            const row: MemberContributionRow = { name: owner };
            classNames.forEach((assetClass) => {
              row[assetClass] = ownerAssets
                .filter((asset) => (asset.assetClass || 'Unknown') === assetClass)
                .reduce((sum, asset) => sum + getConvertedValue(getCurrentTotal(asset), asset.currency, currency), 0);
            });
            return row;
          }),
        };

        return [
          currency,
          {
            subtitleLabel: currencySelection === 'ORIGINAL' ? `${currency} original values` : currency,
            countryData,
            countryLegend,
            growthData: buildGrowthData(selectedAssets, currency),
            currencySunburstData,
            performanceAttribution: {
              currentBalance,
              steps: [
                { name: 'New Deposits', value: newDeposits, fill: WATERFALL_COLORS.deposits },
                { name: 'Market Gains/Losses', value: marketGains, fill: marketGains >= 0 ? WATERFALL_COLORS.market : '#DE350B' },
                { name: 'FX Impact', value: fxImpact, fill: fxImpact >= 0 ? WATERFALL_COLORS.fx : '#FF8B00' },
                { name: 'Current Balance', value: currentBalance, fill: WATERFALL_COLORS.current },
              ],
            },
            memberContributionData,
          } satisfies ChartAnalytics,
        ] as const;
      }),
    ) as Record<DisplayCurrency, ChartAnalytics>;
  }, [chartCurrencies, chartEligibleAssets, currencySelection, getConvertedValue, growthWindowMonths, rates]);

  const renderCountryChart = (currency: DisplayCurrency, expanded = false) => {
    const analytics = chartDataByCurrency[currency];
    if (analytics.countryData.length === 0) {
      return <EmptyChartState message="No assets to summarize yet" />;
    }
    if (analytics.countryData.length <= 1) {
      return (
        <div className="flex min-h-[160px] items-center justify-center rounded-2xl bg-slate-50 px-4 py-8 text-center dark:bg-slate-900">
          <div>
            <Globe className="mx-auto mb-2 h-6 w-6 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">All assets are in {analytics.countryData[0].name}</p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">The By Country chart is hidden because all holdings are in a single country.</p>
          </div>
        </div>
      );
    }
    return (
      <div className={`grid gap-4 ${expanded ? 'xl:grid-cols-[minmax(360px,1fr)_minmax(0,1fr)]' : 'md:grid-cols-[minmax(220px,0.9fr)_minmax(0,1fr)]'}`}>
        <div className={expanded ? 'h-[360px]' : 'h-[240px]'}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={analytics.countryData} cx="50%" cy="50%" innerRadius={expanded ? 86 : 58} outerRadius={expanded ? 132 : 86} paddingAngle={4} dataKey="value">
                {analytics.countryData.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[(index + 2) % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number, _name: string, item: { payload?: ChartSlice }) => formatCurrency(value, item?.payload?.currency || currency)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-3">
          {analytics.countryLegend.map((item) => (
            <div key={item.name}>
              <LegendRow label={item.name} value={`${item.percentage.toFixed(1)}%`} color={item.color} />
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderGrowthChart = (currency: DisplayCurrency, expanded = false) => {
    const analytics = chartDataByCurrency[currency];
    return analytics.growthData.length === 0 ? (
      <EmptyChartState message="Add purchase dates to unlock this chart." />
    ) : (
      <div className="space-y-4">
        <div className="flex items-center justify-end">
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Last
            <select
              value={String(growthWindowMonths)}
              onChange={(event) => setGrowthWindowMonths(Number(event.target.value))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium tracking-normal text-slate-900 outline-none transition-colors focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              {Array.from({ length: maxGrowthWindowMonths }, (_, index) => {
                const value = index + 1;
                return (
                  <option key={value} value={value}>
                    {value} {value === 1 ? 'month' : 'months'}
                  </option>
                );
              })}
            </select>
          </label>
        </div>
        <div className={expanded ? 'h-[420px]' : 'h-[280px]'}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.growthData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(value) => compactNumber(value)} tickLine={false} axisLine={false} width={56} />
              <Tooltip formatter={(value: number) => formatCurrency(value, currency)} />
              <Bar dataKey="current" fill="#172B4D" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderCurrencyChart = (currency: DisplayCurrency, expanded = false) => {
    const analytics = chartDataByCurrency[currency];
    return analytics.currencySunburstData.inner.length === 0 ? (
      <EmptyChartState message="No currency allocation to show yet." />
    ) : (
      <div className={`grid gap-4 ${expanded ? 'xl:grid-cols-[minmax(360px,1fr)_minmax(0,1fr)]' : 'md:grid-cols-[minmax(220px,0.9fr)_minmax(0,1fr)]'}`}>
        <div className={expanded ? 'h-[400px]' : 'h-[280px]'}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={analytics.currencySunburstData.inner} dataKey="value" cx="50%" cy="50%" innerRadius={expanded ? 46 : 30} outerRadius={expanded ? 92 : 62}>
                {analytics.currencySunburstData.inner.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
              <Pie data={analytics.currencySunburstData.outer} dataKey="value" cx="50%" cy="50%" innerRadius={expanded ? 102 : 70} outerRadius={expanded ? 156 : 108}>
                {analytics.currencySunburstData.outer.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number, _name: string, item: { payload?: SunburstInnerSlice | SunburstOuterSlice }) => {
                const payload = item?.payload;
                const payloadCurrency = payload && 'currency' in payload && payload.currency ? payload.currency as DisplayCurrency : payload && 'name' in payload ? (payload.name as DisplayCurrency) : currency;
                return formatCurrency(value, payloadCurrency);
              }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-3">
          {analytics.currencySunburstData.inner.map((item) => (
            <div key={item.name}>
              <LegendRow label={item.name} value={formatCurrency(item.value, item.name as DisplayCurrency)} color={item.fill} />
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderAttributionChart = (currency: DisplayCurrency, expanded = false) => {
    const analytics = chartDataByCurrency[currency];
    return (
    <div className="space-y-4">
      <div className={expanded ? 'h-[400px]' : 'h-[260px]'}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={analytics.performanceAttribution.steps} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis dataKey="name" tickLine={false} axisLine={false} />
            <YAxis tickFormatter={(value) => compactNumber(value)} tickLine={false} axisLine={false} width={56} />
            <Tooltip formatter={(value: number) => formatCurrency(value, currency)} />
            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
              {analytics.performanceAttribution.steps.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
              <LabelList dataKey="value" position="top" formatter={(value: number) => compactCurrency(value, currency)} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <CompactAttribution label="Deposits" value={analytics.performanceAttribution.steps[0].value} currency={currency} />
        <CompactAttribution label="Current Balance" value={analytics.performanceAttribution.currentBalance} currency={currency} />
      </div>
      <div className="flex items-start gap-2 rounded-2xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>FX Impact measures gain or loss from exchange rate changes on foreign-currency holdings. Even if an asset price stays flat, currency movement between the original currency and your display currency affects total value.</p>
      </div>
    </div>
  );
  };

  const renderMemberContributionChart = (currency: DisplayCurrency, expanded = false) => {
    const analytics = chartDataByCurrency[currency];
    if (analytics.memberContributionData.rows.length === 0) {
      return <EmptyChartState message="No member data available." />;
    }

    const lastClassIndex = analytics.memberContributionData.classNames.length - 1;

    return (
      <div className="space-y-4">
        <div className={expanded ? 'h-[360px]' : 'h-[280px]'}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={analytics.memberContributionData.rows} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis dataKey="name" tickLine={false} axisLine={false} />
            <YAxis tickFormatter={(value) => compactNumber(value)} tickLine={false} axisLine={false} width={56} />
            <Tooltip formatter={(value: number) => formatCurrency(value, currency)} />
            {analytics.memberContributionData.classNames.map((assetClass, index) => (
              <Bar key={assetClass} dataKey={assetClass} stackId="members" fill={analytics.memberContributionData.classColors[assetClass]} radius={index === lastClassIndex ? [6, 6, 0, 0] : [0, 0, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-3">
        {analytics.memberContributionData.classNames.map((assetClass) => (
          <div key={assetClass}>
            <LegendRow label={assetClass} value="" color={analytics.memberContributionData.classColors[assetClass]} />
          </div>
        ))}
      </div>
    </div>
    );
  };

  const expandedChartMeta = expandedChart
    ? {
        country: {
          title: 'By Country',
          subtitle: `Current allocation in ${chartDataByCurrency[expandedChart.currency].subtitleLabel}`,
          content: renderCountryChart(expandedChart.currency, true),
        },
        growth: {
          title: 'Growth over time',
          subtitle: `Month-by-month view for the last ${growthWindowMonths} ${growthWindowMonths === 1 ? 'month' : 'months'} in ${chartDataByCurrency[expandedChart.currency].subtitleLabel}`,
          content: renderGrowthChart(expandedChart.currency, true),
        },
        currency: {
          title: 'Multi-Currency Allocation',
          subtitle: `Nested allocation view in ${chartDataByCurrency[expandedChart.currency].subtitleLabel}`,
          content: renderCurrencyChart(expandedChart.currency, true),
        },
        attribution: {
          title: 'Performance Attribution',
          subtitle: 'Why did family wealth change based on current holdings?',
          content: renderAttributionChart(expandedChart.currency, true),
        },
        memberContribution: {
          title: 'Ownership by person',
          subtitle: `Current holdings by person and internal category in ${chartDataByCurrency[expandedChart.currency].subtitleLabel}`,
          content: renderMemberContributionChart(expandedChart.currency, true),
        },
      }[expandedChart.key]
    : null;

  return (
    <div className="space-y-6">
      <div className="mb-2 border-b border-slate-200 pb-5 dark:border-slate-800">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Overview</h1>
            {isSampleMode && (
              <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-0.5 text-xs font-semibold text-amber-700 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300" title="Not your real portfolio">
                Sample data
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{isSampleMode ? 'Sample household portfolio' : 'Household position and what needs attention'}</p>
        </div>
      </div>
      {refreshQueue.pending > 0 && refreshQueue.nextRunAt ? (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-200">
          {refreshQueue.pending} U.S. stock row{refreshQueue.pending === 1 ? '' : 's'} are queued for the next Massive window at {new Date(refreshQueue.nextRunAt).toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
          })}.
        </div>
      ) : null}

      {showEmptyState ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#00875A]">
            <WalletCards className="h-8 w-8 text-white" />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">Welcome to Nexus Portfolio</h2>
          <p className="mb-8 max-w-md text-base text-slate-500 dark:text-slate-400">
            Start tracking your family's wealth. Add your first asset, import holdings from a statement, or connect an integration.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={onAddAsset} className="bg-[#00875A] hover:bg-[#007A51] text-white rounded-lg px-6">
              <Plus className="mr-2 h-4 w-4" />
              Add First Asset
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const link = document.querySelector<HTMLButtonElement>('[data-nav-settings]');
                if (link) link.click();
              }}
              className="rounded-lg"
            >
              Import Holdings
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const link = document.querySelector<HTMLButtonElement>('[data-nav-settings]');
                if (link) link.click();
              }}
              className="rounded-lg"
            >
              Go to Integrations
            </Button>
          </div>
          <div className="mt-6">
            <Button
              onClick={enableSampleMode}
              className="rounded-lg border-2 border-dashed border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200 dark:hover:bg-emerald-950/50"
            >
              <WalletCards className="mr-2 h-4 w-4" />
              Explore sample portfolio
            </Button>
          </div>
          <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
            Sample data shown is for demonstration only. Not your real financial information.
          </p>
          <p className="mt-3 text-sm text-slate-400 dark:text-slate-500">
            Supported formats: CSV, screenshot, and CAS statements.
          </p>
        </div>
      ) : null}

      <Card className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-none dark:border-slate-800 dark:bg-[#151816]">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total household value</p>
              <h2 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl">{formatCurrency(heroStats.current, heroCurrency)}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Reported in {heroCurrency}. Native currencies remain on each holding.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <HeroMetric label="Invested" value={formatCurrency(heroStats.invested, heroCurrency)} />
              <HeroMetric label="Today's Change" value={formatCurrency(heroStats.todayChange, heroCurrency)} tone={heroStats.todayChange >= 0 ? 'positive' : 'negative'} />
              <HeroMetric label="Returns" value={`${formatCurrency(heroStats.returns, heroCurrency)} (${heroStats.retPct >= 0 ? '+' : ''}${heroStats.retPct.toFixed(2)}%)`} tone={heroStats.returns >= 0 ? 'positive' : 'negative'} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 border-y border-slate-200 py-3 sm:flex-row sm:items-end dark:border-slate-800" aria-label="Overview scope">
        <label className="min-w-[180px] space-y-1 text-xs font-medium text-slate-500 dark:text-slate-400">Household scope
          <Select value={memberFilter} onChange={(event) => setMemberFilter(event.target.value)} className="h-9 rounded-lg text-sm">
            <option value="ALL">Entire household</option>
            {members.map((member) => <option key={member} value={member}>{member}</option>)}
          </Select>
        </label>
        <label className="min-w-[180px] space-y-1 text-xs font-medium text-slate-500 dark:text-slate-400">Account jurisdiction
          <Select value={scope} onChange={(event) => setScope(event.target.value as DashboardScope)} className="h-9 rounded-lg text-sm">
            <option value="ALL">All countries</option>
            <option value="CANADA">Canada</option>
            <option value="INDIA">India</option>
          </Select>
        </label>
        <div className="pb-2 text-xs text-slate-500 dark:text-slate-400">Totals and charts use the shared {primaryCurrency} reporting preference.</div>
      </div>

      <ContributionRoomSummary onManage={onManageLimits || (() => {})} />

      <div className="grid gap-6">
        <div className="space-y-6">
          {false && <div className={`grid gap-4 ${summaryCards.length > 1 ? 'xl:grid-cols-2' : 'grid-cols-1'}`}>
            {summaryCards.map(({ currency, stats, cardTitle }) => (
              <Card key={currency} className="overflow-hidden rounded-2xl border border-slate-100 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-slate-50/80 to-white px-5 py-4 dark:from-slate-900/80 dark:to-slate-950">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{currency}</p>
                      <h3 className="truncate text-base font-bold text-slate-900 dark:text-white">{cardTitle}</h3>
                    </div>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#00875A]/10">
                      <Wallet className="h-4 w-4 text-[#00875A]" />
                    </div>
                  </div>
                  <div className="grid gap-3 p-4 sm:grid-cols-2">
                    <CompactMetricTile label="Invested" value={formatCurrency(stats.invested, currency)} icon={<Wallet className="h-4 w-4" />} tone={stats.invested < 0 ? 'negative' : 'neutral'} />
                    <CompactMetricTile label="Current" value={formatCurrency(stats.current, currency)} icon={<TrendingUp className="h-4 w-4" />} tone={stats.current < 0 ? 'negative' : 'neutral'} />
                    <CompactMetricTile label="Today's Change" value={formatCurrency(stats.todayChange, currency)} icon={<ArrowUpRight className="h-4 w-4" />} tone={stats.todayChange >= 0 ? 'positive' : 'negative'} />
                    <CompactMetricTile label="Returns" value={`${formatCurrency(stats.returns, currency)} · ${stats.retPct >= 0 ? '+' : ''}${stats.retPct.toFixed(2)}%`} icon={<TrendingUp className="h-4 w-4" />} tone={stats.returns >= 0 ? 'positive' : 'negative'} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>}

          {currencySelection === 'ORIGINAL' ? (
            <div className="space-y-6">
              {chartCurrencies.length > 1 ? (
                <div className="flex items-start gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-200">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>Charts shown per currency because Original mode keeps INR and CAD separate. Switch to <strong>Unified — INR</strong> or <strong>Unified — CAD</strong> above to see a single combined view.</p>
                </div>
              ) : null}
              <div className={`grid gap-6 ${chartCurrencies.length > 1 ? 'xl:grid-cols-2' : 'grid-cols-1'}`}>
                {chartCurrencies.map((currency) => {
                  const analytics = chartDataByCurrency[currency];
                  return (
                    <div key={`country-${currency}`}>
                      <ChartCard
                        title="By Country"
                        subtitle={`Current allocation in ${analytics.subtitleLabel}`}
                        onExpand={() => setExpandedChart({ key: 'country', currency })}
                      >
                        {renderCountryChart(currency)}
                      </ChartCard>
                    </div>
                  );
                })}
              </div>

              <div className={`grid gap-6 ${chartCurrencies.length > 1 ? 'xl:grid-cols-2' : 'grid-cols-1'}`}>
                {chartCurrencies.map((currency) => {
                  const analytics = chartDataByCurrency[currency];
                  return (
                    <div key={`growth-${currency}`}>
                      <ChartCard
                        title="Growth over time"
                        subtitle={`Month-by-month view for the last ${growthWindowMonths} ${growthWindowMonths === 1 ? 'month' : 'months'} in ${analytics.subtitleLabel}`}
                        onExpand={() => setExpandedChart({ key: 'growth', currency })}
                      >
                        {renderGrowthChart(currency)}
                      </ChartCard>
                    </div>
                  );
                })}
              </div>

              <div className={`grid gap-6 ${chartCurrencies.length > 1 ? 'xl:grid-cols-2' : 'grid-cols-1'}`}>
                {chartCurrencies.map((currency) => {
                  const analytics = chartDataByCurrency[currency];
                  return (
                    <div key={`currency-${currency}`}>
                      <ChartCard
                        title="Multi-Currency Allocation"
                        subtitle={`Nested allocation view in ${analytics.subtitleLabel}`}
                        onExpand={() => setExpandedChart({ key: 'currency', currency })}
                      >
                        {renderCurrencyChart(currency)}
                      </ChartCard>
                    </div>
                  );
                })}
              </div>

              <div className={`grid gap-6 ${chartCurrencies.length > 1 ? 'xl:grid-cols-2' : 'grid-cols-1'}`}>
                {chartCurrencies.map((currency) => (
                  <div key={`attribution-${currency}`}>
                    <ChartCard
                      title="Performance Attribution"
                      subtitle="Why did family wealth change based on current holdings?"
                      onExpand={() => setExpandedChart({ key: 'attribution', currency })}
                    >
                      {renderAttributionChart(currency)}
                    </ChartCard>
                  </div>
                ))}
              </div>

              <div className={`grid gap-6 ${chartCurrencies.length > 1 ? 'xl:grid-cols-2' : 'grid-cols-1'}`}>
                {chartCurrencies.map((currency) => {
                  const analytics = chartDataByCurrency[currency];
                  return (
                    <div key={`memberContribution-${currency}`}>
                      <ChartCard
                        title="Member Contribution"
                        subtitle={`Stacked by internal holding category in ${analytics.subtitleLabel}`}
                        onExpand={() => setExpandedChart({ key: 'memberContribution', currency })}
                      >
                        {renderMemberContributionChart(currency)}
                      </ChartCard>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            chartCurrencies.map((currency) => {
              const analytics = chartDataByCurrency[currency];

              return (
                <div key={`charts-${currency}`} className="space-y-6">
                  <div className="flex items-end justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
                    <div><h2 className="text-lg font-semibold text-slate-900 dark:text-white">Portfolio analysis</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Allocation and exposure in {analytics.subtitleLabel}.</p></div>
                  </div>

                  <div className="grid gap-6 xl:grid-cols-2">
                    <ChartCard title="Where accounts are held" subtitle={`Allocation by account jurisdiction in ${analytics.subtitleLabel}`} onExpand={() => setExpandedChart({ key: 'country', currency })}>
                      {renderCountryChart(currency)}
                    </ChartCard>
                    <ChartCard title="Currency exposure" subtitle={`Native-currency exposure translated to ${analytics.subtitleLabel}`} onExpand={() => setExpandedChart({ key: 'currency', currency })}>
                      {renderCurrencyChart(currency)}
                    </ChartCard>
                  </div>

                  <details className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#151816]">
                    <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-slate-800 dark:text-slate-200">More analysis</summary>
                    <div className="grid gap-6 border-t border-slate-200 p-5 dark:border-slate-800 xl:grid-cols-2">
                      <ChartCard title="Estimated growth" subtitle={`Uses available holding dates; not a historical account statement`} onExpand={() => setExpandedChart({ key: 'growth', currency })}>{renderGrowthChart(currency)}</ChartCard>
                      <ChartCard title="Estimated attribution" subtitle="Contribution and market movement based on available holding data" onExpand={() => setExpandedChart({ key: 'attribution', currency })}>{renderAttributionChart(currency)}</ChartCard>
                      <ChartCard title="Ownership by person" subtitle={`Current holdings by person and internal category`} onExpand={() => setExpandedChart({ key: 'memberContribution', currency })}>{renderMemberContributionChart(currency)}</ChartCard>
                    </div>
                  </details>
                </div>
              );
            })
          )}

          {false && <div className="grid gap-6 md:grid-cols-2">
            {ownerStats.map((owner) => (
              <Card key={owner.name} className="overflow-hidden rounded-2xl border border-slate-100 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800">
                <CardContent className="p-0">
                  <div className="flex items-center gap-4 border-b border-slate-50 bg-gradient-to-r from-slate-50/80 to-white px-5 py-4 dark:border-slate-800 dark:from-slate-900/80 dark:to-slate-950">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#00875A] text-sm font-bold text-white">
                      {owner.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">{owner.name}</h3>
                      <p className="text-sm text-slate-500">{owner.assetCount} assets</p>
                    </div>
                    <Button type="button" variant="outline" size="icon" className="shrink-0 rounded-full" onClick={() => setMemberFilter(owner.name)} title={`View only ${owner.name}`}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-3 p-5">
                    {owner.valuesByCurrency.map((stats) => (
                      <div key={stats.currency} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                        <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{stats.currency}</div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="mb-1 text-xs text-slate-500">Invested</p>
                            <p className={`text-lg font-semibold ${stats.invested < 0 ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>{formatCurrency(stats.invested, stats.currency)}</p>
                          </div>
                          <div>
                            <p className="mb-1 text-xs text-slate-500">Current</p>
                            <p className={`text-lg font-semibold ${stats.current < 0 ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>{formatCurrency(stats.current, stats.currency)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>}
        </div>

        {false && <div className="space-y-6">
          <Card className="overflow-hidden rounded-2xl border border-slate-100 shadow-sm dark:border-slate-800">
            <CardContent className="p-0">
              <div className="flex items-center justify-between border-b border-slate-50 bg-gradient-to-r from-slate-50/80 to-white px-5 py-4 dark:border-slate-800 dark:from-slate-900/80 dark:to-slate-950">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Live FX Rates</div>
                <Info className="h-4 w-4 text-slate-400" />
              </div>
              <div className="space-y-3 p-5">
                {relevantRates.map((rate) => (
                  <div key={rate.label} className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900" title={fxTrendCopy[rate.label] || 'Loading 7-day trend...'}>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{rate.label}</div>
                    <div className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">{rate.value.toFixed(4)}</div>
                    <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{fxTrendCopy[rate.label] || 'Loading 7-day trend...'}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-2xl border border-slate-100 shadow-sm dark:border-slate-800">
            <CardContent className="p-0">
              <div className="flex items-center gap-2 border-b border-slate-50 bg-gradient-to-r from-slate-50/80 to-white px-5 py-4 dark:border-slate-800 dark:from-slate-900/80 dark:to-slate-950">
                <Globe className="h-4 w-4 text-slate-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Quick Geography</h3>
              </div>
              <div className="space-y-3 p-5">
                {chartCurrencies.map((currency) => (
                  <div key={`geo-${currency}`} className="space-y-3">
                    {chartCurrencies.length > 1 ? (
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {currency}
                      </div>
                    ) : null}
                    {chartDataByCurrency[currency].countryLegend.map((item) => (
                      <div key={`${currency}-${item.name}`} className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="font-medium text-slate-700 dark:text-slate-200">{item.name}</span>
                          </div>
                          <span className="text-sm font-semibold text-slate-900 dark:text-white">{item.percentage.toFixed(1)}%</span>
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">{formatCurrency(item.value, item.currency || currency)}</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-2xl border border-slate-100 shadow-sm dark:border-slate-800">
            <CardContent className="p-0">
              <div className="flex items-center gap-2 border-b border-slate-50 bg-gradient-to-r from-slate-50/80 to-white px-5 py-4 dark:border-slate-800 dark:from-slate-900/80 dark:to-slate-950">
                <TrendingUp className="h-4 w-4 text-slate-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Attribution Notes</h3>
              </div>
              <div className="space-y-3 p-5 text-sm text-slate-600 dark:text-slate-300">
                <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
                  Saving vs investing is separated in the performance attribution chart so you can see how much growth came from contributions versus market movement.
                </div>
                <div className="flex items-start gap-2 rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                  <div>
                    <p className="mb-1 font-medium text-slate-700 dark:text-slate-200">What is FX Impact?</p>
                    <p className="text-slate-500 dark:text-slate-400">When you hold assets in a foreign currency (e.g. USD stocks in a CAD portfolio), exchange rate movements create gains or losses separate from the asset price. FX Impact = original investment × (current rate − purchase rate).</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>}
      </div>

      <Dialog open={Boolean(expandedChartMeta)} onOpenChange={(open) => !open && setExpandedChart(null)}>
        {expandedChartMeta ? (
          <>
            <DialogHeader className="pr-10">
              <DialogTitle className="text-2xl">{expandedChartMeta.title}</DialogTitle>
              <DialogDescription>{expandedChartMeta.subtitle}</DialogDescription>
            </DialogHeader>
            <div className="max-h-[72vh] overflow-y-auto pr-1">
              {expandedChartMeta.content}
            </div>
          </>
        ) : null}
      </Dialog>
    </div>
  );
}

function HeroMetric({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'positive' | 'negative';
}) {
  const toneClass =
    tone === 'positive' ? 'text-emerald-700 dark:text-emerald-300' : tone === 'negative' ? 'text-red-600 dark:text-red-300' : 'text-slate-900 dark:text-white';

  return (
    <div className="border-l border-slate-200 px-4 py-1 dark:border-slate-700">
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`mt-1 text-base font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}

function CompactMetricTile({
  label,
  value,
  icon,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  tone?: 'neutral' | 'positive' | 'negative';
}) {
  const toneClass =
    tone === 'positive'
      ? 'text-emerald-600'
      : tone === 'negative'
        ? 'text-red-500'
        : 'text-slate-900 dark:text-slate-100';

  return (
    <div className="min-w-0 rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
        {icon}
      </div>
      <p className={`break-words text-lg font-semibold tracking-tight ${toneClass}`}>{value}</p>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
  onExpand,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  onExpand?: () => void;
}) {
  return (
    <Card className="overflow-hidden rounded-2xl border border-slate-100 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800">
      <CardContent className="p-0">
        <div className="flex items-start justify-between gap-3 border-b border-slate-50 bg-gradient-to-r from-slate-50/80 to-white px-5 py-4 dark:border-slate-800 dark:from-slate-900/80 dark:to-slate-950">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
            {subtitle && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
          </div>
          {onExpand ? (
            <Button type="button" variant="ghost" size="icon" className="shrink-0 rounded-full" onClick={onExpand} title={`Expand ${title}`}>
              <Maximize2 className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
        <div className="p-5">{children}</div>
      </CardContent>
    </Card>
  );
}

function LegendRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-3 dark:bg-slate-900">
      <div className="flex min-w-0 items-center gap-3">
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
        <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
      </div>
      <span className="text-sm font-semibold text-slate-900 dark:text-white">{value}</span>
    </div>
  );
}

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 text-center dark:border-slate-700 dark:bg-slate-900/50">
      <BarChart3 className="h-8 w-8 text-slate-300 dark:text-slate-600" />
      <p className="text-sm text-slate-400 dark:text-slate-500">{message}</p>
    </div>
  );
}

function CompactAttribution({
  label,
  value,
  currency,
}: {
  label: string;
  value: number;
  currency: DisplayCurrency;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className={`mt-2 text-lg font-semibold ${value >= 0 ? 'text-slate-900 dark:text-slate-100' : 'text-red-500'}`}>
        {formatCurrency(value, currency)}
      </div>
    </div>
  );
}

function compactNumber(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return value.toFixed(0);
}

function compactCurrency(value: number, currency: DisplayCurrency) {
  const abs = Math.abs(value);
  const prefix = value < 0 ? '-' : '';
  const symbol = currency === 'USD' ? '$' : currency === 'CAD' ? 'CA$' : '₹';
  if (abs >= 1_000_000) return `${prefix}${symbol}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${prefix}${symbol}${(abs / 1_000).toFixed(0)}k`;
  return `${prefix}${symbol}${abs.toFixed(0)}`;
}

function differenceInCalendarMonths(laterDate: Date, earlierDate: Date) {
  return (laterDate.getFullYear() - earlierDate.getFullYear()) * 12 + (laterDate.getMonth() - earlierDate.getMonth());
}

function getPreviousClose(asset: Asset) {
  const candidate = (asset as Asset & { previousClose?: number }).previousClose;
  return typeof candidate === 'number' && Number.isFinite(candidate) ? candidate : null;
}
