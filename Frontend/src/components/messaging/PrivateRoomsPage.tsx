import type { ConversationSummary } from '../../api/messaging';

interface PrivateRoomsPageProps {
  conversations: ConversationSummary[];
  onOpen: (conversationKey: string) => void;
}

export function PrivateRoomsPage({ conversations, onOpen }: PrivateRoomsPageProps) {
  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        background: '#0b0f10',
      }}
    >
      <div
        style={{
          margin: '0 auto',
          maxWidth: '980px',
          padding: '1.5rem 1rem',
        }}
      >
        <div
          style={{
            marginBottom: '1.75rem',
            paddingInline: '0.25rem',
          }}
        >
          <p
            style={{
              color: '#71717a',
              fontSize: '9px',
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
            }}
          >
            Messaging
          </p>
          <h2
            style={{
              marginTop: '0.5rem',
              color: '#f4f4f5',
              fontSize: '22px',
              fontWeight: 600,
              letterSpacing: '-0.02em',
            }}
          >
            Private Rooms
          </h2>
          <p
            style={{
              marginTop: '0.5rem',
              maxWidth: '42rem',
              color: '#71717a',
              fontSize: '12px',
              lineHeight: '1.7',
            }}
          >
            Open invite-only group conversations.
          </p>
        </div>

        {conversations.length === 0 ? (
          <div
            style={{
              borderRadius: '18px',
              border: '1px solid rgba(255,255,255,0.08)',
              background: '#111518',
              color: '#71717a',
              fontSize: '13px',
              lineHeight: '1.7',
              padding: '1.25rem',
            }}
          >
            No private rooms yet. Create an invite-only room from New Chat.
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            {conversations.map((conversation) => (
              <button
                key={conversation.conversation_key}
                type="button"
                onClick={() => onOpen(conversation.conversation_key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1.25rem',
                  width: '100%',
                  borderRadius: '18px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: '#14161b',
                  padding: '1.25rem',
                  textAlign: 'left',
                  transition: 'background-color 150ms ease, border-color 150ms ease',
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.background = '#171920';
                  event.currentTarget.style.borderColor = 'rgba(255,255,255,0.11)';
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.background = '#14161b';
                  event.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                }}
              >
                <div
                  style={{
                    minWidth: 0,
                    flex: 1,
                  }}
                >
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      borderRadius: '999px',
                      background: 'rgba(244,114,182,0.12)',
                      color: 'rgba(244,114,182,0.9)',
                      padding: '0.3rem 0.65rem',
                      fontSize: '9px',
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Private Room
                  </div>
                  <h3
                    style={{
                      marginTop: '0.75rem',
                      color: '#f4f4f5',
                      fontSize: '20px',
                      fontWeight: 600,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {conversation.name}
                  </h3>
                  <p
                    style={{
                      marginTop: '0.5rem',
                      maxWidth: '48rem',
                      color: '#71717a',
                      fontSize: '13px',
                      lineHeight: '1.7',
                    }}
                  >
                    {conversation.description || 'Invite-only conversation for selected members.'}
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: '0.625rem',
                      marginTop: '1rem',
                    }}
                  >
                    {(conversation.members || []).slice(0, 4).map((member) => (
                      <span
                        key={member.user_id}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          borderRadius: '999px',
                          border: '1px solid rgba(255,255,255,0.1)',
                          background: 'rgba(255,255,255,0.04)',
                          color: '#a1a1aa',
                          padding: '0.35rem 0.75rem',
                          fontSize: '10px',
                          lineHeight: 1,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        @{member.username}
                      </span>
                    ))}
                  </div>
                  <p
                    style={{
                      marginTop: '1rem',
                      color: '#52525b',
                      fontSize: '11px',
                    }}
                  >
                    {conversation.member_count} members
                  </p>
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexShrink: 0,
                    alignItems: 'center',
                    alignSelf: 'center',
                  }}
                >
                  <span
                    style={{
                      borderRadius: '999px',
                      border: '0.5px solid rgba(255,255,255,0.08)',
                      background: 'rgba(255,255,255,0.06)',
                      color: '#d4d4d8',
                      padding: '0.5rem 1rem',
                      fontSize: '12px',
                      fontWeight: 500,
                    }}
                  >
                    Open
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
