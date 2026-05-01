import type { PortfolioAsset, PortfolioDocument } from './types.js';

type SnapshotAsset = {
  name: string;
  ticker: string;
  quantity: number | null;
  currency: string;
  estimatedValue: number | null;
  costBasis: number | null;
  assetClass: string;
  country: string;
  owner: string | null;
};

function asSafeNumber(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
}

function summarizeAsset(asset: PortfolioAsset): SnapshotAsset {
  const name = typeof asset.name === 'string' && asset.name.trim() ? asset.name.trim() : 'Unnamed asset';
  const ticker = typeof asset.ticker === 'string' ? asset.ticker.trim().toUpperCase() : '';
  const quantity = asSafeNumber(asset.quantity);
  const costBasis = asSafeNumber(asset.costBasis);
  const currentPrice = asSafeNumber(asset.currentPrice);
  const estimatedValue = quantity !== null && currentPrice !== null ? Number((quantity * currentPrice).toFixed(2)) : null;
  const currency = typeof asset.currency === 'string' && asset.currency.trim() ? asset.currency.trim().toUpperCase() : 'UNKNOWN';
  const assetClass = typeof asset.assetClass === 'string' && asset.assetClass.trim() ? asset.assetClass.trim() : 'Unclassified';
  const country = typeof asset.country === 'string' && asset.country.trim() ? asset.country.trim() : 'Unknown';
  const owner = typeof asset.owner === 'string' && asset.owner.trim() ? asset.owner.trim() : null;

  return {
    name,
    ticker,
    quantity,
    currency,
    estimatedValue,
    costBasis,
    assetClass,
    country,
    owner,
  };
}

function sanitizeAssets(assets: unknown) {
  const typed = Array.isArray(assets) ? assets as PortfolioAsset[] : [];
  return typed.map(summarizeAsset);
}

export function buildPortfolioSnapshot(portfolio: PortfolioDocument) {
  const assets = sanitizeAssets(portfolio.assets);
  const totalEstimatedByCurrency = new Map<string, number>();
  const totalCostBasisByCurrency = new Map<string, number>();
  const ownerTotals = new Map<string, { assetCount: number; estimatedByCurrency: Map<string, number>; goldQuantity: number; goldEstimatedByCurrency: Map<string, number> }>();

  for (const asset of assets) {
    if (asset.estimatedValue !== null) {
      totalEstimatedByCurrency.set(asset.currency, (totalEstimatedByCurrency.get(asset.currency) || 0) + asset.estimatedValue);
    }
    if (asset.costBasis !== null) {
      totalCostBasisByCurrency.set(asset.currency, (totalCostBasisByCurrency.get(asset.currency) || 0) + asset.costBasis);
    }

    if (asset.owner) {
      const current = ownerTotals.get(asset.owner) || {
        assetCount: 0,
        estimatedByCurrency: new Map<string, number>(),
        goldQuantity: 0,
        goldEstimatedByCurrency: new Map<string, number>(),
      };
      current.assetCount += 1;
      if (asset.estimatedValue !== null) {
        current.estimatedByCurrency.set(
          asset.currency,
          (current.estimatedByCurrency.get(asset.currency) || 0) + asset.estimatedValue,
        );
      }
      if (asset.assetClass.toLowerCase() === 'gold') {
        if (asset.quantity !== null) {
          current.goldQuantity += asset.quantity;
        }
        if (asset.estimatedValue !== null) {
          current.goldEstimatedByCurrency.set(
            asset.currency,
            (current.goldEstimatedByCurrency.get(asset.currency) || 0) + asset.estimatedValue,
          );
        }
      }
      ownerTotals.set(asset.owner, current);
    }
  }

  const topAssets = [...assets]
    .sort((left, right) => (right.estimatedValue || 0) - (left.estimatedValue || 0))
    .slice(0, 15);

  const compactAssets = assets.slice(0, 80);
  const owners = [...ownerTotals.entries()].map(([owner, totals]) => ({
    owner,
    assetCount: totals.assetCount,
    estimatedValueByCurrency: Object.fromEntries(
      [...totals.estimatedByCurrency.entries()].map(([currency, total]) => [currency, Number(total.toFixed(2))]),
    ),
    goldQuantity: Number(totals.goldQuantity.toFixed(4)),
    goldQuantityUnit: 'portfolio quantity unit (often grams for gold assets)',
    goldEstimatedValueByCurrency: Object.fromEntries(
      [...totals.goldEstimatedByCurrency.entries()].map(([currency, total]) => [currency, Number(total.toFixed(2))]),
    ),
  }));

  const snapshot = {
    portfolioId: portfolio.id,
    portfolioName: portfolio.name || 'My Portfolio',
    primaryCurrency: portfolio.primaryCurrency || null,
    secondaryCurrency: portfolio.secondaryCurrency || null,
    baseCurrency: portfolio.baseCurrency || null,
    assetCount: assets.length,
    totals: {
      estimatedValueByCurrency: Object.fromEntries(
        [...totalEstimatedByCurrency.entries()].map(([currency, total]) => [currency, Number(total.toFixed(2))]),
      ),
      costBasisByCurrency: Object.fromEntries(
        [...totalCostBasisByCurrency.entries()].map(([currency, total]) => [currency, Number(total.toFixed(2))]),
      ),
    },
    owners,
    topAssets,
    assets: compactAssets,
    updatedAt: portfolio.updatedAt || null,
  };

  const totalsText = Object.entries(snapshot.totals.estimatedValueByCurrency)
    .map(([currency, total]) => `${currency} ${total}`)
    .join(', ');
  const contextSummary = `Portfolio ${snapshot.portfolioName} has ${snapshot.assetCount} assets. Estimated totals: ${totalsText || 'not available'}.`;

  return { snapshot, contextSummary };
}
