import React, { useEffect, useMemo, useState } from 'react';
import { usePortfolio } from '../store/PortfolioContext';
import { Card, CardContent } from './ui/card';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { ArrowUpRight, Eye, Filter, Globe, Info, PieChart as PieChartIcon, RefreshCw, TrendingUp, Wallet } from 'lucide-react';
import { Button } from './ui/button';
import { Select } from './ui/select';
import { convertAmount, DisplayCurrency, formatCurrency, getCurrentTotal, getInvestmentTotal, getOriginalDisplayCurrency, getRelevantConversionRates } from '../lib/portfolioMetrics';
import { Asset } from '../store/db';
import { fetchHistoricalExchangeRate } from '../lib/api';

const COLORS = ['#00875A', '#00B8D9', '#FFAB00', '#FF5630', '#6554C0', '#36B37E', '#FF8B00'];
type DashboardScope = 'ALL' | 'INDIA' | 'CANADA';
type CurrencySelection = 'ORIGINAL' | DisplayCurrency;

export function Dashboard() {
  const { assets, rates, refreshPrices, isRefreshing } = usePortfolio();
  const [scope, setScope] = useState<DashboardScope>('ALL');
  const [memberFilter, setMemberFilter] = useState('ALL');
  const [currencySelection, setCurrencySelection] = useState<CurrencySelection>('ORIGINAL');
  const [fxTrendCopy, setFxTrendCopy] = useState<Record<string, string>>({});

  const scopeAssets = useMemo(() => {
    if (scope === 'INDIA') return assets.filter((asset) => asset.country === 'India');
    if (scope === 'CANADA') return assets.filter((asset) => asset.country === 'Canada');
    return assets;
  }, [assets, scope]);

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

  const summaryCurrencies: DisplayCurrency[] = useMemo(() => {
    if (currencySelection !== 'ORIGINAL') return [currencySelection];

    return Array.from(
      new Set(filteredAssets.map((asset) => getOriginalDisplayCurrency(asset))),
    ) as DisplayCurrency[];
  }, [currencySelection, filteredAssets]);
  const chartCurrency: DisplayCurrency | null = summaryCurrencies.length === 1 ? summaryCurrencies[0] : null;

  const getConvertedValue = React.useCallback(
    (amount: number, assetCurrency: string, currency: DisplayCurrency) => convertAmount(amount, assetCurrency, currency, rates),
    [rates],
  );

  const getStats = React.useCallback((currency: DisplayCurrency, selectedAssets: Asset[]) => {
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
  }, [getConvertedValue]);

  const getStatsForSelection = React.useCallback((currency: DisplayCurrency, selectedAssets: Asset[]) => {
    if (currencySelection !== 'ORIGINAL') {
      return getStats(currency, selectedAssets);
    }

    const relevantAssets = selectedAssets.filter((asset) => getOriginalDisplayCurrency(asset) === currency);
    return getStats(currency, relevantAssets);
  }, [currencySelection, getStats]);

  const ownerStats = useMemo(() => {
    const owners = Array.from(new Set(filteredAssets.map((asset) => asset.owner)));

    return owners.map((owner) => {
      const ownerAssets = filteredAssets.filter((asset) => asset.owner === owner);
      const valuesByCurrency = summaryCurrencies.map((currency) => ({
        currency,
        ...getStatsForSelection(currency, ownerAssets),
      }));

      return {
        name: String(owner),
        assetCount: ownerAssets.length,
        valuesByCurrency,
      };
    });
  }, [filteredAssets, getStatsForSelection, summaryCurrencies]);

  const countryData = useMemo(() => {
    if (!chartCurrency) return [];

    const totals = filteredAssets.reduce((acc, asset) => {
      const convertedValue = getConvertedValue(getCurrentTotal(asset), asset.currency, chartCurrency);
      acc[asset.country] = (acc[asset.country] || 0) + convertedValue;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(totals).map(([name, value]) => ({ name, value }));
  }, [chartCurrency, filteredAssets, getConvertedValue]);

  const assetClassData = useMemo(() => {
    if (!chartCurrency) return [];

    const totals = filteredAssets.reduce((acc, asset) => {
      const convertedValue = getConvertedValue(getCurrentTotal(asset), asset.currency, chartCurrency);
      acc[asset.assetClass] = (acc[asset.assetClass] || 0) + convertedValue;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(totals)
      .map(([name, value]) => ({ name, value: Number(value) }))
      .sort((left, right) => right.value - left.value);
  }, [chartCurrency, filteredAssets, getConvertedValue]);

  const scopeCopy = {
    ALL: 'All filters applied first, then values are shown in your selected dashboard currency logic.',
    INDIA: 'Only India holdings are considered before currency conversion.',
    CANADA: 'Only Canada holdings are considered before currency conversion.',
  } as const;
  const relevantRates = useMemo(() => getRelevantConversionRates(rates), [rates]);
  const heroCurrency: DisplayCurrency = useMemo(() => {
    if (currencySelection !== 'ORIGINAL') return currencySelection;
    if (scope === 'INDIA') return 'INR';
    return 'CAD';
  }, [currencySelection, scope]);
  const heroStats = useMemo(() => getStats(heroCurrency, filteredAssets), [filteredAssets, getStats, heroCurrency]);
  const assetClassLegend = useMemo(() => {
    const total = assetClassData.reduce((sum, item) => sum + item.value, 0);
    return assetClassData.map((item, index) => ({
      ...item,
      color: COLORS[index % COLORS.length],
      percentage: total > 0 ? (item.value / total) * 100 : 0,
    }));
  }, [assetClassData]);

  useEffect(() => {
    if (!rates) {
      setFxTrendCopy({});
      return;
    }

    let isCancelled = false;
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - 7);
    const formattedDate = targetDate.toISOString().slice(0, 10);
    const pairs = [
      { label: 'USD → INR', from: 'USD', to: 'INR' },
      { label: 'USD → CAD', from: 'USD', to: 'CAD' },
      { label: 'CAD → INR', from: 'CAD', to: 'INR' },
      { label: 'CAD → USD', from: 'CAD', to: 'USD' },
      { label: 'INR → USD', from: 'INR', to: 'USD' },
      { label: 'INR → CAD', from: 'INR', to: 'CAD' },
    ] as const;

    void Promise.all(pairs.map(async (pair) => {
      const priorRate = await fetchHistoricalExchangeRate(formattedDate, pair.from, pair.to);
      const currentRate = convertAmount(1, pair.from, pair.to, rates);
      if (!priorRate || !Number.isFinite(currentRate)) {
        return [pair.label, '7-day trend unavailable right now.'] as const;
      }
      const deltaPct = ((currentRate - priorRate) / priorRate) * 100;
      const direction = deltaPct >= 0 ? 'up' : 'down';
      return [pair.label, `${pair.from} is ${direction} ${Math.abs(deltaPct).toFixed(2)}% against ${pair.to} this week.`] as const;
    })).then((entries) => {
      if (!isCancelled) {
        setFxTrendCopy(Object.fromEntries(entries));
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [rates]);

  return (
    <div className="space-y-6">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">Dashboard</h1>
          <p className="text-lg text-slate-500 dark:text-slate-400">Your family's wealth at a glance</p>
        </div>
        <Button variant="outline" onClick={refreshPrices} disabled={isRefreshing} className="w-full sm:w-auto">
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh Rates
        </Button>
      </div>

      <Card className="overflow-hidden border-none rounded-3xl bg-[radial-gradient(circle_at_top_left,_rgba(0,135,90,0.22),_transparent_40%),linear-gradient(135deg,_#052e2b,_#0f3d37_55%,_#0b5b46)] text-white shadow-[0_30px_90px_rgba(5,46,43,0.28)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(61,255,191,0.18),_transparent_42%),linear-gradient(135deg,_#020617,_#052e2b_55%,_#0b5b46)]">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-100/85">Total Combined Family Wealth</p>
              <h2 className="text-4xl font-black tracking-tight sm:text-5xl">{formatCurrency(heroStats.current, heroCurrency)}</h2>
              <p className="max-w-2xl text-sm text-emerald-50/85">
                {currencySelection === 'ORIGINAL'
                  ? `Hero total is normalized into ${heroCurrency} so you can see the full family wealth in one number. Country and member filters are already applied.`
                  : `This combines all filtered family holdings into ${heroCurrency}.`}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <HeroMetric label="Invested" value={formatCurrency(heroStats.invested, heroCurrency)} />
              <HeroMetric label="Today's Change" value={formatCurrency(heroStats.todayChange, heroCurrency)} tone={heroStats.todayChange >= 0 ? 'positive' : 'negative'} />
              <HeroMetric label="Returns" value={`${formatCurrency(heroStats.returns, heroCurrency)} (${heroStats.retPct >= 0 ? '+' : ''}${heroStats.retPct.toFixed(2)}%)`} tone={heroStats.returns >= 0 ? 'positive' : 'negative'} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm rounded-2xl bg-gradient-to-r from-emerald-50 via-white to-cyan-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            <Filter className="h-4 w-4" />
            Dashboard Filters
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr]">
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">View</p>
              <div className="flex flex-wrap gap-2">
                {([
                  ['ALL', 'All Holdings'],
                  ['INDIA', 'India Only'],
                  ['CANADA', 'Canada Only'],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setScope(value)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${scope === value ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{scopeCopy[scope]}</p>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Members</p>
              <div className="flex flex-wrap gap-2">
                {memberChipOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setMemberFilter(option.value)}
                    disabled={option.disabled}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      memberFilter === option.value
                        ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                        : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                    } ${option.disabled ? 'cursor-not-allowed opacity-50 hover:bg-white dark:hover:bg-slate-900' : ''}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Currency</p>
              <Select
                value={currencySelection}
                onChange={(event) => setCurrencySelection(event.target.value as CurrencySelection)}
              >
                <option value="ORIGINAL">Original</option>
                <option value="USD">USD</option>
                <option value="INR">INR</option>
                <option value="CAD">CAD</option>
              </Select>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {currencySelection === 'ORIGINAL'
                  ? 'Original keeps India holdings in INR and Canada holdings in CAD. Canada USD positions are converted into CAD using current FX before totals are shown.'
                  : `All values are shown in ${currencySelection}.`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm rounded-2xl">
        <CardContent className="p-6">
          <div className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Live FX Rates</div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {relevantRates.map((rate) => (
              <div key={rate.label} className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900" title={fxTrendCopy[rate.label] || 'Loading 7-day trend...'}>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span>{rate.label}</span>
                  <Info className="h-3.5 w-3.5" />
                </div>
                <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{rate.value.toFixed(4)}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className={`grid gap-6 ${summaryCurrencies.length === 3 ? 'xl:grid-cols-3' : 'lg:grid-cols-1'}`}>
        {summaryCurrencies.map((currency) => {
          const stats = getStatsForSelection(currency, filteredAssets);
          const cardTitle = currencySelection === 'ORIGINAL'
            ? scope === 'ALL'
              ? `${currency === 'INR' ? 'India' : 'Canada'} Holdings`
              : `${scope === 'INDIA' ? 'India' : 'Canada'} Holdings`
            : `${scope === 'ALL' ? 'All Holdings' : scope === 'INDIA' ? 'India Holdings' : 'Canada Holdings'} in ${currency}`;

          return (
            <Card key={currency} className="border-none shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-0">
                <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{currency}</p>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">{cardTitle}</h3>
                    </div>
                    <div className="rounded-full bg-slate-100 p-2 dark:bg-slate-800">
                      <Wallet className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 p-6 sm:grid-cols-2">
                  <div className="min-w-0 rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-500">Invested</p>
                      <Wallet className="h-4 w-4 text-slate-400" />
                    </div>
                    <p className={`break-words text-2xl font-semibold tracking-tight ${stats.invested < 0 ? 'text-red-500' : ''}`}>{formatCurrency(stats.invested, currency)}</p>
                  </div>
                  <div className="min-w-0 rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-500">Current</p>
                      <TrendingUp className="h-4 w-4 text-slate-400" />
                    </div>
                    <p className={`break-words text-2xl font-semibold tracking-tight ${stats.current < 0 ? 'text-red-500' : ''}`}>{formatCurrency(stats.current, currency)}</p>
                    <p className={`mt-2 text-sm font-medium ${stats.todayChange >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      Today's Change: {formatCurrency(stats.todayChange, currency)}
                    </p>
                  </div>
                  <div className="min-w-0 rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-500">Returns</p>
                      <ArrowUpRight className="h-4 w-4 text-slate-400" />
                    </div>
                    <p className={`break-words text-2xl font-semibold tracking-tight ${stats.returns >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {formatCurrency(stats.returns, currency)}
                    </p>
                  </div>
                  <div className="min-w-0 rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-500">Returns %</p>
                      <TrendingUp className="h-4 w-4 text-slate-400" />
                    </div>
                    <p className={`break-words text-2xl font-semibold tracking-tight ${stats.retPct >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {stats.retPct >= 0 ? '+' : ''}
                      {stats.retPct.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {ownerStats.map((owner) => (
          <Card key={owner.name} className="border-none shadow-sm rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-full bg-[#00875A] flex items-center justify-center text-white text-xl font-bold">
                  {owner.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-bold">{owner.name}</h3>
                  <p className="text-sm text-slate-500">{owner.assetCount} assets</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="rounded-full"
                  onClick={() => setMemberFilter(owner.name)}
                  title={`View only ${owner.name}`}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                {owner.valuesByCurrency.map((stats) => (
                  <div key={stats.currency} className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
                    <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{stats.currency}</div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-slate-500 mb-1">Invested</p>
                        <p className={`text-xl font-mono font-semibold ${stats.invested < 0 ? 'text-red-500' : ''}`}>{formatCurrency(stats.invested, stats.currency)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 mb-1">Current</p>
                        <p className={`text-xl font-mono font-semibold ${stats.current < 0 ? 'text-red-500' : ''}`}>{formatCurrency(stats.current, stats.currency)}</p>
                      </div>
                    </div>
                    <div className={`rounded-xl p-4 flex justify-between items-center ${stats.returns >= 0 ? 'bg-[#E6F4EA] dark:bg-[#00875A]/20' : 'bg-red-50 dark:bg-red-500/10'}`}>
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Returns</span>
                      <span className={`font-mono font-semibold flex items-center ${stats.returns >= 0 ? 'text-[#00875A]' : 'text-red-500'}`}>
                        {stats.returns >= 0 && <ArrowUpRight className="h-4 w-4 mr-1" />}
                        {`${formatCurrency(stats.returns, stats.currency)} (${stats.returns >= 0 ? '+' : ''}${stats.retPct.toFixed(2)}%)`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-none shadow-sm rounded-2xl">
          <CardContent className="p-6">
            <div className="mb-6 flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              <h3 className="text-lg font-semibold">By Asset Class</h3>
            </div>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
              {!chartCurrency ? (
                <div className="h-[320px] flex items-center justify-center text-center text-slate-500">
                  Select a single-currency view, or filter Original down to one native currency, to view this chart.
                </div>
              ) : assetClassData.length === 0 ? (
                <div className="h-[320px] flex items-center justify-center text-slate-500">No assets to chart yet</div>
              ) : (
                <>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={assetClassData} cx="50%" cy="50%" innerRadius={65} outerRadius={95} paddingAngle={4} dataKey="value">
                          {assetClassData.map((entry, index) => (
                            <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value, chartCurrency)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3">
                    {assetClassLegend.map((item) => (
                      <div key={item.name} className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-3 dark:bg-slate-900">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{item.name}</span>
                        </div>
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">{item.percentage.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-2xl">
          <CardContent className="p-6">
            <div className="mb-6 flex items-center gap-2">
              <Globe className="h-5 w-5" />
              <h3 className="text-lg font-semibold">By Country</h3>
            </div>
            <div className="space-y-4">
              {!chartCurrency ? (
                <div className="h-[320px] flex items-center justify-center text-center text-slate-500">
                  Country comparison needs a single display currency, so use USD/INR/CAD or filter Original down to one native bucket.
                </div>
              ) : countryData.length === 0 ? (
                <div className="h-[320px] flex items-center justify-center text-slate-500">No assets to summarize yet</div>
              ) : (
                countryData.map((country) => (
                  <div key={country.name} className="flex items-center justify-between rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg shadow-sm dark:bg-slate-700">
                        {country.name === 'India' ? '🇮🇳' : country.name === 'Canada' ? '🇨🇦' : '🌍'}
                      </div>
                      <div>
                        <p className="font-medium">{country.name}</p>
                        <p className="text-sm text-slate-500">{scope === 'ALL' ? `Shown in ${chartCurrency}` : 'Filtered view'}</p>
                      </div>
                    </div>
                    <span className="font-mono font-semibold">{formatCurrency(country.value, chartCurrency)}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
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
  const toneClass = tone === 'positive'
    ? 'text-emerald-100'
    : tone === 'negative'
      ? 'text-rose-100'
      : 'text-white';

  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-100/80">{label}</div>
      <div className={`mt-2 text-lg font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}

function getPreviousClose(asset: Asset) {
  const candidate = (asset as Asset & { previousClose?: number }).previousClose;
  return typeof candidate === 'number' && Number.isFinite(candidate) ? candidate : null;
}
