const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface MarketQuote {
  price: number;
  change: number;
  changePercent: number;
  updatedAt: string;
}

export interface TopMoverItem {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
}

export interface TopMoversResponse {
  gainers: TopMoverItem[];
  losers: TopMoverItem[];
  updatedAt: string;
}

export interface StockQuoteResponse {
  symbol: string;
  price: number;
  change?: number;
  change_percent: string;
}

export interface StockHistoryPoint {
  time: string;
  price: number;
}

async function parseError(response: Response) {
  const data = await response.json().catch(() => ({}));
  throw new Error(data.error || 'Failed to fetch market data');
}

export async function fetchQuote(symbol: string): Promise<StockQuoteResponse> {
  const normalized = symbol.trim();
  const response = await fetch(`${API_BASE_URL}/api/stocks/quote/${encodeURIComponent(normalized)}`);
  if (!response.ok) {
    await parseError(response);
  }
  return response.json();
}

export async function fetchHistory(symbol: string): Promise<StockHistoryPoint[]> {
  const normalized = symbol.trim();
  const response = await fetch(`${API_BASE_URL}/api/stocks/history/${encodeURIComponent(normalized)}`);
  if (!response.ok) {
    await parseError(response);
  }
  return response.json();
}

export async function getQuotes(tickers: string[]): Promise<Record<string, MarketQuote>> {
  const uniqueTickers = Array.from(new Set(tickers.map((ticker) => ticker.trim()).filter(Boolean)));

  if (uniqueTickers.length === 0) {
    return {};
  }

  const entries = await Promise.all(
    uniqueTickers.map(async (ticker) => {
      const quote = await fetchQuote(ticker);
      const changePercent = Number.parseFloat((quote.change_percent || '0').replace('%', '')) || 0;

      return [
        ticker,
        {
          price: quote.price,
          change: typeof quote.change === 'number' && Number.isFinite(quote.change) ? quote.change : 0,
          changePercent,
          updatedAt: new Date().toISOString(),
        },
      ] as const;
    }),
  );

  return Object.fromEntries(entries);
}

export async function getTopMovers(index: string): Promise<TopMoversResponse> {
  const query = encodeURIComponent(index);
  const response = await fetch(`${API_BASE_URL}/api/market/top-movers?index=${query}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch top movers');
  }

  return data;
}
