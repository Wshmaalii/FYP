import { useCallback, useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Star, BarChart3, ChevronRight } from 'lucide-react';
import { View } from '../App';
import { getTopMovers, getQuotes, MARKET_DATA_LIMITED_MESSAGE, MARKET_SYMBOL_NAMES, PRIMARY_MARKET_SYMBOLS, type MarketDataStatus, type TopMoverItem } from '../api/market';
import { WATCHLIST_UPDATED_EVENT, fetchWatchlist } from '../api/watchlist';

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
      className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[18px] border border-transparent px-3.5 py-3 transition-all duration-150 text-left hover:border-zinc-800 hover:bg-zinc-900/90 active:translate-y-px"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold tracking-tight text-zinc-100">{stock.ticker}</span>
          {stock.change !== null && (isPositive ? (
            <TrendingUp className="w-3 h-3 text-emerald-400" />
          ) : (
            <TrendingDown className="w-3 h-3 text-red-400" />
          ))}
        </div>
        <p className="mt-1 truncate text-xs leading-5 text-zinc-500">{stock.name}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium text-zinc-100">{stock.price !== null ? stock.price.toFixed(2) : '--'}</p>
        <p className={`mt-1 text-xs font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
          {stock.changePercent !== null ? `${isPositive ? '+' : ''}${stock.changePercent.toFixed(2)}%` : 'Unavailable'}
        </p>
      </div>
    </button>
  );
}

export function MarketDashboard({ onNavigate, onOpenStock }: MarketDashboardProps) {
  const [marketIndices, setMarketIndices] = useState<Stock[]>([]);
  const [topMovers, setTopMovers] = useState<Stock[]>([]);
  const [watchlist, setWatchlist] = useState<Stock[]>([]);
  const [liveDataError, setLiveDataError] = useState(false);
  const [topMoversMessage, setTopMoversMessage] = useState<string | null>(null);
  const [overviewStatus, setOverviewStatus] = useState<MarketDataStatus | null>(null);
  const [watchlistStatus, setWatchlistStatus] = useState<MarketDataStatus | null>(null);

  const loadDashboardData = useCallback(async (isMountedRef?: { current: boolean }) => {
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

        if (isMountedRef && !isMountedRef.current) {
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
        if (!isMountedRef || isMountedRef.current) {
          setLiveDataError(true);
          setMarketIndices([]);
          setTopMovers([]);
          setTopMoversMessage(null);
        }
      }
    }, []);

  useEffect(() => {
    const mounted = { current: true };
    void loadDashboardData(mounted);

    const handleWatchlistUpdated = () => {
      void loadDashboardData(mounted);
    };
    window.addEventListener(WATCHLIST_UPDATED_EVENT, handleWatchlistUpdated);

    return () => {
      mounted.current = false;
      window.removeEventListener(WATCHLIST_UPDATED_EVENT, handleWatchlistUpdated);
    };
  }, [loadDashboardData]);

  return (
    <div className="flex-1 overflow-y-auto border-t border-zinc-800 bg-zinc-950/90">
      <div className="p-4">
        <button onClick={() => onNavigate('Market Overview')} className="w-full group">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[10px] uppercase tracking-[0.22em] text-zinc-500 transition-colors group-hover:text-cyan-400">Market Snapshot</h3>
            <div className="flex items-center gap-1">
              <span className="text-cyan-400 text-xs">Stored snapshots</span>
              <ChevronRight className="w-3 h-3 text-zinc-600 group-hover:text-cyan-400 transition-colors" />
            </div>
          </div>
        </button>
        {liveDataError && <p className="text-zinc-500 text-xs mb-2">{MARKET_DATA_LIMITED_MESSAGE}</p>}
        {!liveDataError && !overviewStatus?.isCachedFallback && marketIndices.length > 0 && (
          <p className="text-zinc-500 text-xs mb-2">Showing most recent available data for tracked stocks.</p>
        )}
        {!liveDataError && overviewStatus?.isCachedFallback && (
          <p className="text-zinc-500 text-xs mb-2">
            {overviewStatus.message || 'Showing most recent available data.'}
            {overviewStatus.lastUpdatedAt ? ` Last updated ${new Date(overviewStatus.lastUpdatedAt).toLocaleString('en-GB')}.` : ''}
          </p>
        )}
        <div className="rounded-[22px] border border-zinc-800/80 bg-zinc-900/45 p-2">
          {marketIndices.length === 0 && !liveDataError ? (
            <p className="px-2.5 py-2 text-xs text-zinc-500">No stored market snapshots yet.</p>
          ) : (
            marketIndices.map((stock, index) => (
              <div key={stock.ticker} className={index > 0 ? 'border-t border-zinc-800/80 pt-1.5' : ''}>
                <StockItem stock={stock} onOpenStock={onOpenStock} />
              </div>
            ))
          )}
        </div>
      </div>

      <div className="border-t border-zinc-800 p-4">
        <button onClick={() => onNavigate('Top Movers')} className="w-full group">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              <h3 className="text-zinc-500 text-[11px] uppercase tracking-[0.18em] group-hover:text-cyan-400 transition-colors">Most Discussed</h3>
            </div>
            <ChevronRight className="w-3 h-3 text-zinc-600 group-hover:text-cyan-400 transition-colors" />
          </div>
        </button>
        <div className="rounded-[22px] border border-zinc-800/80 bg-zinc-900/45 p-2">
          {topMovers.length === 0 && !liveDataError ? (
            <p className="px-2.5 py-2 text-xs text-zinc-500">{topMoversMessage || 'Loading discussed names...'}</p>
          ) : (
            topMovers.map((stock, index) => (
              <div key={stock.ticker} className={index > 0 ? 'border-t border-zinc-800/80 pt-1.5' : ''}>
                <StockItem stock={stock} onOpenStock={onOpenStock} />
              </div>
            ))
          )}
        </div>
      </div>

      <div className="border-t border-zinc-800 p-4">
        <button onClick={() => onNavigate('Watchlist')} className="w-full group">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-cyan-400" />
              <h3 className="text-zinc-500 text-[11px] uppercase tracking-[0.18em] group-hover:text-cyan-400 transition-colors">Watchlist</h3>
            </div>
            <ChevronRight className="w-3 h-3 text-zinc-600 group-hover:text-cyan-400 transition-colors" />
          </div>
        </button>
        <div className="rounded-[22px] border border-zinc-800/80 bg-zinc-900/45 p-2">
          {watchlistStatus?.isCachedFallback && (
            <p className="text-zinc-500 text-xs mb-2">
              {watchlistStatus.message || 'Showing most recent available data.'}
              {watchlistStatus.lastUpdatedAt ? ` Last updated ${new Date(watchlistStatus.lastUpdatedAt).toLocaleString('en-GB')}.` : ''}
            </p>
          )}
          {watchlist.length === 0 ? (
            <p className="px-2.5 py-2 text-xs text-zinc-500">No watchlist items yet</p>
          ) : (
            watchlist.map((stock, index) => (
              <div key={stock.ticker} className={index > 0 ? 'border-t border-zinc-800/80 pt-1.5' : ''}>
                <StockItem stock={stock} onOpenStock={onOpenStock} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
