import { ArrowLeft, TrendingUp, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getTopMovers, MARKET_DATA_LIMITED_MESSAGE, TopMoverItem } from '../../api/market';
import { addWatchlistItem } from '../../api/watchlist';

interface TopMoversPageProps {
  onBack: () => void;
}

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
      className="bg-zinc-900 border border-zinc-800 rounded hover:border-cyan-600 transition-colors cursor-pointer"
      onClick={() => onToggleExpand(stock.ticker)}
    >
      <div className="flex items-center gap-4 p-4">
        <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded flex items-center justify-center flex-shrink-0">
          <span className="text-white text-sm">{stock.ticker.substring(0, 2)}</span>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-zinc-100">{stock.ticker}</h3>
          <p className="text-zinc-500 text-sm truncate">{stock.name}</p>
        </div>

        <div className="w-24 h-12">
          <div className="w-full h-full flex items-center justify-center text-[11px] text-zinc-600 border border-zinc-800 rounded">
            On demand
          </div>
        </div>

        <div className="text-right min-w-[100px]">
          <p className="text-zinc-100">{stock.price !== null ? `${stock.price.toFixed(2)}p` : '--'}</p>
          <p className="text-zinc-500 text-sm">{stock.uniqueUsers} members</p>
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
          className="p-2 bg-zinc-950 hover:bg-cyan-600 border border-zinc-800 hover:border-cyan-600 rounded transition-colors flex-shrink-0"
          title="Add to Watchlist"
        >
          <Plus className="w-4 h-4 text-zinc-400 hover:text-white" />
        </button>
      </div>

      {isExpanded && (
        <div className="border-t border-zinc-800 px-4 py-3">
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
  const [selectedFilter, setSelectedFilter] = useState<'FTSE100' | 'FTSE250' | 'Global'>('FTSE100');
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

  useEffect(() => {
    let isMounted = true;

    const loadTopMovers = async () => {
      if (isMounted) {
        setLoading(true);
        setError(null);
      }

      try {
        const data = await getTopMovers(selectedFilter);
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
  }, [selectedFilter]);

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
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900 p-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-zinc-400 hover:text-zinc-100 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back to FTSE100</span>
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white text-2xl mb-2">Most Discussed</h1>
            <p className="text-zinc-400">Most discussed supported tickers in the TradeLink community</p>
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2">
            {(['FTSE100', 'FTSE250', 'Global'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedFilter(filter)}
                className={`px-4 py-2 rounded transition-colors ${
                  selectedFilter === filter
                    ? 'bg-cyan-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
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
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-sm text-zinc-500">
            {providerMessage}
          </div>
        )}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            <h2 className="text-zinc-100">Most Discussed</h2>
            <span className="text-zinc-500 text-sm">({discussed.length} tickers)</span>
          </div>
          <div className="space-y-3">
            {loading ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-sm text-zinc-500">
                Loading discussed tickers...
              </div>
            ) : discussed.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-sm text-zinc-500">
                Mention a ticker like #BARC.L or $AAPL to start.
              </div>
            ) : (
              discussed.map((stock) => (
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
