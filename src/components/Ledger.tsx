import React, { useEffect, useMemo, useState } from 'react';
import { usePortfolio } from '../store/PortfolioContext';
import { Asset } from '../store/db';
import {
  ColumnDef,
  SortingState,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Select } from './ui/select';
import { TickerRepairModal } from './TickerRepairModal';
import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, Building2, ChevronDown, ChevronRight, Edit, Gem, Landmark, LineChart, PiggyBank, RefreshCw, ShieldCheck, Trash2, WalletCards } from 'lucide-react';
import { convertAmount, formatCurrency, formatPercent, getAssetXirr, getCurrentPrice, getCurrentTotal, getGrowthTotal, getInvestmentPrice, getInvestmentTotal, isDebtAssetClass } from '../lib/portfolioMetrics';
import { getTickerRecommendation } from '../lib/api';

type LedgerCurrency = 'CAD' | 'INR' | 'USD' | 'ORIGINAL';
type SortColumn = 'assetClass' | 'name' | 'owner' | 'investmentTotal' | 'currentTotal' | 'growthTotal' | 'xirr';

export function Ledger({ onEditAsset }: { onEditAsset?: (asset: Asset) => void }) {
  const { assets, baseCurrency, rates, removeAsset, refreshAsset, refreshPrices, refreshFailedPrices, isRefreshing } = usePortfolio();
  const [canadaSorting, setCanadaSorting] = useState<SortingState>([
    { id: 'assetClassGroup', desc: false },
    { id: 'name', desc: false },
  ]);
  const [indiaSorting, setIndiaSorting] = useState<SortingState>([
    { id: 'assetClassGroup', desc: false },
    { id: 'name', desc: false },
  ]);
  const [memberFilter, setMemberFilter] = useState('ALL');
  const [assetClassFilter, setAssetClassFilter] = useState('ALL');
  const [pricingFilter, setPricingFilter] = useState<'ALL' | 'AUTO' | 'MANUAL' | 'FAILED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [tickerRepairAsset, setTickerRepairAsset] = useState<Asset | undefined>(undefined);
  const [collapsedClasses, setCollapsedClasses] = useState<string[]>([]);
  const [refreshingRowIds, setRefreshingRowIds] = useState<string[]>([]);

  const handleRefreshRow = React.useCallback(async (assetId: string) => {
    setRefreshingRowIds((current) => current.includes(assetId) ? current : [...current, assetId]);
    try {
      await refreshAsset(assetId);
    } finally {
      setRefreshingRowIds((current) => current.filter((id) => id !== assetId));
    }
  }, [refreshAsset]);

  const members = useMemo(
    () => Array.from(new Set(assets.map((asset) => asset.owner).filter(Boolean))).map(String).sort(),
    [assets],
  );
  const assetClassOptions = useMemo(
    () => Array.from(new Set(assets.map((asset) => getCanonicalAssetClass(asset.assetClass)).filter(Boolean))).map(String).sort(),
    [assets],
  );
  const filteredAssets = useMemo(
    () => assets.filter((asset) => {
      const matchesMember = memberFilter === 'ALL' || asset.owner === memberFilter;
      const matchesClass = assetClassFilter === 'ALL' || getCanonicalAssetClass(asset.assetClass) === assetClassFilter;
      const matchesPricing =
        pricingFilter === 'ALL' ||
        (pricingFilter === 'AUTO' && asset.autoUpdate && asset.priceFetchStatus !== 'failed') ||
        (pricingFilter === 'MANUAL' && !asset.autoUpdate) ||
        (pricingFilter === 'FAILED' && asset.priceFetchStatus === 'failed');
      const normalizedSearch = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !normalizedSearch ||
        [asset.name, asset.assetClass, getCanonicalAssetClass(asset.assetClass), asset.owner, asset.ticker, asset.holdingPlatform, asset.comments]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedSearch));

      return matchesMember && matchesClass && matchesPricing && matchesSearch;
    }),
    [assetClassFilter, assets, memberFilter, pricingFilter, searchQuery],
  );

  useEffect(() => {
    if (memberFilter !== 'ALL' && !members.includes(memberFilter)) {
      setMemberFilter('ALL');
    }
  }, [memberFilter, members]);

  useEffect(() => {
    if (assetClassFilter !== 'ALL' && !assetClassOptions.includes(assetClassFilter)) {
      setAssetClassFilter('ALL');
    }
  }, [assetClassFilter, assetClassOptions]);

  const getConvertedValue = React.useCallback(
    (amount: number, assetCurrency: string, currency: LedgerCurrency) => {
      if (currency === 'ORIGINAL') return amount;
      return convertAmount(amount, assetCurrency, currency, rates);
    },
    [rates],
  );

  const getDisplayCurrency = React.useCallback(
    (asset: Asset): 'CAD' | 'INR' | 'USD' => (baseCurrency === 'ORIGINAL' ? asset.currency : baseCurrency),
    [baseCurrency],
  );

  const columns = useMemo<ColumnDef<Asset, unknown>[]>(() => {
    const columnHelper = createColumnHelper<Asset>();

    return [
      columnHelper.accessor('name', {
        id: 'name',
        header: 'Asset',
        cell: (info) => {
          const asset = info.row.original;
          const hasFailedPrice = asset.priceFetchStatus === 'failed';
          const providerForRecommendation = asset.priceProvider === 'finnhub' || asset.priceProvider === 'alphavantage' || asset.priceProvider === 'yahoo' ? asset.priceProvider : 'yahoo';
          const assetMeta = [asset.ticker || 'No ticker', getCanonicalAssetClass(asset.assetClass), asset.owner].filter(Boolean).join(' • ');
          const isRowRefreshing = refreshingRowIds.includes(asset.id);

          return (
            <div className="space-y-2" style={{ fontVariantNumeric: 'tabular-nums' }}>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-2xl bg-slate-100 p-2 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                  {getAssetIcon(asset.assetClass)}
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{asset.name}</div>
                  <div className="truncate text-xs text-slate-500 dark:text-slate-400">{assetMeta}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white dark:bg-slate-100 dark:text-slate-900">
                    {getOwnerInitials(asset.owner)}
                  </span>
                  {asset.owner}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                  {asset.holdingPlatform || getCanonicalAssetClass(asset.assetClass)}
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setTickerRepairAsset(asset)}
                    className={`inline-flex items-center gap-1 text-xs font-medium ${hasFailedPrice ? 'text-amber-600 hover:text-amber-700' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-100'}`}
                    title={hasFailedPrice ? `${asset.priceFetchMessage || 'Price fetch failed.'} ${getTickerRecommendation(asset.ticker || '', providerForRecommendation)}` : 'Check or update ticker/provider'}
                  >
                    {hasFailedPrice ? <AlertTriangle className="h-3.5 w-3.5" /> : null}
                    {asset.ticker ? 'Modify ticker' : 'Add ticker'}
                  </button>
                  {asset.ticker ? (
                    <button
                      type="button"
                      onClick={() => void handleRefreshRow(asset.id)}
                      disabled={isRowRefreshing}
                      className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:text-slate-100"
                      title="Refresh only this row"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isRowRefreshing ? 'animate-spin' : ''}`} />
                      Refresh row
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          );
        },
      }),
      columnHelper.accessor((row) => getCanonicalAssetClass(row.assetClass), {
        id: 'assetClassGroup',
        header: 'Group',
        enableHiding: true,
        cell: () => null,
      }),
      columnHelper.accessor('quantity', {
        id: 'position',
        header: 'Position',
        cell: (info) => {
          const asset = info.row.original;
          const displayCurrency = getDisplayCurrency(asset);
          const investmentPrice = getConvertedValue(getInvestmentPrice(asset), asset.currency, baseCurrency);

          return (
            <div className="space-y-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{asset.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 })}</div>
              <div className={`text-xs ${isDebtAssetClass(asset.assetClass) ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'}`}>
                Avg: {formatCurrency(investmentPrice, displayCurrency)}
              </div>
            </div>
          );
        },
      }),
      columnHelper.accessor('currentPrice', {
        id: 'currentPrice',
        header: (
          <div className="flex items-center gap-2">
            <span>Current Price</span>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                void refreshFailedPrices();
              }}
              className="inline-flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              title="Retry failed price fetches"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        ),
        cell: (info) => {
          const asset = info.row.original;
          const displayCurrency = getDisplayCurrency(asset);
          const hasFailedPrice = asset.priceFetchStatus === 'failed';
          const providerForRecommendation = asset.priceProvider === 'finnhub' || asset.priceProvider === 'alphavantage' || asset.priceProvider === 'yahoo' ? asset.priceProvider : 'yahoo';
          const previousClose = getPreviousClose(asset);
          const currentPrice = hasFailedPrice
            ? (asset.currentPrice ? getConvertedValue(getCurrentPrice(asset), asset.currency, baseCurrency) : getConvertedValue(getInvestmentPrice(asset), asset.currency, baseCurrency))
            : getConvertedValue(getCurrentPrice(asset), asset.currency, baseCurrency);
          const convertedPreviousClose = previousClose ? getConvertedValue(previousClose, asset.currency, baseCurrency) : null;
          const dailyChange = convertedPreviousClose !== null ? currentPrice - convertedPreviousClose : null;
          const dailyChangePercent = convertedPreviousClose ? dailyChange! / convertedPreviousClose : null;

          return (
            <div className="space-y-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
              <div className={`text-sm font-semibold ${hasFailedPrice ? 'text-amber-600' : 'text-slate-900 dark:text-slate-100'}`}>{currentPrice ? formatCurrency(currentPrice, displayCurrency) : '-'}</div>
              {dailyChange !== null && dailyChangePercent !== null ? (
                <div className={`text-xs ${getStatusColor(dailyChange)}`}>
                  {formatCurrency(dailyChange, displayCurrency)} ({formatPercent(dailyChangePercent)})
                </div>
              ) : (
                <div className="text-xs text-slate-500 dark:text-slate-400">Daily change unavailable</div>
              )}
              {hasFailedPrice && (
                <div className="flex items-center gap-1 text-[11px] text-amber-600" title={`${asset.priceFetchMessage || 'Price fetch failed.'} ${getTickerRecommendation(asset.ticker || '', providerForRecommendation)}`}>
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Last known value shown
                </div>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor((row) => getConvertedValue(getCurrentTotal(row), row.currency, baseCurrency), {
        id: 'marketValue',
        header: 'Market Value',
        cell: (info) => {
          const asset = info.row.original;
          const displayCurrency = getDisplayCurrency(asset);
          const currentTotal = info.getValue() as number;
          const investmentTotal = getConvertedValue(getInvestmentTotal(asset), asset.currency, baseCurrency);
          return (
            <div className="space-y-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
              <div className={`text-sm font-semibold ${isDebtAssetClass(asset.assetClass) ? 'text-red-500' : 'text-slate-900 dark:text-slate-100'}`}>
                {formatCurrency(currentTotal, displayCurrency)}
              </div>
              <div className={`text-xs ${isDebtAssetClass(asset.assetClass) ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'}`}>
                Cost basis: {formatCurrency(investmentTotal, displayCurrency)}
              </div>
            </div>
          );
        },
      }),
      columnHelper.accessor((row) => getConvertedValue(getGrowthTotal(row), row.currency, baseCurrency), {
        id: 'performance',
        header: 'Performance',
        cell: (info) => {
          const asset = info.row.original;
          const growthTotal = info.getValue() as number;
          const displayCurrency = getDisplayCurrency(asset);
          const investmentTotal = getConvertedValue(getInvestmentTotal(asset), asset.currency, baseCurrency);
          const growthPercent = investmentTotal !== 0 ? growthTotal / investmentTotal : 0;
          const xirr = getAssetXirr(asset, displayCurrency, rates);
          const tone = growthTotal >= 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300';

          return (
            <div className="space-y-2" style={{ fontVariantNumeric: 'tabular-nums' }}>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>
                  {formatPercent(growthPercent)}
                </span>
                <span className={`text-sm font-semibold ${getStatusColor(growthTotal)}`}>
                  {formatCurrency(growthTotal, displayCurrency)}
                </span>
              </div>
              <div className="text-xs font-medium text-slate-600 dark:text-slate-300">XIRR: {formatPercent(xirr)}</div>
            </div>
          );
        },
      }),
      columnHelper.accessor('comments', {
        id: 'notes',
        header: 'Notes',
        cell: (info) => {
          const asset = info.row.original;
          return (
            <div className="space-y-1">
              <div className="text-sm text-slate-700 dark:text-slate-200">{asset.comments || 'No comments added'}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{asset.autoUpdate ? 'Live price enabled' : 'Manual pricing'}</div>
            </div>
          );
        },
      }),
      columnHelper.display({
        id: 'actions',
        enableColumnFilter: false,
        enableSorting: false,
        cell: (info) => (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => onEditAsset?.(info.row.original)}>
              <Edit className="h-4 w-4 text-slate-500" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => removeAsset(info.row.original.id)}>
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        ),
      }),
    ];
  }, [baseCurrency, getConvertedValue, getDisplayCurrency, handleRefreshRow, onEditAsset, rates, refreshFailedPrices, refreshingRowIds, removeAsset]);

  const canadaAssets = useMemo(
    () => filteredAssets.filter((asset) => asset.country === 'Canada'),
    [filteredAssets],
  );
  const indiaAssets = useMemo(
    () => filteredAssets.filter((asset) => asset.country === 'India'),
    [filteredAssets],
  );

  const canadaTable = useReactTable<Asset>({
    data: canadaAssets,
    columns,
    state: {
      sorting: canadaSorting,
    },
    onSortingChange: setCanadaSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });
  const indiaTable = useReactTable<Asset>({
    data: indiaAssets,
    columns,
    state: {
      sorting: indiaSorting,
    },
    onSortingChange: setIndiaSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="space-y-6">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">Assets</h1>
          <p className="text-lg text-slate-500 dark:text-slate-400">Manage your family's individual holdings</p>
        </div>
        <Button variant="outline" onClick={refreshPrices} disabled={isRefreshing} className="hidden sm:flex items-center gap-2">
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh Rates
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,0.8fr)]">
            <div className="space-y-5">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Search</p>
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search asset, ticker, platform, comments..."
                  className="h-11 rounded-2xl border-slate-200 bg-slate-50 px-4 dark:border-slate-800 dark:bg-slate-900"
                />
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Members</p>
                <div className="flex flex-wrap gap-2">
                  <FilterChip active={memberFilter === 'ALL'} onClick={() => setMemberFilter('ALL')}>Both</FilterChip>
                  {members.map((member) => (
                    <FilterChip key={member} active={memberFilter === member} onClick={() => setMemberFilter(member)}>
                      {member}
                    </FilterChip>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Asset Classes</p>
                <div className="flex flex-wrap gap-2">
                  <FilterChip active={assetClassFilter === 'ALL'} onClick={() => setAssetClassFilter('ALL')}>All Classes</FilterChip>
                  {assetClassOptions.map((assetClass) => (
                    <FilterChip key={assetClass} active={assetClassFilter === assetClass} onClick={() => setAssetClassFilter(assetClass)}>
                      {assetClass}
                    </FilterChip>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Pricing</p>
                <div className="flex flex-wrap gap-2">
                  <FilterChip active={pricingFilter === 'ALL'} onClick={() => setPricingFilter('ALL')}>All</FilterChip>
                  <FilterChip active={pricingFilter === 'AUTO'} onClick={() => setPricingFilter('AUTO')}>Live Price</FilterChip>
                  <FilterChip active={pricingFilter === 'MANUAL'} onClick={() => setPricingFilter('MANUAL')}>Manual</FilterChip>
                  <FilterChip active={pricingFilter === 'FAILED'} onClick={() => setPricingFilter('FAILED')}>Needs Attention</FilterChip>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <StatPill label="Rows" value={String(filteredAssets.length)} />
                <StatPill label="Failed" value={String(filteredAssets.filter((asset) => asset.priceFetchStatus === 'failed').length)} />
                <StatPill label="Manual" value={String(filteredAssets.filter((asset) => !asset.autoUpdate).length)} />
              </div>
              <div className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                Canada assets appear first, followed by India. Each section starts in alphabetical order and can be sorted from its own table headers.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden space-y-6 md:block">
        <CountryTableSection
          title="Canada Assets"
          subtitle="Alphabetical by default. Click headers here to sort only Canada holdings."
          table={canadaTable}
          columnsLength={columns.length}
          collapsedClasses={collapsedClasses}
          setCollapsedClasses={setCollapsedClasses}
        />
        <CountryTableSection
          title="India Assets"
          subtitle="Alphabetical by default. Click headers here to sort only India holdings."
          table={indiaTable}
          columnsLength={columns.length}
          collapsedClasses={collapsedClasses}
          setCollapsedClasses={setCollapsedClasses}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:hidden">
        {[...canadaTable.getRowModel().rows, ...indiaTable.getRowModel().rows].length ? (
          [...canadaTable.getRowModel().rows, ...indiaTable.getRowModel().rows].map((row, index, allRows) => {
            const previousClass = index > 0 ? allRows[index - 1].original.assetClass : null;
            const showSeparator = index === 0 || previousClass !== row.original.assetClass;
            const asset = row.original;
            const displayCurrency = getDisplayCurrency(asset);
            const investmentTotal = getConvertedValue(getInvestmentTotal(asset), asset.currency, baseCurrency);
            const investmentPrice = getConvertedValue(getInvestmentPrice(asset), asset.currency, baseCurrency);
            const currentPrice = getConvertedValue(getCurrentPrice(asset), asset.currency, baseCurrency);
            const currentTotal = getConvertedValue(getCurrentTotal(asset), asset.currency, baseCurrency);
            const growthTotal = getConvertedValue(getGrowthTotal(asset), asset.currency, baseCurrency);
            const xirr = getAssetXirr(asset, displayCurrency, rates);
            const isRowRefreshing = refreshingRowIds.includes(asset.id);

            return (
              <React.Fragment key={row.id}>
                {showSeparator && (
                  <div className="pt-2">
                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                      <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white dark:bg-slate-100 dark:text-slate-900">
                        {asset.assetClass}
                      </span>
                      <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                    </div>
                  </div>
                )}
                <div className="rounded-lg border p-4 bg-white dark:bg-slate-950 dark:border-slate-800 space-y-3 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-slate-100 p-2 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                          {getAssetIcon(asset.assetClass)}
                        </div>
                        <div>
                          <div className="font-semibold text-lg">{asset.name}</div>
                          <div className="text-sm text-slate-500 inline-flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white dark:bg-slate-100 dark:text-slate-900">
                              {getOwnerInitials(asset.owner)}
                            </span>
                            {asset.owner} • {asset.country}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => onEditAsset?.(asset)}>
                        <Edit className="h-4 w-4 text-slate-500" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => removeAsset(asset.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm pt-2 border-t">
                    <div>
                      <div className="text-slate-500">Total Quantity</div>
                      <div>{asset.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 })}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Ticker</div>
                      <div>{asset.ticker || '-'}</div>
                      <button
                        type="button"
                        onClick={() => setTickerRepairAsset(asset)}
                        className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${asset.priceFetchStatus === 'failed' ? 'text-amber-600' : 'text-slate-500'}`}
                        title={asset.priceFetchStatus === 'failed' ? asset.priceFetchMessage || 'Price fetch failed.' : 'Check or update ticker/provider'}
                      >
                        {asset.priceFetchStatus === 'failed' ? <AlertTriangle className="h-3.5 w-3.5" /> : null}
                        {asset.ticker ? 'Modify ticker' : 'Add ticker'}
                      </button>
                      {asset.ticker ? (
                        <button
                          type="button"
                          onClick={() => void handleRefreshRow(asset.id)}
                          disabled={isRowRefreshing}
                          className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
                          title="Refresh only this row"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${isRowRefreshing ? 'animate-spin' : ''}`} />
                          Refresh row
                        </button>
                      ) : null}
                    </div>
                    <div>
                      <div className="text-slate-500">Holding Platform</div>
                      <div>{asset.holdingPlatform || '-'}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Comments</div>
                      <div>{asset.comments || '-'}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Investment Total</div>
                      <div className={isDebtAssetClass(asset.assetClass) ? 'font-medium text-red-500' : ''}>{formatCurrency(investmentTotal, displayCurrency)}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Investment Price</div>
                      <div className={isDebtAssetClass(asset.assetClass) ? 'font-medium text-red-500' : ''}>{formatCurrency(investmentPrice, displayCurrency)}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Current Price</div>
                      <div className={isDebtAssetClass(asset.assetClass) ? 'font-medium text-red-500' : ''}>{asset.currentPrice ? formatCurrency(currentPrice, displayCurrency) : '-'}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Current Total</div>
                      <div className={`font-semibold ${isDebtAssetClass(asset.assetClass) ? 'text-red-500' : ''}`}>{formatCurrency(currentTotal, displayCurrency)}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Total Growth</div>
                      <div className={growthTotal >= 0 ? 'font-medium text-emerald-600' : 'font-medium text-red-500'}>
                        {formatCurrency(growthTotal, displayCurrency)}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">XIRR</div>
                      <div>{formatPercent(xirr)}</div>
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })
        ) : (
          <div className="text-center py-8 text-slate-500">No assets found.</div>
        )}
      </div>

      <TickerRepairModal
        asset={tickerRepairAsset}
        open={Boolean(tickerRepairAsset)}
        onOpenChange={(open) => {
          if (!open) {
            setTickerRepairAsset(undefined);
          }
        }}
      />
    </div>
  );
}

function FilterChip({ active, children, onClick }: React.PropsWithChildren<{ active: boolean; onClick: () => void }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${active ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'}`}
    >
      {children}
    </button>
  );
}

function StatPill({ label, value }: React.PropsWithChildren<{ label: string; value: string }>) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">{value}</div>
    </div>
  );
}

function CountryTableSection({
  title,
  subtitle,
  table,
  columnsLength,
  collapsedClasses,
  setCollapsedClasses,
}: {
  title: string;
  subtitle: string;
  table: ReturnType<typeof useReactTable<Asset>>;
  columnsLength: number;
  collapsedClasses: string[];
  setCollapsedClasses: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  const tableRows = table.getRowModel().rows;

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
      </div>
      <Table className="w-full">
        <TableHeader className="sticky top-0 z-10 bg-white/95 backdrop-blur dark:bg-slate-950/95">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className="min-w-0 border-b border-slate-200 bg-white/95 px-4 py-4 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:border-slate-800 dark:bg-slate-950/95 dark:text-slate-400">
                  {header.isPlaceholder ? null : (
                    <div
                      className={header.column.getCanSort() ? 'flex cursor-pointer select-none items-center gap-2 hover:text-slate-700 dark:hover:text-slate-300' : 'flex items-center gap-2'}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{
                        asc: <ArrowUp className="h-4 w-4" />,
                        desc: <ArrowDown className="h-4 w-4" />,
                      }[header.column.getIsSorted() as string] ?? (
                        header.column.getCanSort() ? <ArrowUpDown className="h-4 w-4 text-slate-300" /> : null
                      )}
                    </div>
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {tableRows.length ? (
            tableRows.map((row, index) => {
              const currentGroup = getCanonicalAssetClass(row.original.assetClass);
              const previousClass = index > 0 ? getCanonicalAssetClass(tableRows[index - 1].original.assetClass) : null;
              const showSeparator = index === 0 || previousClass !== currentGroup;
              const isCollapsed = collapsedClasses.includes(currentGroup);

              return (
                <React.Fragment key={row.id}>
                  {showSeparator && (
                    <TableRow className="bg-slate-50/90 dark:bg-slate-900/60 hover:bg-slate-50/90 dark:hover:bg-slate-900/60">
                      <TableCell colSpan={columnsLength} className="border-t border-slate-200 px-4 py-3 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => setCollapsedClasses((current) => current.includes(currentGroup) ? current.filter((item) => item !== currentGroup) : [...current, currentGroup])}
                          className="flex w-full items-center gap-3 text-left"
                        >
                          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                          <span className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white dark:bg-slate-100 dark:text-slate-900">
                            {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            {currentGroup}
                          </span>
                          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                        </button>
                      </TableCell>
                    </TableRow>
                  )}
                  {!isCollapsed && (
                    <TableRow className={`align-top transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/50 ${index % 2 === 0 ? 'bg-white dark:bg-slate-950' : 'bg-slate-50/55 dark:bg-slate-900/40'}`}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="min-w-0 px-4 py-4 text-sm leading-6">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={columnsLength} className="h-24 text-center">
                No assets found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </section>
  );
}

function getOwnerInitials(owner: string) {
  return owner
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'NA';
}

function getAssetIcon(assetClass: string) {
  const normalized = assetClass.toLowerCase();
  if (normalized.includes('real estate') || normalized.includes('property')) return <Building2 className="h-4 w-4" />;
  if (normalized.includes('equity') || normalized.includes('stock')) return <LineChart className="h-4 w-4" />;
  if (normalized.includes('bank') || normalized.includes('cash') || normalized.includes('account')) return <Landmark className="h-4 w-4" />;
  if (normalized.includes('gold')) return <Gem className="h-4 w-4" />;
  if (normalized.includes('credit')) return <WalletCards className="h-4 w-4" />;
  if (normalized.includes('fd') || normalized.includes('pf') || normalized.includes('nps')) return <PiggyBank className="h-4 w-4" />;
  return <ShieldCheck className="h-4 w-4" />;
}

function getPreviousClose(asset: Asset) {
  const candidate = (asset as Asset & { previousClose?: number }).previousClose;
  return typeof candidate === 'number' && Number.isFinite(candidate) ? candidate : null;
}

function getStatusColor(val: number) {
  return val >= 0 ? 'text-emerald-600' : 'text-red-600';
}

function getCanonicalAssetClass(assetClass: string) {
  const normalized = assetClass.trim().toLowerCase();
  if (normalized === 'equity' || normalized === 'stock' || normalized === 'stocks') return 'Stocks';
  if (normalized === 'mutual fund' || normalized === 'mutual funds') return 'Mutual Funds';
  if (normalized === 'bank account inr' || normalized === 'bank account' || normalized === 'cash') return assetClass.trim() === 'Cash' ? 'Cash' : 'Bank Account INR';
  if (normalized === 'pf') return 'PF';
  if (normalized === 'ppf') return 'PPF';
  if (normalized === 'fd') return 'FD';
  if (normalized === 'nps') return 'NPS';
  return assetClass;
}
