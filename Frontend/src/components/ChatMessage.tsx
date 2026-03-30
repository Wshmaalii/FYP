import { ShieldCheck } from 'lucide-react';
import { MarketDataCard } from './MarketDataCard';
import type { TradeTicketInput } from './TradeTicketDrawer';

interface Message {
  id: string;
  user: string;
  verified: boolean;
  content: string;
  timestamp: string | null;
  tickers?: string[];
}

interface ChatMessageProps {
  message: Message;
  onOpenTradeTicket?: (ticket: TradeTicketInput) => void;
}

function getAvatarColor(user: string): string {
  const colors = ['#4f6ef7', '#00c4a0', '#f59e0b', '#f26b6b', '#2dd4aa'];
  const index = user.split('').reduce((total, character) => total + character.charCodeAt(0), 0);
  return colors[index % colors.length];
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return '';
  }

  if (!value.includes('T')) {
    return value;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function ChatMessage({ message, onOpenTradeTicket }: ChatMessageProps) {
  const avatarColor = getAvatarColor(message.user);

  return (
    <div className="flex gap-3">
      <div
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white"
        style={{ background: avatarColor }}
      >
        {message.user.split(' ').map((name) => name[0]).join('')}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{message.user}</span>
          {message.verified && (
            <ShieldCheck className="w-4 h-4" style={{ color: 'var(--accent-teal)' }} />
          )}
          <span className="text-[11px]" style={{ color: 'var(--text-label)' }}>{formatTimestamp(message.timestamp)}</span>
        </div>

        <div
          className="inline-block max-w-2xl rounded-2xl rounded-tl-sm px-4 py-3"
          style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)' }}
        >
          <p className="text-[13px] leading-6" style={{ color: 'var(--text-secondary)' }}>{message.content}</p>
        </div>

        {message.tickers && message.tickers.length > 0 && (
          <div className="grid gap-3 mt-3 max-w-2xl">
            {message.tickers.map((ticker) => (
              <MarketDataCard key={ticker} ticker={ticker} onOpenTradeTicket={onOpenTradeTicket} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
