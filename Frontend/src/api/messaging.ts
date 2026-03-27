import { getApiBaseUrl } from './config';
import { getStoredToken } from './auth';

const API_BASE_URL = getApiBaseUrl();

export interface MessagingUser {
  user_id: string;
  username: string;
  display_name: string;
}

export interface ConversationChannel {
  channel_key: string;
  name: string;
  slug: string;
}

export interface ConversationSummary {
  conversation_key: string;
  kind: 'public_space' | 'private_group' | 'direct_message';
  name: string;
  description: string;
  visibility: 'public' | 'private';
  member_count: number;
  is_member: boolean;
  channels: ConversationChannel[];
  members?: Array<MessagingUser & { role: string }>;
  handle?: string;
}

export interface MessagingSidebarData {
  my_spaces: ConversationSummary[];
  direct_messages: ConversationSummary[];
  private_groups: ConversationSummary[];
}

export interface ConversationMessage {
  id: string;
  user_id: string;
  user: string;
  verified: boolean;
  content: string;
  timestamp: string | null;
  tickers: string[];
  channel: string;
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

  const text = await response.text();
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson && text ? JSON.parse(text) : null;

  if (!response.ok) {
    if (data && typeof data === 'object' && 'error' in data) {
      throw new Error(String(data.error));
    }
    throw new Error(text || 'Request failed');
  }

  if (!isJson) {
    throw new Error('Messaging API did not return JSON.');
  }

  return data as T;
}

export async function fetchMessagingSidebar() {
  return request<MessagingSidebarData>('/api/messaging/sidebar');
}

export async function fetchSpaces() {
  return request<{ spaces: ConversationSummary[] }>('/api/spaces');
}

export async function joinSpace(conversationKey: string) {
  const data = await request<{ conversation: ConversationSummary }>(`/api/spaces/${conversationKey}/join`, {
    method: 'POST',
  });
  return data.conversation;
}

export async function fetchConversation(conversationKey: string) {
  const data = await request<{ conversation: ConversationSummary }>(`/api/conversations/${conversationKey}`);
  return data.conversation;
}

export async function fetchConversationMessages(channelKey: string) {
  const data = await request<{ messages: ConversationMessage[] }>(`/api/conversations/${channelKey}/messages`);
  return data.messages;
}

export async function sendConversationMessage(channelKey: string, content: string) {
  const data = await request<{ message: ConversationMessage }>(`/api/conversations/${channelKey}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
  return data.message;
}

export async function searchMessagingUsers(query: string) {
  const data = await request<{ users: MessagingUser[] }>(`/api/users/search?q=${encodeURIComponent(query)}`);
  return data.users;
}

export async function createDirectMessage(username: string) {
  const data = await request<{ conversation: ConversationSummary }>('/api/dms', {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
  return data.conversation;
}

export async function createPrivateGroup(name: string, usernames: string[]) {
  const data = await request<{ conversation: ConversationSummary }>('/api/groups', {
    method: 'POST',
    body: JSON.stringify({ name, usernames }),
  });
  return data.conversation;
}
