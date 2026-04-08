import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BarChart3, MessageSquareText, Plus, Star, TrendingDown, TrendingUp } from 'lucide-react';
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

function formatChartTick(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
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
  const headerMetaLine = `Source · Stored market snapshot${updatedAt ? ` · Last updated ${formatTimestamp(updatedAt)}` : ''}`;

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
      <div
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: 'var(--bg-sidebar)',
          padding: '28px 32px',
        }}
      >
        <button
          onClick={onBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '18px',
            color: 'var(--text-muted)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back to Markets</span>
        </button>

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '32px',
          }}
        >
          <div style={{ maxWidth: '48rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '10px',
                flexWrap: 'wrap',
              }}
            >
              <h1
                style={{
                  margin: 0,
                  fontSize: '42px',
                  fontWeight: 700,
                  letterSpacing: '-0.04em',
                  color: '#ffffff',
                  lineHeight: 1,
                }}
              >
                {ticker}
              </h1>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  borderRadius: '999px',
                  padding: '6px 11px',
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--text-label)',
                  background: 'rgba(255,255,255,0.035)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                Stored snapshot
              </span>
            </div>
            <p
              style={{
                margin: 0,
                color: 'var(--text-muted)',
                fontSize: '17px',
                lineHeight: 1.5,
              }}
            >
              {companyName}
            </p>
            <p
              style={{
                margin: '12px 0 0',
                color: 'var(--text-label)',
                fontSize: '12px',
                lineHeight: 1.5,
              }}
            >
              {headerMetaLine}
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '12px',
              flexShrink: 0,
            }}
          >
            <button
              onClick={() => onMentionInChat(ticker)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.02)',
                padding: '12px 16px',
                color: 'var(--text-primary)',
                cursor: 'pointer',
              }}
            >
              <MessageSquareText className="w-4 h-4" />
              Mention in Chat
            </button>
            <button
              onClick={() => void handleToggleWatchlist()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderRadius: '16px',
                border: '1px solid var(--accent-teal-border)',
                background: 'var(--accent-teal)',
                padding: '12px 16px',
                color: '#ffffff',
                boxShadow: '0 12px 28px rgba(8,145,178,0.16)',
                cursor: 'pointer',
              }}
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
        {watchMessage && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-zinc-300 text-sm">
            {watchMessage}
          </div>
        )}

        <div
          style={{
            borderRadius: '24px',
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.03)',
            padding: '24px 26px',
            boxShadow: '0 18px 40px rgba(0,0,0,0.18)',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: '24px',
              alignItems: 'start',
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--text-label)',
                }}
              >
                Latest Price
              </p>
              <p
                style={{
                  margin: '14px 0 0',
                  fontSize: '42px',
                  fontWeight: 700,
                  letterSpacing: '-0.04em',
                  color: 'var(--text-primary)',
                  lineHeight: 1,
                }}
              >
                {price !== null ? price.toFixed(2) : '--'}
              </p>
            </div>
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--text-label)',
                }}
              >
                Change
              </p>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '14px',
                  color: change !== null ? (isPositive ? '#34d399' : '#f87171') : 'var(--text-label)',
                }}
              >
                {change !== null ? (isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />) : null}
                <p
                  style={{
                    margin: 0,
                    fontSize: '30px',
                    fontWeight: 700,
                    letterSpacing: '-0.03em',
                    lineHeight: 1,
                  }}
                >
                  {change !== null ? `${isPositive ? '+' : ''}${change.toFixed(2)}` : '--'}
                </p>
              </div>
            </div>
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--text-label)',
                }}
              >
                Change %
              </p>
              <p
                style={{
                  margin: '14px 0 0',
                  fontSize: '30px',
                  fontWeight: 700,
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                  color: changePercent !== null ? (isPositive ? '#34d399' : '#f87171') : 'var(--text-label)',
                }}
              >
                {changePercent !== null ? `${isPositive ? '+' : ''}${changePercent.toFixed(2)}%` : '--'}
              </p>
            </div>
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--text-label)',
                }}
              >
                Source
              </p>
              <p
                style={{
                  margin: '14px 0 0',
                  fontSize: '15px',
                  fontWeight: 500,
                  lineHeight: 1.5,
                  color: 'var(--text-muted)',
                }}
              >
                Stored market snapshot
              </p>
            </div>
          </div>
        </div>

        <div
          style={{
            borderRadius: '24px',
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.03)',
            padding: '24px',
            boxShadow: '0 18px 40px rgba(0,0,0,0.2)',
          }}
        >
          <h2
            style={{
              margin: '0 0 20px',
              fontSize: '20px',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: 'var(--text-primary)',
            }}
          >
            Price History
          </h2>
          <div className={history.length === 0 ? 'min-h-[220px]' : 'h-72'}>
            {loading ? (
              <div className="flex h-full items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950/60 text-sm text-zinc-500">
                Loading stored history...
              </div>
            ) : history.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  height: '100%',
                  minHeight: '220px',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '20px',
                  border: '1px solid rgba(255,255,255,0.06)',
                  background: 'rgba(0,0,0,0.18)',
                  padding: '32px',
                  textAlign: 'center',
                }}
              >
                <div style={{ maxWidth: '28rem' }}>
                  <div
                    style={{
                      display: 'flex',
                      width: '56px',
                      height: '56px',
                      margin: '0 auto 14px',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '999px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <BarChart3 className="w-6 h-6" style={{ color: 'var(--text-label)' }} />
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '15px',
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                    }}
                  >
                    Price chart not available yet
                  </p>
                  <p
                    style={{
                      margin: '8px 0 0',
                      fontSize: '13px',
                      lineHeight: 1.6,
                      color: 'var(--text-label)',
                    }}
                  >
                    Chart will populate as snapshots are collected.
                  </p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={history}
                  margin={{ top: 12, right: 12, left: 0, bottom: 10 }}
                >
                  <XAxis
                    dataKey="time"
                    tickFormatter={formatChartTick}
                    minTickGap={28}
                    stroke="rgba(255,255,255,0.18)"
                    tick={{ fill: 'var(--text-label)', fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                  />
                  <YAxis
                    domain={chartDomain}
                    tickFormatter={(value) => `${Number(value).toFixed(2)}`}
                    width={68}
                    stroke="rgba(255,255,255,0.18)"
                    tick={{ fill: 'var(--text-label)', fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: '1px solid #3f3f46',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#a1a1aa' }}
                    labelFormatter={(value) => formatChartTick(String(value))}
                    formatter={(value: number | string) => [`${Number(value).toFixed(2)} USD`, 'Price']}
                  />
                  <Line type="monotone" dataKey="price" stroke="#14b8a6" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
