export function getYahooTicker(ticker: string) {
  if (!ticker.includes(':')) return ticker;
  const [exchange, symbol] = ticker.split(':');

  switch (exchange.toUpperCase()) {
    case 'NASDAQ':
    case 'NYSE':
    case 'AMEX':
      return symbol;
    case 'NSE':
      return `${symbol}.NS`;
    case 'BOM':
      return `${symbol}.BO`;
    case 'TSE':
      return `${symbol}.TO`;
    case 'CVE':
      return `${symbol}.V`;
    case 'LON':
      return `${symbol}.L`;
    case 'FRA':
      return `${symbol}.F`;
    case 'TYO':
      return `${symbol}.T`;
    default:
      return symbol;
  }
}

export async function fetchYahooFinancePrice(ticker: string) {
  const yahooTicker = getYahooTicker(ticker);
  const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooTicker)}`;
  const yahooResponse = await fetch(yahooUrl);

  if (!yahooResponse.ok) {
    throw new Error(`Yahoo returned ${yahooResponse.status} for ${yahooTicker}`);
  }

  const yahooData = await yahooResponse.json();
  const result = yahooData.chart?.result?.[0];
  const price = result?.meta?.regularMarketPrice;
  const previousClose = result?.meta?.previousClose ?? result?.meta?.chartPreviousClose ?? result?.meta?.regularMarketPreviousClose;
  const currency = result?.meta?.currency;

  if (typeof price !== 'number') {
    return {
      price: null,
      previousClose: typeof previousClose === 'number' ? previousClose : null,
      yahooTicker,
      currency,
      sourceUrl: `https://finance.yahoo.com/quote/${encodeURIComponent(yahooTicker)}`,
      error: `Price not found for ticker: ${ticker} (Yahoo: ${yahooTicker})`,
    };
  }

  return {
    price,
    previousClose: typeof previousClose === 'number' ? previousClose : null,
    yahooTicker,
    currency,
    sourceUrl: `https://finance.yahoo.com/quote/${encodeURIComponent(yahooTicker)}`,
    error: null,
  };
}
