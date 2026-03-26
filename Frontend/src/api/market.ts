import { getApiBaseUrl } from './config';

const API_BASE_URL = getApiBaseUrl();
export const MARKET_DATA_LIMITED_MESSAGE = 'Live market data is limited in this prototype. Data is provided on-demand for selected tickers.';
const MARKET_DATA_UNAVAILABLE_MESSAGE = 'Live market data is temporarily unavailable for the selected tickers.';

export interface MarketQuote {
  price: number;
  change: number;
  changePercent: number;
  updatedAt: string;
}

export interface MarketDataStatus {
  source: 'live' | 'cache' | 'internal';
  isCachedFallback: boolean;
  lastUpdatedAt: string | null;
  message: string | null;
}

export interface MarketOverviewIndex {
  name: string;
  ticker: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  region: string;
  status: string;
  history: StockHistoryPoint[];
  available: boolean;
  sourceSymbol: string | null;
  sourceType: 'proxy_etf' | 'direct' | null;
  sourceLabel: string | null;
}

export interface MarketOverviewResponse {
  indices: MarketOverviewIndex[];
  updatedAt: string;
  sectors_available: boolean;
  sectors: Array<{ sector: string; change: number }>;
  marketDataStatus?: MarketDataStatus;
}

export interface EarningsCalendarItem {
  ticker: string;
  company: string;
  report_date: string;
  estimate: number | null;
  currency: string;
}

export interface TopMoverItem {
  ticker: string;
  name: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  volume: number;
  mentionCount: number;
  uniqueUsers: number;
  watchlistAdds: number;
}

export interface TopMoversResponse {
  items: TopMoverItem[];
  updatedAt: string;
  supported: boolean;
  message: string | null;
  windowDays: number;
  marketDataStatus?: MarketDataStatus;
}

export interface StockQuoteResponse {
  symbol: string;
  price: number;
  change?: number;
  change_percent: string;
  marketDataStatus?: MarketDataStatus;
}

export interface StockHistoryPoint {
  time: string;
  price: number;
}

export interface StockHistoryResponse {
  points: StockHistoryPoint[];
  marketDataStatus?: MarketDataStatus;
}

export interface EarningsCalendarResponse {
  items: EarningsCalendarItem[];
  updatedAt: string;
  marketDataStatus?: MarketDataStatus;
}

export interface MarketQuotesResponse {
  quotes: Record<string, MarketQuote>;
  marketDataStatus?: MarketDataStatus;
}

async function parseError(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  const rawBody = await response.text();

  if (contentType.includes('application/json')) {
    let data: Record<string, unknown> = {};
    try {
      data = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      throw new Error(MARKET_DATA_UNAVAILABLE_MESSAGE);
    }
    const error = typeof data?.error === 'string' ? data.error.toLowerCase() : '';
    if (error.includes('rate limit')) {
      throw new Error(MARKET_DATA_LIMITED_MESSAGE);
    }
    throw new Error(MARKET_DATA_UNAVAILABLE_MESSAGE);
  }

  if (rawBody.trim().startsWith('<!doctype') || rawBody.trim().startsWith('<html')) {
    throw new Error(MARKET_DATA_UNAVAILABLE_MESSAGE);
  }

  throw new Error(MARKET_DATA_UNAVAILABLE_MESSAGE);
}

export async function fetchQuote(symbol: string): Promise<StockQuoteResponse> {
  const normalized = symbol.trim();
  const response = await fetch(`${API_BASE_URL}/api/stocks/quote/${encodeURIComponent(normalized)}`);
  if (!response.ok) {
    await parseError(response);
  }
  return response.json();
}

export async function fetchHistory(symbol: string): Promise<StockHistoryResponse> {
  const normalized = symbol.trim();
  const response = await fetch(`${API_BASE_URL}/api/stocks/history/${encodeURIComponent(normalized)}`);
  if (!response.ok) {
    await parseError(response);
  }
  return response.json();
}

export async function getQuotes(tickers: string[]): Promise<MarketQuotesResponse> {
  const uniqueTickers = Array.from(new Set(tickers.map((ticker) => ticker.trim()).filter(Boolean)));

  if (uniqueTickers.length === 0) {
    return { quotes: {} };
  }

  const query = encodeURIComponent(uniqueTickers.join(','));
  const response = await fetch(`${API_BASE_URL}/api/market/quotes?tickers=${query}`);
  const contentType = response.headers.get('content-type') || '';
  const rawBody = await response.text();

  if (!contentType.includes('application/json')) {
    throw new Error(MARKET_DATA_UNAVAILABLE_MESSAGE);
  }

  const data = rawBody ? JSON.parse(rawBody) : {};

  if (!response.ok) {
    const error = typeof data?.error === 'string' ? data.error.toLowerCase() : '';
    throw new Error(error.includes('rate limit') ? MARKET_DATA_LIMITED_MESSAGE : MARKET_DATA_UNAVAILABLE_MESSAGE);
  }

  return { quotes: data.quotes || {}, marketDataStatus: data.marketDataStatus };
}

export async function getTopMovers(index: string): Promise<TopMoversResponse> {
  const query = encodeURIComponent(index);
  const response = await fetch(`${API_BASE_URL}/api/market/top-movers?index=${query}`);
  const contentType = response.headers.get('content-type') || '';
  const rawBody = await response.text();

  if (!contentType.includes('application/json')) {
    throw new Error(MARKET_DATA_UNAVAILABLE_MESSAGE);
  }

  const data = rawBody ? JSON.parse(rawBody) : {};

  if (!response.ok) {
    const error = typeof data?.error === 'string' ? data.error.toLowerCase() : '';
    throw new Error(error.includes('rate limit') ? MARKET_DATA_LIMITED_MESSAGE : MARKET_DATA_UNAVAILABLE_MESSAGE);
  }

  return data;
}

export async function getMarketOverview(): Promise<MarketOverviewResponse> {
  const response = await fetch(`${API_BASE_URL}/api/market/overview`);
  if (!response.ok) {
    await parseError(response);
  }
  return response.json();
}

export async function getUpcomingEarnings(): Promise<EarningsCalendarResponse> {
  const response = await fetch(`${API_BASE_URL}/api/earnings/upcoming`);
  if (!response.ok) {
    await parseError(response);
  }
  return response.json();
}
