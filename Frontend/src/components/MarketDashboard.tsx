import { useCallback, useEffect, useState } from 'react';
import { View } from '../App';
import { getQuotes, MARKET_DATA_LIMITED_MESSAGE, MARKET_SYMBOL_NAMES, PRIMARY_MARKET_SYMBOLS, type MarketDataStatus } from '../api/market';

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
      className="flex w-full items-center justify-between rounded-md py-1.5 text-left transition-all"
      style={{ borderBottom: '0.5px solid var(--border-faint)' }}
    >
      <div className="min-w-0 flex-1">
        <div className="text-[12px] font-semibold" style={{ color: 'var(--text-secondary)' }}>{stock.ticker}</div>
        <div className="mt-px truncate text-[10px]" style={{ color: 'var(--text-faint)' }}>{stock.name}</div>
      </div>
      <div className="text-right">
        <div className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>{stock.price !== null ? stock.price.toFixed(2) : '--'}</div>
        <div className={`mt-px text-[10px] ${isPositive ? 'text-[#2dd4aa]' : 'text-[#f26b6b]'}`}>
          {stock.changePercent !== null ? `${isPositive ? '+' : ''}${stock.changePercent.toFixed(2)}%` : 'Unavailable'}
        </div>
      </div>
    </button>
  );
}

export function MarketDashboard({ onNavigate, onOpenStock }: MarketDashboardProps) {
  const [marketIndices, setMarketIndices] = useState<Stock[]>([]);
  const [liveDataError, setLiveDataError] = useState(false);
  const [overviewStatus, setOverviewStatus] = useState<MarketDataStatus | null>(null);

  const loadDashboardData = useCallback(async (isMountedRef?: { current: boolean }) => {
      try {
        const overviewQuotes = await getQuotes([...PRIMARY_MARKET_SYMBOLS]);

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

        setOverviewStatus(overviewQuotes.marketDataStatus || null);
        setLiveDataError(false);
      } catch {
        if (!isMountedRef || isMountedRef.current) {
          setLiveDataError(true);
          setMarketIndices([]);
        }
      }
    }, []);

  useEffect(() => {
    const mounted = { current: true };
    void loadDashboardData(mounted);

    return () => {
      mounted.current = false;
    };
  }, [loadDashboardData]);

  return (
    <div className="mt-auto px-3.5 py-3" style={{ borderTop: '0.5px solid var(--border-subtle)' }}>
      <div className="mb-2">
        <button
          type="button"
          onClick={() => onNavigate('Market Overview')}
          className="cursor-pointer text-[10px] font-semibold uppercase tracking-[1px] transition-colors"
          style={{ color: 'var(--text-label)' }}
        >
          Snapshot
        </button>
      </div>
      {liveDataError && <p className="pb-2 text-[10px] leading-4" style={{ color: 'var(--text-faint)' }}>{MARKET_DATA_LIMITED_MESSAGE}</p>}
      {!liveDataError && overviewStatus?.isCachedFallback && (
        <p className="pb-2 text-[10px] leading-4" style={{ color: 'var(--text-faint)' }}>
          {overviewStatus.message || 'Showing most recent available data.'}
        </p>
      )}
      <div className="space-y-0">
        {marketIndices.length === 0 && !liveDataError ? (
          <p className="py-2 text-[10px]" style={{ color: 'var(--text-faint)' }}>No stored market snapshots yet.</p>
        ) : (
          marketIndices.map((stock, index) => (
            <div key={stock.ticker} className={index === marketIndices.length - 1 ? '[&>button]:border-b-0' : ''}>
              <StockItem stock={stock} onOpenStock={onOpenStock} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
