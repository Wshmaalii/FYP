import { getApiBaseUrl } from './config';
import { getStoredToken } from './auth';

const API_BASE_URL = getApiBaseUrl();

export type MessageChannel = 'market' | 'private' | 'earnings';

export interface ChannelMessage {
  id: string;
  user_id: string;
  user: string;
  verified: boolean;
  content: string;
  timestamp: string | null;
  tickers: string[];
  channel: MessageChannel;
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
    throw new Error('Messages API did not return JSON.');
  }

  return data as T;
}

export async function fetchMessages(channel: MessageChannel, limit = 50): Promise<ChannelMessage[]> {
  const data = await request<{ messages: ChannelMessage[] }>(
    `/api/messages?channel=${encodeURIComponent(channel)}&limit=${limit}`,
  );
  return data.messages;
}

export async function sendMessage(channel: MessageChannel, content: string): Promise<ChannelMessage> {
  const data = await request<{ message: ChannelMessage }>('/api/messages', {
    method: 'POST',
    body: JSON.stringify({ channel, content }),
  });
  return data.message;
}
