import type { ConversationSummary } from '../../api/messaging';

interface PublicSpacesPageProps {
  spaces: ConversationSummary[];
  onOpen: (conversationKey: string) => void;
}

export function PublicSpacesPage({ spaces, onOpen }: PublicSpacesPageProps) {
  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        background: 'var(--bg-app)',
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
              color: 'var(--text-label)',
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
              color: 'var(--text-primary)',
              fontSize: '22px',
              fontWeight: 600,
              letterSpacing: '-0.02em',
            }}
          >
            Public Spaces
          </h2>
          <p
            style={{
              marginTop: '0.5rem',
              maxWidth: '42rem',
              color: 'var(--text-muted)',
              fontSize: '12px',
              lineHeight: '1.7',
            }}
          >
            Open the public spaces you have already joined.
          </p>
        </div>

        {spaces.length === 0 ? (
          <div
            style={{
              borderRadius: '18px',
              border: '1px solid var(--border-primary)',
              background: 'var(--bg-card)',
              color: 'var(--text-muted)',
              fontSize: '13px',
              lineHeight: '1.7',
              padding: '1.25rem',
            }}
          >
            You have not joined any public spaces yet. Browse available communities from Explore Spaces.
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            {spaces.map((space) => (
              <button
                key={space.conversation_key}
                type="button"
                onClick={() => onOpen(space.conversation_key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1.25rem',
                  width: '100%',
                  borderRadius: '18px',
                  border: '1px solid var(--border-primary)',
                  background: 'var(--bg-card)',
                  padding: '1.25rem',
                  textAlign: 'left',
                  transition: 'background-color 150ms ease, border-color 150ms ease',
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.background = 'var(--bg-hover)';
                  event.currentTarget.style.borderColor = 'var(--border-secondary)';
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.background = 'var(--bg-card)';
                  event.currentTarget.style.borderColor = 'var(--border-primary)';
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
                      color: 'var(--text-primary)',
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
                      color: 'var(--text-muted)',
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
                          border: '1px solid var(--border-primary)',
                          background: 'var(--bg-hover)',
                          color: 'var(--text-muted)',
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
                      color: 'var(--text-subtle)',
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
                  <span
                    style={{
                      borderRadius: '999px',
                      border: '0.5px solid var(--border-primary)',
                      background: 'var(--bg-hover)',
                      color: 'var(--text-secondary)',
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
