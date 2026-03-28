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
      className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3 text-left transition-colors hover:bg-[rgba(255,255,255,0.02)]"
    >
      <div className="min-w-0">
        <p className="text-[12px] font-semibold text-[rgba(255,255,255,0.9)]">{stock.ticker}</p>
        <p className="mt-0.5 truncate text-[10px] leading-4 text-[rgba(255,255,255,0.45)]">{stock.name}</p>
      </div>
      <div className="text-right">
        <p className="text-[12px] font-medium text-[rgba(255,255,255,0.9)]">{stock.price !== null ? stock.price.toFixed(2) : '--'}</p>
        <p className={`mt-0.5 text-[12px] font-medium ${isPositive ? 'text-[#2dd4aa]' : 'text-[#f26b6b]'}`}>
          {stock.changePercent !== null ? `${isPositive ? '+' : ''}${stock.changePercent.toFixed(2)}%` : 'Unavailable'}
        </p>
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
    <div className="bg-[#111113]">
      <div className="pb-2">
        <button onClick={() => onNavigate('Market Overview')} className="mb-3 flex w-full items-center justify-between">
          <h3 className="text-[10px] font-medium uppercase tracking-[1.2px] text-[rgba(255,255,255,0.28)]">Snapshot</h3>
        </button>
        {liveDataError && <p className="mb-3 text-[10px] leading-4 text-[rgba(255,255,255,0.28)]">{MARKET_DATA_LIMITED_MESSAGE}</p>}
        {!liveDataError && overviewStatus?.lastUpdatedAt && (
          <p className="mb-3 text-[10px] leading-4 text-[rgba(255,255,255,0.28)]">
            Last updated {new Date(overviewStatus.lastUpdatedAt).toLocaleString('en-GB')}.
          </p>
        )}
        <div className="divide-y divide-[rgba(255,255,255,0.07)]">
          {marketIndices.length === 0 && !liveDataError ? (
            <p className="py-3 text-[10px] text-[rgba(255,255,255,0.28)]">No stored market snapshots yet.</p>
          ) : (
            marketIndices.map((stock) => (
              <div key={stock.ticker}>
                <StockItem stock={stock} onOpenStock={onOpenStock} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
