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
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 shadow-xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-zinc-100">{ticker}</h4>
          </div>
          <p className="text-zinc-500 text-sm">{companyName}</p>
        </div>
        <button className="text-zinc-500 hover:text-cyan-400 transition-colors">
          <Star className="w-4 h-4" />
        </button>
      </div>

      {/* Price & Change */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-zinc-100 text-2xl">{price !== null ? price.toFixed(2) : '--'}</span>
            <span className="text-zinc-500 text-sm">GBp</span>
          </div>
          <div className={`flex items-center gap-1 mt-1 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
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
            <span className="text-xs text-zinc-500">{MARKET_DATA_LIMITED_MESSAGE}</span>
          )}
          {!liveDataError && marketDataStatus?.isCachedFallback && (
            <span className="text-xs text-zinc-500">
              {marketDataStatus.message || 'Showing most recent available data.'}
              {marketDataStatus.lastUpdatedAt ? ` Last updated ${new Date(marketDataStatus.lastUpdatedAt).toLocaleString('en-GB')}.` : ''}
            </span>
          )}
          {watchError && (
            <span className="text-xs text-red-400">{watchError}</span>
          )}
        </div>

        {/* Sparkline */}
        <div className="w-24 h-12">
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

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={handleBuy}
          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors text-sm"
        >
          Buy
        </button>
        <button
          onClick={handleSell}
          className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors text-sm"
        >
          Sell
        </button>
        <button
          onClick={handleWatch}
          className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-colors text-sm flex items-center justify-center gap-1"
        >
          <Activity className="w-3 h-3" />
          {isWatched ? 'Watching' : 'Watch'}
        </button>
      </div>
    </div>
  );
}
