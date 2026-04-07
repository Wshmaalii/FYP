import { getApiBaseUrl } from './config';
import { getStoredToken } from './auth';

const API_BASE_URL = getApiBaseUrl();

export interface MessagingUser {
  user_id: string;
  username: string;
  display_name: string;
  connection_status?: 'connected' | 'incoming_pending' | 'outgoing_pending' | 'none';
  request_id?: string | null;
  conversation_key?: string | null;
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
  connection_status?: 'connected' | 'incoming_pending' | 'outgoing_pending' | 'none';
  request_id?: string | null;
  last_message_preview?: string;
  last_message_at?: string | null;
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

export interface DirectMessageListItem {
  conversation_key: string | null;
  user_id: string;
  username: string;
  display_name: string;
  preview: string;
  timestamp: string | null;
  connection_status: 'connected' | 'incoming_pending' | 'outgoing_pending' | 'none';
  request_id: string | null;
  request_kind: 'connection_request' | 'message_request' | null;
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

export async function fetchDirectMessagesOverview() {
  return request<{ inbox: DirectMessageListItem[]; requests: DirectMessageListItem[] }>('/api/dms/overview');
}

export async function fetchSpaces() {
  return request<{ spaces: ConversationSummary[] }>('/api/spaces');
}

export async function createSpace(name: string, description: string, visibility: 'public' | 'private' = 'public') {
  const data = await request<{ conversation: ConversationSummary }>('/api/spaces', {
    method: 'POST',
    body: JSON.stringify({ name, description, visibility }),
  });
  return data.conversation;
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

export async function fetchConversationMessages(channelKey: string, limit = 50) {
  const data = await request<{ messages: ConversationMessage[] }>(`/api/conversations/${channelKey}/messages?limit=${limit}`);
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

export async function sendConnectionRequest(username: string) {
  return request<{ request: { id: string; status: string } }>('/api/connections/requests', {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
}

export async function acceptConnectionRequest(requestId: string) {
  return request<{ request: { id: string; status: string }; conversation: ConversationSummary }>(`/api/connections/requests/${requestId}/accept`, {
    method: 'POST',
  });
}

export async function declineConnectionRequest(requestId: string) {
  return request<{ request: { id: string; status: string } }>(`/api/connections/requests/${requestId}/decline`, {
    method: 'POST',
  });
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
