import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, MessageSquareText, Plus, Star, TrendingDown, TrendingUp } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fetchHistory, getQuotes, MARKET_SYMBOL_NAMES, type MarketDataStatus, type StockHistoryPoint } from '../../api/market';
import { addWatchlistItem, fetchWatchlist, removeWatchlistItem } from '../../api/watchlist';

interface StockDetailPageProps {
  ticker: string;
  onBack: () => void;
  onMentionInChat: (ticker: string) => void;
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return '--';
  }

  return new Date(value).toLocaleString('en-GB');
}

export function StockDetailPage({ ticker, onBack, onMentionInChat }: StockDetailPageProps) {
  const [price, setPrice] = useState<number | null>(null);
  const [change, setChange] = useState<number | null>(null);
  const [changePercent, setChangePercent] = useState<number | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [history, setHistory] = useState<StockHistoryPoint[]>([]);
  const [historyStatus, setHistoryStatus] = useState<MarketDataStatus | null>(null);
  const [quoteStatus, setQuoteStatus] = useState<MarketDataStatus | null>(null);
  const [watchMessage, setWatchMessage] = useState<string | null>(null);
  const [isWatched, setIsWatched] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const companyName = MARKET_SYMBOL_NAMES[ticker] || ticker;
  const isPositive = (change ?? 0) >= 0;

  useEffect(() => {
    let isMounted = true;

    const loadStock = async () => {
      setLoading(true);
      setError(null);
      setWatchMessage(null);

      try {
        const [quotesResponse, historyResponse, watchlistItems] = await Promise.all([
          getQuotes([ticker]),
          fetchHistory(ticker).catch(() => ({ points: [], marketDataStatus: null })),
          fetchWatchlist().catch(() => []),
        ]);

        if (!isMounted) {
          return;
        }

        const quote = quotesResponse.quotes[ticker];
        if (!quote) {
          setError('No stored market snapshot is available for this stock yet.');
          setPrice(null);
          setChange(null);
          setChangePercent(null);
          setUpdatedAt(null);
        } else {
          setPrice(quote.price);
          setChange(quote.change);
          setChangePercent(quote.changePercent);
          setUpdatedAt(quote.updatedAt);
        }

        setHistory(historyResponse.points);
        setQuoteStatus(quotesResponse.marketDataStatus || null);
        setHistoryStatus(historyResponse.marketDataStatus || null);
        setIsWatched(watchlistItems.some((item) => item.ticker === ticker));
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load stock detail');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadStock();

    return () => {
      isMounted = false;
    };
  }, [ticker]);

  const chartDomain = useMemo(() => {
    if (history.length === 0) {
      return [0, 1];
    }
    const prices = history.map((point) => point.price);
    return [Math.min(...prices) * 0.995, Math.max(...prices) * 1.005];
  }, [history]);

  const handleToggleWatchlist = async () => {
    setWatchMessage(null);

    try {
      if (isWatched) {
        await removeWatchlistItem(ticker);
        setIsWatched(false);
        setWatchMessage(`${ticker} removed from your watchlist.`);
      } else {
        await addWatchlistItem(ticker, companyName);
        setIsWatched(true);
        setWatchMessage(`${ticker} added to your watchlist.`);
      }
    } catch (err) {
      setWatchMessage(err instanceof Error ? err.message : 'Failed to update watchlist');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-950">
      <div className="border-b border-zinc-800 bg-zinc-900 px-8 py-7">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-zinc-400 hover:text-zinc-100 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back to Markets</span>
        </button>

        <div className="flex items-start justify-between gap-8">
          <div className="max-w-3xl">
            <div className="mb-3 flex items-center gap-3">
              <h1 className="text-4xl font-semibold tracking-tight text-white">{ticker}</h1>
              <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-zinc-400">
                Stored snapshot
              </span>
            </div>
            <p className="text-lg text-zinc-400">{companyName}</p>
            <div className="mt-5 space-y-2">
              <p className="text-sm text-zinc-500"><span className="text-zinc-600">Source</span> · Stored market snapshot</p>
              <p className="text-sm text-zinc-500"><span className="text-zinc-600">Last updated</span> · {formatTimestamp(updatedAt)}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => onMentionInChat(ticker)}
              className="flex items-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 transition-all duration-150 hover:bg-zinc-800 active:translate-y-px"
            >
              <MessageSquareText className="w-4 h-4" />
              Mention in Chat
            </button>
            <button
              onClick={() => void handleToggleWatchlist()}
              className="flex items-center gap-2 rounded-2xl bg-cyan-600 px-4 py-3 text-white shadow-[0_12px_28px_rgba(8,145,178,0.16)] transition-all duration-150 hover:bg-cyan-500 active:translate-y-px"
            >
              {isWatched ? <Star className="w-4 h-4 fill-white" /> : <Plus className="w-4 h-4" />}
              {isWatched ? 'Watching' : 'Add to Watchlist'}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-8 px-8 py-8">
        {error && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-zinc-400 text-sm">
            {error}
          </div>
        )}
        {!error && quoteStatus?.isCachedFallback && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-zinc-400 text-sm leading-6">
            {quoteStatus.message || 'Showing most recent available data.'}
            {quoteStatus.lastUpdatedAt ? ` Last updated ${formatTimestamp(quoteStatus.lastUpdatedAt)}.` : ''}
          </div>
        )}
        {watchMessage && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-zinc-300 text-sm">
            {watchMessage}
          </div>
        )}

        <div className="grid grid-cols-4 gap-5">
          <div className="rounded-[28px] border border-zinc-800 bg-zinc-900 px-5 py-6 shadow-[0_12px_28px_rgba(0,0,0,0.16)]">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Latest Price</p>
            <p className="mt-4 text-4xl font-semibold tracking-tight text-zinc-100">{price !== null ? price.toFixed(2) : '--'}</p>
          </div>
          <div className="rounded-[28px] border border-zinc-800 bg-zinc-900 px-5 py-6 shadow-[0_12px_28px_rgba(0,0,0,0.16)]">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Change</p>
            <div className={`mt-4 flex items-center gap-2 ${change !== null ? (isPositive ? 'text-emerald-400' : 'text-red-400') : 'text-zinc-500'}`}>
              {change !== null ? (isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />) : null}
              <p className="text-4xl font-semibold tracking-tight">{change !== null ? `${isPositive ? '+' : ''}${change.toFixed(2)}` : '--'}</p>
            </div>
          </div>
          <div className="rounded-[28px] border border-zinc-800 bg-zinc-900 px-5 py-6 shadow-[0_12px_28px_rgba(0,0,0,0.16)]">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Change %</p>
            <p className={`mt-4 text-4xl font-semibold tracking-tight ${changePercent !== null ? (isPositive ? 'text-emerald-400' : 'text-red-400') : 'text-zinc-500'}`}>
              {changePercent !== null ? `${isPositive ? '+' : ''}${changePercent.toFixed(2)}%` : '--'}
            </p>
          </div>
          <div className="rounded-[28px] border border-zinc-800 bg-zinc-900 px-5 py-6 shadow-[0_12px_28px_rgba(0,0,0,0.16)]">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Source</p>
            <p className="mt-4 text-base font-medium leading-7 text-zinc-100">Stored market snapshot</p>
          </div>
        </div>

        <div className="rounded-[28px] border border-zinc-800 bg-zinc-900 p-6 shadow-[0_18px_40px_rgba(0,0,0,0.2)]">
          <h2 className="mb-5 text-lg font-semibold tracking-tight text-zinc-100">Price History</h2>
          <div className={history.length === 0 ? 'min-h-[220px]' : 'h-72'}>
            {loading ? (
              <div className="flex h-full items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950/60 text-sm text-zinc-500">
                Loading stored history...
              </div>
            ) : history.length === 0 ? (
              <div className="flex h-full items-center justify-center rounded-[24px] border border-zinc-800 bg-zinc-950/60 px-8 text-center text-sm leading-6 text-zinc-500">
                <div className="max-w-md">
                  <p className="font-medium text-zinc-400">Price chart not available yet</p>
                  <p className="mt-2">Price chart will appear once enough stored snapshots have been collected.</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <XAxis dataKey="time" hide />
                  <YAxis domain={chartDomain} hide />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: '1px solid #3f3f46',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#a1a1aa' }}
                  />
                  <Line type="monotone" dataKey="price" stroke={isPositive ? '#34d399' : '#f87171'} strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          {historyStatus?.isCachedFallback && (
            <p className="text-zinc-500 text-xs mt-3">
              {historyStatus.message || 'Showing most recent available data.'}
              {historyStatus.lastUpdatedAt ? ` Last updated ${formatTimestamp(historyStatus.lastUpdatedAt)}.` : ''}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
