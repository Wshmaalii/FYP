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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-[20px]" style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)', boxShadow: '0 36px 100px rgba(0,0,0,0.44)' }}>
        <div className="flex items-start justify-between px-8 py-7" style={{ borderBottom: '0.5px solid var(--border-subtle)' }}>
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em]" style={{ color: 'var(--text-label)' }}>Messaging</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>New Chat</h3>
            <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-muted)' }}>Start a direct message, create a private group, or open a new public space.</p>
          </div>
          <button type="button" onClick={onClose} className="mt-1 rounded-xl p-2 transition-colors" style={{ color: 'var(--text-muted)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-8 pt-6">
          <div className="inline-flex gap-1 rounded-full p-1.5" style={{ background: 'var(--bg-app)', border: '0.5px solid var(--border-primary)' }}>
            {(['dm', 'group', 'space'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setMode(value);
                  setError(null);
                }}
                className="rounded-full px-4 py-2.5 text-sm font-medium transition-all duration-200 ease-out"
                style={mode === value
                  ? { background: 'var(--accent-teal-bg)', color: 'var(--accent-teal)', border: '0.5px solid var(--accent-teal-border)' }
                  : { color: 'var(--text-muted)' }}
              >
                {value === 'dm' ? 'Direct Message' : value === 'group' ? 'Private Group' : 'Public Space'}
              </button>
            ))}
          </div>
        </div>

        <div className="px-8 py-6 space-y-6">
          {(mode === 'group' || mode === 'space') && (
            <div className="space-y-2">
              <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{mode === 'group' ? 'Group name' : 'Space name'}</label>
              <input
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                placeholder={mode === 'group' ? 'Macro Night Shift' : 'Large Caps Europe'}
                className="w-full rounded-2xl px-4 py-3.5 transition-all duration-150 focus:outline-none"
                style={{ background: 'var(--bg-app)', border: '0.5px solid var(--border-primary)', color: 'var(--text-primary)' }}
              />
            </div>
          )}

          {mode === 'space' && (
            <>
              <div className="space-y-2">
                <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Description</label>
                <textarea
                  value={spaceDescription}
                  onChange={(event) => setSpaceDescription(event.target.value)}
                  placeholder="What this space is for, who it is useful for, and what gets discussed here."
                  className="min-h-[112px] w-full rounded-2xl px-4 py-3.5 transition-all duration-150 focus:outline-none"
                  style={{ background: 'var(--bg-app)', border: '0.5px solid var(--border-primary)', color: 'var(--text-primary)' }}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Visibility</label>
                <div className="inline-flex gap-1 rounded-full p-1.5" style={{ background: 'var(--bg-app)', border: '0.5px solid var(--border-primary)' }}>
                  {(['public', 'private'] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSpaceVisibility(value)}
                      className="rounded-full px-4 py-2.5 text-sm font-medium transition-all duration-200 ease-out"
                      style={spaceVisibility === value
                        ? { background: 'var(--accent-teal-bg)', color: 'var(--accent-teal)', border: '0.5px solid var(--accent-teal-border)' }
                        : { color: 'var(--text-muted)' }}
                    >
                      {value === 'public' ? 'Public' : 'Private'}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {mode !== 'space' && (
          <div className="space-y-2">
            <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              {mode === 'dm' ? 'Username' : 'Invite by username'}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input
                value={query}
                onChange={(event) => void handleSearchChange(event.target.value)}
                placeholder={mode === 'dm' ? 'Search username' : 'Search usernames to invite'}
                className="w-full rounded-2xl py-3.5 pl-10 pr-4 transition-all duration-150 focus:outline-none"
                style={{ background: 'var(--bg-app)', border: '0.5px solid var(--border-primary)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>
          )}

          {mode === 'group' && selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {selectedUsers.map((user) => (
                <span key={user.user_id} className="rounded-full px-3 py-1.5 text-xs" style={{ background: 'var(--accent-teal-bg)', border: '0.5px solid var(--accent-teal-border)', color: 'var(--accent-teal)' }}>
                  @{user.username}
                </span>
              ))}
            </div>
          )}

          {mode !== 'space' && (
          <div className="overflow-hidden rounded-[20px]" style={{ background: 'var(--bg-app)', border: '0.5px solid var(--border-primary)' }}>
            {query.trim().length < 2 ? (
              <div className="px-4 py-5 text-sm" style={{ color: 'var(--text-muted)' }}>
                Search by username to start a conversation.
              </div>
            ) : searching ? (
              <div className="px-4 py-5 text-sm" style={{ color: 'var(--text-muted)' }}>Searching usernames...</div>
            ) : searchResults.length === 0 ? (
              <div className="px-4 py-5 text-sm" style={{ color: 'var(--text-muted)' }}>No usernames match that search yet.</div>
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
                  className="flex w-full items-center justify-between px-4 py-4 text-left transition-all duration-150 last:border-b-0"
                  style={{ borderBottom: '0.5px solid var(--border-subtle)' }}
                >
                  <div>
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{user.display_name}</div>
                    <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>@{user.username}</div>
                  </div>
                  {mode === 'group' && selectedUsernames.includes(user.username) && (
                    <Users className="h-4 w-4" style={{ color: 'var(--accent-teal)' }} />
                  )}
                </button>
              ))
            )}
          </div>
          )}

          {error && (
            <div className="rounded-2xl px-4 py-3.5 text-sm" style={{ background: 'rgba(120,53,15,0.2)', border: '0.5px solid rgba(220,38,38,0.35)', color: '#fca5a5' }}>
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-8 py-5" style={{ borderTop: '0.5px solid var(--border-subtle)' }}>
          <button type="button" onClick={onClose} className="rounded-2xl px-4 py-2.5 transition-all duration-150" style={{ background: 'var(--bg-app)', color: 'var(--text-secondary)', border: '0.5px solid var(--border-primary)' }}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className="min-w-[132px] rounded-2xl px-4 py-2.5 text-white transition-all duration-150 disabled:opacity-60"
            style={{ background: 'var(--accent-teal)', border: '0.5px solid var(--accent-teal-border)' }}
          >
            {submitting ? 'Working...' : mode === 'dm' ? 'Start DM' : mode === 'group' ? 'Create Group' : 'Create Space'}
          </button>
        </div>
      </div>
    </div>
  );
}
