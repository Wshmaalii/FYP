import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ChevronRight, Star } from 'lucide-react';
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

function StockItem({
  stock,
  onOpenStock,
  showDivider = true,
}: {
  stock: Stock;
  onOpenStock: (ticker: string) => void;
  showDivider?: boolean;
}) {
  const isPositive = (stock.change ?? 0) >= 0;

  return (
    <button
      type="button"
      onClick={() => onOpenStock(stock.ticker)}
      className="flex w-full min-w-0 max-w-full items-start justify-between gap-2 rounded-md px-0 py-1.5 text-left transition-all duration-150 active:translate-y-px"
      style={{
        borderBottom: showDivider ? '0.5px solid var(--border-faint)' : 'none',
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.background = 'var(--bg-hover)';
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.background = 'transparent';
      }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold" style={{ color: 'var(--text-secondary)' }}>{stock.ticker}</span>
        </div>
        <p className="mt-0.5 truncate text-[10px]" style={{ color: 'var(--text-faint)' }}>{stock.name}</p>
      </div>
      <div className="flex min-w-[3.5rem] flex-col items-end text-right">
        <p className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>
          {stock.price !== null ? stock.price.toFixed(2) : '--'}
        </p>
        <p
          className="mt-0.5 text-[10px]"
          style={{ color: isPositive ? 'var(--color-green)' : 'var(--color-red)' }}
        >
          {stock.changePercent !== null ? `${isPositive ? '+' : ''}${stock.changePercent.toFixed(2)}%` : 'Unavailable'}
        </p>
      </div>
    </button>
  );
}

function SectionHeader({
  title,
  onClick,
  trailing,
  icon,
}: {
  title: string;
  onClick: () => void;
  trailing?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-1.5 flex w-full min-w-0 max-w-full items-baseline justify-between gap-2 overflow-hidden text-left transition-colors duration-150"
      style={{ color: 'var(--text-label)' }}
      onMouseEnter={(event) => {
        event.currentTarget.style.color = 'var(--text-muted)';
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.color = 'var(--text-label)';
      }}
    >
      <div className="flex min-w-0 items-baseline gap-1.5">
        {icon}
        <span className="truncate text-[10px] font-semibold uppercase tracking-[1px]">{title}</span>
      </div>
      <div className="flex min-w-0 flex-1 items-baseline justify-end gap-0.5 overflow-hidden">
        {trailing}
        <ChevronRight className="h-3 w-3" />
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
    <div className="mt-auto min-w-0 max-w-full overflow-hidden px-2.5 py-2">
      <div className="pb-2">
        <SectionHeader
          title="Snapshot"
          onClick={() => onNavigate('Market Overview')}
          trailing={<span className="truncate text-[10px]" style={{ color: 'var(--accent-teal)' }}>Stored snapshots</span>}
        />
        {liveDataError ? (
          <p className="mb-2 max-w-full break-words text-[10px] leading-4" style={{ color: 'var(--text-faint)' }}>{MARKET_DATA_LIMITED_MESSAGE}</p>
        ) : !overviewStatus?.isCachedFallback && marketIndices.length > 0 ? (
          <p className="mb-2 max-w-full break-words text-[10px] leading-4" style={{ color: 'var(--text-faint)' }}>
            Showing most recent available data.
          </p>
        ) : overviewStatus?.isCachedFallback ? (
          <p className="mb-2 max-w-full break-words text-[10px] leading-4" style={{ color: 'var(--text-faint)', overflowWrap: 'anywhere' }}>
            {overviewStatus.message || 'Showing most recent available data.'}
            {overviewStatus.lastUpdatedAt ? ` Last updated ${new Date(overviewStatus.lastUpdatedAt).toLocaleString('en-GB')}.` : ''}
          </p>
        ) : null}
        <div className="space-y-0">
          {marketIndices.length === 0 && !liveDataError ? (
            <p className="max-w-full break-words py-1.5 text-[10px]" style={{ color: 'var(--text-faint)' }}>No stored market snapshots yet.</p>
          ) : (
            marketIndices.map((stock, index) => (
              <StockItem
                key={stock.ticker}
                stock={stock}
                onOpenStock={onOpenStock}
                showDivider={index < marketIndices.length - 1}
              />
            ))
          )}
        </div>
      </div>

      <div className="border-t pt-2" style={{ borderColor: 'var(--border-subtle)' }}>
        <SectionHeader
          title="Most Discussed"
          onClick={() => onNavigate('Top Movers')}
        />
        <div className="space-y-0">
          {topMovers.length === 0 ? (
            <p className="max-w-full break-words py-1.5 text-[10px] leading-4" style={{ color: 'var(--text-faint)' }}>
              {topMoversMessage || 'Mention a ticker like #SPY or $AAPL to start.'}
            </p>
          ) : (
            topMovers.map((stock, index) => (
              <StockItem
                key={stock.ticker}
                stock={stock}
                onOpenStock={onOpenStock}
                showDivider={index < topMovers.length - 1}
              />
            ))
          )}
        </div>
      </div>

      <div className="border-t pt-2" style={{ borderColor: 'var(--border-subtle)' }}>
        <SectionHeader
          title="Watchlist"
          onClick={() => onNavigate('Watchlist')}
          icon={<Star className="h-3.5 w-3.5" style={{ color: 'var(--accent-teal)' }} />}
        />
        {watchlistStatus?.isCachedFallback ? (
          <p className="mb-2 max-w-full break-words text-[10px] leading-4" style={{ color: 'var(--text-faint)', overflowWrap: 'anywhere' }}>
            {watchlistStatus.message || 'Showing most recent available data.'}
            {watchlistStatus.lastUpdatedAt ? ` Last updated ${new Date(watchlistStatus.lastUpdatedAt).toLocaleString('en-GB')}.` : ''}
          </p>
        ) : null}
        <div className="space-y-0">
          {watchlist.length === 0 ? (
            <p className="max-w-full break-words py-1.5 text-[10px] leading-4" style={{ color: 'var(--text-faint)' }}>No watchlist items yet.</p>
          ) : (
            watchlist.map((stock, index) => (
              <StockItem
                key={stock.ticker}
                stock={stock}
                onOpenStock={onOpenStock}
                showDivider={index < watchlist.length - 1}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
