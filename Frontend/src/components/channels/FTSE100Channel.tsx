import { TrendingUp, TrendingDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { fetchHistory, getMarketOverview, getTopMovers, MARKET_DATA_LIMITED_MESSAGE, type MarketOverviewIndex, type StockHistoryPoint, type TopMoverItem } from '../../api/market';
import { ChannelPrivacyCard } from './ChannelPrivacyCard';

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

export function FTSE100Channel() {
  const [ftseIndex, setFtseIndex] = useState<MarketOverviewIndex | null>(null);
  const [topMovers, setTopMovers] = useState<TopMoverView[]>([]);
  const [history, setHistory] = useState<StockHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topMoversMessage, setTopMoversMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadChannelData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [overview, movers] = await Promise.all([
          getMarketOverview(),
          getTopMovers('FTSE100'),
        ]);

        if (!isMounted) {
          return;
        }

        const nextFtseIndex = overview.indices.find((index) => index.name === 'FTSE 100') || null;
        setFtseIndex(nextFtseIndex);
        setTopMoversMessage(movers.message);
        setTopMovers(
          movers.items.map((stock) => ({
            ...stock,
            discussionLabel: `${stock.uniqueUsers} members • ${stock.mentionCount} mentions`,
          })),
        );
        if (nextFtseIndex?.sourceSymbol) {
          const historyData = await fetchHistory(nextFtseIndex.sourceSymbol);
          if (isMounted) {
            setHistory(historyData);
          }
        } else {
          setHistory([]);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load FTSE data');
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

  const isPositive = (ftseIndex?.change ?? 0) >= 0;
  const chartValues = history;
  const availableChartPrices = chartValues.map((point) => point.price);
  const minPrice = availableChartPrices.length > 0 ? Math.min(...availableChartPrices) * 0.995 : 0;
  const maxPrice = availableChartPrices.length > 0 ? Math.max(...availableChartPrices) * 1.005 : 1;

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-950">
      <div className="border-b border-zinc-800 p-6">
        {loading && !ftseIndex ? (
          <div className="text-zinc-400 text-sm">Loading FTSE 100 data...</div>
        ) : error ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-zinc-400 text-sm">{MARKET_DATA_LIMITED_MESSAGE}</div>
        ) : ftseIndex && ftseIndex.available ? (
          <div className="flex items-end gap-6">
            <div>
              <h2 className="text-zinc-500 text-sm mb-2">FTSE 100 Index</h2>
              <div className="flex items-baseline gap-3">
                <span className="text-white text-4xl">{ftseIndex.price?.toFixed(2)}</span>
                <div className={`flex items-center gap-2 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                  <span className="text-xl">{isPositive ? '+' : ''}{(ftseIndex.change ?? 0).toFixed(2)}</span>
                  <span className="text-lg">({isPositive ? '+' : ''}{(ftseIndex.changePercent ?? 0).toFixed(2)}%)</span>
                </div>
              </div>
              <p className="text-zinc-500 text-sm mt-2">Status: {ftseIndex.status}</p>
              {ftseIndex.sourceLabel && (
                <p className="text-zinc-500 text-xs mt-1">Source: {ftseIndex.sourceLabel}</p>
              )}
            </div>
            <div className="flex gap-6 pb-2">
              <div>
                <p className="text-zinc-500 text-xs">Open</p>
                <p className="text-zinc-100">{ftseIndex.open !== null ? ftseIndex.open.toFixed(2) : '--'}</p>
              </div>
              <div>
                <p className="text-zinc-500 text-xs">High</p>
                <p className="text-zinc-100">{ftseIndex.high !== null ? ftseIndex.high.toFixed(2) : '--'}</p>
              </div>
              <div>
                <p className="text-zinc-500 text-xs">Low</p>
                <p className="text-zinc-100">{ftseIndex.low !== null ? ftseIndex.low.toFixed(2) : '--'}</p>
              </div>
              <div>
                <p className="text-zinc-500 text-xs">Volume</p>
                <p className="text-zinc-100">{formatVolume(ftseIndex.volume)}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-zinc-500 text-sm">
            FTSE 100 live data is temporarily unavailable.
          </div>
        )}
      </div>

      <ChannelPrivacyCard
        scopeLabel="Public Channel"
        audienceLabel="Members Visible"
        visibilitySummary="FTSE100 is a public community space. Shared market context here is visible to signed-in TradeLink members."
        membershipVisibility="Participation in linked FTSE discussions is visible to other members in the channel."
        tickerVisibility="Any explicit ticker mentions shared in FTSE discussions are visible to all members in that channel."
        metadataVisibility="Display name, verification badge, timestamps, and explicit ticker mentions are visible in FTSE discussions."
      />

      <div className="grid grid-cols-3 gap-6 p-6">
        <div className="col-span-2 bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h3 className="text-zinc-100 mb-4">Intraday Performance</h3>
          <div className="h-80">
            {chartValues.length === 0 ? (
          <div className="h-full flex items-center justify-center text-zinc-500 text-sm">
                Intraday chart is available only when selected ticker history can be loaded in the prototype.
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
          <h3 className="text-zinc-100 mb-4">Sector Heatmap</h3>
          <div className="h-full flex items-center justify-center text-zinc-500 text-sm">
            Live sector heatmap unavailable from the current market data source.
          </div>
        </div>

        <div className="col-span-3 bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h3 className="text-zinc-100 mb-4">Most Discussed</h3>
          {topMovers.length === 0 ? (
            <div className="text-zinc-500 text-sm">{topMoversMessage || 'No discussed names available right now.'}</div>
          ) : (
            <div className="space-y-3">
              {topMovers.map((stock) => {
                const stockPositive = stock.change >= 0;

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
                        <h4 className="text-zinc-100">{stock.ticker}</h4>
                        <p className="text-zinc-500 text-sm">{stock.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p className="text-zinc-100">{stock.price.toFixed(2)}p</p>
                        <p className="text-zinc-500 text-sm">{stock.discussionLabel}</p>
                      </div>
                      <div className={`flex items-center gap-2 min-w-[120px] justify-end ${stockPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                        {stockPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                        <div className="text-right">
                          <p>{stockPositive ? '+' : ''}{stock.change.toFixed(2)}</p>
                          <p className="text-sm">{stockPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%</p>
                        </div>
                      </div>
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
