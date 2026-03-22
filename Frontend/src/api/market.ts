import { getApiBaseUrl } from './config';

const API_BASE_URL = getApiBaseUrl();

export interface MarketQuote {
  price: number;
  change: number;
  changePercent: number;
  updatedAt: string;
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
  region: 'Europe' | 'US' | 'Asia';
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
  price: number;
  change: number;
  changePercent: number;
  volume: number;
}

export interface TopMoversResponse {
  gainers: TopMoverItem[];
  losers: TopMoverItem[];
  updatedAt: string;
  supported: boolean;
  message: string | null;
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
  const contentType = response.headers.get('content-type') || '';
  const rawBody = await response.text();

  if (contentType.includes('application/json')) {
    const data = rawBody ? JSON.parse(rawBody) : {};
    throw new Error(data.error || 'Failed to fetch market data');
  }

  if (rawBody.trim().startsWith('<!doctype') || rawBody.trim().startsWith('<html')) {
    throw new Error('Market API returned HTML. Check VITE_API_URL / deployed API URL.');
  }

  throw new Error(rawBody || 'Failed to fetch market data');
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

  const query = encodeURIComponent(uniqueTickers.join(','));
  const response = await fetch(`${API_BASE_URL}/api/market/quotes?tickers=${query}`);
  const contentType = response.headers.get('content-type') || '';
  const rawBody = await response.text();

  if (!contentType.includes('application/json')) {
    if (rawBody.trim().startsWith('<!doctype') || rawBody.trim().startsWith('<html')) {
      throw new Error('Market API returned HTML. Check VITE_API_URL / deployed API URL.');
    }
    throw new Error(rawBody || 'Failed to fetch market quotes');
  }

  const data = rawBody ? JSON.parse(rawBody) : {};

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch market quotes');
  }

  return data.quotes || {};
}

export async function getTopMovers(index: string): Promise<TopMoversResponse> {
  const query = encodeURIComponent(index);
  const response = await fetch(`${API_BASE_URL}/api/market/top-movers?index=${query}`);
  const contentType = response.headers.get('content-type') || '';
  const rawBody = await response.text();

  if (!contentType.includes('application/json')) {
    if (rawBody.trim().startsWith('<!doctype') || rawBody.trim().startsWith('<html')) {
      throw new Error('Market API returned HTML. Check VITE_API_URL / deployed API URL.');
    }
    throw new Error(rawBody || 'Failed to fetch top movers');
  }

  const data = rawBody ? JSON.parse(rawBody) : {};

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch top movers');
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

export async function getUpcomingEarnings(): Promise<{ items: EarningsCalendarItem[]; updatedAt: string }> {
  const response = await fetch(`${API_BASE_URL}/api/earnings/upcoming`);
  if (!response.ok) {
    await parseError(response);
  }
  return response.json();
}
