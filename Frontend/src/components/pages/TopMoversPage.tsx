import { ArrowLeft, TrendingDown, TrendingUp, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getTopMovers, MARKET_DATA_LIMITED_MESSAGE, TopMoverItem } from '../../api/market';
import { addWatchlistItem } from '../../api/watchlist';

interface TopMoversPageProps {
  onBack: () => void;
}

type DiscussedFilter = 'All' | 'Big Tech' | 'AI' | 'Consumer / Media' | 'Finance' | 'High Volatility';

const DISCUSSED_FILTER_SYMBOLS: Record<Exclude<DiscussedFilter, 'All'>, string[]> = {
  'Big Tech': ['AAPL', 'MSFT', 'AMZN', 'META', 'GOOGL'],
  'AI': ['NVDA', 'AMD', 'PLTR', 'MSFT'],
  'Consumer / Media': ['NFLX', 'DIS', 'AMZN', 'UBER'],
  'Finance': ['JPM', 'V', 'MA', 'COIN'],
  'High Volatility': ['TSLA', 'COIN', 'PLTR', 'AMD', 'NVDA', 'UBER'],
};

interface Stock {
  ticker: string;
  name: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  mentionCount: number;
  uniqueUsers: number;
  watchlistAdds: number;
}

function sectionLabelStyle() {
  return {
    margin: 0,
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.16em',
    textTransform: 'uppercase' as const,
    color: 'var(--text-label)',
  };
}

function StockRow({
  stock,
  onAddToWatchlist,
  onToggleExpand,
  isExpanded,
  updatedAt,
}: {
  stock: Stock;
  onAddToWatchlist: (ticker: string) => void;
  onToggleExpand: (ticker: string) => void;
  isExpanded: boolean;
  updatedAt?: string;
}) {
  const hasQuote = stock.price !== null && stock.change !== null && stock.changePercent !== null;
  const isPositive = (stock.change ?? 0) >= 0;

  return (
    <div
      className="cursor-pointer"
      onClick={() => onToggleExpand(stock.ticker)}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '18px',
        transition: 'border-color 150ms ease, background 150ms ease',
      }}
    >
      <div className="flex items-center gap-4 p-4">
        <div
          className="flex-shrink-0"
          style={{
            width: '44px',
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-teal))',
          }}
        >
          <span className="text-white text-sm">{stock.ticker.substring(0, 2)}</span>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-zinc-100" style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>{stock.ticker}</h3>
          <p className="text-zinc-500 text-sm truncate" style={{ margin: '4px 0 0', color: 'var(--text-muted)' }}>{stock.name}</p>
        </div>

        <div className="w-24 h-12">
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              color: 'var(--text-label)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              background: 'rgba(0,0,0,0.16)',
            }}
          >
            On demand
          </div>
        </div>

        <div className="text-right min-w-[100px]">
          <p className="text-zinc-100" style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
            {stock.price !== null ? `${stock.price.toFixed(2)}p` : '--'}
          </p>
          <p className="text-zinc-500 text-sm" style={{ margin: '4px 0 0', color: 'var(--text-label)' }}>{stock.uniqueUsers} members</p>
        </div>

        <div className={`flex items-center gap-2 min-w-[120px] justify-end ${hasQuote ? (isPositive ? 'text-emerald-400' : 'text-red-400') : 'text-zinc-500'}`}>
          {hasQuote ? (
            <>
              {isPositive ? (
                <TrendingUp className="w-5 h-5" />
              ) : (
                <TrendingDown className="w-5 h-5" />
              )}
              <div className="text-right">
                <p>{isPositive ? '+' : ''}{stock.change!.toFixed(2)}</p>
                <p className="text-sm">{isPositive ? '+' : ''}{stock.changePercent!.toFixed(2)}%</p>
              </div>
            </>
          ) : (
            <div className="text-right">
              <p>On demand</p>
              <p className="text-sm">No cached quote</p>
            </div>
          )}
        </div>

        <button
          onClick={(event) => {
            event.stopPropagation();
            onAddToWatchlist(stock.ticker);
          }}
          className="flex-shrink-0"
          title="Add to Watchlist"
          style={{
            padding: '10px',
            background: 'rgba(0,0,0,0.18)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            cursor: 'pointer',
          }}
        >
          <Plus className="w-4 h-4 text-zinc-400 hover:text-white" />
        </button>
      </div>

      {isExpanded && (
        <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Live quote details</span>
            <span className="text-zinc-500">{updatedAt ? `Updated: ${updatedAt}` : 'Updated: --'}</span>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div className="bg-zinc-950 border border-zinc-800 rounded p-3">
              <p className="text-zinc-500 text-xs mb-1">Last Price</p>
              <p className="text-zinc-100">{stock.price !== null ? `${stock.price.toFixed(2)}p` : '--'}</p>
            </div>
            <div className="bg-zinc-950 border border-zinc-800 rounded p-3">
              <p className="text-zinc-500 text-xs mb-1">Day Change</p>
              {hasQuote ? (
                <p className={isPositive ? 'text-emerald-400' : 'text-red-400'}>
                  {isPositive ? '+' : ''}{stock.change!.toFixed(2)} ({isPositive ? '+' : ''}{stock.changePercent!.toFixed(2)}%)
                </p>
              ) : (
                <p className="text-zinc-500">Live quote on demand</p>
              )}
            </div>
            <div className="bg-zinc-950 border border-zinc-800 rounded p-3">
              <p className="text-zinc-500 text-xs mb-1">Mentions / Watchlist Adds</p>
              <p className="text-zinc-100">{stock.mentionCount} / {stock.watchlistAdds}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function TopMoversPage({ onBack }: TopMoversPageProps) {
  const [selectedFilter, setSelectedFilter] = useState<DiscussedFilter>('All');
  const [discussed, setDiscussed] = useState<Stock[]>([]);
  const [expandedTicker, setExpandedTicker] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [watchlistMessage, setWatchlistMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [providerMessage, setProviderMessage] = useState<string | null>(null);

  const mapMoverToStock = (mover: TopMoverItem): Stock => ({
    ticker: mover.ticker,
    name: mover.name,
    price: mover.price,
    change: mover.change,
    changePercent: mover.changePercent,
    mentionCount: mover.mentionCount,
    uniqueUsers: mover.uniqueUsers,
    watchlistAdds: mover.watchlistAdds,
  });

  const filteredDiscussed = selectedFilter === 'All'
    ? discussed
    : discussed.filter((stock) => DISCUSSED_FILTER_SYMBOLS[selectedFilter].includes(stock.ticker));

  useEffect(() => {
    let isMounted = true;

    const loadTopMovers = async () => {
      if (isMounted) {
        setLoading(true);
        setError(null);
      }

      try {
        const data = await getTopMovers('Global');
        if (!isMounted) {
          return;
        }

        setDiscussed(data.items.map(mapMoverToStock));
        setLastUpdatedAt(data.updatedAt);
        setProviderMessage(data.message);
      } catch (err) {
        if (!isMounted) {
          return;
        }

        setDiscussed([]);
        setLastUpdatedAt(null);
        setError(err instanceof Error ? err.message : 'Failed to load discussed tickers');
        setProviderMessage(null);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadTopMovers();

    return () => {
      isMounted = false;
    };
  }, []);

  const toggleExpanded = (ticker: string) => {
    setExpandedTicker((current) => (current === ticker ? null : ticker));
  };

  const handleAddToWatchlist = async (ticker: string) => {
    const stock = discussed.find((item) => item.ticker === ticker);

    try {
      await addWatchlistItem(ticker, stock?.name);
      setWatchlistMessage(`${ticker} added to your watchlist.`);
    } catch (err) {
      setWatchlistMessage(err instanceof Error ? err.message : 'Failed to add watchlist item');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-950">
      <div
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: 'var(--bg-sidebar)',
          padding: '24px 32px',
        }}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-zinc-400 hover:text-zinc-100 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back to Dashboard</span>
        </button>

        <div className="flex items-start justify-between gap-8">
          <div>
            <p style={sectionLabelStyle()}>Community Signals</p>
            <h1 className="text-white text-2xl mb-2" style={{ marginTop: '10px', fontSize: '28px', fontWeight: 700, letterSpacing: '-0.03em' }}>
              Most Discussed
            </h1>
            <p className="text-zinc-400" style={{ maxWidth: '36rem', color: 'var(--text-muted)', fontSize: '15px', lineHeight: 1.6 }}>
              Most discussed supported tickers in the TradeLink community, ranked by mentions and watchlist activity.
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
              justifyContent: 'flex-end',
            }}
          >
            {(['All', 'Big Tech', 'AI', 'Consumer / Media', 'Finance', 'High Volatility'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedFilter(filter)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '14px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: selectedFilter === filter ? 'var(--accent-teal-bg)' : 'rgba(255,255,255,0.04)',
                  color: selectedFilter === filter ? 'var(--accent-teal)' : 'var(--text-muted)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1180px', margin: '0 auto', padding: '24px 24px 32px' }}>
        {watchlistMessage && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-sm text-zinc-300">
            {watchlistMessage}
          </div>
        )}
        {error && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-sm text-zinc-400">
            {MARKET_DATA_LIMITED_MESSAGE}
          </div>
        )}
        {providerMessage && !error && (
          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              padding: '16px',
              color: 'var(--text-label)',
              fontSize: '14px',
            }}
          >
            {providerMessage}
          </div>
        )}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            <h2 className="text-zinc-100" style={{ margin: 0, fontSize: '22px', fontWeight: 700 }}>Most Discussed</h2>
            <span className="text-zinc-500 text-sm">({filteredDiscussed.length} tickers)</span>
          </div>
          <div className="space-y-3">
            {loading ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-sm text-zinc-500">
                Loading discussed tickers...
              </div>
            ) : filteredDiscussed.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '240px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '20px',
                  padding: '32px',
                  textAlign: 'center',
                }}
              >
                <div>
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
                    <TrendingUp className="w-7 h-7 text-zinc-600" />
                  </div>
                  <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '22px', fontWeight: 600 }}>
                    No discussed tickers yet
                  </h3>
                  <p style={{ margin: '8px 0 0', color: 'var(--text-label)', fontSize: '14px', lineHeight: 1.6 }}>
                    {providerMessage || 'Mention a ticker like #SPY or $AAPL to start.'}
                  </p>
                </div>
              </div>
            ) : (
              filteredDiscussed.map((stock) => (
                <StockRow
                  key={stock.ticker}
                  stock={stock}
                  onAddToWatchlist={handleAddToWatchlist}
                  onToggleExpand={toggleExpanded}
                  isExpanded={expandedTicker === stock.ticker}
                  updatedAt={lastUpdatedAt || undefined}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
