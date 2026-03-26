import { ArrowLeft, TrendingUp, TrendingDown, Clock, Globe } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getQuotes, MARKET_DATA_LIMITED_MESSAGE, MARKET_SYMBOL_NAMES, PRIMARY_MARKET_SYMBOLS, SUPPORTED_MARKET_SYMBOLS, type MarketDataStatus, type MarketOverviewIndex } from '../../api/market';

interface MarketOverviewPageProps {
  onBack: () => void;
  onSelectStock: (ticker: string) => void;
}

type MarketFilter = 'All' | 'Big Tech' | 'AI' | 'Consumer / Media' | 'Finance' | 'High Volatility';

const MARKET_FILTER_SYMBOLS: Record<Exclude<MarketFilter, 'All'>, string[]> = {
  'Big Tech': ['AAPL', 'MSFT', 'AMZN', 'META', 'GOOGL'],
  'AI': ['NVDA', 'AMD', 'PLTR', 'MSFT'],
  'Consumer / Media': ['NFLX', 'DIS', 'AMZN', 'UBER'],
  'Finance': ['JPM', 'V', 'MA', 'COIN'],
  'High Volatility': ['TSLA', 'COIN', 'PLTR', 'AMD', 'NVDA', 'UBER'],
};

function buildSnapshotCard(ticker: string, quote: { price: number; change: number; changePercent: number; updatedAt: string }): MarketOverviewIndex {
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

function formatVolume(volume: number | null) {
  if (!volume) {
    return '--';
  }
  if (volume >= 1_000_000_000) return `${(volume / 1_000_000_000).toFixed(1)}B`;
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `${(volume / 1_000).toFixed(1)}K`;
  return `${Math.round(volume)}`;
}

function IndexCard({ index, onSelectStock }: { index: MarketOverviewIndex; onSelectStock: (ticker: string) => void }) {
  const isPositive = (index.change ?? 0) >= 0;

  return (
    <button
      type="button"
      onClick={() => onSelectStock(index.ticker)}
      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-cyan-600 transition-colors text-left"
    >
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
        <Globe className="w-4 h-4 text-cyan-400" />
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
          {index.history.length === 0 && (
            <p className="text-zinc-500 text-xs mt-3">Chart history is not available for this snapshot yet.</p>
          )}
        </>
      ) : (
        <div className="text-zinc-500 text-sm">Live market data is not available for this item in the prototype right now.</div>
      )}
    </button>
  );
}

export function MarketOverviewPage({ onBack, onSelectStock }: MarketOverviewPageProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedFilter, setSelectedFilter] = useState<MarketFilter>('All');
  const [indices, setIndices] = useState<MarketOverviewIndex[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sectorsAvailable, setSectorsAvailable] = useState(false);
  const [marketDataStatus, setMarketDataStatus] = useState<MarketDataStatus | null>(null);

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
        const data = await getQuotes([...SUPPORTED_MARKET_SYMBOLS]);
        if (isMounted) {
          const orderedPrimary = PRIMARY_MARKET_SYMBOLS
            .map((ticker) => {
              const quote = data.quotes[ticker];
              return quote ? buildSnapshotCard(ticker, quote) : null;
            })
            .filter((index): index is MarketOverviewIndex => index !== null);

          const remainingSupported = SUPPORTED_MARKET_SYMBOLS
            .filter((ticker) => !PRIMARY_MARKET_SYMBOLS.includes(ticker as typeof PRIMARY_MARKET_SYMBOLS[number]))
            .map((ticker) => {
              const quote = data.quotes[ticker];
              return quote ? buildSnapshotCard(ticker, quote) : null;
            })
            .filter((index): index is MarketOverviewIndex => index !== null);

          setIndices([...orderedPrimary, ...remainingSupported]);
          setSectorsAvailable(false);
          setMarketDataStatus(data.marketDataStatus || null);
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

  const filteredIndices = selectedFilter === 'All'
    ? indices.filter((index) => PRIMARY_MARKET_SYMBOLS.includes(index.ticker as typeof PRIMARY_MARKET_SYMBOLS[number]))
    : indices.filter((index) => MARKET_FILTER_SYMBOLS[selectedFilter].includes(index.ticker));

  const openMarkets = indices.filter((index) => index.available).length;
  const closedMarkets = indices.filter((index) => !index.available).length;
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
                  {openMarkets} Available
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-zinc-600 rounded-full" />
                  {closedMarkets} Unavailable
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {(['All', 'Big Tech', 'AI', 'Consumer / Media', 'Finance', 'High Volatility'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedFilter(filter)}
                className={`px-4 py-2 rounded transition-colors ${
                  selectedFilter === filter
                    ? 'bg-cyan-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {error && <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-zinc-400 text-sm">{error}</div>}
        {!error && marketDataStatus?.isCachedFallback && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-zinc-400 text-sm">
            {marketDataStatus.message || 'Showing most recent available data.'}
            {marketDataStatus.lastUpdatedAt ? ` Last updated ${new Date(marketDataStatus.lastUpdatedAt).toLocaleString('en-GB')}.` : ''}
          </div>
        )}

        <div>
          <h2 className="text-zinc-100 mb-4">Curated Market Snapshot</h2>
          {loading && indices.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-zinc-500 text-sm">Loading stored market snapshots...</div>
          ) : filteredIndices.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-zinc-500 text-sm">No stored market snapshots are available for this filter yet.</div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {filteredIndices.map((index) => (
                <IndexCard key={index.ticker} index={index} onSelectStock={onSelectStock} />
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-zinc-100 mb-4">Sector Performance Heatmap</h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <div className="text-zinc-500 text-sm">Market data is available for selected tracked stocks.</div>
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
