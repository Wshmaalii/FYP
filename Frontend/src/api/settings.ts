import { getApiBaseUrl } from './config';
import { getStoredToken } from './auth';

const API_BASE_URL = getApiBaseUrl();

export interface UserSettings {
  full_name: string;
  username: string;
  email_notifications: boolean;
  push_notifications: boolean;
  message_notifications: boolean;
  profile_visibility: 'public' | 'members' | 'private';
  dark_mode: boolean;
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
    throw new Error('Settings API did not return JSON.');
  }

  return data as T;
}

export async function fetchSettings(): Promise<UserSettings> {
  const data = await request<{ settings: UserSettings }>('/api/settings/me');
  return data.settings;
}

export async function updateSettings(payload: Partial<UserSettings>): Promise<UserSettings> {
  const data = await request<{ settings: UserSettings }>('/api/settings/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return data.settings;
}

export async function updatePassword(payload: {
  current_password: string;
  new_password: string;
  confirm_password: string;
}): Promise<void> {
  await request<{ message: string }>('/api/auth/password', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
