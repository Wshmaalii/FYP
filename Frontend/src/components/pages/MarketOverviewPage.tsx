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
      className="w-full rounded-[28px] border border-zinc-800 bg-[linear-gradient(180deg,rgba(24,27,35,0.96),rgba(17,20,27,0.98))] p-5 text-left shadow-[0_18px_38px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.03)] transition-all duration-150 hover:border-zinc-700 hover:bg-[linear-gradient(180deg,rgba(26,29,38,0.98),rgba(18,21,29,1))]"
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2.5">
            <h3 className="text-lg font-semibold tracking-tight text-zinc-100">{index.name}</h3>
            <span className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] ${
              index.status === 'Open'
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                : index.status === 'Unavailable'
                  ? 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
            }`}>
              {index.status}
            </span>
          </div>
          <p className="text-sm font-medium text-zinc-500">{index.ticker}</p>
          {index.sourceLabel && <p className="mt-2 text-xs leading-5 text-zinc-600">Source: {index.sourceLabel}</p>}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-950/90">
          <Globe className="h-4 w-4 text-cyan-400" />
        </div>
      </div>

      {index.available ? (
        <>
          <div className="mb-5 rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-4">
            <div className="mb-2 flex items-baseline gap-2">
              <span className="text-3xl font-semibold tracking-tight text-white">{index.price?.toFixed(2)}</span>
              <span className="text-sm text-zinc-500">USD</span>
            </div>
            <div className={`flex items-center gap-1.5 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span className="text-base font-medium">{isPositive ? '+' : ''}{(index.change ?? 0).toFixed(2)}</span>
                <span className="text-sm">({isPositive ? '+' : ''}{(index.changePercent ?? 0).toFixed(2)}%)</span>
              </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-zinc-950/65 px-3.5 py-3">
              <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Open</p>
              <p className="mt-2 text-base font-medium text-zinc-100">{index.open !== null ? index.open.toFixed(2) : '--'}</p>
            </div>
            <div className="rounded-2xl bg-zinc-950/65 px-3.5 py-3">
              <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Volume</p>
              <p className="mt-2 text-base font-medium text-zinc-100">{formatVolume(index.volume)}</p>
            </div>
            <div className="rounded-2xl bg-zinc-950/65 px-3.5 py-3">
              <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">High</p>
              <p className="mt-2 text-base font-medium text-emerald-400">{index.high !== null ? index.high.toFixed(2) : '--'}</p>
            </div>
            <div className="rounded-2xl bg-zinc-950/65 px-3.5 py-3">
              <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Low</p>
              <p className="mt-2 text-base font-medium text-red-400">{index.low !== null ? index.low.toFixed(2) : '--'}</p>
            </div>
          </div>
          {index.history.length === 0 && (
            <p className="mt-4 text-xs leading-5 text-zinc-500">Chart history is not available for this snapshot yet.</p>
          )}
        </>
      ) : (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-5 text-sm leading-6 text-zinc-500">Live market data is not available for this item in the prototype right now.</div>
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
    <div className="flex-1 overflow-y-auto bg-zinc-950">
      <div className="border-b border-zinc-800 bg-zinc-900 px-8 py-7">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-zinc-400 hover:text-zinc-100 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back to Dashboard</span>
        </button>

        <div className="flex items-start justify-between gap-8">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-semibold tracking-tight text-white">Market Overview</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-400">Snapshot-based market data for tracked stocks</p>
            <div className="mt-5 flex flex-wrap items-center gap-5 text-zinc-400">
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

          <div className="inline-flex rounded-full border border-zinc-800 bg-zinc-950 p-1.5 gap-1">
            {(['All', 'Big Tech', 'AI', 'Consumer / Media', 'Finance', 'High Volatility'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedFilter(filter)}
                className={`rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${
                  selectedFilter === filter
                    ? 'bg-cyan-600 text-white shadow-[0_10px_24px_rgba(8,145,178,0.18)]'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-8 px-8 py-8">
        {error && <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-400">{error}</div>}
        {!error && marketDataStatus?.isCachedFallback && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-4 text-sm text-zinc-400">
            {marketDataStatus.message || 'Showing most recent available data.'}
            {marketDataStatus.lastUpdatedAt ? ` Last updated ${new Date(marketDataStatus.lastUpdatedAt).toLocaleString('en-GB')}.` : ''}
          </div>
        )}
        {!error && !marketDataStatus?.isCachedFallback && indices.length > 0 && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-4 text-sm text-zinc-400">
            Showing most recent available data for selected tracked stocks.
          </div>
        )}

        <div>
          <h2 className="mb-5 text-lg font-semibold tracking-tight text-zinc-100">Curated Market Snapshot</h2>
          {loading && indices.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-sm text-zinc-500">Loading stored market snapshots...</div>
          ) : filteredIndices.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-sm text-zinc-500">No stored market snapshots are available for this filter yet.</div>
          ) : (
            <div className="grid grid-cols-3 gap-5">
              {filteredIndices.map((index) => (
                <IndexCard key={index.ticker} index={index} onSelectStock={onSelectStock} />
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-4 text-lg font-semibold tracking-tight text-zinc-100">Snapshot Notes</h2>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="text-zinc-500 text-sm">Market data is stored and refreshed manually for selected tracked stocks. Prices remain visible until a newer snapshot replaces them.</div>
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-lg font-semibold tracking-tight text-zinc-100">Market Summary</h2>
          <div className="grid grid-cols-4 gap-5">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-5">
              <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Markets Advancing</p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-emerald-400">{availableIndices.filter((index) => (index.change ?? 0) > 0).length}</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-5">
              <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Markets Declining</p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-red-400">{availableIndices.filter((index) => (index.change ?? 0) < 0).length}</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-5">
              <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Stored Snapshots</p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-cyan-400">{availableIndices.length}</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-5">
              <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Unavailable</p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-zinc-300">{indices.filter((index) => !index.available).length}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
