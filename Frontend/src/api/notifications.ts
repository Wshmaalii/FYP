import { getApiBaseUrl } from './config';
import { getStoredToken } from './auth';

const API_BASE_URL = getApiBaseUrl();

export interface MentionNotificationPayload {
  space_name: string;
  conversation_key: string;
  channel_name: string;
  channel_key: string;
  message_id: string;
  mentioned_by_name: string;
  mentioned_by_username: string;
  message_preview: string;
}

export interface WatchlistAlertNotificationPayload {
  ticker: string;
  stock_name: string;
  price: number | null;
  change: number | null;
  change_percent: number | null;
  movement_label: string;
}

export interface ConnectionRequestNotificationPayload {
  request_id: string;
  requester_id: string;
  requester_name: string;
  requester_username: string;
  status: 'pending' | 'accepted' | 'declined';
}

export interface NotificationRecord {
  id: string;
  type: 'mention' | 'watchlist_alert' | 'connection_request';
  is_read: boolean;
  read_at: string | null;
  created_at: string | null;
  payload: MentionNotificationPayload | WatchlistAlertNotificationPayload | ConnectionRequestNotificationPayload;
}

export interface NotificationsResponse {
  notifications: NotificationRecord[];
  unread_count: number;
  counts: {
    mentions: number;
    watchlist_alerts: number;
    connections: number;
  };
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
    throw new Error('Notifications API did not return JSON.');
  }

  return data as T;
}

export async function fetchNotifications(limit = 50): Promise<NotificationsResponse> {
  return request<NotificationsResponse>(`/api/notifications?limit=${limit}`);
}

export async function markNotificationsRead(ids: string[]): Promise<{ unread_count: number }> {
  return request<{ unread_count: number }>('/api/notifications/read', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}

export async function markAllNotificationsRead(): Promise<{ unread_count: number }> {
  return request<{ unread_count: number }>('/api/notifications/read', {
    method: 'POST',
    body: JSON.stringify({ mark_all: true }),
  });
}
