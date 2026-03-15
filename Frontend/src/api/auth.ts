import { getApiBaseUrl } from './config';

const API_BASE_URL = getApiBaseUrl();
const TOKEN_KEY = 'tradelink_auth_token';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

interface AuthResponse {
  token: string;
  user: AuthUser;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const contentType = response.headers.get('content-type') || '';
  const rawBody = await response.text();
  const isJson = contentType.includes('application/json');
  const data = isJson && rawBody ? JSON.parse(rawBody) : null;

  if (!response.ok) {
    if (data && typeof data === 'object' && 'error' in data) {
      throw new Error(String(data.error));
    }

    if (rawBody.trim().startsWith('<!doctype') || rawBody.trim().startsWith('<html')) {
      throw new Error('Auth API returned HTML. Check VITE_API_URL / deployed API URL.');
    }

    throw new Error(rawBody || 'Request failed');
  }

  if (!isJson) {
    throw new Error('Auth API did not return JSON.');
  }

  return data as T;
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function storeToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export async function signup(name: string, email: string, password: string): Promise<AuthUser> {
  const data = await request<AuthResponse>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });

  storeToken(data.token);
  return data.user;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const data = await request<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  storeToken(data.token);
  return data.user;
}

export async function getCurrentUser(token: string): Promise<AuthUser> {
  const data = await request<{ user: AuthUser }>('/api/auth/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return data.user;
}

export async function logout(token: string | null) {
  if (!token) {
    clearStoredToken();
    return;
  }

  try {
    await request<{ message: string }>('/api/auth/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } finally {
    clearStoredToken();
  }
}
