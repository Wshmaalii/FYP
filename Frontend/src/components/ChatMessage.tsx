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

function formatTimestamp(value: string) {
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
  return (
    <div className="flex gap-3">
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0">
        <span className="text-white text-sm">{message.user.split(' ').map(n => n[0]).join('')}</span>
      </div>

      {/* Message Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-zinc-100">{message.user}</span>
          {message.verified && (
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
          )}
          <span className="text-zinc-600 text-xs">{formatTimestamp(message.timestamp)}</span>
        </div>

        <div className="bg-zinc-900 rounded-2xl rounded-tl-sm px-4 py-3 border border-zinc-800 inline-block max-w-2xl">
          <p className="text-zinc-300">{message.content}</p>
        </div>
        
        {/* Market Data Cards */}
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
