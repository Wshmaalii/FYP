import { MessageSquare, Plus, Search } from 'lucide-react';
import type { ConversationSummary } from '../../api/messaging';

interface DirectMessagesPageProps {
  conversations: ConversationSummary[];
  onOpen: (conversationKey: string) => void;
}

const AVATAR_BACKGROUNDS = ['#14b8a6', '#34d399', '#f59e0b', '#4f6ef7', '#ef4444', '#8b5cf6'];
const TIMESTAMP_LABELS = ['10:32', '09:15', 'Yesterday', 'Yesterday', 'Wednesday', 'Tuesday'];

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

function getPreview(conversation: ConversationSummary) {
  if (conversation.description?.trim()) {
    return conversation.description;
  }
  if (conversation.handle) {
    return `Start chatting with @${conversation.handle}`;
  }
  return 'Open this conversation to start messaging.';
}

function getTimestamp(index: number) {
  return TIMESTAMP_LABELS[index % TIMESTAMP_LABELS.length];
}

function isOnline(index: number) {
  return index < 2;
}

export function DirectMessagesPage({ conversations, onOpen }: DirectMessagesPageProps) {
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        background: 'var(--bg-app)',
      }}
    >
      <div
        style={{
          width: '350px',
          minWidth: '350px',
          maxWidth: '350px',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          background: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border-subtle)',
        }}
      >
        <div
          style={{
            padding: '1.5rem 1rem 1rem',
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
                fontSize: '18px',
                fontWeight: 600,
                letterSpacing: '-0.02em',
              }}
            >
              Direct Messages
            </h2>
            <button
              type="button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '2.75rem',
                height: '2.75rem',
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
              position: 'relative',
              marginTop: '1.25rem',
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
              placeholder="Search conversations..."
              style={{
                width: '100%',
                borderRadius: '16px',
                border: '1px solid var(--border-primary)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                padding: '0.95rem 1rem 0.95rem 3rem',
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
          {conversations.length === 0 ? (
            <div
              style={{
                padding: '1.25rem 1rem',
                color: 'var(--text-muted)',
                fontSize: '13px',
                lineHeight: '1.7',
              }}
            >
              No direct messages yet. Start a 1:1 conversation from New Chat.
            </div>
          ) : (
            conversations.map((conversation, index) => (
              <button
                key={conversation.conversation_key}
                type="button"
                onClick={() => onOpen(conversation.conversation_key)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '1rem',
                  padding: '1.25rem 1rem',
                  textAlign: 'left',
                  borderTop: index === 0 ? 'none' : '1px solid var(--border-subtle)',
                  transition: 'background-color 150ms ease',
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.background = 'var(--bg-hover)';
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.background = 'transparent';
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '4rem',
                    height: '4rem',
                    borderRadius: '999px',
                    background: getAvatarBackground(conversation.conversation_key, index),
                    color: '#ffffff',
                    fontSize: '16px',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {getInitials(conversation.name)}
                </div>
                <div
                  style={{
                    minWidth: 0,
                    flex: 1,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                    }}
                  >
                    <div
                      style={{
                        minWidth: 0,
                        flex: 1,
                        color: 'var(--text-primary)',
                        fontSize: '15px',
                        fontWeight: 600,
                        letterSpacing: '-0.01em',
                        lineHeight: 1.3,
                      }}
                    >
                      {conversation.name}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          color: 'var(--text-subtle)',
                          fontSize: '12px',
                          lineHeight: 1.2,
                        }}
                      >
                        {getTimestamp(index)}
                      </span>
                      {isOnline(index) ? (
                        <span
                          style={{
                            width: '0.625rem',
                            height: '0.625rem',
                            borderRadius: '999px',
                            background: '#14b8a6',
                          }}
                        />
                      ) : null}
                    </div>
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
                    {getPreview(conversation)}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

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
            <MessageSquare className="h-10 w-10" />
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
            Select a conversation
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
            Choose a conversation from the list to start messaging.
          </p>
        </div>
      </div>
    </div>
  );
}
