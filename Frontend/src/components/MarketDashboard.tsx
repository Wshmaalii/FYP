import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Star, BarChart3, ChevronRight } from 'lucide-react';
import { View } from '../App';
import { getQuotes, MarketQuote } from '../api/market';
import { fetchWatchlist } from '../api/watchlist';

interface Stock {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

interface MarketDashboardProps {
  onNavigate: (view: View) => void;
}

const marketIndices: Stock[] = [
  { ticker: 'FTSE 100', name: 'FTSE 100', price: 7523.45, change: 45.23, changePercent: 0.61 },
  { ticker: 'DAX', name: 'DAX', price: 16834.32, change: -23.12, changePercent: -0.14 },
  { ticker: 'CAC 40', name: 'CAC 40', price: 7456.89, change: 12.45, changePercent: 0.17 },
];

const topMovers: Stock[] = [
  { ticker: 'BARC.L', name: 'Barclays', price: 186.5, change: 4.3, changePercent: 2.36 },
  { ticker: 'LLOY.L', name: 'Lloyds', price: 52.8, change: -1.2, changePercent: -2.22 },
  { ticker: 'BP.L', name: 'BP PLC', price: 445.6, change: 8.9, changePercent: 2.04 },
];

function StockItem({ stock }: { stock: Stock }) {
  const isPositive = stock.change >= 0;
  
  return (
    <div className="flex items-center justify-between py-2 px-3 hover:bg-zinc-900 rounded transition-colors cursor-pointer">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-zinc-100 text-sm">{stock.ticker}</span>
          {isPositive ? (
            <TrendingUp className="w-3 h-3 text-emerald-400" />
          ) : (
            <TrendingDown className="w-3 h-3 text-red-400" />
          )}
        </div>
        <p className="text-zinc-500 text-xs truncate">{stock.name}</p>
      </div>
      <div className="text-right">
        <p className="text-zinc-100 text-sm">{stock.price.toFixed(2)}</p>
        <p className={`text-xs ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
          {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%
        </p>
      </div>
    </div>
  );
}

export function MarketDashboard({ onNavigate }: MarketDashboardProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [liveQuotes, setLiveQuotes] = useState<Record<string, MarketQuote>>({});
  const [liveDataError, setLiveDataError] = useState(false);
  const [watchlist, setWatchlist] = useState<Stock[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadQuotes = async () => {
      try {
        const watchlistItems = await fetchWatchlist().catch(() => []);
        const watchlistStocks: Stock[] = watchlistItems.slice(0, 3).map((item) => ({
          ticker: item.ticker,
          name: item.company_name || item.ticker,
          price: 0,
          change: 0,
          changePercent: 0,
        }));
        const sidebarTickers = [
          ...marketIndices.map((stock) => stock.ticker),
          ...topMovers.map((stock) => stock.ticker),
          ...watchlistStocks.map((stock) => stock.ticker),
        ];
        const quotes = await getQuotes(sidebarTickers);
        if (isMounted) {
          setWatchlist(
            watchlistStocks.map((stock) => ({
              ...stock,
              price: quotes[stock.ticker]?.price ?? 0,
              change: quotes[stock.ticker]?.change ?? 0,
              changePercent: quotes[stock.ticker]?.changePercent ?? 0,
            })),
          );
          setLiveQuotes(quotes);
          setLiveDataError(false);
        }
      } catch {
        if (isMounted) {
          setLiveDataError(true);
        }
      }
    };

    void loadQuotes();
    const interval = setInterval(() => {
      void loadQuotes();
    }, 15000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const withLiveQuote = (stock: Stock): Stock => {
    const quote = liveQuotes[stock.ticker];
    if (!quote) {
      return stock;
    }

    return {
      ...stock,
      price: quote.price,
      change: quote.change,
      changePercent: quote.changePercent,
    };
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Live Market Prices */}
      <div className="p-4">
        <button
          onClick={() => onNavigate('Market Overview')}
          className="w-full group"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-zinc-400 text-xs uppercase tracking-wider group-hover:text-cyan-400 transition-colors">Market Overview</h3>
            <div className="flex items-center gap-1">
              <span className="text-cyan-400 text-xs">{currentTime.toLocaleTimeString('en-GB')}</span>
              <ChevronRight className="w-3 h-3 text-zinc-600 group-hover:text-cyan-400 transition-colors" />
            </div>
          </div>
        </button>
        {liveDataError && (
          <p className="text-zinc-500 text-xs mb-2">Live data temporarily unavailable</p>
        )}
        <div className="space-y-1">
          {marketIndices.map((stock) => (
            <StockItem key={stock.ticker} stock={withLiveQuote(stock)} />
          ))}
        </div>
      </div>

      {/* Top Movers */}
      <div className="p-4 border-t border-zinc-800">
        <button
          onClick={() => onNavigate('Top Movers')}
          className="w-full group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              <h3 className="text-zinc-400 text-xs uppercase tracking-wider group-hover:text-cyan-400 transition-colors">Top Movers</h3>
            </div>
            <ChevronRight className="w-3 h-3 text-zinc-600 group-hover:text-cyan-400 transition-colors" />
          </div>
        </button>
        <div className="space-y-1">
          {topMovers.map((stock) => (
            <StockItem key={stock.ticker} stock={withLiveQuote(stock)} />
          ))}
        </div>
      </div>

      {/* Watchlist */}
      <div className="p-4 border-t border-zinc-800">
        <button
          onClick={() => onNavigate('Watchlist')}
          className="w-full group"
        >
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
            watchlist.map((stock) => (
              <StockItem key={stock.ticker} stock={withLiveQuote(stock)} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
