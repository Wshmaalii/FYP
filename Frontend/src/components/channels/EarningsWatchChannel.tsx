import { AlertTriangle, Clock, Calendar } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getUpcomingEarnings, MARKET_DATA_LIMITED_MESSAGE, type EarningsCalendarItem } from '../../api/market';
import { fetchMessages, sendMessage, type ChannelMessage } from '../../api/messages';
import { ChatMessage } from '../ChatMessage';
import { MessageInput } from '../MessageInput';
import { ChannelPrivacyCard } from './ChannelPrivacyCard';

function formatReportDate(value: string) {
  if (!value) {
    return 'Date unavailable';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function EarningsCard({ report }: { report: EarningsCalendarItem }) {
  
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-cyan-600 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-zinc-100">{report.ticker}</h3>
          </div>
          <p className="text-zinc-500 text-sm">{report.company}</p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-cyan-400">
            <Clock className="w-3 h-3" />
            <span className="text-sm">{formatReportDate(report.report_date)}</span>
          </div>
          <p className="text-zinc-500 text-xs mt-1">Estimated earnings date</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 mb-3">
        <div className="bg-zinc-950 border border-zinc-800 rounded p-3">
          <p className="text-zinc-500 text-xs mb-1">Estimated EPS</p>
          <span className="text-zinc-100">
            {report.estimate !== null ? `${report.estimate} ${report.currency || ''}`.trim() : 'Unavailable'}
          </span>
        </div>
      </div>
    </div>
  );
}

export function EarningsWatchChannel() {
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [earnings, setEarnings] = useState<EarningsCalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [earningsLoading, setEarningsLoading] = useState(true);
  const [earningsError, setEarningsError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadMessages = async () => {
      if (isMounted) {
        setLoading((current) => current && messages.length === 0);
        setError(null);
      }

      try {
        const messageData = await fetchMessages('earnings');
        if (isMounted) {
          setMessages(messageData);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load commentary');
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

  useEffect(() => {
    let isMounted = true;

    const loadEarnings = async () => {
      setEarningsLoading(true);
      setEarningsError(null);

      try {
        const data = await getUpcomingEarnings();
        if (isMounted) {
          setEarnings(data.items.slice(0, 6));
        }
      } catch (err) {
        if (isMounted) {
          setEarningsError(err instanceof Error ? err.message : 'Failed to load earnings calendar');
        }
      } finally {
        if (isMounted) {
          setEarningsLoading(false);
        }
      }
    };

    void loadEarnings();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSend = async (content: string) => {
    setIsSending(true);
    setError(null);

    try {
      const createdMessage = await sendMessage('earnings', content);
      setMessages((current) => [...current, createdMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send commentary');
      throw err;
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <div className="bg-amber-950 border-b border-amber-900 px-6 py-3 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-400" />
        <span className="text-amber-300 text-sm">Earnings data is subject to company reporting schedules and may change.</span>
      </div>

      <ChannelPrivacyCard
        scopeLabel="Public Channel"
        audienceLabel="Members Visible"
        visibilitySummary="Messages in Earnings Watch are visible to signed-in TradeLink members who can access this channel."
        membershipVisibility="Participation in this discussion is visible to other members in the channel."
        tickerVisibility="Any explicit ticker mention you include in commentary is visible to all members here."
        metadataVisibility="Display name, verification badge, timestamp, and mentioned tickers are visible in this channel."
      />

      <div className="flex-1 overflow-y-auto bg-zinc-950">
        <div className="border-b border-zinc-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-cyan-400" />
            <h2 className="text-zinc-100">Upcoming Earnings Reports</h2>
          </div>
          {earningsError ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-zinc-500 text-sm">
              {MARKET_DATA_LIMITED_MESSAGE}
            </div>
          ) : earningsLoading ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-zinc-500 text-sm">
              Loading earnings calendar...
            </div>
          ) : earnings.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-zinc-500 text-sm">
              Upcoming earnings context is not available right now.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {earnings.map((report) => (
                <EarningsCard key={`${report.ticker}-${report.report_date}`} report={report} />
              ))}
            </div>
          )}
        </div>

        <div className="p-6 space-y-4">
          <h2 className="text-zinc-100 mb-4">Analyst Commentary</h2>
          {error && (
            <div className="bg-zinc-900 border border-red-900 rounded-lg p-4 text-red-400 text-sm">
              {error}
            </div>
          )}
          {loading ? (
            <div className="text-zinc-400 text-sm">Loading commentary...</div>
          ) : messages.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-zinc-500 text-sm">
              No commentary yet. Share the first earnings update.
            </div>
          ) : (
            messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))
          )}
        </div>
      </div>

      <MessageInput
        onSend={handleSend}
        isSending={isSending}
        placeholder="Share earnings commentary..."
        privacyMode="public"
        contextLabel="channel"
      />
    </>
  );
}
