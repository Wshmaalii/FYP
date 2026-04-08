import { useEffect, useMemo, useState } from 'react';
import { Hash, Lock } from 'lucide-react';
import type { ConversationSummary, ConversationMessage } from '../../api/messaging';
import { fetchConversationMessages, sendConversationMessage } from '../../api/messaging';
import { decryptConversationMessage } from '../../crypto/e2ee';
import { ChatMessage } from '../ChatMessage';
import { MessageInput } from '../MessageInput';
import { ChannelPrivacyCard } from '../channels/ChannelPrivacyCard';

interface ConversationPageProps {
  conversation: ConversationSummary;
  currentUserId: string;
  selectedChannelKey: string | null;
  onChannelSelect: (channelKey: string) => void;
  prefilledMessage?: string | null;
  onDraftConsumed?: () => void;
  highlightedMessageId?: string | null;
  onHighlightConsumed?: () => void;
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
  currentUserId,
  selectedChannelKey,
  onChannelSelect,
  prefilledMessage = null,
  onDraftConsumed,
  highlightedMessageId = null,
  onHighlightConsumed,
}: ConversationPageProps) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false,
  );
  const privacy = buildPrivacyCopy(conversation);
  const isEncryptedConversation = conversation.kind === 'direct_message' || conversation.kind === 'private_group';
  const activeChannelKey = selectedChannelKey || conversation.channels[0]?.channel_key || null;
  const activeChannel = conversation.channels.find((channel) => channel.channel_key === activeChannelKey) || conversation.channels[0] || null;

  const resolveMessageContent = async (message: ConversationMessage) => {
    if (!isEncryptedConversation) {
      return message;
    }

    try {
      const content = await decryptConversationMessage(message, currentUserId);
      return { ...message, content };
    } catch (err) {
      return {
        ...message,
        content: err instanceof Error ? `[Unable to decrypt: ${err.message}]` : '[Unable to decrypt on this device]',
      };
    }
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobileViewport(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!activeChannelKey) {
      return;
    }

    let isMounted = true;
    const loadMessages = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchConversationMessages(activeChannelKey, highlightedMessageId ? 100 : 50);
        const resolvedMessages = isEncryptedConversation
          ? await Promise.all(data.map((message) => resolveMessageContent(message)))
          : data;
        if (isMounted) {
          setMessages(resolvedMessages);
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
  }, [activeChannelKey, highlightedMessageId, currentUserId, isEncryptedConversation]);

  useEffect(() => {
    if (loading || !highlightedMessageId) {
      return;
    }

    const element = document.getElementById(`message-${highlightedMessageId}`);
    if (!element) {
      return;
    }

    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const timeoutId = window.setTimeout(() => {
      onHighlightConsumed?.();
    }, 1800);

    return () => window.clearTimeout(timeoutId);
  }, [highlightedMessageId, loading, messages, onHighlightConsumed]);

  const handleSend = async (content: string) => {
    if (!activeChannelKey) {
      throw new Error('No active channel selected.');
    }
    setIsSending(true);
    setError(null);
    try {
      const createdMessage = await sendConversationMessage(activeChannelKey, content, {
        enabled: isEncryptedConversation,
        members: conversation.members || [],
      });
      const resolvedMessage = await resolveMessageContent(createdMessage);
      setMessages((current) => [...current, resolvedMessage]);
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
          padding: isMobileViewport ? '12px 14px 10px' : '14px 24px 10px',
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
                fontSize: isMobileViewport ? '12px' : '13px',
                lineHeight: 1.5,
                whiteSpace: isMobileViewport ? 'normal' : 'nowrap',
                overflow: 'hidden',
                textOverflow: isMobileViewport ? 'clip' : 'ellipsis',
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
              fontSize: isMobileViewport ? '10px' : '11px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-primary)',
              color: 'var(--text-muted)',
            }}
          >
            {memberText}
          </div>
        </div>

        {isEncryptedConversation ? (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '12px',
              borderRadius: '999px',
              padding: '6px 11px',
              background: 'var(--accent-teal-bg)',
              border: '1px solid var(--accent-teal-border)',
              color: 'var(--accent-teal)',
              fontSize: '11px',
              fontWeight: 600,
              lineHeight: 1,
            }}
          >
            <Lock className="w-3 h-3" />
            End-to-end encrypted
          </div>
        ) : null}

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
                  padding: isMobileViewport ? '7px 12px' : '8px 14px',
                  fontSize: isMobileViewport ? '11px' : '12px',
                  fontWeight: 600,
                  lineHeight: 1,
                  background: channel.channel_key === activeChannelKey ? 'var(--accent-teal-bg)' : 'transparent',
                  border: `1px solid ${channel.channel_key === activeChannelKey ? 'var(--accent-teal-border)' : 'var(--border-primary)'}`,
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

      <div
        className="flex-1 space-y-4 overflow-y-auto"
        style={{ padding: isMobileViewport ? '14px 14px 18px' : '16px 24px' }}
      >
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
          messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              highlighted={highlightedMessageId === message.id}
            />
          ))
        )}
      </div>

      <MessageInput
        onSend={handleSend}
        isSending={isSending}
        placeholder={
          isEncryptedConversation
            ? 'Type a secure message...'
            : conversation.kind === 'direct_message'
              ? 'Send a direct message...'
              : 'Type a message... Use @ to mention, # for tickers'
        }
        privacyMode={privacy.privacyMode}
        contextLabel={privacy.contextLabel}
        externalDraft={prefilledMessage}
        onExternalDraftApplied={onDraftConsumed}
      />
    </div>
  );
}
