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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div>
            <h3 className="text-zinc-100">New Chat</h3>
            <p className="text-zinc-500 text-sm">Start a direct message or create a private group.</p>
          </div>
          <button type="button" onClick={onClose} className="text-zinc-500 hover:text-zinc-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pt-5">
          <div className="inline-flex rounded-lg bg-zinc-950 border border-zinc-800 p-1">
            {(['dm', 'group', 'space'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setMode(value);
                  setError(null);
                }}
                className={`px-4 py-2 rounded text-sm transition-colors ${
                  mode === value ? 'bg-cyan-600 text-white' : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                {value === 'dm' ? 'Direct Message' : value === 'group' ? 'Private Group' : 'Public Space'}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 space-y-4">
          {(mode === 'group' || mode === 'space') && (
            <div>
              <label className="block text-zinc-300 text-sm mb-2">{mode === 'group' ? 'Group name' : 'Space name'}</label>
              <input
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                placeholder={mode === 'group' ? 'Macro Night Shift' : 'Large Caps Europe'}
                className="w-full px-4 py-3 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          )}

          {mode === 'space' && (
            <>
              <div>
                <label className="block text-zinc-300 text-sm mb-2">Description</label>
                <textarea
                  value={spaceDescription}
                  onChange={(event) => setSpaceDescription(event.target.value)}
                  placeholder="What this space is for, who it is useful for, and what gets discussed here."
                  className="w-full px-4 py-3 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 min-h-[96px]"
                />
              </div>
              <div>
                <label className="block text-zinc-300 text-sm mb-2">Visibility</label>
                <div className="inline-flex rounded-lg bg-zinc-950 border border-zinc-800 p-1">
                  {(['public', 'private'] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSpaceVisibility(value)}
                      className={`px-4 py-2 rounded text-sm transition-colors ${
                        spaceVisibility === value ? 'bg-cyan-600 text-white' : 'text-zinc-400 hover:text-zinc-100'
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
          <div>
            <label className="block text-zinc-300 text-sm mb-2">
              {mode === 'dm' ? 'Username' : 'Invite by username'}
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={query}
                onChange={(event) => void handleSearchChange(event.target.value)}
                placeholder={mode === 'dm' ? 'Search username' : 'Search usernames to invite'}
                className="w-full pl-10 pr-4 py-3 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>
          )}

          {mode === 'group' && selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map((user) => (
                <span key={user.user_id} className="px-3 py-1 rounded-full bg-cyan-950 border border-cyan-900 text-cyan-300 text-xs">
                  @{user.username}
                </span>
              ))}
            </div>
          )}

          {mode !== 'space' && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
            {query.trim().length < 2 ? (
              <div className="px-4 py-4 text-zinc-500 text-sm">
                Search by username to start a conversation.
              </div>
            ) : searching ? (
              <div className="px-4 py-4 text-zinc-500 text-sm">Searching usernames...</div>
            ) : searchResults.length === 0 ? (
              <div className="px-4 py-4 text-zinc-500 text-sm">No usernames match that search yet.</div>
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
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-900 text-left transition-colors border-b border-zinc-800 last:border-b-0"
                >
                  <div>
                    <div className="text-zinc-100 text-sm">{user.display_name}</div>
                    <div className="text-zinc-500 text-xs">@{user.username}</div>
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
            <div className="rounded-lg border border-red-900 bg-zinc-950 px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-zinc-800 flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-zinc-950 text-zinc-300 hover:bg-zinc-800 transition-colors">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 disabled:opacity-60 text-white transition-colors"
          >
            {submitting ? 'Working...' : mode === 'dm' ? 'Start DM' : mode === 'group' ? 'Create Group' : 'Create Space'}
          </button>
        </div>
      </div>
    </div>
  );
}
