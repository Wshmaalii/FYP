import { useEffect, useMemo, useState } from 'react';
import { MessageSquare, Plus, Search, UserPlus } from 'lucide-react';
import type { ConversationSummary, DirectMessageListItem, MessagingUser } from '../../api/messaging';
import {
  acceptConnectionRequest,
  createDirectMessage,
  declineConnectionRequest,
  fetchDirectMessagesOverview,
  searchMessagingUsers,
  sendConnectionRequest,
} from '../../api/messaging';

interface DirectMessagesPageProps {
  conversations: ConversationSummary[];
  onOpen: (conversationKey: string) => void;
}

type InboxTab = 'inbox' | 'requests';

const AVATAR_BACKGROUNDS = ['#14b8a6', '#34d399', '#f59e0b', '#4f6ef7', '#ef4444', '#8b5cf6'];

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return 'DM';
  }
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase();
}

function getAvatarBackground(seed: string, index: number) {
  const seedValue = [...seed].reduce((total, char) => total + char.charCodeAt(0), 0);
  return AVATAR_BACKGROUNDS[(seedValue + index) % AVATAR_BACKGROUNDS.length];
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return 'Now';
  }

  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return 'Now';
  }

  const now = new Date();
  const sameDay = timestamp.toDateString() === now.toDateString();
  if (sameDay) {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  const diffDays = Math.floor((now.getTime() - timestamp.getTime()) / 86400000);
  if (diffDays <= 1) {
    return 'Yesterday';
  }

  if (diffDays < 7) {
    return timestamp.toLocaleDateString([], { weekday: 'short' });
  }

  return timestamp.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
}

function getUserActionLabel(user: MessagingUser) {
  switch (user.connection_status) {
    case 'connected':
      return user.conversation_key ? 'Open DM' : 'Start DM';
    case 'incoming_pending':
      return 'Accept Request';
    case 'outgoing_pending':
      return 'Request Sent';
    default:
      return 'Send Connection Request';
  }
}

export function DirectMessagesPage({ conversations, onOpen }: DirectMessagesPageProps) {
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false,
  );
  const [tab, setTab] = useState<InboxTab>('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [inboxItems, setInboxItems] = useState<DirectMessageListItem[]>(
    conversations.map((conversation) => ({
      conversation_key: conversation.conversation_key,
      user_id: conversation.members?.[0]?.user_id || conversation.conversation_key,
      username: conversation.handle || conversation.name.toLowerCase().replace(/\s+/g, '_'),
      display_name: conversation.name,
      preview: conversation.last_message_preview || conversation.description || `Start chatting with @${conversation.handle || 'trader'}`,
      timestamp: conversation.last_message_at || null,
      connection_status: 'connected',
      request_id: null,
      request_kind: null,
    })),
  );
  const [requestItems, setRequestItems] = useState<DirectMessageListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupResults, setLookupResults] = useState<MessagingUser[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [actingRequestId, setActingRequestId] = useState<string | null>(null);
  const [actingUserId, setActingUserId] = useState<string | null>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileViewport(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDirectMessagesOverview();
      setInboxItems(data.inbox);
      setRequestItems(data.requests);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load direct messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOverview();
  }, []);

  const handleLookupChange = async (value: string) => {
    setLookupQuery(value);
    setError(null);
    if (value.trim().length < 2) {
      setLookupResults([]);
      return;
    }

    setSearchingUsers(true);
    try {
      const results = await searchMessagingUsers(value);
      setLookupResults(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search users');
    } finally {
      setSearchingUsers(false);
    }
  };

  const handleUserAction = async (user: MessagingUser) => {
    setActingUserId(user.user_id);
    setError(null);

    try {
      if (user.connection_status === 'connected') {
        const conversation = await createDirectMessage(user.username);
        setSearchOpen(false);
        await loadOverview();
        onOpen(conversation.conversation_key);
        return;
      }

      if (user.connection_status === 'incoming_pending' && user.request_id) {
        const result = await acceptConnectionRequest(user.request_id);
        setSearchOpen(false);
        await loadOverview();
        onOpen(result.conversation.conversation_key);
        return;
      }

      if (user.connection_status === 'outgoing_pending') {
        return;
      }

      await sendConnectionRequest(user.username);
      const refreshedResults = await searchMessagingUsers(lookupQuery || user.username);
      setLookupResults(refreshedResults);
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to complete this action');
    } finally {
      setActingUserId(null);
    }
  };

  const handleRequestAction = async (item: DirectMessageListItem, action: 'accept' | 'decline') => {
    if (!item.request_id) {
      return;
    }

    setActingRequestId(item.request_id);
    setError(null);
    try {
      if (action === 'accept') {
        const result = await acceptConnectionRequest(item.request_id);
        await loadOverview();
        onOpen(result.conversation.conversation_key);
      } else {
        await declineConnectionRequest(item.request_id);
        await loadOverview();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update this request');
    } finally {
      setActingRequestId(null);
    }
  };

  const visibleItems = useMemo(() => {
    const source = tab === 'inbox' ? inboxItems : requestItems;
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return source;
    }
    return source.filter((item) =>
      item.display_name.toLowerCase().includes(query)
      || item.username.toLowerCase().includes(query)
      || item.preview.toLowerCase().includes(query),
    );
  }, [inboxItems, requestItems, searchQuery, tab]);

  return (
    <>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: isMobileViewport ? 'column' : 'row',
          background: 'var(--bg-app)',
        }}
      >
        <div
          style={{
            width: isMobileViewport ? '100%' : '350px',
            minWidth: isMobileViewport ? '100%' : '350px',
            maxWidth: isMobileViewport ? '100%' : '350px',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            background: 'var(--bg-sidebar)',
            borderRight: isMobileViewport ? 'none' : '1px solid var(--border-subtle)',
          }}
        >
          <div
            style={{
              padding: isMobileViewport ? '1rem 0.875rem 0.875rem' : '1.5rem 1rem 1rem',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
              }}
            >
              <h2
                style={{
                  color: 'var(--text-primary)',
                  fontSize: isMobileViewport ? '17px' : '18px',
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                }}
              >
                Direct Messages
              </h2>
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: isMobileViewport ? '2.5rem' : '2.75rem',
                  height: isMobileViewport ? '2.5rem' : '2.75rem',
                  borderRadius: '14px',
                  border: '0.5px solid var(--accent-teal-border)',
                  background: 'var(--accent-teal-bg)',
                  color: 'var(--accent-teal)',
                }}
                aria-label="Start conversation"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>

            <div
              style={{
                display: 'inline-flex',
                gap: '6px',
                padding: '4px',
                borderRadius: '14px',
                border: '1px solid var(--border-primary)',
                background: 'var(--bg-card)',
                marginTop: '1rem',
              }}
            >
              {[
                { key: 'inbox' as const, label: `Inbox (${inboxItems.length})` },
                { key: 'requests' as const, label: `Requests (${requestItems.length})` },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTab(item.key)}
                  style={{
                    border: 'none',
                    borderRadius: '999px',
                    background: tab === item.key ? 'var(--accent-teal-bg)' : 'transparent',
                    color: tab === item.key ? 'var(--accent-teal)' : 'var(--text-muted)',
                    padding: '7px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div
              style={{
                position: 'relative',
                marginTop: '1rem',
              }}
            >
              <Search
                className="h-4 w-4"
                style={{
                  position: 'absolute',
                  left: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={tab === 'inbox' ? 'Search conversations...' : 'Search requests...'}
                style={{
                  width: '100%',
                  borderRadius: '16px',
                  border: '1px solid var(--border-primary)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  padding: isMobileViewport ? '0.85rem 1rem 0.85rem 3rem' : '0.95rem 1rem 0.95rem 3rem',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
            }}
          >
            {error ? (
              <div
                style={{
                  margin: '0.875rem',
                  borderRadius: '14px',
                  border: '1px solid rgba(127,29,29,0.7)',
                  background: 'rgba(69,10,10,0.3)',
                  padding: '12px 14px',
                  color: '#fca5a5',
                  fontSize: '12px',
                  lineHeight: 1.55,
                }}
              >
                {error}
              </div>
            ) : null}

            {loading ? (
              <div style={{ padding: '1rem 0.875rem', color: 'var(--text-muted)', fontSize: '13px' }}>
                Loading direct messages...
              </div>
            ) : visibleItems.length === 0 ? (
              <div
                style={{
                  padding: '1rem 0.875rem',
                  color: 'var(--text-muted)',
                  fontSize: '13px',
                  lineHeight: '1.7',
                }}
              >
                {tab === 'inbox'
                  ? 'No direct messages yet. Start a 1:1 conversation from the + button.'
                  : 'No message requests right now. Incoming connection requests will appear here.'}
              </div>
            ) : (
              visibleItems.map((item, index) => (
                <div
                  key={`${item.user_id}-${item.request_id || item.conversation_key || index}`}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem',
                    padding: isMobileViewport ? '1rem 0.875rem' : '1.25rem 1rem',
                    textAlign: 'left',
                    borderTop: index === 0 ? 'none' : '1px solid var(--border-subtle)',
                    transition: 'background-color 150ms ease',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: isMobileViewport ? '3.25rem' : '4rem',
                      height: isMobileViewport ? '3.25rem' : '4rem',
                      borderRadius: '999px',
                      background: getAvatarBackground(item.user_id, index),
                      color: '#ffffff',
                      fontSize: isMobileViewport ? '14px' : '16px',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {getInitials(item.display_name)}
                  </div>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            color: 'var(--text-primary)',
                            fontSize: '15px',
                            fontWeight: 600,
                            letterSpacing: '-0.01em',
                            lineHeight: 1.3,
                          }}
                        >
                          {item.display_name}
                        </div>
                        <div style={{ marginTop: '2px', color: 'var(--text-label)', fontSize: '11px' }}>@{item.username}</div>
                      </div>
                      <span style={{ color: 'var(--text-subtle)', fontSize: '12px', lineHeight: 1.2, flexShrink: 0 }}>
                        {formatTimestamp(item.timestamp)}
                      </span>
                    </div>

                    <p
                      style={{
                        marginTop: '0.45rem',
                        color: 'var(--text-muted)',
                        fontSize: '13px',
                        lineHeight: 1.5,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {item.preview}
                    </p>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                      {tab === 'inbox' && item.conversation_key ? (
                        <button
                          type="button"
                          onClick={() => onOpen(item.conversation_key!)}
                          style={{
                            borderRadius: '10px',
                            border: '1px solid var(--accent-teal-border)',
                            background: 'var(--accent-teal-bg)',
                            color: 'var(--accent-teal)',
                            padding: '8px 10px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Open Conversation
                        </button>
                      ) : null}

                      {tab === 'requests' && item.request_id ? (
                        <>
                          <button
                            type="button"
                            onClick={() => void handleRequestAction(item, 'accept')}
                            disabled={actingRequestId === item.request_id}
                            style={{
                              borderRadius: '10px',
                              border: '1px solid var(--accent-teal-border)',
                              background: 'var(--accent-teal-bg)',
                              color: 'var(--accent-teal)',
                              padding: '8px 10px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: actingRequestId === item.request_id ? 'not-allowed' : 'pointer',
                              opacity: actingRequestId === item.request_id ? 0.65 : 1,
                            }}
                          >
                            {actingRequestId === item.request_id ? 'Working…' : 'Accept'}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleRequestAction(item, 'decline')}
                            disabled={actingRequestId === item.request_id}
                            style={{
                              borderRadius: '10px',
                              border: '1px solid var(--border-primary)',
                              background: 'var(--bg-card)',
                              color: 'var(--text-muted)',
                              padding: '8px 10px',
                              fontSize: '12px',
                              cursor: actingRequestId === item.request_id ? 'not-allowed' : 'pointer',
                              opacity: actingRequestId === item.request_id ? 0.65 : 1,
                            }}
                          >
                            Decline
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {!isMobileViewport ? (
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--bg-app)',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '2rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '6.5rem',
                  height: '6.5rem',
                  borderRadius: '999px',
                  background: 'var(--bg-hover)',
                  color: 'var(--text-muted)',
                }}
              >
                {tab === 'requests' ? <UserPlus className="h-10 w-10" /> : <MessageSquare className="h-10 w-10" />}
              </div>
              <h3
                style={{
                  marginTop: '1.5rem',
                  color: 'var(--text-primary)',
                  fontSize: '20px',
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                }}
              >
                {tab === 'requests' ? 'Review your requests' : 'Select a conversation'}
              </h3>
              <p
                style={{
                  marginTop: '0.75rem',
                  color: 'var(--text-muted)',
                  fontSize: '13px',
                  lineHeight: '1.7',
                  maxWidth: '28rem',
                }}
              >
                {tab === 'requests'
                  ? 'Accept or decline pending requests before they move into your main inbox.'
                  : 'Choose a conversation from the list to start messaging.'}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {searchOpen ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.56)',
            padding: '24px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '34rem',
              borderRadius: '22px',
              border: '1px solid var(--border-primary)',
              background: 'var(--bg-card)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.34)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border-primary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div>
                  <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '20px', fontWeight: 600 }}>Find people</h3>
                  <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.6 }}>
                    Search for users and either start a DM or send a connection request.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSearchOpen(false);
                    setLookupQuery('');
                    setLookupResults([]);
                  }}
                  style={{
                    borderRadius: '10px',
                    border: '1px solid var(--border-primary)',
                    background: 'var(--bg-app)',
                    color: 'var(--text-muted)',
                    padding: '8px 10px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
              </div>

              <div style={{ position: 'relative', marginTop: '1rem' }}>
                <Search
                  className="h-4 w-4"
                  style={{
                    position: 'absolute',
                    left: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  type="text"
                  value={lookupQuery}
                  onChange={(event) => void handleLookupChange(event.target.value)}
                  placeholder="Search users by name or username"
                  style={{
                    width: '100%',
                    borderRadius: '16px',
                    border: '1px solid var(--border-primary)',
                    background: 'var(--bg-app)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    padding: '0.95rem 1rem 0.95rem 3rem',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div style={{ maxHeight: '24rem', overflowY: 'auto' }}>
              {lookupQuery.trim().length < 2 ? (
                <div style={{ padding: '24px 20px', color: 'var(--text-label)', fontSize: '13px', textAlign: 'center' }}>
                  Search users to start a DM or send a connection request.
                </div>
              ) : searchingUsers ? (
                <div style={{ padding: '18px 20px', color: 'var(--text-label)', fontSize: '13px' }}>
                  Searching users...
                </div>
              ) : lookupResults.length === 0 ? (
                <div style={{ padding: '18px 20px', color: 'var(--text-label)', fontSize: '13px' }}>
                  No users match that search yet.
                </div>
              ) : (
                lookupResults.map((user, index) => (
                  <button
                    key={user.user_id}
                    type="button"
                    onClick={() => void handleUserAction(user)}
                    disabled={actingUserId === user.user_id || user.connection_status === 'outgoing_pending'}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '14px',
                      padding: '14px 20px',
                      border: 'none',
                      borderTop: index === 0 ? 'none' : '1px solid var(--border-primary)',
                      background: 'transparent',
                      textAlign: 'left',
                      cursor: user.connection_status === 'outgoing_pending' ? 'default' : 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '2.75rem',
                          height: '2.75rem',
                          borderRadius: '999px',
                          background: getAvatarBackground(user.user_id, index),
                          color: '#ffffff',
                          fontSize: '14px',
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {getInitials(user.display_name)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600 }}>{user.display_name}</div>
                        <div style={{ marginTop: '2px', color: 'var(--text-label)', fontSize: '12px' }}>@{user.username}</div>
                      </div>
                    </div>
                    <span
                      style={{
                        flexShrink: 0,
                        borderRadius: '999px',
                        border: `1px solid ${user.connection_status === 'connected' || user.connection_status === 'incoming_pending' ? 'var(--accent-teal-border)' : 'var(--border-primary)'}`,
                        background: user.connection_status === 'connected' || user.connection_status === 'incoming_pending'
                          ? 'var(--accent-teal-bg)'
                          : 'var(--bg-app)',
                        color: user.connection_status === 'connected' || user.connection_status === 'incoming_pending'
                          ? 'var(--accent-teal)'
                          : 'var(--text-muted)',
                        padding: '7px 10px',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}
                    >
                      {actingUserId === user.user_id ? 'Working…' : getUserActionLabel(user)}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
