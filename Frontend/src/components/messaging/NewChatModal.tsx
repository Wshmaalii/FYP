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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.08),transparent_24%),rgba(0,0,0,0.76)] px-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(24,27,36,0.98),rgba(14,17,24,0.98))] shadow-[0_36px_100px_rgba(0,0,0,0.48)]">
        <div className="flex items-start justify-between border-b border-white/8 px-8 py-7">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-300/80">Messaging</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-100">New Chat</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-500">Start a direct message, create a private group, or open a new public space.</p>
          </div>
          <button type="button" onClick={onClose} className="mt-1 rounded-xl p-2 text-zinc-500 transition-colors hover:bg-white/[0.04] hover:text-zinc-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-8 pt-6">
          <div className="inline-flex rounded-2xl border border-white/8 bg-zinc-950/90 p-1.5 gap-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            {(['dm', 'group', 'space'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setMode(value);
                  setError(null);
                }}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ease-out ${
                  mode === value
                    ? 'bg-cyan-600 text-white shadow-[0_10px_24px_rgba(8,145,178,0.2),inset_0_1px_0_rgba(255,255,255,0.08)]'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04] active:translate-y-px'
                }`}
              >
                {value === 'dm' ? 'Direct Message' : value === 'group' ? 'Private Group' : 'Public Space'}
              </button>
            ))}
          </div>
        </div>

        <div className="px-8 py-6 space-y-6">
          {(mode === 'group' || mode === 'space') && (
            <div className="space-y-2">
              <label className="block text-zinc-300 text-sm font-medium">{mode === 'group' ? 'Group name' : 'Space name'}</label>
              <input
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                placeholder={mode === 'group' ? 'Macro Night Shift' : 'Large Caps Europe'}
                className="w-full rounded-2xl border border-white/8 bg-zinc-950/90 px-4 py-3.5 text-zinc-100 placeholder-zinc-600 transition-all duration-150 focus:border-cyan-400/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/70"
              />
            </div>
          )}

          {mode === 'space' && (
            <>
              <div className="space-y-2">
                <label className="block text-zinc-300 text-sm font-medium">Description</label>
                <textarea
                  value={spaceDescription}
                  onChange={(event) => setSpaceDescription(event.target.value)}
                  placeholder="What this space is for, who it is useful for, and what gets discussed here."
                  className="min-h-[112px] w-full rounded-2xl border border-white/8 bg-zinc-950/90 px-4 py-3.5 text-zinc-100 placeholder-zinc-600 transition-all duration-150 focus:border-cyan-400/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/70"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-zinc-300 text-sm font-medium">Visibility</label>
                <div className="inline-flex rounded-2xl border border-white/8 bg-zinc-950/90 p-1.5 gap-1">
                  {(['public', 'private'] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSpaceVisibility(value)}
                      className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ease-out ${
                        spaceVisibility === value ? 'bg-cyan-600 text-white shadow-[0_8px_18px_rgba(8,145,178,0.18)]' : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]'
                      }`}
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
            <label className="block text-zinc-300 text-sm font-medium">
              {mode === 'dm' ? 'Username' : 'Invite by username'}
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={query}
                onChange={(event) => void handleSearchChange(event.target.value)}
                placeholder={mode === 'dm' ? 'Search username' : 'Search usernames to invite'}
                className="w-full rounded-2xl border border-white/8 bg-zinc-950/90 py-3.5 pl-10 pr-4 text-zinc-100 placeholder-zinc-600 transition-all duration-150 focus:border-cyan-400/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/70"
              />
            </div>
          </div>
          )}

          {mode === 'group' && selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {selectedUsers.map((user) => (
                <span key={user.user_id} className="rounded-full border border-cyan-900/70 bg-cyan-950/70 px-3 py-1.5 text-xs text-cyan-300">
                  @{user.username}
                </span>
              ))}
            </div>
          )}

          {mode !== 'space' && (
          <div className="overflow-hidden rounded-2xl border border-white/8 bg-zinc-950/90">
            {query.trim().length < 2 ? (
              <div className="px-4 py-5 text-zinc-500 text-sm">
                Search by username to start a conversation.
              </div>
            ) : searching ? (
              <div className="px-4 py-5 text-zinc-500 text-sm">Searching usernames...</div>
            ) : searchResults.length === 0 ? (
              <div className="px-4 py-5 text-zinc-500 text-sm">No usernames match that search yet.</div>
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
                  className="w-full border-b border-white/6 px-4 py-4 text-left transition-all duration-150 last:border-b-0 hover:bg-white/[0.035] active:translate-y-px"
                >
                  <div>
                    <div className="text-zinc-100 text-sm font-medium">{user.display_name}</div>
                    <div className="text-zinc-500 text-xs mt-1">@{user.username}</div>
                  </div>
                  {mode === 'group' && selectedUsernames.includes(user.username) && (
                    <Users className="w-4 h-4 text-cyan-400" />
                  )}
                </button>
              ))
            )}
          </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-900/70 bg-red-950/30 px-4 py-3.5 text-sm text-red-300">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-white/8 px-8 py-5">
          <button type="button" onClick={onClose} className="rounded-2xl bg-zinc-950/90 px-4 py-2.5 text-zinc-300 transition-all duration-150 hover:bg-white/[0.05] active:translate-y-px">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className="min-w-[132px] rounded-2xl bg-cyan-600 px-4 py-2.5 text-white shadow-[0_14px_30px_rgba(8,145,178,0.2)] transition-all duration-150 hover:bg-cyan-500 active:translate-y-px disabled:opacity-60"
          >
            {submitting ? 'Working...' : mode === 'dm' ? 'Start DM' : mode === 'group' ? 'Create Group' : 'Create Space'}
          </button>
        </div>
      </div>
    </div>
  );
}
