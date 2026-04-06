import type { ConversationSummary } from '../../api/messaging';

interface ExploreSpacesPageProps {
  spaces: ConversationSummary[];
  joiningKey: string | null;
  onJoin: (conversationKey: string) => Promise<void>;
  onOpen: (conversationKey: string) => void;
}

export function ExploreSpacesPage({ spaces, joiningKey, onJoin, onOpen }: ExploreSpacesPageProps) {
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
            Discover
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
            Explore Spaces
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
            Join public trading communities and move straight into conversation.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          {spaces.map((space) => (
            <div
              key={space.conversation_key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1.25rem',
                borderRadius: '18px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: '#14161b',
                padding: '1.25rem',
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
                    background: 'rgba(88,122,255,0.16)',
                    color: 'rgba(132,153,255,0.92)',
                    padding: '0.3rem 0.65rem',
                    fontSize: '9px',
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                  }}
                >
                    Public Space
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
                  {space.name}
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
                  {space.description}
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
                  {space.channels.map((channel) => (
                    <span
                      key={channel.channel_key}
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
                      #{channel.slug}
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
                  {space.member_count} members
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
                {space.is_member ? (
                  <button
                    type="button"
                    onClick={() => onOpen(space.conversation_key)}
                    style={{
                      borderRadius: '999px',
                      border: '0.5px solid rgba(255,255,255,0.08)',
                      background: 'rgba(255,255,255,0.06)',
                      color: '#d4d4d8',
                      padding: '0.5rem 1rem',
                      fontSize: '12px',
                      fontWeight: 500,
                      transition: 'background-color 150ms ease',
                    }}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                    }}
                  >
                    Open
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void onJoin(space.conversation_key)}
                    disabled={joiningKey === space.conversation_key}
                    style={{
                      borderRadius: '999px',
                      border: '0.5px solid rgba(255,255,255,0.08)',
                      background: 'rgba(255,255,255,0.06)',
                      color: '#d4d4d8',
                      padding: '0.5rem 1rem',
                      fontSize: '12px',
                      fontWeight: 500,
                      transition: 'background-color 150ms ease, opacity 150ms ease',
                      opacity: joiningKey === space.conversation_key ? 0.6 : 1,
                    }}
                    onMouseEnter={(event) => {
                      if (joiningKey !== space.conversation_key) {
                        event.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                      }
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                    }}
                  >
                    {joiningKey === space.conversation_key ? 'Joining...' : 'Join'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
