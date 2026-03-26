import { Send, Paperclip, TrendingUp } from 'lucide-react';
import { useState } from 'react';

interface MessageInputProps {
  onSend?: (message: string) => Promise<void> | void;
  isSending?: boolean;
  placeholder?: string;
  privacyMode?: 'public' | 'private';
  contextLabel?: string;
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
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [sendWarning, setSendWarning] = useState<string | null>(null);

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
    <div className="border-t border-zinc-800 bg-zinc-950 px-6 py-4">
      <div className="flex items-end gap-3">
        {/* Attachment Buttons */}
        <div className="flex gap-2 pb-2">
          <button
            className="w-9 h-9 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-center transition-colors"
            title="Attach ticker"
          >
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </button>
          <button
            className="w-9 h-9 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-center transition-colors"
            title="Attach file"
          >
            <Paperclip className="w-4 h-4 text-zinc-400" />
          </button>
        </div>

        {/* Input Field */}
        <div className="flex-1 relative">
          <textarea
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              setSendWarning(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            rows={1}
            style={{ minHeight: '44px', maxHeight: '120px' }}
          />
        </div>

        {/* Send Button */}
        <button
          onClick={() => void handleSend()}
          disabled={!message.trim() || isSending}
          className="w-11 h-11 rounded-lg bg-cyan-600 hover:bg-cyan-700 disabled:bg-zinc-800 disabled:cursor-not-allowed flex items-center justify-center transition-colors flex-shrink-0"
        >
          <Send className="w-5 h-5 text-white" />
        </button>
      </div>

      {sendWarning && (
        <div className="mt-3 bg-amber-950 border border-amber-900 rounded-lg p-3 text-amber-300 text-sm">
          <p>{sendWarning}</p>
          <p className="text-amber-400/80 text-xs mt-1">Press send again to post in this public {contextLabel}, or edit the message first.</p>
        </div>
      )}

      {/* Help Text */}
      <div className="mt-2 text-xs text-zinc-600 px-1">
        {privacyMode === 'public'
          ? `Public ${contextLabel}: your display name, timestamp, and explicit ticker mentions are visible here. Use $AAPL or #SPY for ticker cards. Press Enter to send, Shift+Enter for new line.`
          : `Private ${contextLabel}: only members can see your message metadata here. Use $AAPL or #SPY for ticker cards. Press Enter to send, Shift+Enter for new line.`}
      </div>
    </div>
  );
}
