import { Send, Paperclip, TrendingUp } from 'lucide-react';
import { useState } from 'react';

interface MessageInputProps {
  onSend?: (message: string) => Promise<void> | void;
  isSending?: boolean;
  placeholder?: string;
}

export function MessageInput({ onSend, isSending = false, placeholder = 'Type a message... Use $AAPL or #BARC.L for tickers' }: MessageInputProps) {
  const [message, setMessage] = useState('');

  const handleSend = async () => {
    if (message.trim() && onSend) {
      const value = message.trim();
      await onSend(value);
      setMessage('');
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
            onChange={(e) => setMessage(e.target.value)}
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

      {/* Help Text */}
      <div className="mt-2 text-xs text-zinc-600 px-1">
        Press Enter to send, Shift+Enter for new line. Use $AAPL or #BARC.L for ticker cards.
      </div>
    </div>
  );
}
