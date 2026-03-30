import { useEffect, useMemo, useState } from 'react';
import { Hash, Lock, MessageSquare, Users } from 'lucide-react';
import type { ConversationSummary, ConversationMessage } from '../../api/messaging';
import { fetchConversationMessages, sendConversationMessage } from '../../api/messaging';
import { ChatMessage } from '../ChatMessage';
import { MessageInput } from '../MessageInput';
import { ChannelPrivacyCard } from '../channels/ChannelPrivacyCard';

interface ConversationPageProps {
  conversation: ConversationSummary;
  selectedChannelKey: string | null;
  onChannelSelect: (channelKey: string) => void;
  prefilledMessage?: string | null;
  onDraftConsumed?: () => void;
}

function buildPrivacyCopy(conversation: ConversationSummary) {
  if (conversation.kind === 'direct_message') {
    return {
      scopeLabel: 'Direct Message',
      audienceLabel: 'Two Participants',
      visibilitySummary: 'Only the two participants in this direct message can read the conversation.',
      membershipVisibility: 'Only the participants can see that this direct message exists.',
      tickerVisibility: 'Ticker mentions stay inside this conversation and are only visible to the two participants.',
      metadataVisibility: 'Display name, timestamp, and explicit ticker mentions are visible only to the two participants.',
      privacyMode: 'private' as const,
      contextLabel: 'message',
    };
  }

  if (conversation.kind === 'private_group') {
    return {
      scopeLabel: 'Private Group',
      audienceLabel: 'Invite Only',
      visibilitySummary: 'Only invited members can read and send messages in this group.',
      membershipVisibility: 'Group membership is visible only to invited members.',
      tickerVisibility: 'Ticker mentions stay inside this group and are only visible to invited members.',
      metadataVisibility: 'Display name, timestamp, and explicit ticker mentions are visible only to invited members.',
      privacyMode: 'private' as const,
      contextLabel: 'group',
    };
  }

  return {
    scopeLabel: 'Public Space',
    audienceLabel: 'Members Visible',
    visibilitySummary: 'Joined members of this public space can read and send messages in the selected channel.',
    membershipVisibility: 'Space membership is visible to other members in this public space.',
    tickerVisibility: 'Explicit ticker mentions are visible to everyone in the selected space channel.',
    metadataVisibility: 'Display name, timestamp, and explicit ticker mentions are visible in this public space.',
    privacyMode: 'public' as const,
    contextLabel: 'space',
  };
}

export function ConversationPage({
  conversation,
  selectedChannelKey,
  onChannelSelect,
  prefilledMessage = null,
  onDraftConsumed,
}: ConversationPageProps) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const privacy = buildPrivacyCopy(conversation);
  const activeChannelKey = selectedChannelKey || conversation.channels[0]?.channel_key || null;
  const activeChannel = conversation.channels.find((channel) => channel.channel_key === activeChannelKey) || conversation.channels[0] || null;

  useEffect(() => {
    if (!activeChannelKey) {
      return;
    }

    let isMounted = true;
    const loadMessages = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchConversationMessages(activeChannelKey);
        if (isMounted) {
          setMessages(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load conversation');
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
  }, [activeChannelKey]);

  const handleSend = async (content: string) => {
    if (!activeChannelKey) {
      throw new Error('No active channel selected.');
    }
    setIsSending(true);
    setError(null);
    try {
      const createdMessage = await sendConversationMessage(activeChannelKey, content);
      setMessages((current) => [...current, createdMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      throw err;
    } finally {
      setIsSending(false);
    }
  };

  const memberText = useMemo(() => {
    if (conversation.kind === 'direct_message') {
      const members = conversation.members || [];
      return members.length > 0 ? members.map((member) => member.display_name).join(', ') : conversation.name;
    }
    return `${conversation.member_count} members`;
  }, [conversation]);

  return (
    <div className="flex flex-1 flex-col" style={{ background: 'var(--bg-app)' }}>
      <div className="px-7 py-6" style={{ background: 'var(--bg-app)', borderBottom: '0.5px solid var(--border-subtle)' }}>
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="mb-3 flex items-center gap-2.5">
              {conversation.kind === 'direct_message' ? (
                <MessageSquare className="h-4 w-4" style={{ color: 'var(--accent-teal)' }} />
              ) : conversation.kind === 'private_group' ? (
                <Lock className="h-4 w-4" style={{ color: 'var(--accent-teal)' }} />
              ) : (
                <Users className="h-4 w-4" style={{ color: 'var(--accent-teal)' }} />
              )}
              <h2 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>{conversation.name}</h2>
              {conversation.kind !== 'direct_message' && (
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{memberText}</span>
              )}
            </div>
            <p className="max-w-3xl text-sm leading-6" style={{ color: 'var(--text-faint)' }}>{conversation.description}</p>
          </div>
          {conversation.kind === 'direct_message' ? (
            <div className="pt-1 text-sm" style={{ color: 'var(--text-muted)' }}>{memberText}</div>
          ) : null}
        </div>

        {conversation.kind === 'public_space' && conversation.channels.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-3">
            {conversation.channels.map((channel) => (
              <button
                key={channel.channel_key}
                type="button"
                onClick={() => onChannelSelect(channel.channel_key)}
                className="rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
                style={channel.channel_key === activeChannelKey
                  ? { background: 'var(--accent-teal-bg)', border: '0.5px solid var(--accent-teal-border)', color: 'var(--accent-teal)' }
                  : { background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)', color: 'var(--text-muted)' }}
              >
                <span className="inline-flex items-center gap-2">
                  <Hash className="h-3 w-3" />
                  {channel.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <ChannelPrivacyCard {...privacy} />

      <div className="flex-1 space-y-4 overflow-y-auto px-7 py-6">
        {error && (
          <div className="rounded-[14px] p-4 text-sm" style={{ background: 'rgba(120,53,15,0.2)', border: '0.5px solid rgba(220,38,38,0.35)', color: '#fca5a5' }}>
            {error}
          </div>
        )}
        {loading ? (
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading conversation...</div>
        ) : messages.length === 0 ? (
          <div className="rounded-[14px] p-8 text-sm leading-6" style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)', color: 'var(--text-muted)' }}>
            No messages yet. Start the conversation in {activeChannel ? `#${activeChannel.slug}` : conversation.name}.
          </div>
        ) : (
          messages.map((message) => <ChatMessage key={message.id} message={message} />)
        )}
      </div>

      <MessageInput
        onSend={handleSend}
        isSending={isSending}
        placeholder={conversation.kind === 'direct_message' ? 'Send a direct message...' : 'Send a message...'}
        privacyMode={privacy.privacyMode}
        contextLabel={privacy.contextLabel}
        externalDraft={prefilledMessage}
        onExternalDraftApplied={onDraftConsumed}
      />
    </div>
  );
}
