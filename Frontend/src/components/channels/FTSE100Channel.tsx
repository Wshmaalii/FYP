import { TrendingUp, TrendingDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { fetchHistory, getQuotes, getTopMovers, MARKET_DATA_LIMITED_MESSAGE, MARKET_SYMBOL_NAMES, PRIMARY_MARKET_SYMBOLS, type MarketDataStatus, type MarketOverviewIndex, type StockHistoryPoint, type TopMoverItem } from '../../api/market';
import { ChannelPrivacyCard } from './ChannelPrivacyCard';
import { addWatchlistItem } from '../../api/watchlist';

interface TopMoverView extends TopMoverItem {
  discussionLabel: string;
}

function formatVolume(volume: number | null) {
  if (!volume) {
    return '--';
  }
  if (volume >= 1_000_000_000) return `${(volume / 1_000_000_000).toFixed(1)}B`;
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `${(volume / 1_000).toFixed(1)}K`;
  return `${Math.round(volume)}`;
}

interface FTSE100ChannelProps {
  onSelectStock: (ticker: string) => void;
}

function buildFeaturedIndex(ticker: string, quote: { price: number; change: number; changePercent: number; updatedAt: string }): MarketOverviewIndex {
  return {
    name: MARKET_SYMBOL_NAMES[ticker] || ticker,
    ticker,
    price: quote.price,
    change: quote.change,
    changePercent: quote.changePercent,
    open: null,
    high: null,
    low: null,
    volume: null,
    region: 'US',
    status: 'Tracked',
    history: [],
    available: true,
    sourceSymbol: ticker,
    sourceType: 'direct',
    sourceLabel: 'Stored market snapshot',
  };
}

export function FTSE100Channel({ onSelectStock }: FTSE100ChannelProps) {
  const [featuredIndices, setFeaturedIndices] = useState<MarketOverviewIndex[]>([]);
  const [topMovers, setTopMovers] = useState<TopMoverView[]>([]);
  const [history, setHistory] = useState<StockHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topMoversMessage, setTopMoversMessage] = useState<string | null>(null);
  const [marketDataStatus, setMarketDataStatus] = useState<MarketDataStatus | null>(null);
  const [watchlistMessage, setWatchlistMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadChannelData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [overview, movers] = await Promise.all([
          getQuotes([...PRIMARY_MARKET_SYMBOLS]),
          getTopMovers('Global'),
        ]);

        if (!isMounted) {
          return;
        }

        const nextFeaturedIndices = ['SPY', 'AAPL', 'MSFT']
          .map((ticker) => {
            const quote = overview.quotes[ticker];
            return quote ? buildFeaturedIndex(ticker, quote) : null;
          })
          .filter((index): index is MarketOverviewIndex => index !== null);
        setFeaturedIndices(nextFeaturedIndices);
        setMarketDataStatus(overview.marketDataStatus || null);
        setTopMoversMessage(movers.message);
        setTopMovers(
          movers.items.map((stock) => ({
            ...stock,
            discussionLabel: `${stock.uniqueUsers} members • ${stock.mentionCount} mentions`,
          })),
        );
        if (nextFeaturedIndices[0]?.sourceSymbol) {
          const historyData = await fetchHistory(nextFeaturedIndices[0].sourceSymbol);
          if (isMounted) {
            setHistory(historyData.points);
          }
        } else {
          setHistory([]);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load market data');
          setHistory([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadChannelData();

    return () => {
      isMounted = false;
    };
  }, []);

  const primaryIndex = featuredIndices[0] || null;
  const isPositive = (primaryIndex?.change ?? 0) >= 0;
  const chartValues = history;
  const availableChartPrices = chartValues.map((point) => point.price);
  const minPrice = availableChartPrices.length > 0 ? Math.min(...availableChartPrices) * 0.995 : 0;
  const maxPrice = availableChartPrices.length > 0 ? Math.max(...availableChartPrices) * 1.005 : 1;

  const handleAddToWatchlist = async (ticker: string) => {
    const stock = topMovers.find((item) => item.ticker === ticker);

    try {
      await addWatchlistItem(ticker, stock?.name || MARKET_SYMBOL_NAMES[ticker] || ticker);
      setWatchlistMessage(`${ticker} added to your watchlist.`);
    } catch (err) {
      setWatchlistMessage(err instanceof Error ? err.message : 'Failed to add watchlist item');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-950">
      <div className="border-b border-zinc-800 p-6">
        {loading && featuredIndices.length === 0 ? (
          <div className="text-zinc-400 text-sm">Loading curated market data...</div>
        ) : error ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-zinc-400 text-sm">{MARKET_DATA_LIMITED_MESSAGE}</div>
        ) : primaryIndex && primaryIndex.available ? (
          <div className="flex items-end gap-6">
            <div>
              <h2 className="text-zinc-500 text-sm mb-2">Featured Market Snapshot</h2>
              <div className="flex items-baseline gap-3">
                <span className="text-white text-4xl">{primaryIndex.price?.toFixed(2)}</span>
                <div className={`flex items-center gap-2 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                  <span className="text-xl">{isPositive ? '+' : ''}{(primaryIndex.change ?? 0).toFixed(2)}</span>
                  <span className="text-lg">({isPositive ? '+' : ''}{(primaryIndex.changePercent ?? 0).toFixed(2)}%)</span>
                </div>
              </div>
              <p className="text-zinc-500 text-sm mt-2">{primaryIndex.name} • {primaryIndex.status}</p>
              {primaryIndex.sourceLabel && (
                <p className="text-zinc-500 text-xs mt-1">Source: {primaryIndex.sourceLabel}</p>
              )}
              {marketDataStatus?.isCachedFallback && (
                <p className="text-zinc-500 text-xs mt-1">
                  {marketDataStatus.message || 'Showing most recent available data.'}
                  {marketDataStatus.lastUpdatedAt ? ` Last updated ${new Date(marketDataStatus.lastUpdatedAt).toLocaleString('en-GB')}.` : ''}
                </p>
              )}
            </div>
            <div className="flex gap-6 pb-2">
              <div>
                <p className="text-zinc-500 text-xs">Open</p>
                <p className="text-zinc-100">{primaryIndex.open !== null ? primaryIndex.open.toFixed(2) : '--'}</p>
              </div>
              <div>
                <p className="text-zinc-500 text-xs">High</p>
                <p className="text-zinc-100">{primaryIndex.high !== null ? primaryIndex.high.toFixed(2) : '--'}</p>
              </div>
              <div>
                <p className="text-zinc-500 text-xs">Low</p>
                <p className="text-zinc-100">{primaryIndex.low !== null ? primaryIndex.low.toFixed(2) : '--'}</p>
              </div>
              <div>
                <p className="text-zinc-500 text-xs">Volume</p>
                <p className="text-zinc-100">{formatVolume(primaryIndex.volume)}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-zinc-500 text-sm">
            Curated market data is temporarily unavailable.
          </div>
        )}
      </div>

      <ChannelPrivacyCard
        scopeLabel="Public Channel"
        audienceLabel="Members Visible"
        visibilitySummary="This public market space is visible to signed-in TradeLink members discussing large-cap and widely followed names."
        membershipVisibility="Participation in this channel is visible to other members in the space."
        tickerVisibility="Any explicit ticker mentions shared here are visible to all members in this channel."
        metadataVisibility="Display name, verification badge, timestamps, and explicit ticker mentions are visible in this channel."
      />

      <div className="grid grid-cols-3 gap-6 p-6">
        <div className="col-span-2 bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h3 className="text-zinc-100 mb-4">Selected Stock Detail</h3>
          <div className="h-80">
            {chartValues.length === 0 ? (
              <div className="h-full flex items-center justify-center text-zinc-500 text-sm">
                Price chart will appear once enough stored snapshots have been collected.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartValues}>
                  <XAxis dataKey="time" hide />
                  <YAxis domain={[minPrice, maxPrice]} hide />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: '1px solid #3f3f46',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#a1a1aa' }}
                  />
                  <Line type="monotone" dataKey="price" stroke="#06b6d4" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h3 className="text-zinc-100 mb-4">Tracked Stocks</h3>
          <div className="space-y-3">
            {featuredIndices.length === 0 ? (
              <div className="h-full flex items-center justify-center text-zinc-500 text-sm">
                No stored market snapshots are available yet.
              </div>
            ) : (
              featuredIndices.map((stock) => (
                <button
                  key={stock.ticker}
                  type="button"
                  onClick={() => onSelectStock(stock.ticker)}
                  className="w-full flex items-center justify-between rounded border border-zinc-800 bg-zinc-950 px-4 py-3 text-left hover:border-cyan-600 transition-colors"
                >
                  <div>
                    <p className="text-zinc-100">{stock.ticker}</p>
                    <p className="text-zinc-500 text-sm">{stock.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-zinc-100">{stock.price !== null ? stock.price.toFixed(2) : '--'}</p>
                    <p className={`text-sm ${(stock.change ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {stock.changePercent !== null ? `${(stock.changePercent ?? 0) >= 0 ? '+' : ''}${stock.changePercent.toFixed(2)}%` : 'Unavailable'}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="col-span-3 bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h3 className="text-zinc-100 mb-4">Most Discussed</h3>
          {watchlistMessage && (
            <div className="mb-4 rounded border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-300">
              {watchlistMessage}
            </div>
          )}
          {topMovers.length === 0 ? (
            <div className="text-zinc-500 text-sm">{topMoversMessage || 'Mention a ticker like #SPY or $AAPL to start.'}</div>
          ) : (
            <div className="space-y-3">
              {topMovers.map((stock) => {
                const hasQuote = stock.price !== null && stock.change !== null && stock.changePercent !== null;
                const stockPositive = (stock.change ?? 0) >= 0;

                return (
                  <div
                    key={stock.ticker}
                    className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded hover:border-cyan-600 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded flex items-center justify-center">
                        <span className="text-white text-sm">{stock.ticker.substring(0, 2)}</span>
                      </div>
                      <div>
                        <button
                          type="button"
                          onClick={() => onSelectStock(stock.ticker)}
                          className="text-zinc-100 hover:text-cyan-400 transition-colors"
                        >
                          {stock.ticker}
                        </button>
                        <p className="text-zinc-500 text-sm">{stock.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p className="text-zinc-100">{stock.price !== null ? `${stock.price.toFixed(2)}p` : '--'}</p>
                        <p className="text-zinc-500 text-sm">{stock.discussionLabel}</p>
                      </div>
                      <div className={`flex items-center gap-2 min-w-[120px] justify-end ${hasQuote ? (stockPositive ? 'text-emerald-400' : 'text-red-400') : 'text-zinc-500'}`}>
                        {hasQuote ? (
                          <>
                            {stockPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                            <div className="text-right">
                              <p>{stockPositive ? '+' : ''}{stock.change!.toFixed(2)}</p>
                              <p className="text-sm">{stockPositive ? '+' : ''}{stock.changePercent!.toFixed(2)}%</p>
                            </div>
                          </>
                        ) : (
                          <div className="text-right">
                            <p>On demand</p>
                            <p className="text-sm">No cached quote</p>
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleAddToWatchlist(stock.ticker)}
                        className="rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300 hover:border-cyan-600 hover:text-white transition-colors"
                      >
                        Watch
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
