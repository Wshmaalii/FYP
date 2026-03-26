import { getApiBaseUrl } from './config';
import { getStoredToken } from './auth';

const API_BASE_URL = getApiBaseUrl();
export const WATCHLIST_UPDATED_EVENT = 'tradelink:watchlist-updated';

export interface WatchlistItem {
  ticker: string;
  company_name: string | null;
  created_at: string | null;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const rawBody = await response.text();
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson && rawBody ? JSON.parse(rawBody) : null;

  if (!response.ok) {
    if (data && typeof data === 'object' && 'error' in data) {
      throw new Error(String(data.error));
    }
    throw new Error(rawBody || 'Request failed');
  }

  if (!isJson) {
    throw new Error('Watchlist API did not return JSON.');
  }

  return data as T;
}

export async function fetchWatchlist(): Promise<WatchlistItem[]> {
  const data = await request<{ items: WatchlistItem[] }>('/api/watchlist');
  return data.items;
}

export async function addWatchlistItem(ticker: string, company_name?: string): Promise<WatchlistItem> {
  const data = await request<{ item: WatchlistItem }>('/api/watchlist', {
    method: 'POST',
    body: JSON.stringify({ ticker, company_name }),
  });
  window.dispatchEvent(new CustomEvent(WATCHLIST_UPDATED_EVENT, { detail: { action: 'added', ticker } }));
  return data.item;
}

export async function removeWatchlistItem(ticker: string): Promise<void> {
  await request<{ message: string }>(`/api/watchlist/${encodeURIComponent(ticker)}`, {
    method: 'DELETE',
  });
  window.dispatchEvent(new CustomEvent(WATCHLIST_UPDATED_EVENT, { detail: { action: 'removed', ticker } }));
}
