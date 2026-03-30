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
      className="w-full rounded-xl border border-white/8 bg-[#16181d] p-4 text-left shadow-[0_1px_0_rgba(255,255,255,0.02)] transition-colors duration-150 hover:border-white/14 hover:bg-[#191c22]"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[13px] font-medium text-zinc-100">{index.name}</h3>
          <p className="mt-1 text-[11px] text-zinc-500">{index.ticker}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] ${
            index.status === 'Unavailable'
              ? 'border-white/10 bg-white/[0.03] text-zinc-500'
              : 'border-[#1e564d] bg-[rgba(0,196,160,0.10)] text-[#8ed7c7]'
          }`}>
            {index.status === 'Unavailable' ? 'Unavailable' : 'Tracked'}
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/6 bg-[#121419]">
            <Globe className="h-3.5 w-3.5 text-zinc-500" />
          </div>
        </div>
      </div>

      {index.available ? (
        <>
          <div className="mb-3 flex items-baseline gap-2">
            <span className="text-[22px] font-semibold tracking-tight text-zinc-50">{index.price?.toFixed(2)}</span>
            <span className="text-[11px] text-zinc-500">USD</span>
          </div>
          <div className={`mb-4 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium ${
            isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
          }`}>
            {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            <span>{isPositive ? '+' : ''}{(index.change ?? 0).toFixed(2)} ({isPositive ? '+' : ''}{(index.changePercent ?? 0).toFixed(2)}%)</span>
          </div>

          <div className="mb-3 border-t border-white/6" />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">Open</p>
              <p className="mt-1 text-[12px] text-zinc-300">{index.open !== null ? index.open.toFixed(2) : '--'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">Volume</p>
              <p className="mt-1 text-[12px] text-zinc-300">{formatVolume(index.volume)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">High</p>
              <p className="mt-1 text-[12px] text-zinc-300">{index.high !== null ? index.high.toFixed(2) : '--'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">Low</p>
              <p className="mt-1 text-[12px] text-zinc-300">{index.low !== null ? index.low.toFixed(2) : '--'}</p>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="mb-3 flex items-baseline gap-2">
            <span className="text-[22px] font-semibold tracking-tight text-zinc-50">--</span>
            <span className="text-[11px] text-zinc-500">USD</span>
          </div>
          <div className="mb-4 inline-flex rounded-md bg-white/[0.04] px-2 py-1 text-[12px] text-zinc-500">
            Live market data unavailable
          </div>
          <div className="mb-3 border-t border-white/6" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">Open</p>
              <p className="mt-1 text-[12px] text-zinc-300">--</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">Volume</p>
              <p className="mt-1 text-[12px] text-zinc-300">--</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">High</p>
              <p className="mt-1 text-[12px] text-zinc-300">--</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">Low</p>
              <p className="mt-1 text-[12px] text-zinc-300">--</p>
            </div>
          </div>
        </>
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
      <div className="mx-auto max-w-[1100px] px-5 py-5 lg:px-6 lg:py-6">
        <button
          onClick={onBack}
          className="mb-4 flex items-center gap-2 text-[12px] text-zinc-400 transition-colors hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </button>

        <div className="mb-5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Market Snapshot</p>
          <h1 className="mt-1 text-[24px] font-semibold tracking-tight text-white">Market Overview</h1>
          <p className="mt-1.5 text-[12px] leading-5 text-zinc-400">Snapshot-based market data for tracked stocks.</p>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-[12px] text-zinc-400">
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

        <div className="mb-5 flex flex-wrap gap-2">
          {(['All', 'Big Tech', 'AI', 'Consumer / Media', 'Finance', 'High Volatility'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setSelectedFilter(filter)}
              className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
                selectedFilter === filter
                  ? 'bg-[rgba(0,196,160,0.14)] text-[#8ed7c7]'
                  : 'text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="space-y-5">
          {error && <div className="rounded-xl border border-white/8 bg-[#16181d] p-4 text-[12px] text-zinc-400">{error}</div>}
          {!error && marketDataStatus?.isCachedFallback && (
            <div className="rounded-xl border border-white/8 bg-[#16181d] px-4 py-3">
              <div className="text-[13px] font-medium text-zinc-100">Market Snapshot</div>
              <div className="mt-1 text-[12px] text-zinc-500">
                {marketDataStatus.message || 'Showing most recent available data.'}
                {marketDataStatus.lastUpdatedAt ? ` Last updated ${new Date(marketDataStatus.lastUpdatedAt).toLocaleString('en-GB')}.` : ''}
              </div>
            </div>
          )}
          {!error && !marketDataStatus?.isCachedFallback && indices.length > 0 && (
            <div className="rounded-xl border border-white/8 bg-[#16181d] px-4 py-3">
              <div className="text-[13px] font-medium text-zinc-100">Market Snapshot</div>
              <div className="mt-1 text-[12px] text-zinc-500">Showing most recent available data for selected tracked stocks.</div>
            </div>
          )}

          <div>
            <h2 className="mb-4 text-[16px] font-semibold text-zinc-100">Curated Market Snapshot</h2>
            {loading && indices.length === 0 ? (
              <div className="rounded-xl border border-white/8 bg-[#16181d] p-5 text-[12px] text-zinc-500">Loading stored market snapshots...</div>
            ) : filteredIndices.length === 0 ? (
              <div className="rounded-xl border border-white/8 bg-[#16181d] p-5 text-[12px] text-zinc-500">No stored market snapshots are available for this filter yet.</div>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {filteredIndices.map((index) => (
                  <IndexCard key={index.ticker} index={index} onSelectStock={onSelectStock} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
