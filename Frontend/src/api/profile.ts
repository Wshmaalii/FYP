import { getApiBaseUrl } from './config';
import { getStoredToken } from './auth';

const API_BASE_URL = getApiBaseUrl();

export interface UserProfile {
  user_id: string;
  email: string;
  full_name: string;
  username: string;
  bio: string;
  avatar_url: string | null;
  avatar_seed: string;
  joined_at: string | null;
  verified_trader: boolean;
}

export interface ProfileStats {
  messages_sent_count: number;
  watchlist_items_count: number;
  active_rooms_count: number;
  profile_completion_percent: number;
  recent_participation_count: number;
  tickers_shared_count: number;
}

export interface ProfileActivity {
  id: string;
  activity_type: string;
  description: string;
  ticker: string | null;
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
    throw new Error('Profile API did not return JSON.');
  }

  return data as T;
}

export async function fetchMyProfile(): Promise<UserProfile> {
  const data = await request<{ profile: UserProfile }>('/api/profile/me');
  return data.profile;
}

export async function updateMyProfile(payload: {
  full_name: string;
  username: string;
  bio: string;
  avatar_url?: string | null;
}): Promise<UserProfile> {
  const data = await request<{ profile: UserProfile }>('/api/profile/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return data.profile;
}

export async function fetchProfileStats(): Promise<ProfileStats> {
  const data = await request<{ stats: ProfileStats }>('/api/profile/stats');
  return data.stats;
}

export async function fetchProfileActivity(limit = 10): Promise<ProfileActivity[]> {
  const data = await request<{ activities: ProfileActivity[] }>(`/api/profile/activity?limit=${limit}`);
  return data.activities;
}
