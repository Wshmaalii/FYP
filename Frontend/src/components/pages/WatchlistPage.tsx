import { useEffect, useState } from 'react';
import { ArrowLeft, Bell, Star, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { getQuotes } from '../../api/market';
import { fetchWatchlist, removeWatchlistItem, type WatchlistItem } from '../../api/watchlist';

interface WatchlistPageProps {
  onBack: () => void;
}

interface WatchlistStock extends WatchlistItem {
  price: number | null;
  change: number;
  changePercent: number;
}

function WatchlistRow({
  stock,
  onRemove,
}: {
  stock: WatchlistStock;
  onRemove: (ticker: string) => void;
}) {
  const isPositive = stock.changePercent >= 0;

  return (
    <div className="flex items-center gap-4 p-4 bg-zinc-900 border border-zinc-800 rounded hover:border-cyan-600 transition-colors">
      <Star className="w-5 h-5 text-amber-400 fill-amber-400 flex-shrink-0" />

      <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded flex items-center justify-center flex-shrink-0">
        <span className="text-white text-sm">{stock.ticker.substring(0, 2)}</span>
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="text-zinc-100">{stock.ticker}</h3>
        <p className="text-zinc-500 text-sm truncate">{stock.company_name || 'Saved watchlist item'}</p>
      </div>

      <div className="w-24 h-12">
        <div className="w-full h-full flex items-center justify-center text-[11px] text-zinc-600 border border-zinc-800 rounded">
          On demand
        </div>
      </div>

      <div className="text-right min-w-[100px]">
        <p className="text-zinc-100">{stock.price !== null ? `${stock.price.toFixed(2)}p` : '--'}</p>
        <p className="text-zinc-500 text-sm">Saved item</p>
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
          className="p-2 bg-zinc-950 hover:bg-cyan-600 border border-zinc-800 hover:border-cyan-600 rounded transition-colors"
          title="Set Alert"
        >
          <Bell className="w-4 h-4 text-zinc-400" />
        </button>
        <button
          onClick={() => onRemove(stock.ticker)}
          className="p-2 bg-zinc-950 hover:bg-red-600 border border-zinc-800 hover:border-red-600 rounded transition-colors"
          title="Remove from Watchlist"
        >
          <Trash2 className="w-4 h-4 text-zinc-400" />
        </button>
      </div>
    </div>
  );
}

export function WatchlistPage({ onBack }: WatchlistPageProps) {
  const [stocks, setStocks] = useState<WatchlistStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadWatchlist = async () => {
      setLoading(true);
      setError(null);

      try {
        const items = await fetchWatchlist();
        const quotes = items.length > 0 ? await getQuotes(items.map((item) => item.ticker)) : {};

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

    return () => {
      isMounted = false;
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
      <div className="border-b border-zinc-800 bg-zinc-900 p-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-zinc-400 hover:text-zinc-100 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back to Dashboard</span>
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-white text-2xl mb-2">My Watchlist</h1>
            <p className="text-zinc-400">Track your saved stocks and market movements</p>
          </div>

          <div className="flex gap-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 min-w-[120px]">
              <p className="text-zinc-500 text-xs mb-1">Total Stocks</p>
              <p className="text-white text-2xl">{stocks.length}</p>
            </div>
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 min-w-[120px]">
              <p className="text-zinc-500 text-xs mb-1">Gainers</p>
              <p className="text-emerald-400 text-2xl">{totalGain}</p>
            </div>
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 min-w-[120px]">
              <p className="text-zinc-500 text-xs mb-1">Losers</p>
              <p className="text-red-400 text-2xl">{totalLoss}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-zinc-100">Portfolio View</h2>
          <div className="flex items-center gap-2 text-zinc-500 text-sm">
            <span>Real-time updates</span>
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          </div>
        </div>

        {error && <div className="mb-4 bg-red-950 border border-red-900 rounded-lg p-4 text-red-400 text-sm">{error}</div>}

        {loading ? (
          <div className="flex items-center justify-center py-12 bg-zinc-900 border border-zinc-800 rounded-lg">
            <div className="text-zinc-400 text-sm">Loading watchlist...</div>
          </div>
        ) : stocks.length === 0 ? (
          <div className="flex items-center justify-center py-12 bg-zinc-900 border border-zinc-800 rounded-lg">
            <div className="text-center">
              <Star className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <h3 className="text-zinc-100 mb-2">No watchlist items yet</h3>
              <p className="text-zinc-500 text-sm">Add stocks from Top Movers to start tracking them.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {stocks.map((stock) => (
              <WatchlistRow key={stock.ticker} stock={stock} onRemove={handleRemove} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
