import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Star, Activity } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import type { TradeTicketInput } from './TradeTicketDrawer';
import { fetchHistory, fetchQuote, MARKET_DATA_LIMITED_MESSAGE, MARKET_SYMBOL_NAMES, type MarketDataStatus } from '../api/market';
import { addWatchlistItem, fetchWatchlist, removeWatchlistItem } from '../api/watchlist';

interface MarketDataCardProps {
  ticker: string;
  onOpenTradeTicket?: (ticket: TradeTicketInput) => void;
}

export function MarketDataCard({ ticker, onOpenTradeTicket }: MarketDataCardProps) {
  const [companyName, setCompanyName] = useState(MARKET_SYMBOL_NAMES[ticker] || ticker);
  const [price, setPrice] = useState<number | null>(null);
  const [changeValue, setChangeValue] = useState<number | null>(null);
  const [changePercent, setChangePercent] = useState<number | null>(null);
  const [sparklineData, setSparklineData] = useState<Array<{ value: number }>>([]);
  const [isWatched, setIsWatched] = useState(false);
  const [liveDataError, setLiveDataError] = useState(false);
  const [marketDataStatus, setMarketDataStatus] = useState<MarketDataStatus | null>(null);
  const [watchError, setWatchError] = useState<string | null>(null);

  const isPositive = (changeValue ?? changePercent ?? 0) >= 0;
  const sentimentLabel = isPositive ? 'BULLISH' : 'BEARISH';
  const currencyUnit = ticker.includes('.') ? 'GBp' : 'USD';
  const changePillText = changeValue !== null && changePercent !== null
    ? `${changeValue >= 0 ? '+' : ''}${changeValue.toFixed(2)} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)`
    : 'Unavailable';

  useEffect(() => {
    setCompanyName(MARKET_SYMBOL_NAMES[ticker] || ticker);
  }, [ticker]);

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
        setChangeValue(typeof quote.change === 'number' && Number.isFinite(quote.change) ? quote.change : null);
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
        setChangeValue(null);
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
    <div
      style={{
        background: 'rgba(255,255,255,0.035)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '18px',
        padding: '20px',
        transition: 'border-color 150ms ease',
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '18px',
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '8px',
              flexWrap: 'wrap',
            }}
          >
            <h4
              style={{
                margin: 0,
                color: 'var(--text-primary)',
                fontSize: '28px',
                fontWeight: 700,
                letterSpacing: '-0.03em',
                lineHeight: 1,
              }}
            >
              {ticker}
            </h4>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                borderRadius: '999px',
                padding: '6px 10px',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: isPositive ? 'var(--accent-teal)' : '#f87171',
                background: isPositive ? 'rgba(45,212,170,0.12)' : 'rgba(248,113,113,0.12)',
                border: `1px solid ${isPositive ? 'rgba(45,212,170,0.22)' : 'rgba(248,113,113,0.22)'}`,
              }}
            >
              {sentimentLabel}
            </span>
          </div>
          <p
            style={{
              margin: 0,
              color: 'var(--text-muted)',
              fontSize: '14px',
              lineHeight: 1.45,
            }}
          >
            {companyName}
          </p>
        </div>
        <button
          style={{
            color: 'var(--text-label)',
            padding: '4px',
            margin: '-4px',
            borderRadius: '10px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <Star className="w-4 h-4" />
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '18px',
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '8px',
            }}
          >
            <span
              style={{
                color: 'var(--text-primary)',
                fontSize: '42px',
                fontWeight: 700,
                letterSpacing: '-0.04em',
                lineHeight: 1,
              }}
            >
              {price !== null ? price.toFixed(2) : '--'}
            </span>
            <span
              style={{
                color: 'var(--text-label)',
                fontSize: '16px',
                fontWeight: 500,
              }}
            >
              {currencyUnit}
            </span>
          </div>
          <div style={{ marginTop: '14px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                borderRadius: '999px',
                padding: '8px 12px',
                fontSize: '13px',
                fontWeight: 600,
                color: isPositive ? '#2dd4aa' : '#f87171',
                background: isPositive ? 'rgba(45,212,170,0.12)' : 'rgba(248,113,113,0.12)',
                border: `1px solid ${isPositive ? 'rgba(45,212,170,0.18)' : 'rgba(248,113,113,0.18)'}`,
              }}
            >
              {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {changePillText}
            </span>
          </div>
          {liveDataError && (
            <p style={{ margin: '12px 0 0', color: 'var(--text-label)', fontSize: '12px', lineHeight: 1.5 }}>{MARKET_DATA_LIMITED_MESSAGE}</p>
          )}
          {!liveDataError && marketDataStatus?.isCachedFallback && (
            <p style={{ margin: '12px 0 0', color: 'var(--text-label)', fontSize: '12px', lineHeight: 1.5 }}>
              {marketDataStatus.message || 'Showing most recent available data.'}
              {marketDataStatus.lastUpdatedAt ? ` Last updated ${new Date(marketDataStatus.lastUpdatedAt).toLocaleString('en-GB')}.` : ''}
            </p>
          )}
          {watchError && (
            <p style={{ margin: '12px 0 0', color: '#f87171', fontSize: '12px', lineHeight: 1.5 }}>{watchError}</p>
          )}
        </div>

        <div style={{ width: '136px', height: '72px', flexShrink: 0 }}>
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

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: '12px',
        }}
      >
        <button
          onClick={handleBuy}
          style={{
            padding: '10px 12px',
            background: '#059669',
            color: '#ffffff',
            borderRadius: '14px',
            border: 'none',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Buy
        </button>
        <button
          onClick={handleSell}
          style={{
            padding: '10px 12px',
            background: '#dc2626',
            color: '#ffffff',
            borderRadius: '14px',
            border: 'none',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Sell
        </button>
        <button
          onClick={handleWatch}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '10px 12px',
            background: 'rgba(255,255,255,0.05)',
            color: 'var(--text-secondary)',
            borderRadius: '14px',
            border: '1px solid rgba(255,255,255,0.07)',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Activity className="w-3 h-3" />
          {isWatched ? 'Watching' : 'Watch'}
        </button>
      </div>
    </div>
  );
}
