import { getStorageAdapter } from '../storage/index.js';

export const HISTORICAL_PRICES_COLLECTION = 'historical_prices';

export interface HistoricalPriceRecord {
  id: string;
  uid: string;
  ticker: string;
  date: string;
  price: number;
  currency: string;
  recordedAt: number;
  batchId: string;
}

export async function saveHistoricalPrices(
  uid: string,
  batchId: string,
  prices: Array<{
    ticker: string;
    date: string;
    price: number;
    currency: string;
  }>,
  onProgress?: (current: number, total: number) => void,
): Promise<{ inserted: number }> {
  const adapter = getStorageAdapter();
  const now = Date.now();
  let inserted = 0;

  const total = prices.length;
  if (onProgress) onProgress(0, total);

  const chunkSize = 25;
  for (let i = 0; i < total; i += chunkSize) {
    const chunk = prices.slice(i, i + chunkSize);
    const batch = adapter.batch();

    for (const price of chunk) {
      const id = `${uid}:${price.ticker}:${price.date}`;
      batch.set(HISTORICAL_PRICES_COLLECTION, id, {
        id,
        uid,
        ticker: price.ticker.toUpperCase(),
        date: price.date,
        price: price.price,
        currency: price.currency,
        recordedAt: now,
        batchId,
      } as unknown as Record<string, unknown>);
    }

    await batch.commit();
    inserted += chunk.length;
    if (onProgress) onProgress(inserted, total);
  }

  return { inserted };
}

export async function getHistoricalPrices(
  uid: string,
  ticker?: string,
): Promise<HistoricalPriceRecord[]> {
  const adapter = getStorageAdapter();
  const results = await adapter.queryWhere<HistoricalPriceRecord>(
    HISTORICAL_PRICES_COLLECTION,
    'uid',
    '==',
    uid,
  );

  if (ticker) {
    return results.filter((r) => r.ticker.toUpperCase() === ticker.toUpperCase());
  }

  return results;
}

export async function deleteHistoricalBatch(
  uid: string,
  batchId: string,
): Promise<{ deleted: number }> {
  const adapter = getStorageAdapter();
  const records = await adapter.queryWhere<HistoricalPriceRecord>(
    HISTORICAL_PRICES_COLLECTION,
    'uid',
    '==',
    uid,
  ).then((results) => results.filter((r) => r.batchId === batchId));

  if (records.length === 0) return { deleted: 0 };

  const batch = adapter.batch();
  for (const record of records) {
    batch.delete(HISTORICAL_PRICES_COLLECTION, record.id);
  }
  await batch.commit();

  return { deleted: records.length };
}
