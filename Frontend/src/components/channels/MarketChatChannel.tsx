import { AlertTriangle } from 'lucide-react';
import { ChatMessage } from '../ChatMessage';
import { MessageInput } from '../MessageInput';
import { useState } from 'react';
import { TradeTicketDrawer } from '../TradeTicketDrawer';
import type { TradeTicketInput } from '../TradeTicketDrawer';

interface Message {
  id: string;
  user: string;
  verified: boolean;
  content: string;
  timestamp: string;
  tickers?: string[];
}

const mockMessages: Message[] = [
  {
    id: '1',
    user: 'James Fletcher',
    verified: true,
    content: 'Morning all. Watching BARC.L closely today after the quarterly results.',
    timestamp: '09:42',
    tickers: ['BARC.L']
  },
  {
    id: '2',
    user: 'Sarah Chen',
    verified: true,
    content: 'Strong resistance at 185p. Worth keeping an eye on volume.',
    timestamp: '09:45',
  },
  {
    id: '3',
    user: 'Michael Roberts',
    verified: false,
    content: 'Anyone looking at LLOY.L and VOD.L this morning? Both showing interesting movement.',
    timestamp: '09:48',
    tickers: ['LLOY.L', 'VOD.L']
  },
  {
    id: '4',
    user: 'Emma Thompson',
    verified: true,
    content: 'Market sentiment seems cautious ahead of the BoE announcement. Keeping positions small.',
    timestamp: '09:52',
  },
  {
    id: '5',
    user: 'David Kumar',
    verified: false,
    content: 'BARC.L breaking through resistance now. Volume spike confirmed.',
    timestamp: '09:55',
    tickers: ['BARC.L']
  },
];

export function MarketChatChannel() {
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [activeTicket, setActiveTicket] = useState<TradeTicketInput | null>(null);

  const handlePlaceOrder = (side: 'BUY' | 'SELL', ticker: string, price: number) => {
    const now = new Date();
    const timestamp = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const actionMessage: Message = {
      id: `trade-${Date.now()}-${ticker}-${side}`,
      user: 'You',
      verified: true,
      content: `${side} order prepared for ${ticker} at ${price.toFixed(2)} GBp.`,
      timestamp,
      tickers: [ticker],
    };

    setMessages((prev) => [...prev, actionMessage]);
  };

  return (
    <>
      {/* Warning Banner */}
      <div className="bg-amber-950 border-b border-amber-900 px-6 py-3 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-400" />
        <span className="text-amber-300 text-sm">Market data may be delayed by 15 seconds.</span>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-zinc-950">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} onOpenTradeTicket={setActiveTicket} />
        ))}
      </div>

      {/* Message Input */}
      <MessageInput />

      <TradeTicketDrawer
        isOpen={activeTicket !== null}
        ticket={activeTicket}
        onClose={() => setActiveTicket(null)}
        onPlaceOrder={handlePlaceOrder}
      />
    </>
  );
}
