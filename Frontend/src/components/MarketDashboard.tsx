import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Star, BarChart3, ChevronRight } from 'lucide-react';
import { View } from '../App';
import { getMarketOverview, getTopMovers, MARKET_DATA_LIMITED_MESSAGE, type MarketOverviewIndex, type TopMoverItem } from '../api/market';
import { fetchWatchlist } from '../api/watchlist';
import { getQuotes } from '../api/market';

interface Stock {
  ticker: string;
  name: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
}

interface MarketDashboardProps {
  onNavigate: (view: View) => void;
}

function StockItem({ stock }: { stock: Stock }) {
  const isPositive = (stock.change ?? 0) >= 0;

  return (
    <div className="flex items-center justify-between py-2 px-3 hover:bg-zinc-900 rounded transition-colors cursor-pointer">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-zinc-100 text-sm">{stock.ticker}</span>
          {stock.change !== null && (isPositive ? (
            <TrendingUp className="w-3 h-3 text-emerald-400" />
          ) : (
            <TrendingDown className="w-3 h-3 text-red-400" />
          ))}
        </div>
        <p className="text-zinc-500 text-xs truncate">{stock.name}</p>
      </div>
      <div className="text-right">
        <p className="text-zinc-100 text-sm">{stock.price !== null ? stock.price.toFixed(2) : '--'}</p>
        <p className={`text-xs ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
          {stock.changePercent !== null ? `${isPositive ? '+' : ''}${stock.changePercent.toFixed(2)}%` : 'Unavailable'}
        </p>
      </div>
    </div>
  );
}

export function MarketDashboard({ onNavigate }: MarketDashboardProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [marketIndices, setMarketIndices] = useState<Stock[]>([]);
  const [topMovers, setTopMovers] = useState<Stock[]>([]);
  const [watchlist, setWatchlist] = useState<Stock[]>([]);
  const [liveDataError, setLiveDataError] = useState(false);
  const [topMoversMessage, setTopMoversMessage] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadDashboardData = async () => {
      try {
        const [overview, movers, watchlistItems] = await Promise.all([
          getMarketOverview(),
          getTopMovers('FTSE100'),
          fetchWatchlist().catch(() => []),
        ]);

        const watchlistStocks: Stock[] = watchlistItems.slice(0, 3).map((item) => ({
          ticker: item.ticker,
          name: item.company_name || item.ticker,
          price: null,
          change: null,
          changePercent: null,
        }));

        const quotes = watchlistStocks.length > 0 ? await getQuotes(watchlistStocks.map((item) => item.ticker)) : {};

        if (!isMounted) {
          return;
        }

        setMarketIndices(
          overview.indices
            .filter((index) => ['FTSE 100', 'S&P 500'].includes(index.name))
            .map((index: MarketOverviewIndex) => ({
              ticker: index.ticker,
              name: index.sourceType === 'proxy_etf' ? `${index.name} (proxy)` : index.name,
              price: index.price,
              change: index.change,
              changePercent: index.changePercent,
            })),
        );

        const combinedMovers = movers.items
          .slice(0, 3)
          .map((stock: TopMoverItem) => ({
            ticker: stock.ticker,
            name: stock.name,
            price: stock.price,
            change: stock.change,
            changePercent: stock.changePercent,
          }));
        setTopMovers(combinedMovers);
        setTopMoversMessage(movers.message);

        setWatchlist(
          watchlistStocks.map((stock) => ({
            ...stock,
            price: quotes[stock.ticker]?.price ?? null,
            change: quotes[stock.ticker]?.change ?? null,
            changePercent: quotes[stock.ticker]?.changePercent ?? null,
          })),
        );

        setLiveDataError(false);
      } catch {
        if (isMounted) {
          setLiveDataError(true);
          setMarketIndices([]);
          setTopMovers([]);
          setTopMoversMessage(null);
        }
      }
    };

    void loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4">
        <button onClick={() => onNavigate('Market Overview')} className="w-full group">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-zinc-400 text-xs uppercase tracking-wider group-hover:text-cyan-400 transition-colors">Market Overview</h3>
            <div className="flex items-center gap-1">
              <span className="text-cyan-400 text-xs">{currentTime.toLocaleTimeString('en-GB')}</span>
              <ChevronRight className="w-3 h-3 text-zinc-600 group-hover:text-cyan-400 transition-colors" />
            </div>
          </div>
        </button>
        {liveDataError && <p className="text-zinc-500 text-xs mb-2">{MARKET_DATA_LIMITED_MESSAGE}</p>}
        <div className="space-y-1">
          {marketIndices.length === 0 && !liveDataError ? (
            <p className="text-zinc-500 text-xs">Loading market overview...</p>
          ) : (
            marketIndices.map((stock) => <StockItem key={stock.ticker} stock={stock} />)
          )}
        </div>
      </div>

      <div className="p-4 border-t border-zinc-800">
        <button onClick={() => onNavigate('Top Movers')} className="w-full group">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              <h3 className="text-zinc-400 text-xs uppercase tracking-wider group-hover:text-cyan-400 transition-colors">Most Discussed</h3>
            </div>
            <ChevronRight className="w-3 h-3 text-zinc-600 group-hover:text-cyan-400 transition-colors" />
          </div>
        </button>
        <div className="space-y-1">
          {topMovers.length === 0 && !liveDataError ? (
            <p className="text-zinc-500 text-xs">{topMoversMessage || 'Loading discussed names...'}</p>
          ) : (
            topMovers.map((stock) => <StockItem key={stock.ticker} stock={stock} />)
          )}
        </div>
      </div>

      <div className="p-4 border-t border-zinc-800">
        <button onClick={() => onNavigate('Watchlist')} className="w-full group">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-cyan-400" />
              <h3 className="text-zinc-400 text-xs uppercase tracking-wider group-hover:text-cyan-400 transition-colors">Watchlist</h3>
            </div>
            <ChevronRight className="w-3 h-3 text-zinc-600 group-hover:text-cyan-400 transition-colors" />
          </div>
        </button>
        <div className="space-y-1">
          {watchlist.length === 0 ? (
            <p className="text-zinc-500 text-xs">No watchlist items yet</p>
          ) : (
            watchlist.map((stock) => <StockItem key={stock.ticker} stock={stock} />)
          )}
        </div>
      </div>
    </div>
  );
}
