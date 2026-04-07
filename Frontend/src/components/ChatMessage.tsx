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
  highlighted?: boolean;
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

export function ChatMessage({ message, onOpenTradeTicket, highlighted = false }: ChatMessageProps) {
  const avatarColor = getAvatarColor(message.user);

  return (
    <div
      id={`message-${message.id}`}
      style={{
        display: 'flex',
        gap: '14px',
        alignItems: 'flex-start',
        scrollMarginTop: '88px',
      }}
    >
      <div
        style={{
          display: 'flex',
          width: '48px',
          height: '48px',
          flexShrink: 0,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '999px',
          background: avatarColor,
          color: '#ffffff',
          fontSize: '16px',
          fontWeight: 700,
          letterSpacing: '-0.02em',
        }}
      >
        {message.user.split(' ').map((name) => name[0]).join('')}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '6px',
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              color: 'var(--text-primary)',
              fontSize: '15px',
              fontWeight: 600,
              lineHeight: 1.25,
            }}
          >
            {message.user}
          </span>
          {message.verified && (
            <ShieldCheck className="w-4 h-4" style={{ color: 'var(--accent-teal)' }} />
          )}
          <span
            style={{
              color: 'var(--text-label)',
              fontSize: '12px',
              lineHeight: 1.25,
            }}
          >
            {formatTimestamp(message.timestamp)}
          </span>
        </div>

        <div
          style={{
            display: 'inline-block',
            maxWidth: '42rem',
            borderRadius: '18px',
            borderTopLeftRadius: '8px',
            padding: '14px 16px',
            background: highlighted ? 'rgba(8,145,178,0.12)' : 'rgba(255,255,255,0.035)',
            border: highlighted ? '1px solid rgba(8,145,178,0.28)' : '1px solid rgba(255,255,255,0.07)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)',
          }}
        >
          <p
            style={{
              margin: 0,
              color: 'var(--text-secondary)',
              fontSize: '14px',
              lineHeight: 1.65,
            }}
          >
            {message.content}
          </p>
        </div>

        {message.tickers && message.tickers.length > 0 && (
          <div
            style={{
              display: 'grid',
              gap: '12px',
              marginTop: '12px',
              maxWidth: '42rem',
            }}
          >
            {message.tickers.map((ticker) => (
              <MarketDataCard key={ticker} ticker={ticker} onOpenTradeTicket={onOpenTradeTicket} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
