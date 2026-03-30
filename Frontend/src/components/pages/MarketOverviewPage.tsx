import { ArrowLeft, TrendingUp, TrendingDown, Globe } from 'lucide-react';
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
      className="w-full rounded-[18px] border border-zinc-800/80 bg-[#111518] p-3.5 text-left transition-colors duration-150 hover:border-zinc-700 hover:bg-[#14181b]"
    >
      <div className="mb-3.5 flex items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <h3 className="text-[15px] font-medium tracking-tight text-zinc-100">{index.name}</h3>
            <span className={`rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] ${
              index.status === 'Open'
                ? 'border-emerald-800 bg-emerald-950/60 text-emerald-400'
                : index.status === 'Unavailable'
                  ? 'border-zinc-700 bg-zinc-900 text-zinc-500'
                  : 'border-zinc-700 bg-zinc-900 text-zinc-400'
            }`}>
              {index.status}
            </span>
          </div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">{index.ticker}</p>
          {index.sourceLabel && <p className="mt-1.5 text-[10px] leading-4.5 text-zinc-600">Source: {index.sourceLabel}</p>}
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-zinc-700 bg-zinc-950/80">
          <Globe className="h-3.5 w-3.5 text-[#8fb7b2]" />
        </div>
      </div>

      {index.available ? (
        <>
          <div className="mb-3 rounded-[14px] border border-zinc-800/80 bg-zinc-950/70 px-3.5 py-3">
            <div className="mb-1.5 flex items-baseline gap-2">
              <span className="text-[24px] font-semibold tracking-tight text-white">{index.price?.toFixed(2)}</span>
              <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">USD</span>
            </div>
            <div className={`flex items-center gap-1.5 text-[12px] ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
              {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              <span className="font-medium">{isPositive ? '+' : ''}{(index.change ?? 0).toFixed(2)}</span>
              <span>({isPositive ? '+' : ''}{(index.changePercent ?? 0).toFixed(2)}%)</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-sm">
            <div className="rounded-[14px] border border-zinc-800/70 bg-zinc-950/55 px-3 py-2.5">
              <p className="text-[9px] uppercase tracking-[0.16em] text-zinc-500">Open</p>
              <p className="mt-1.5 text-[12px] font-medium text-zinc-100">{index.open !== null ? index.open.toFixed(2) : '--'}</p>
            </div>
            <div className="rounded-[14px] border border-zinc-800/70 bg-zinc-950/55 px-3 py-2.5">
              <p className="text-[9px] uppercase tracking-[0.16em] text-zinc-500">Volume</p>
              <p className="mt-1.5 text-[12px] font-medium text-zinc-100">{formatVolume(index.volume)}</p>
            </div>
            <div className="rounded-[14px] border border-zinc-800/70 bg-zinc-950/55 px-3 py-2.5">
              <p className="text-[9px] uppercase tracking-[0.16em] text-zinc-500">High</p>
              <p className="mt-1.5 text-[12px] font-medium text-emerald-400">{index.high !== null ? index.high.toFixed(2) : '--'}</p>
            </div>
            <div className="rounded-[14px] border border-zinc-800/70 bg-zinc-950/55 px-3 py-2.5">
              <p className="text-[9px] uppercase tracking-[0.16em] text-zinc-500">Low</p>
              <p className="mt-1.5 text-[12px] font-medium text-red-400">{index.low !== null ? index.low.toFixed(2) : '--'}</p>
            </div>
          </div>
          {index.history.length === 0 && (
            <p className="mt-3 text-[10px] leading-4.5 text-zinc-500">Chart history is not available for this snapshot yet.</p>
          )}
        </>
      ) : (
        <div className="rounded-[14px] border border-zinc-800 bg-zinc-950/60 px-3.5 py-4 text-[12px] leading-5 text-zinc-500">Live market data is not available for this item in the prototype right now.</div>
      )}
    </button>
  );
}

export function MarketOverviewPage({ onBack, onSelectStock }: MarketOverviewPageProps) {
  const [selectedFilter, setSelectedFilter] = useState<MarketFilter>('All');
  const [indices, setIndices] = useState<MarketOverviewIndex[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marketDataStatus, setMarketDataStatus] = useState<MarketDataStatus | null>(null);

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
    <div className="flex-1 overflow-y-auto bg-[#0b0f10]">
      <div className="mx-auto max-w-[1120px] px-4 py-5 lg:px-6 lg:py-6">
        <button
          onClick={onBack}
          className="mb-4 flex items-center gap-2 text-[12px] text-zinc-400 transition-colors hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </button>

        <div className="rounded-[20px] border border-zinc-800/80 bg-[#101417] px-4 py-4 lg:px-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-[9px] uppercase tracking-[0.28em] text-zinc-500">Market Snapshot</p>
              <h1 className="mt-1.5 text-[24px] font-semibold tracking-tight text-white">Market Overview</h1>
              <p className="mt-1.5 text-[12px] leading-5 text-zinc-400">Snapshot-based market data for tracked stocks.</p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px] text-zinc-400">
                <span className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-400" />
                  {openMarkets} Available
                </span>
                <span className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-zinc-600" />
                  {closedMarkets} Unavailable
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 rounded-[16px] border border-zinc-800 bg-zinc-950/85 p-1">
              {(['All', 'Big Tech', 'AI', 'Consumer / Media', 'Finance', 'High Volatility'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
                    selectedFilter === filter
                      ? 'bg-[#131f1f] text-[#d4ece8]'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5 py-5">
          {error && <div className="rounded-[16px] border border-zinc-800 bg-[#111518] p-3.5 text-[12px] text-zinc-400">{error}</div>}
          {!error && marketDataStatus?.isCachedFallback && (
            <div className="rounded-[16px] border border-zinc-800 bg-[#111518] px-4 py-3 text-[12px] text-zinc-400">
              {marketDataStatus.message || 'Showing most recent available data.'}
              {marketDataStatus.lastUpdatedAt ? ` Last updated ${new Date(marketDataStatus.lastUpdatedAt).toLocaleString('en-GB')}.` : ''}
            </div>
          )}
          {!error && !marketDataStatus?.isCachedFallback && indices.length > 0 && (
            <div className="rounded-[16px] border border-zinc-800 bg-[#111518] px-4 py-3 text-[12px] text-zinc-400">
              Showing most recent available data for selected tracked stocks.
            </div>
          )}

          <div>
            <h2 className="mb-3 text-[16px] font-semibold tracking-tight text-zinc-100">Curated Market Snapshot</h2>
            {loading && indices.length === 0 ? (
              <div className="rounded-[16px] border border-zinc-800 bg-[#111518] p-5 text-[12px] text-zinc-500">Loading stored market snapshots...</div>
            ) : filteredIndices.length === 0 ? (
              <div className="rounded-[16px] border border-zinc-800 bg-[#111518] p-5 text-[12px] text-zinc-500">No stored market snapshots are available for this filter yet.</div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {filteredIndices.map((index) => (
                  <IndexCard key={index.ticker} index={index} onSelectStock={onSelectStock} />
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="mb-3 text-[16px] font-semibold tracking-tight text-zinc-100">Snapshot Notes</h2>
            <div className="rounded-[16px] border border-zinc-800 bg-[#111518] p-5">
              <div className="text-zinc-500 text-[12px]">Market data is stored and refreshed manually for selected tracked stocks. Prices remain visible until a newer snapshot replaces them.</div>
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-[16px] font-semibold tracking-tight text-zinc-100">Market Summary</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[16px] border border-zinc-800 bg-[#111518] px-4 py-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Markets Advancing</p>
                <p className="mt-2 text-[28px] font-semibold tracking-tight text-emerald-400">{availableIndices.filter((index) => (index.change ?? 0) > 0).length}</p>
              </div>
              <div className="rounded-[16px] border border-zinc-800 bg-[#111518] px-4 py-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Markets Declining</p>
                <p className="mt-2 text-[28px] font-semibold tracking-tight text-red-400">{availableIndices.filter((index) => (index.change ?? 0) < 0).length}</p>
              </div>
              <div className="rounded-[16px] border border-zinc-800 bg-[#111518] px-4 py-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Stored Snapshots</p>
                <p className="mt-2 text-[28px] font-semibold tracking-tight text-[#8fb7b2]">{availableIndices.length}</p>
              </div>
              <div className="rounded-[16px] border border-zinc-800 bg-[#111518] px-4 py-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Unavailable</p>
                <p className="mt-2 text-[28px] font-semibold tracking-tight text-zinc-300">{indices.filter((index) => !index.available).length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
