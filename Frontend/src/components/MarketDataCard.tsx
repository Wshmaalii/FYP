import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Star, Activity } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import type { TradeTicketInput } from './TradeTicketDrawer';
import { fetchHistory, fetchQuote, MARKET_DATA_LIMITED_MESSAGE, type MarketDataStatus } from '../api/market';
import { addWatchlistItem, fetchWatchlist, removeWatchlistItem } from '../api/watchlist';

interface MarketDataCardProps {
  ticker: string;
  onOpenTradeTicket?: (ticket: TradeTicketInput) => void;
}

export function MarketDataCard({ ticker, onOpenTradeTicket }: MarketDataCardProps) {
  const [companyName, setCompanyName] = useState(ticker);
  const [price, setPrice] = useState<number | null>(null);
  const [changePercent, setChangePercent] = useState<number | null>(null);
  const [sparklineData, setSparklineData] = useState<Array<{ value: number }>>([]);
  const [isWatched, setIsWatched] = useState(false);
  const [liveDataError, setLiveDataError] = useState(false);
  const [marketDataStatus, setMarketDataStatus] = useState<MarketDataStatus | null>(null);
  const [watchError, setWatchError] = useState<string | null>(null);

  const isPositive = (changePercent ?? 0) >= 0;

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const [quote, history] = await Promise.all([
          fetchQuote(ticker),
          fetchHistory(ticker),
        ]);

        if (!isMounted) {
          return;
        }

        const parsedPercent = Number.parseFloat((quote.change_percent || '0').replace('%', '')) || 0;
        setPrice(Number.isFinite(quote.price) ? quote.price : null);
        setChangePercent(parsedPercent);
        setSparklineData(
          history.points.map((point) => ({
            value: point.price,
          })),
        );
        setMarketDataStatus(quote.marketDataStatus || history.marketDataStatus || null);
        setLiveDataError(false);
      } catch {
        if (!isMounted) {
          return;
        }
        setPrice(null);
        setChangePercent(null);
        setSparklineData([]);
        setMarketDataStatus(null);
        setLiveDataError(true);
      }
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [ticker]);

  useEffect(() => {
    let isMounted = true;

    const loadWatchlistState = async () => {
      try {
        const items = await fetchWatchlist();
        if (!isMounted) {
          return;
        }
        const existingItem = items.find((item) => item.ticker === ticker);
        setIsWatched(Boolean(existingItem));
        if (existingItem?.company_name) {
          setCompanyName(existingItem.company_name);
        }
      } catch {
        if (isMounted) {
          setIsWatched(false);
        }
      }
    };

    void loadWatchlistState();

    return () => {
      isMounted = false;
    };
  }, [ticker]);

  const handleBuy = () => {
    if (onOpenTradeTicket) {
      onOpenTradeTicket({
        ticker,
        company: companyName,
        side: 'BUY',
        price: price ?? 0,
      });
      return;
    }
  };

  const handleSell = () => {
    if (onOpenTradeTicket) {
      onOpenTradeTicket({
        ticker,
        company: companyName,
        side: 'SELL',
        price: price ?? 0,
      });
      return;
    }
  };

  const handleWatch = async () => {
    setWatchError(null);

    try {
      if (isWatched) {
        await removeWatchlistItem(ticker);
        setIsWatched(false);
      } else {
        await addWatchlistItem(ticker, companyName);
        setIsWatched(true);
      }
    } catch (err) {
      setWatchError(err instanceof Error ? err.message : 'Failed to update watchlist');
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 transition-all duration-200 ease-out hover:border-zinc-700 hover:shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <h4 className="text-zinc-100 text-base font-semibold tracking-tight">{ticker}</h4>
          </div>
          <p className="text-zinc-500 text-sm leading-5">{companyName}</p>
        </div>
        <button className="text-zinc-500 hover:text-cyan-400 transition-colors duration-150 p-1 -m-1 rounded-lg">
          <Star className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-end justify-between gap-4 mb-5">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-zinc-100 text-3xl font-semibold tracking-tight">{price !== null ? price.toFixed(2) : '--'}</span>
            <span className="text-zinc-500 text-sm">USD</span>
          </div>
          <div className={`flex items-center gap-1.5 mt-2 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {isPositive ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span className="text-sm">
              {changePercent !== null ? `${isPositive ? '+' : ''}${changePercent.toFixed(2)}%` : 'Unavailable'}
            </span>
            <span className="text-xs text-zinc-500">today</span>
          </div>
          {liveDataError && (
            <p className="text-xs text-zinc-500 mt-3 leading-5">{MARKET_DATA_LIMITED_MESSAGE}</p>
          )}
          {!liveDataError && marketDataStatus?.isCachedFallback && (
            <p className="text-xs text-zinc-500 mt-3 leading-5">
              {marketDataStatus.message || 'Showing most recent available data.'}
              {marketDataStatus.lastUpdatedAt ? ` Last updated ${new Date(marketDataStatus.lastUpdatedAt).toLocaleString('en-GB')}.` : ''}
            </p>
          )}
          {watchError && (
            <p className="text-xs text-red-400 mt-3 leading-5">{watchError}</p>
          )}
        </div>

        <div className="w-28 h-14">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparklineData}>
              <Line
                type="monotone"
                dataKey="value"
                stroke={isPositive ? '#34d399' : '#f87171'}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={handleBuy}
          className="px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:translate-y-px text-white rounded-xl transition-all duration-150 text-sm font-medium"
        >
          Buy
        </button>
        <button
          onClick={handleSell}
          className="px-3 py-2.5 bg-red-600 hover:bg-red-700 active:translate-y-px text-white rounded-xl transition-all duration-150 text-sm font-medium"
        >
          Sell
        </button>
        <button
          onClick={handleWatch}
          className="px-3 py-2.5 bg-zinc-800 hover:bg-zinc-700 active:translate-y-px text-zinc-300 rounded-xl transition-all duration-150 text-sm flex items-center justify-center gap-1.5 font-medium"
        >
          <Activity className="w-3 h-3" />
          {isWatched ? 'Watching' : 'Watch'}
        </button>
      </div>
    </div>
  );
}
