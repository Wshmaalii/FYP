import { AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { sendMessage, fetchMessages, type ChannelMessage } from '../../api/messages';
import { ChatMessage } from '../ChatMessage';
import { MessageInput } from '../MessageInput';
import { TradeTicketDrawer } from '../TradeTicketDrawer';
import type { TradeTicketInput } from '../TradeTicketDrawer';
import { ChannelPrivacyCard } from './ChannelPrivacyCard';

export function MarketChatChannel() {
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [activeTicket, setActiveTicket] = useState<TradeTicketInput | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadMessages = async () => {
      if (isMounted) {
        setLoading((current) => current && messages.length === 0);
        setError(null);
      }

      try {
        const messageData = await fetchMessages('market');
        if (isMounted) {
          setMessages(messageData);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load messages');
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
  }, []);

  const handleSend = async (content: string) => {
    setIsSending(true);
    setError(null);

    try {
      const createdMessage = await sendMessage('market', content);
      setMessages((current) => [...current, createdMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      throw err;
    } finally {
      setIsSending(false);
    }
  };

  const handlePlaceOrder = (side: 'BUY' | 'SELL', ticker: string, price: number) => {
    const now = new Date();
    const timestamp = now.toISOString();
    const actionMessage: ChannelMessage = {
      id: `trade-${Date.now()}-${ticker}-${side}`,
      user_id: 'local',
      user: 'You',
      verified: true,
      content: `${side} order prepared for ${ticker} at ${price.toFixed(2)} GBp.`,
      timestamp,
      tickers: [ticker],
      channel: 'market',
    };

    setMessages((prev) => [...prev, actionMessage]);
  };

  return (
    <>
      <div className="bg-amber-950 border-b border-amber-900 px-6 py-3 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-400" />
        <span className="text-amber-300 text-sm">Market data may be delayed by 15 seconds.</span>
      </div>

      <ChannelPrivacyCard
        scopeLabel="Public Channel"
        audienceLabel="Members Visible"
        visibilitySummary="Messages in Market Chat are visible to signed-in TradeLink members who can access this channel."
        membershipVisibility="Channel participation is visible to other members in this space."
        tickerVisibility="Explicit ticker mentions like $AAPL or #SPY are visible to everyone in this channel."
        metadataVisibility="Display name, verification badge, timestamp, and mentioned tickers are visible in this channel."
      />

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-zinc-950">
        {error && (
          <div className="bg-zinc-900 border border-red-900 rounded-lg p-4 text-red-400 text-sm">
            {error}
          </div>
        )}
        {loading ? (
          <div className="text-zinc-400 text-sm">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-zinc-500 text-sm">
            No messages yet. Start the conversation.
          </div>
        ) : (
          messages.map((message) => (
            <ChatMessage key={message.id} message={message} onOpenTradeTicket={setActiveTicket} />
          ))
        )}
      </div>

      <MessageInput onSend={handleSend} isSending={isSending} privacyMode="public" contextLabel="channel" />

      <TradeTicketDrawer
        isOpen={activeTicket !== null}
        ticket={activeTicket}
        onClose={() => setActiveTicket(null)}
        onPlaceOrder={handlePlaceOrder}
      />
    </>
  );
}
