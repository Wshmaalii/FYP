import { useMemo, useState } from 'react';
import { Search, Users, X } from 'lucide-react';
import type { MessagingUser } from '../../api/messaging';

interface NewChatModalProps {
  isOpen: boolean;
  searchResults: MessagingUser[];
  searching: boolean;
  onClose: () => void;
  onSearch: (query: string) => Promise<void>;
  onStartDm: (username: string) => Promise<void>;
  onCreateGroup: (name: string, usernames: string[]) => Promise<void>;
  onCreateSpace: (name: string, description: string, visibility: 'public' | 'private') => Promise<void>;
}

export function NewChatModal({
  isOpen,
  searchResults,
  searching,
  onClose,
  onSearch,
  onStartDm,
  onCreateGroup,
  onCreateSpace,
}: NewChatModalProps) {
  const [mode, setMode] = useState<'dm' | 'group' | 'space'>('dm');
  const [query, setQuery] = useState('');
  const [groupName, setGroupName] = useState('');
  const [spaceDescription, setSpaceDescription] = useState('');
  const [spaceVisibility, setSpaceVisibility] = useState<'public' | 'private'>('public');
  const [selectedUsernames, setSelectedUsernames] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedUsers = useMemo(
    () => searchResults.filter((user) => selectedUsernames.includes(user.username)),
    [searchResults, selectedUsernames],
  );

  if (!isOpen) {
    return null;
  }

  const handleSearchChange = async (value: string) => {
    setQuery(value);
    setError(null);
    if (value.trim().length >= 2) {
      await onSearch(value);
    }
  };

  const toggleUser = (username: string) => {
    setSelectedUsernames((current) =>
      current.includes(username) ? current.filter((item) => item !== username) : [...current, username],
    );
  };

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'dm') {
        if (!query.trim()) {
          throw new Error('Search for a username to start a DM.');
        }
        await onStartDm(query.trim().toLowerCase());
      } else if (mode === 'group') {
        if (!groupName.trim()) {
          throw new Error('Group name is required.');
        }
        if (selectedUsernames.length === 0) {
          throw new Error('Add at least one username to create a private group.');
        }
        await onCreateGroup(groupName.trim(), selectedUsernames);
      } else {
        if (!groupName.trim()) {
          throw new Error('Space name is required.');
        }
        await onCreateSpace(groupName.trim(), spaceDescription.trim(), spaceVisibility);
      }
      setQuery('');
      setGroupName('');
      setSpaceDescription('');
      setSpaceVisibility('public');
      setSelectedUsernames([]);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to complete this action.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        justifyContent: 'flex-end',
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(1px)',
      }}
    >
      <div
        style={{
          display: 'flex',
          height: '100%',
          width: '100%',
          maxWidth: '500px',
          flexDirection: 'column',
          overflow: 'hidden',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          background: '#101417',
          boxShadow: '-20px 0 48px rgba(0,0,0,0.36)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            padding: '18px 20px 16px',
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: 700,
                letterSpacing: '-0.03em',
                color: 'var(--text-primary)',
              }}
            >
              New Chat
            </h3>
            <p
              style={{
                margin: '8px 0 0',
                maxWidth: '28rem',
                fontSize: '13px',
                lineHeight: 1.5,
                color: 'var(--text-muted)',
              }}
            >
              Start a direct message, create a private group, or open a new public space.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              marginTop: '2px',
              display: 'flex',
              width: '36px',
              height: '36px',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.03)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            <X style={{ width: '16px', height: '16px' }} />
          </button>
        </div>

        <div
          style={{
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            padding: '14px 20px',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              flexWrap: 'wrap',
              gap: '6px',
              borderRadius: '14px',
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(0,0,0,0.24)',
              padding: '4px',
            }}
          >
            {(['dm', 'group', 'space'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setMode(value);
                  setError(null);
                }}
                style={{
                  borderRadius: '999px',
                  padding: '8px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: mode === value ? 'var(--accent-teal-bg)' : 'transparent',
                  color: mode === value ? 'var(--accent-teal)' : 'var(--text-muted)',
                }}
              >
                {value === 'dm' ? 'Direct Message' : value === 'group' ? 'Private Group' : 'Public Space'}
              </button>
            ))}
          </div>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '18px 20px',
          }}
        >
          <div
            style={{
              display: 'grid',
              gap: '18px',
            }}
          >
            {(mode === 'group' || mode === 'space') && (
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'var(--text-label)',
                  }}
                >
                  {mode === 'group' ? 'Group Name' : 'Space Name'}
                </label>
                <input
                  value={groupName}
                  onChange={(event) => setGroupName(event.target.value)}
                  placeholder={mode === 'group' ? 'Macro Night Shift' : 'Large Caps Europe'}
                  style={{
                    width: '100%',
                    borderRadius: '14px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(0,0,0,0.22)',
                    padding: '11px 14px',
                    fontSize: '13px',
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                />
              </div>
            )}

            {mode === 'space' && (
              <>
                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: 'var(--text-label)',
                    }}
                  >
                    Description
                  </label>
                  <textarea
                    value={spaceDescription}
                    onChange={(event) => setSpaceDescription(event.target.value)}
                    placeholder="What this space is for, who it is useful for, and what gets discussed here."
                    style={{
                      minHeight: '104px',
                      width: '100%',
                      borderRadius: '14px',
                      border: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(0,0,0,0.22)',
                      padding: '11px 14px',
                      fontSize: '13px',
                      color: 'var(--text-primary)',
                      outline: 'none',
                      resize: 'vertical',
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: 'var(--text-label)',
                    }}
                  >
                    Visibility
                  </label>
                  <div
                    style={{
                      display: 'inline-flex',
                      gap: '6px',
                      borderRadius: '14px',
                      border: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(0,0,0,0.22)',
                      padding: '4px',
                    }}
                  >
                    {(['public', 'private'] as const).map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setSpaceVisibility(value)}
                        style={{
                          borderRadius: '999px',
                          padding: '8px 14px',
                          fontSize: '12px',
                          fontWeight: 600,
                          border: 'none',
                          cursor: 'pointer',
                          background: spaceVisibility === value ? 'var(--accent-teal-bg)' : 'transparent',
                          color: spaceVisibility === value ? 'var(--accent-teal)' : 'var(--text-muted)',
                        }}
                      >
                        {value === 'public' ? 'Public' : 'Private'}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {mode !== 'space' && (
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'var(--text-label)',
                  }}
                >
                  {mode === 'dm' ? 'Username' : 'Invite by username'}
                </label>
                <div style={{ position: 'relative' }}>
                  <Search
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      width: '16px',
                      height: '16px',
                      color: 'var(--text-label)',
                      transform: 'translateY(-50%)',
                    }}
                  />
                  <input
                    value={query}
                    onChange={(event) => void handleSearchChange(event.target.value)}
                    placeholder={mode === 'dm' ? 'Search username' : 'Search usernames to invite'}
                    style={{
                      width: '100%',
                      borderRadius: '14px',
                      border: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(0,0,0,0.22)',
                      padding: '11px 14px 11px 40px',
                      fontSize: '13px',
                      color: 'var(--text-primary)',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
            )}

            {mode === 'group' && selectedUsers.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  paddingTop: '4px',
                }}
              >
                {selectedUsers.map((user) => (
                  <span
                    key={user.user_id}
                    style={{
                      borderRadius: '999px',
                      border: '1px solid var(--accent-teal-border)',
                      background: 'var(--accent-teal-bg)',
                      padding: '5px 12px',
                      fontSize: '11px',
                      color: '#b7ddd8',
                    }}
                  >
                    @{user.username}
                  </span>
                ))}
              </div>
            )}

            {mode !== 'space' && (
              <div
                style={{
                  overflow: 'hidden',
                  borderRadius: '16px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(0,0,0,0.22)',
                }}
              >
                {query.trim().length < 2 ? (
                  <div
                    style={{
                      padding: '28px 20px',
                      color: 'var(--text-label)',
                      fontSize: '12px',
                      textAlign: 'center',
                    }}
                  >
                    Search by username to start a conversation.
                  </div>
                ) : searching ? (
                  <div style={{ padding: '18px 16px', color: 'var(--text-label)', fontSize: '12px' }}>Searching usernames...</div>
                ) : searchResults.length === 0 ? (
                  <div style={{ padding: '18px 16px', color: 'var(--text-label)', fontSize: '12px' }}>No usernames match that search yet.</div>
                ) : (
                  searchResults.map((user) => (
                    <button
                      key={user.user_id}
                      type="button"
                      onClick={() => {
                        if (mode === 'dm') {
                          setQuery(user.username);
                        } else {
                          toggleUser(user.username);
                        }
                      }}
                      style={{
                        display: 'flex',
                        width: '100%',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        border: 'none',
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                        background: 'transparent',
                        padding: '14px 16px',
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            color: 'var(--text-primary)',
                            fontSize: '13px',
                            fontWeight: 600,
                          }}
                        >
                          {user.display_name}
                        </div>
                        <div
                          style={{
                            marginTop: '2px',
                            color: 'var(--text-label)',
                            fontSize: '11px',
                          }}
                        >
                          @{user.username}
                        </div>
                      </div>
                      {mode === 'group' && selectedUsernames.includes(user.username) && (
                        <Users style={{ width: '14px', height: '14px', flexShrink: 0, color: '#8fb7b2' }} />
                      )}
                    </button>
                  ))
                )}
              </div>
            )}

            {error && (
              <div
                style={{
                  borderRadius: '14px',
                  border: '1px solid rgba(127,29,29,0.7)',
                  background: 'rgba(69,10,10,0.3)',
                  padding: '12px 16px',
                  fontSize: '12px',
                  color: '#fca5a5',
                }}
              >
                {error}
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            padding: '14px 20px',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.02)',
              padding: '10px 14px',
              fontSize: '12px',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            style={{
              minWidth: '124px',
              borderRadius: '12px',
              border: '1px solid var(--accent-teal-border)',
              background: 'var(--accent-teal)',
              padding: '10px 16px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#ffffff',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? 'Working...' : mode === 'dm' ? 'Start DM' : mode === 'group' ? 'Create Group' : 'Create Space'}
          </button>
        </div>
      </div>
    </div>
  );
}
