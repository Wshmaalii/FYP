import { Lock, Shield, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { fetchMessages, sendMessage, type ChannelMessage } from '../../api/messages';
import { MessageInput } from '../MessageInput';

interface Member {
  name: string;
  status: 'online' | 'offline';
  verified: boolean;
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return '--';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function PrivateRoomsChannel() {
  const [showMembers, setShowMembers] = useState(false);
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadMessages = async () => {
      setLoading(true);
      setError(null);

      try {
        const messageData = await fetchMessages('private');
        if (isMounted) {
          setMessages(messageData);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load private messages');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadMessages();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSend = async (content: string) => {
    setIsSending(true);
    setError(null);

    try {
      const createdMessage = await sendMessage('private', content);
      setMessages((current) => [...current, createdMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      throw err;
    } finally {
      setIsSending(false);
    }
  };

  const members = useMemo<Member[]>(() => {
    const seen = new Set<string>();
    return messages.reduce<Member[]>((accumulator, message) => {
      if (seen.has(message.user)) {
        return accumulator;
      }
      seen.add(message.user);
      accumulator.push({
        name: message.user,
        status: 'online',
        verified: message.verified,
      });
      return accumulator;
    }, []);
  }, [messages]);

  return (
    <>
      <div className="bg-cyan-950 border-b border-cyan-900 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-cyan-400" />
          <span className="text-cyan-300 text-sm">End-to-end encrypted • Only members can see messages</span>
        </div>
        <button
          onClick={() => setShowMembers(!showMembers)}
          className="flex items-center gap-2 px-3 py-1 bg-cyan-900 hover:bg-cyan-800 rounded transition-colors"
        >
          <Users className="w-4 h-4 text-cyan-300" />
          <span className="text-cyan-300 text-sm">{members.length} members</span>
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-zinc-950">
          {error && (
            <div className="bg-zinc-900 border border-red-900 rounded-lg p-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-zinc-400 text-sm">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-cyan-400" />
                </div>
                <h3 className="text-zinc-100 mb-2">Secure Private Room</h3>
                <p className="text-zinc-500 text-sm">
                  All messages in this room are end-to-end encrypted. Only invited members can read and send messages.
                </p>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm">{message.user.split(' ').map((n) => n[0]).join('')}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-zinc-100">{message.user}</span>
                    <Lock className="w-3 h-3 text-cyan-400" />
                    <span className="text-zinc-600 text-xs">{formatTimestamp(message.timestamp)}</span>
                  </div>

                  <div className="bg-zinc-900 rounded-2xl rounded-tl-sm px-4 py-3 border border-cyan-900/30 inline-block max-w-2xl">
                    <p className="text-zinc-300">{message.content}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {showMembers && (
          <div className="w-72 bg-zinc-900 border-l border-zinc-800 p-4 overflow-y-auto">
            <h3 className="text-zinc-100 mb-4 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Members ({members.length})
            </h3>
            <div className="space-y-2">
              {members.length === 0 ? (
                <p className="text-zinc-500 text-sm">No members active yet.</p>
              ) : (
                members.map((member) => (
                  <div
                    key={member.name}
                    className="flex items-center gap-3 p-2 rounded hover:bg-zinc-800 transition-colors"
                  >
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                        <span className="text-white text-sm">{member.name.split(' ').map((n) => n[0]).join('')}</span>
                      </div>
                      <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-zinc-900 bg-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-zinc-100 text-sm truncate">{member.name}</span>
                        {member.verified && <Shield className="w-3 h-3 text-cyan-400" />}
                      </div>
                      <span className="text-zinc-500 text-xs capitalize">{member.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <MessageInput onSend={handleSend} isSending={isSending} placeholder="Send an encrypted message..." />
    </>
  );
}
