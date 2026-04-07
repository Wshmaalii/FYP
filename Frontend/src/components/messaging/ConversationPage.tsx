import { useEffect, useMemo, useState } from 'react';
import { Hash } from 'lucide-react';
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
      <div
        style={{
          padding: '14px 24px 10px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-sidebar)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <p
              style={{
                margin: 0,
                maxWidth: '56rem',
                color: 'var(--text-muted)',
                fontSize: '13px',
                lineHeight: 1.5,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {conversation.description || privacy.visibilitySummary}
            </p>
          </div>
          <div
            style={{
              flexShrink: 0,
              borderRadius: '999px',
              padding: '7px 12px',
              fontSize: '11px',
              background: 'var(--bg-card)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'var(--text-muted)',
            }}
          >
            {memberText}
          </div>
        </div>

        {conversation.kind === 'public_space' && conversation.channels.length > 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '12px',
              paddingBottom: '2px',
              overflowX: 'auto',
            }}
          >
            {conversation.channels.map((channel) => (
              <button
                key={channel.channel_key}
                type="button"
                onClick={() => onChannelSelect(channel.channel_key)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexShrink: 0,
                  borderRadius: '999px',
                  padding: '8px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  lineHeight: 1,
                  background: channel.channel_key === activeChannelKey ? 'var(--accent-teal-bg)' : 'transparent',
                  border: `1px solid ${channel.channel_key === activeChannelKey ? 'var(--accent-teal-border)' : 'rgba(255,255,255,0.07)'}`,
                  color: channel.channel_key === activeChannelKey ? 'var(--accent-teal)' : 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                <Hash className="w-3 h-3" />
                {channel.name}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <ChannelPrivacyCard {...privacy} />

      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
        {error && (
          <div className="rounded-2xl border border-red-900/70 bg-red-950/30 p-4 text-sm text-red-300">
            {error}
          </div>
        )}
        {loading ? (
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading conversation...</div>
        ) : messages.length === 0 ? (
          <div className="rounded-[20px] p-8 text-sm leading-6 shadow-[0_18px_44px_rgba(0,0,0,0.18)]" style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)', color: 'var(--text-muted)' }}>
            No messages yet. Start the conversation in {activeChannel ? `#${activeChannel.slug}` : conversation.name}.
          </div>
        ) : (
          messages.map((message) => <ChatMessage key={message.id} message={message} />)
        )}
      </div>

      <MessageInput
        onSend={handleSend}
        isSending={isSending}
        placeholder={conversation.kind === 'direct_message' ? 'Send a direct message...' : 'Type a message... Use @ to mention, # for tickers'}
        privacyMode={privacy.privacyMode}
        contextLabel={privacy.contextLabel}
        externalDraft={prefilledMessage}
        onExternalDraftApplied={onDraftConsumed}
      />
    </div>
  );
}
