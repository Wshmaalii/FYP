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
  placeholder = 'Type a message... Use @ to mention, # for tickers',
  privacyMode = 'public',
  contextLabel = 'channel',
  externalDraft = null,
  onExternalDraftApplied,
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [sendWarning, setSendWarning] = useState<string | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false,
  );
  const hasMessage = message.trim().length > 0;

  useEffect(() => {
    const handleResize = () => {
      setIsMobileViewport(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!externalDraft) {
      return;
    }

    setMessage(externalDraft);
    setSendWarning(null);
    onExternalDraftApplied?.();
  }, [externalDraft, onExternalDraftApplied]);

  const handleSend = async () => {
    if (hasMessage && onSend) {
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
      style={{
        position: isMobileViewport ? 'sticky' : 'static',
        bottom: 0,
        zIndex: isMobileViewport ? 12 : 'auto',
        padding: isMobileViewport
          ? '12px 12px calc(12px + env(safe-area-inset-bottom, 0px))'
          : '16px 24px 14px',
        borderTop: '1px solid var(--border-subtle)',
        background: 'var(--bg-sidebar)',
        boxShadow: isMobileViewport ? '0 -10px 28px rgba(0, 0, 0, 0.16)' : 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: isMobileViewport ? '8px' : '12px',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '8px',
            paddingBottom: isMobileViewport ? 0 : '2px',
          }}
        >
          <button
            style={{
              display: 'flex',
              width: isMobileViewport ? '42px' : '44px',
              height: isMobileViewport ? '42px' : '44px',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '14px',
              background: 'var(--bg-card)',
              border: '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer',
            }}
            title="Attach ticker"
          >
            <TrendingUp className="w-4 h-4" style={{ color: 'var(--accent-teal)' }} />
          </button>
          <button
            style={{
              display: 'flex',
              width: isMobileViewport ? '42px' : '44px',
              height: isMobileViewport ? '42px' : '44px',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '14px',
              background: 'var(--bg-card)',
              border: '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer',
            }}
            title="Attach file"
          >
            <Paperclip className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        <div style={{ position: 'relative', flex: 1 }}>
          <textarea
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              setSendWarning(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            style={{
              width: '100%',
              resize: 'none',
              borderRadius: '18px',
              padding: isMobileViewport ? '13px 16px' : '14px 18px',
              fontSize: '14px',
              lineHeight: 1.5,
              minHeight: '44px',
              maxHeight: '120px',
              background: 'var(--bg-card)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'var(--text-primary)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)',
              outline: 'none',
            }}
          />
        </div>

        <button
          onClick={() => void handleSend()}
          disabled={!hasMessage || isSending}
          style={{
            display: 'flex',
            width: isMobileViewport ? '42px' : '44px',
            height: isMobileViewport ? '42px' : '44px',
            flexShrink: 0,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '14px',
            background: hasMessage && !isSending ? 'var(--accent-teal)' : 'var(--bg-card)',
            border: `1px solid ${hasMessage && !isSending ? 'var(--accent-teal-border)' : 'rgba(255,255,255,0.08)'}`,
            cursor: !hasMessage || isSending ? 'not-allowed' : 'pointer',
            opacity: !hasMessage || isSending ? 0.75 : 1,
          }}
        >
          <Send className="w-5 h-5" style={{ color: hasMessage && !isSending ? '#ffffff' : 'var(--text-muted)' }} />
        </button>
      </div>

      {sendWarning && (
        <div
          style={{
            marginTop: '12px',
            borderRadius: '12px',
            border: '1px solid rgba(245,158,11,0.2)',
            padding: '12px',
            background: 'rgba(245,158,11,0.08)',
            color: '#fcd34d',
            fontSize: '14px',
            lineHeight: 1.5,
          }}
        >
          <p style={{ margin: 0 }}>{sendWarning}</p>
          <p style={{ margin: '4px 0 0', color: 'rgba(251,191,36,0.8)', fontSize: '12px' }}>
            Press send again to post in this public {contextLabel}, or edit the message first.
          </p>
        </div>
      )}

      {!isMobileViewport ? (
        <div
          style={{
            marginTop: '10px',
            paddingLeft: '2px',
            color: 'var(--text-label)',
            fontSize: '11px',
            lineHeight: 1.4,
          }}
        >
          Press Enter to send, Shift+Enter for new line
        </div>
      ) : null}
    </div>
  );
}
