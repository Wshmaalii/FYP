import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Star, Activity } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import type { TradeTicketInput } from './TradeTicketDrawer';
import { fetchHistory, fetchQuote } from '../api/market';

interface MarketDataCardProps {
  ticker: string;
  onOpenTradeTicket?: (ticket: TradeTicketInput) => void;
}

const stockMeta: Record<string, {
  name: string;
  sentiment?: 'Bullish' | 'Bearish' | 'High Volume';
}> = {
  'BARC.L': { name: 'Barclays PLC', sentiment: 'Bullish' },
  'LLOY.L': { name: 'Lloyds Banking Group', sentiment: 'Bearish' },
  'VOD.L': { name: 'Vodafone Group', sentiment: 'High Volume' },
};

const WATCHLIST_STORAGE_KEY = 'tradelink_watchlist';

export function MarketDataCard({ ticker, onOpenTradeTicket }: MarketDataCardProps) {
  const stockInfo = stockMeta[ticker] || { name: ticker };
  const [price, setPrice] = useState(0);
  const [changePercent, setChangePercent] = useState(0);
  const [sparklineData, setSparklineData] = useState<Array<{ value: number }>>([]);
  const [isWatched, setIsWatched] = useState(false);
  const [liveDataError, setLiveDataError] = useState(false);

  const isPositive = changePercent >= 0;

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
        setPrice(Number.isFinite(quote.price) ? quote.price : 0);
        setChangePercent(parsedPercent);
        setSparklineData(
          history.map((point) => ({
            value: point.price,
          })),
        );
        setLiveDataError(false);
      } catch {
        if (!isMounted) {
          return;
        }
        setLiveDataError(true);
      }
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [ticker]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(WATCHLIST_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      setIsWatched(Array.isArray(parsed) && parsed.includes(ticker));
    } catch {
      setIsWatched(false);
    }
  }, [ticker]);

  const updateWatchlist = (nextWatched: boolean) => {
    try {
      const raw = localStorage.getItem(WATCHLIST_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const current = Array.isArray(parsed) ? parsed : [];
      const next = nextWatched ? Array.from(new Set([...current, ticker])) : current.filter((item) => item !== ticker);
      localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Keep UI responsive even if storage is unavailable.
    }
  };

  const handleBuy = () => {
    if (onOpenTradeTicket) {
      onOpenTradeTicket({
        ticker,
        company: stockInfo.name,
        side: 'BUY',
        price,
      });
      return;
    }
    console.log(`BUY ${ticker} @ ${price.toFixed(2)}`);
  };

  const handleSell = () => {
    if (onOpenTradeTicket) {
      onOpenTradeTicket({
        ticker,
        company: stockInfo.name,
        side: 'SELL',
        price,
      });
      return;
    }
    console.log(`SELL ${ticker} @ ${price.toFixed(2)}`);
  };

  const handleWatch = () => {
    const nextWatched = !isWatched;
    setIsWatched(nextWatched);
    updateWatchlist(nextWatched);
  };

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'Bullish':
        return 'bg-emerald-950 text-emerald-400 border-emerald-800';
      case 'Bearish':
        return 'bg-red-950 text-red-400 border-red-800';
      case 'High Volume':
        return 'bg-cyan-950 text-cyan-400 border-cyan-800';
      default:
        return 'bg-zinc-800 text-zinc-400 border-zinc-700';
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 shadow-xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-zinc-100">{ticker}</h4>
            {stockInfo.sentiment && (
              <span className={`text-xs px-2 py-0.5 rounded border ${getSentimentColor(stockInfo.sentiment)}`}>
                {stockInfo.sentiment}
              </span>
            )}
          </div>
          <p className="text-zinc-500 text-sm">{stockInfo.name}</p>
        </div>
        <button className="text-zinc-500 hover:text-cyan-400 transition-colors">
          <Star className="w-4 h-4" />
        </button>
      </div>

      {/* Price & Change */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-zinc-100 text-2xl">{price.toFixed(2)}</span>
            <span className="text-zinc-500 text-sm">GBp</span>
          </div>
          <div className={`flex items-center gap-1 mt-1 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {isPositive ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span className="text-sm">
              {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
            </span>
            <span className="text-xs text-zinc-500">today</span>
          </div>
          {liveDataError && (
            <span className="text-xs text-zinc-500">Live data temporarily unavailable</span>
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
