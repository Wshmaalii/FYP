import { Send, Paperclip, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';

interface MessageInputProps {
  onSend?: (message: string) => Promise<void> | void;
  isSending?: boolean;
  placeholder?: string;
  privacyMode?: 'public' | 'private';
  contextLabel?: string;
  externalDraft?: string | null;
  onExternalDraftApplied?: () => void;
}

function getSensitiveContentPrompt(message: string) {
  const value = message.trim();
  if (!value) {
    return null;
  }

  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(value)) {
    return 'This public message includes an email address. Everyone in this channel can see it.';
  }
  if (/(?:\+?\d[\d\s()-]{7,}\d)/.test(value)) {
    return 'This public message looks like it includes a phone number. Everyone in this channel can see it.';
  }
  if (/\b(telegram|whatsapp|signal|discord|address|mobile)\b/i.test(value)) {
    return 'This public message may reveal contact details. Check whether you want to share that in a public channel.';
  }
  if (/\b(my|holding|position|bought|buying|sold|selling)\b/i.test(value) && /(£|\$|€|\b\d{3,}\b)/.test(value)) {
    return 'This public message appears to include personal trade size or position details. Check whether you want to post that publicly.';
  }

  return null;
}

export function MessageInput({
  onSend,
  isSending = false,
  placeholder = 'Type a message... Use $AAPL or #SPY for tickers',
  privacyMode = 'public',
  contextLabel = 'channel',
  externalDraft = null,
  onExternalDraftApplied,
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [sendWarning, setSendWarning] = useState<string | null>(null);

  useEffect(() => {
    if (!externalDraft) {
      return;
    }

    setMessage(externalDraft);
    setSendWarning(null);
    onExternalDraftApplied?.();
  }, [externalDraft, onExternalDraftApplied]);

  const handleSend = async () => {
    if (message.trim() && onSend) {
      const value = message.trim();
      const sensitivePrompt = privacyMode === 'public' ? getSensitiveContentPrompt(value) : null;
      if (sensitivePrompt && sendWarning !== sensitivePrompt) {
        setSendWarning(sensitivePrompt);
        return;
      }

      await onSend(value);
      setMessage('');
      setSendWarning(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div
      className="px-6 py-4"
      style={{
        borderTop: '0.5px solid var(--border-subtle)',
        background: 'var(--bg-sidebar)',
      }}
    >
      <div className="flex items-end gap-3">
        <div className="flex gap-2 pb-2">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg transition-all"
            style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)' }}
            title="Attach ticker"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--bg-card)';
            }}
          >
            <TrendingUp className="h-4 w-4" style={{ color: 'var(--accent-teal)' }} />
          </button>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg transition-all"
            style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)' }}
            title="Attach file"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--bg-card)';
            }}
          >
            <Paperclip className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        <div className="relative flex-1">
          <textarea
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              setSendWarning(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full resize-none rounded-lg px-4 py-3 text-[13px] focus:outline-none"
            style={{
              background: 'var(--bg-card)',
              border: '0.5px solid var(--border-primary)',
              color: 'var(--text-primary)',
              minHeight: '44px',
              maxHeight: '120px',
            }}
            rows={1}
          />
        </div>

        <button
          onClick={() => void handleSend()}
          disabled={!message.trim() || isSending}
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg transition-all disabled:cursor-not-allowed"
          style={{
            background: message.trim() ? 'var(--accent-teal)' : 'var(--bg-card)',
            border: `0.5px solid ${message.trim() ? 'var(--accent-teal-border)' : 'var(--border-primary)'}`,
          }}
        >
          <Send
            className="h-5 w-5"
            style={{ color: message.trim() ? '#ffffff' : 'var(--text-muted)' }}
          />
        </button>
      </div>

      {sendWarning && (
        <div className="mt-3 rounded-lg p-3 text-sm" style={{ background: 'rgba(120,53,15,0.35)', border: '0.5px solid rgba(180,83,9,0.55)', color: '#fcd34d' }}>
          <p>{sendWarning}</p>
          <p className="mt-1 text-xs" style={{ color: 'rgba(252,211,77,0.8)' }}>
            Press send again to post in this public {contextLabel}, or edit the message first.
          </p>
        </div>
      )}

      <div className="mt-2 px-1 text-[11px]" style={{ color: 'var(--text-label)' }}>
        {privacyMode === 'public'
          ? `Public ${contextLabel}: your display name, timestamp, and explicit ticker mentions are visible here. Use $AAPL or #SPY for ticker cards. Press Enter to send, Shift+Enter for new line.`
          : `Private ${contextLabel}: only members can see your message metadata here. Use $AAPL or #SPY for ticker cards. Press Enter to send, Shift+Enter for new line.`}
      </div>
    </div>
  );
}
