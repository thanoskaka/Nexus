export interface HistoricalPriceRow {
  date: string;
  ticker: string;
  price: number;
  currency?: string;
}

export interface HistoricalImportParseResult {
  rows: HistoricalPriceRow[];
  errors: string[];
  warnings: string[];
  summary: {
    totalRows: number;
    uniqueTickers: number;
    dateRange: { earliest: string; latest: string } | null;
  };
}

export interface HistoricalSnapshot {
  id: string;
  ticker: string;
  date: string;
  price: number;
  currency: string;
  recordedAt: number;
}

const ALLOWED_CURRENCIES = ['CAD', 'INR', 'USD'];

function normalizeCurrency(value: string | undefined, defaultCurrency: string): string {
  if (!value) return defaultCurrency;
  const upper = value.trim().toUpperCase();
  if (ALLOWED_CURRENCIES.includes(upper)) return upper;
  return defaultCurrency;
}

function isValidDate(value: string): boolean {
  const date = new Date(value);
  return !isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(value);
}

export function parseHistoricalCSV(
  content: string,
  defaultCurrency: string = 'USD',
): HistoricalImportParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const rows: HistoricalPriceRow[] = [];
  const seen = new Set<string>();

  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return { rows: [], errors: ['CSV file is empty'], warnings, summary: { totalRows: 0, uniqueTickers: 0, dateRange: null } };
  }

  const headerLine = lines[0].toLowerCase().trim();
  const headers = headerLine.split(',').map((h) => h.trim());

  const dateIdx = headers.indexOf('date');
  const tickerIdx = headers.indexOf('ticker');
  const priceIdx = headers.indexOf('price');
  const currencyIdx = headers.indexOf('currency');

  if (dateIdx === -1) errors.push('Missing required column: date');
  if (tickerIdx === -1) errors.push('Missing required column: ticker');
  if (priceIdx === -1) errors.push('Missing required column: price');

  if (errors.length > 0) {
    return { rows: [], errors, warnings, summary: { totalRows: 0, uniqueTickers: 0, dateRange: null } };
  }

  const uniqueTickers = new Set<string>();
  let earliestDate: string | null = null;
  let latestDate: string | null = null;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const fields = line.split(',').map((f) => f.trim());

    const date = fields[dateIdx] || '';
    const ticker = (fields[tickerIdx] || '').toUpperCase();
    const priceStr = fields[priceIdx] || '';
    const currency = currencyIdx !== -1 ? fields[currencyIdx] : undefined;

    if (!date || !ticker || !priceStr) {
      errors.push(`Row ${i + 1}: missing required field(s)`);
      continue;
    }

    if (!isValidDate(date)) {
      errors.push(`Row ${i + 1}: invalid date "${date}". Use YYYY-MM-DD format.`);
      continue;
    }

    const price = parseFloat(priceStr);
    if (isNaN(price) || price < 0) {
      errors.push(`Row ${i + 1}: invalid or negative price "${priceStr}"`);
      continue;
    }

    const dedupKey = `${date}:${ticker}`;
    if (seen.has(dedupKey)) {
      warnings.push(`Row ${i + 1}: duplicate entry for ${ticker} on ${date}`);
      continue;
    }
    seen.add(dedupKey);

    uniqueTickers.add(ticker);
    if (!earliestDate || date < earliestDate) earliestDate = date;
    if (!latestDate || date > latestDate) latestDate = date;

    rows.push({
      date,
      ticker,
      price,
      currency: normalizeCurrency(currency, defaultCurrency),
    });
  }

  const dateRange = earliestDate && latestDate ? { earliest: earliestDate, latest: latestDate } : null;

  return {
    rows,
    errors,
    warnings,
    summary: {
      totalRows: rows.length,
      uniqueTickers: uniqueTickers.size,
      dateRange,
    },
  };
}

export function buildHistoricalSnapshots(
  rows: HistoricalPriceRow[],
): HistoricalSnapshot[] {
  const now = Date.now();
  return rows.map((row) => ({
    id: `hist:${row.ticker}:${row.date}`,
    ticker: row.ticker,
    date: row.date,
    price: row.price,
    currency: row.currency || 'USD',
    recordedAt: now,
  }));
}
