import { ArrowLeft, TrendingUp, TrendingDown, Clock, Globe } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getMarketOverview, MARKET_DATA_LIMITED_MESSAGE, type MarketOverviewIndex } from '../../api/market';

interface MarketOverviewPageProps {
  onBack: () => void;
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

function IndexCard({ index }: { index: MarketOverviewIndex }) {
  const isPositive = (index.change ?? 0) >= 0;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-cyan-600 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-zinc-100">{index.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded ${
              index.status === 'Open'
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                : index.status === 'Unavailable'
                  ? 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
            }`}>
              {index.status}
            </span>
          </div>
          <p className="text-zinc-500 text-sm">{index.ticker}</p>
          {index.sourceLabel && <p className="text-zinc-600 text-xs mt-1">Source: {index.sourceLabel}</p>}
        </div>
        <Globe className={`w-4 h-4 ${
          index.region === 'Europe' ? 'text-blue-400' :
          index.region === 'US' ? 'text-cyan-400' :
          'text-orange-400'
        }`} />
      </div>

      {index.available ? (
        <>
          <div className="mb-3">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-white text-2xl">{index.price?.toFixed(2)}</span>
              <div className={`flex items-center gap-1 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span>{isPositive ? '+' : ''}{(index.change ?? 0).toFixed(2)}</span>
                <span className="text-sm">({isPositive ? '+' : ''}{(index.changePercent ?? 0).toFixed(2)}%)</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-zinc-500 text-xs">Open</p>
              <p className="text-zinc-100">{index.open !== null ? index.open.toFixed(2) : '--'}</p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs">Volume</p>
              <p className="text-zinc-100">{formatVolume(index.volume)}</p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs">High</p>
              <p className="text-emerald-400">{index.high !== null ? index.high.toFixed(2) : '--'}</p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs">Low</p>
              <p className="text-red-400">{index.low !== null ? index.low.toFixed(2) : '--'}</p>
            </div>
          </div>
        </>
      ) : (
        <div className="text-zinc-500 text-sm">Live market data is not available for this item in the prototype right now.</div>
      )}
    </div>
  );
}

export function MarketOverviewPage({ onBack }: MarketOverviewPageProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedRegion, setSelectedRegion] = useState<'All' | 'Europe' | 'US' | 'Asia'>('All');
  const [indices, setIndices] = useState<MarketOverviewIndex[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sectorsAvailable, setSectorsAvailable] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadOverview = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await getMarketOverview();
        if (isMounted) {
          setIndices(data.indices);
          setSectorsAvailable(data.sectors_available);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : MARKET_DATA_LIMITED_MESSAGE);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadOverview();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredIndices = selectedRegion === 'All'
    ? indices
    : indices.filter((index) => index.region === selectedRegion);

  const openMarkets = indices.filter((index) => index.status === 'Open').length;
  const closedMarkets = indices.filter((index) => index.status !== 'Open').length;
  const availableIndices = indices.filter((index) => index.available);

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-950">
      <div className="border-b border-zinc-800 bg-zinc-900 p-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-zinc-400 hover:text-zinc-100 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back to Dashboard</span>
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-white text-2xl mb-2">Market Overview</h1>
            <div className="flex items-center gap-4 text-zinc-400">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span className="text-sm">{currentTime.toLocaleString('en-GB')}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                  {openMarkets} Open
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-zinc-600 rounded-full" />
                  {closedMarkets} Closed / Unavailable
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {(['All', 'Europe', 'US', 'Asia'] as const).map((region) => (
              <button
                key={region}
                onClick={() => setSelectedRegion(region)}
                className={`px-4 py-2 rounded transition-colors ${
                  selectedRegion === region
                    ? 'bg-cyan-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                {region}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {error && <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-zinc-400 text-sm">{error}</div>}

        <div>
          <h2 className="text-zinc-100 mb-4">Curated Market Snapshot</h2>
          {loading && indices.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-zinc-500 text-sm">Loading market overview...</div>
          ) : filteredIndices.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-zinc-500 text-sm">No tracked market items are available for this filter.</div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {filteredIndices.map((index) => (
                <IndexCard key={index.ticker} index={index} />
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-zinc-100 mb-4">Sector Performance Heatmap</h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            {sectorsAvailable ? (
              <div className="text-zinc-500 text-sm">Sector data loaded.</div>
            ) : (
              <div className="text-zinc-500 text-sm">{MARKET_DATA_LIMITED_MESSAGE}</div>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-zinc-100 mb-4">Market Summary</h2>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <p className="text-zinc-500 text-sm mb-2">Markets Advancing</p>
              <p className="text-emerald-400 text-2xl">{availableIndices.filter((index) => (index.change ?? 0) > 0).length}</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <p className="text-zinc-500 text-sm mb-2">Markets Declining</p>
              <p className="text-red-400 text-2xl">{availableIndices.filter((index) => (index.change ?? 0) < 0).length}</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <p className="text-zinc-500 text-sm mb-2">Live Indices</p>
              <p className="text-cyan-400 text-2xl">{availableIndices.length}</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <p className="text-zinc-500 text-sm mb-2">Unavailable</p>
              <p className="text-zinc-300 text-2xl">{indices.filter((index) => !index.available).length}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
