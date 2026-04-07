import { useEffect, useState } from 'react';
import { ArrowLeft, Bell, Star, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { getQuotes, type MarketDataStatus } from '../../api/market';
import { WATCHLIST_UPDATED_EVENT, fetchWatchlist, removeWatchlistItem, type WatchlistItem } from '../../api/watchlist';

interface WatchlistPageProps {
  onBack: () => void;
  onSelectStock: (ticker: string) => void;
}

interface WatchlistStock extends WatchlistItem {
  price: number | null;
  change: number;
  changePercent: number;
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

function WatchlistRow({
  stock,
  onRemove,
  onSelectStock,
}: {
  stock: WatchlistStock;
  onRemove: (ticker: string) => void;
  onSelectStock: (ticker: string) => void;
}) {
  const isPositive = stock.changePercent >= 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelectStock(stock.ticker)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelectStock(stock.ticker);
        }
      }}
      className="w-full text-left"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '18px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '18px',
        transition: 'border-color 150ms ease, background 150ms ease',
      }}
    >
      <Star className="w-5 h-5 text-amber-400 fill-amber-400 flex-shrink-0" />

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
        <p className="text-zinc-500 text-sm truncate" style={{ margin: '4px 0 0', color: 'var(--text-muted)' }}>
          {stock.company_name || 'Saved watchlist item'}
        </p>
      </div>

      <div style={{ width: '88px', height: '38px' }}>
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
        <p className="text-zinc-500 text-sm" style={{ margin: '4px 0 0', color: 'var(--text-label)' }}>Saved item</p>
      </div>

      <div className={`flex items-center gap-2 min-w-[120px] justify-end ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
        {isPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
        <div className="text-right">
          <p>{isPositive ? '+' : ''}{stock.change.toFixed(2)}</p>
          <p className="text-sm">{isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%</p>
        </div>
      </div>

      <div className="flex gap-2 flex-shrink-0">
        <button
          className="transition-colors"
          title="Set Alert"
          onClick={(event) => {
            event.stopPropagation();
          }}
          style={{
            padding: '10px',
            background: 'rgba(0,0,0,0.18)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            cursor: 'pointer',
          }}
        >
          <Bell className="w-4 h-4 text-zinc-400" />
        </button>
        <button
          onClick={(event) => {
            event.stopPropagation();
            onRemove(stock.ticker);
          }}
          className="transition-colors"
          title="Remove from Watchlist"
          style={{
            padding: '10px',
            background: 'rgba(0,0,0,0.18)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            cursor: 'pointer',
          }}
        >
          <Trash2 className="w-4 h-4 text-zinc-400" />
        </button>
      </div>
    </div>
  );
}

export function WatchlistPage({ onBack, onSelectStock }: WatchlistPageProps) {
  const [stocks, setStocks] = useState<WatchlistStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marketDataStatus, setMarketDataStatus] = useState<MarketDataStatus | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadWatchlist = async () => {
      setLoading(true);
      setError(null);

      try {
        const items = await fetchWatchlist();
        const quoteResponse = items.length > 0 ? await getQuotes(items.map((item) => item.ticker)) : { quotes: {} };
        const quotes = quoteResponse.quotes;

        if (!isMounted) {
          return;
        }

        setStocks(
          items.map((item) => {
            const quote = quotes[item.ticker];
            const price = quote?.price ?? null;
            const changePercent = quote?.changePercent ?? 0;
            const change = price !== null ? (price * changePercent) / 100 : 0;
            return {
              ...item,
              price,
              change,
              changePercent,
            };
          }),
        );
        setMarketDataStatus(quoteResponse.marketDataStatus || null);
      } catch (err) {
        if (!isMounted) {
          return;
        }
        setError(err instanceof Error ? err.message : 'Failed to load watchlist');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadWatchlist();

    const handleWatchlistUpdated = () => {
      void loadWatchlist();
    };
    window.addEventListener(WATCHLIST_UPDATED_EVENT, handleWatchlistUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener(WATCHLIST_UPDATED_EVENT, handleWatchlistUpdated);
    };
  }, []);

  const handleRemove = async (ticker: string) => {
    try {
      await removeWatchlistItem(ticker);
      setStocks((current) => current.filter((stock) => stock.ticker !== ticker));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove watchlist item');
    }
  };

  const totalGain = stocks.filter((stock) => stock.changePercent >= 0).length;
  const totalLoss = stocks.filter((stock) => stock.changePercent < 0).length;

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
            <p style={sectionLabelStyle()}>Personal Tracking</p>
            <h1 className="text-white text-2xl mb-2" style={{ marginTop: '10px', fontSize: '28px', fontWeight: 700, letterSpacing: '-0.03em' }}>
              My Watchlist
            </h1>
            <p className="text-zinc-400" style={{ maxWidth: '36rem', color: 'var(--text-muted)', fontSize: '15px', lineHeight: 1.6 }}>
              Keep track of the tickers you want to revisit in conversations and stored market snapshots.
            </p>
          </div>

          <div className="flex gap-4">
            <div style={{ background: 'rgba(0,0,0,0.22)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '16px', minWidth: '120px' }}>
              <p className="text-zinc-500 text-xs mb-1" style={{ color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Total Stocks</p>
              <p className="text-white text-2xl" style={{ margin: 0, fontSize: '30px', fontWeight: 700 }}>{stocks.length}</p>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.22)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '16px', minWidth: '120px' }}>
              <p className="text-zinc-500 text-xs mb-1" style={{ color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Gainers</p>
              <p className="text-emerald-400 text-2xl" style={{ margin: 0, fontSize: '30px', fontWeight: 700 }}>{totalGain}</p>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.22)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '16px', minWidth: '120px' }}>
              <p className="text-zinc-500 text-xs mb-1" style={{ color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Losers</p>
              <p className="text-red-400 text-2xl" style={{ margin: 0, fontSize: '30px', fontWeight: 700 }}>{totalLoss}</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1180px', margin: '0 auto', padding: '24px 24px 32px' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p style={sectionLabelStyle()}>Tracked Tickers</p>
            <h2 className="text-zinc-100" style={{ margin: '10px 0 0', fontSize: '22px', fontWeight: 700 }}>Tracked Tickers</h2>
          </div>
          <div className="flex items-center gap-2 text-zinc-500 text-sm">
            <span>Stored market snapshots</span>
            <div className="w-2 h-2 bg-cyan-400 rounded-full" />
          </div>
        </div>

        {error && <div className="mb-4 bg-red-950 border border-red-900 rounded-lg p-4 text-red-400 text-sm">{error}</div>}
        {!error && marketDataStatus?.isCachedFallback && (
          <div className="mb-4 bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-zinc-400 text-sm">
            {marketDataStatus.message || 'Showing most recent available data.'}
            {marketDataStatus.lastUpdatedAt ? ` Last updated ${new Date(marketDataStatus.lastUpdatedAt).toLocaleString('en-GB')}.` : ''}
          </div>
        )}
        {!error && !marketDataStatus?.isCachedFallback && stocks.length > 0 && (
          <div className="mb-4 bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-zinc-400 text-sm">
            Showing most recent available data for your tracked stocks.
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12 bg-zinc-900 border border-zinc-800 rounded-lg">
            <div className="text-zinc-400 text-sm">Loading watchlist...</div>
          </div>
        ) : stocks.length === 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '280px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '20px',
              padding: '32px',
            }}
          >
            <div className="text-center">
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
                <Star className="w-7 h-7 text-zinc-600" />
              </div>
              <h3 className="text-zinc-100 mb-2" style={{ fontSize: '22px', fontWeight: 600 }}>No watchlist items yet</h3>
              <p className="text-zinc-500 text-sm" style={{ color: 'var(--text-label)', fontSize: '14px', lineHeight: 1.6 }}>
                Add discussed tickers to keep track of ongoing conversations and revisit them later.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {stocks.map((stock) => (
              <WatchlistRow key={stock.ticker} stock={stock} onRemove={handleRemove} onSelectStock={onSelectStock} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
