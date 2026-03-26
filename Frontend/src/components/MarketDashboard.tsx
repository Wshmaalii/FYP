import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Star, BarChart3, ChevronRight } from 'lucide-react';
import { View } from '../App';
import { getTopMovers, getQuotes, MARKET_DATA_LIMITED_MESSAGE, MARKET_SYMBOL_NAMES, PRIMARY_MARKET_SYMBOLS, type MarketDataStatus, type TopMoverItem } from '../api/market';
import { fetchWatchlist } from '../api/watchlist';

interface Stock {
  ticker: string;
  name: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
}

interface MarketDashboardProps {
  onNavigate: (view: View) => void;
  onOpenStock: (ticker: string) => void;
}

function StockItem({ stock, onOpenStock }: { stock: Stock; onOpenStock: (ticker: string) => void }) {
  const isPositive = (stock.change ?? 0) >= 0;

  return (
    <button
      type="button"
      onClick={() => onOpenStock(stock.ticker)}
      className="w-full flex items-center justify-between py-2 px-3 hover:bg-zinc-900 rounded transition-colors cursor-pointer text-left"
    >
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
    </button>
  );
}

export function MarketDashboard({ onNavigate, onOpenStock }: MarketDashboardProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [marketIndices, setMarketIndices] = useState<Stock[]>([]);
  const [topMovers, setTopMovers] = useState<Stock[]>([]);
  const [watchlist, setWatchlist] = useState<Stock[]>([]);
  const [liveDataError, setLiveDataError] = useState(false);
  const [topMoversMessage, setTopMoversMessage] = useState<string | null>(null);
  const [overviewStatus, setOverviewStatus] = useState<MarketDataStatus | null>(null);
  const [watchlistStatus, setWatchlistStatus] = useState<MarketDataStatus | null>(null);

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
        const [overviewQuotes, movers, watchlistItems] = await Promise.all([
          getQuotes([...PRIMARY_MARKET_SYMBOLS]),
          getTopMovers('Global'),
          fetchWatchlist().catch(() => []),
        ]);

        const watchlistStocks: Stock[] = watchlistItems.slice(0, 3).map((item) => ({
          ticker: item.ticker,
          name: item.company_name || item.ticker,
          price: null,
          change: null,
          changePercent: null,
        }));

        const quoteResponse = watchlistStocks.length > 0 ? await getQuotes(watchlistStocks.map((item) => item.ticker)) : { quotes: {} };
        const quotes = quoteResponse.quotes;

        if (!isMounted) {
          return;
        }

        setMarketIndices(
          [...PRIMARY_MARKET_SYMBOLS]
            .map((ticker) => {
              const quote = overviewQuotes.quotes[ticker];
              if (!quote) {
                return null;
              }
              return {
                ticker,
                name: MARKET_SYMBOL_NAMES[ticker] || ticker,
                price: quote.price,
                change: quote.change,
                changePercent: quote.changePercent,
              };
            })
            .filter((stock): stock is Stock => stock !== null)
            .slice(0, 3),
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
        setOverviewStatus(overviewQuotes.marketDataStatus || null);
        setWatchlistStatus(quoteResponse.marketDataStatus || null);

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
        {!liveDataError && overviewStatus?.isCachedFallback && (
          <p className="text-zinc-500 text-xs mb-2">
            {overviewStatus.message || 'Showing most recent available data.'}
            {overviewStatus.lastUpdatedAt ? ` Last updated ${new Date(overviewStatus.lastUpdatedAt).toLocaleString('en-GB')}.` : ''}
          </p>
        )}
        <div className="space-y-1">
          {marketIndices.length === 0 && !liveDataError ? (
            <p className="text-zinc-500 text-xs">No stored market snapshots yet.</p>
          ) : (
            marketIndices.map((stock) => <StockItem key={stock.ticker} stock={stock} onOpenStock={onOpenStock} />)
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
            topMovers.map((stock) => <StockItem key={stock.ticker} stock={stock} onOpenStock={onOpenStock} />)
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
          {watchlistStatus?.isCachedFallback && (
            <p className="text-zinc-500 text-xs mb-2">
              {watchlistStatus.message || 'Showing most recent available data.'}
              {watchlistStatus.lastUpdatedAt ? ` Last updated ${new Date(watchlistStatus.lastUpdatedAt).toLocaleString('en-GB')}.` : ''}
            </p>
          )}
          {watchlist.length === 0 ? (
            <p className="text-zinc-500 text-xs">No watchlist items yet</p>
          ) : (
            watchlist.map((stock) => <StockItem key={stock.ticker} stock={stock} onOpenStock={onOpenStock} />)
          )}
        </div>
      </div>
    </div>
  );
}
