import { fetchYahooFinancePrice } from '../src/lib/financeServer';

type RequestLike = {
  query: Record<string, string | string[] | undefined>;
};

type ResponseLike = {
  status: (code: number) => ResponseLike;
  json: (body: unknown) => void;
};

export default async function handler(req: RequestLike, res: ResponseLike) {
  const rawTicker = req.query.ticker;
  const ticker = Array.isArray(rawTicker) ? rawTicker[0] : rawTicker;

  if (!ticker) {
    res.status(400).json({ error: 'Ticker is required' });
    return;
  }

  try {
    const result = await fetchYahooFinancePrice(ticker);

    if (result.price == null) {
      res.status(404).json({
        error: result.error,
        previousClose: result.previousClose,
        currency: result.currency,
        sourceUrl: result.sourceUrl,
        normalizedTicker: result.yahooTicker,
      });
      return;
    }

    res.status(200).json({
      price: result.price,
      previousClose: result.previousClose,
      currency: result.currency,
      sourceUrl: result.sourceUrl,
      normalizedTicker: result.yahooTicker,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch data',
    });
  }
}
