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
  const statusLabel = index.available ? 'TRACKED' : 'UNAVAILABLE';

  return (
    <button
      type="button"
      onClick={() => onSelectStock(index.ticker)}
      className="w-full rounded-[22px] border border-[rgba(255,255,255,0.09)] bg-[#07090d] p-0 text-left transition-colors duration-150 hover:border-[rgba(255,255,255,0.16)] hover:bg-[#0a0d12]"
    >
      <div className="p-5">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0 pr-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-[18px] font-medium leading-8 text-[rgba(255,255,255,0.96)]">{index.name}</h3>
              <span className="rounded-full border border-[rgba(255,255,255,0.16)] bg-[rgba(255,255,255,0.08)] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.04em] text-[rgba(255,255,255,0.6)]">
                {statusLabel}
              </span>
            </div>
            <p className="mt-3 text-[13px] text-[rgba(255,255,255,0.46)]">{index.ticker}</p>
            {index.sourceLabel ? (
              <p className="mt-2 text-[12px] text-[rgba(255,255,255,0.28)]">Source: {index.sourceLabel}</p>
            ) : null}
          </div>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.02)]">
            <Globe className="h-5 w-5 text-[#00d7ff]" />
          </div>
        </div>

        {index.available ? (
          <>
            <div className="rounded-[18px] border border-[rgba(255,255,255,0.09)] bg-[#06080c] px-5 py-5">
              <div className="flex items-baseline gap-3">
                <span className="text-[22px] font-medium tracking-tight text-[rgba(255,255,255,0.96)]">{index.price?.toFixed(2)}</span>
                <span className="text-[12px] text-[rgba(255,255,255,0.36)]">USD</span>
              </div>
              <div className={`mt-4 flex items-center gap-1.5 text-[14px] ${isPositive ? 'text-[#14e0ae]' : 'text-[#ff6a6a]'}`}>
                {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                <span>{isPositive ? '+' : ''}{(index.change ?? 0).toFixed(2)}({isPositive ? '+' : ''}{(index.changePercent ?? 0).toFixed(2)}%)</span>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-6">
              <div>
                <p className="text-[12px] uppercase tracking-[0.04em] text-[rgba(255,255,255,0.4)]">OPEN</p>
                <p className="mt-2 text-[18px] text-[rgba(255,255,255,0.92)]">{index.open !== null ? index.open.toFixed(2) : '--'}</p>
              </div>
              <div>
                <p className="text-[12px] uppercase tracking-[0.04em] text-[rgba(255,255,255,0.4)]">VOLUME</p>
                <p className="mt-2 text-[18px] text-[rgba(255,255,255,0.92)]">{formatVolume(index.volume)}</p>
              </div>
              <div>
                <p className="text-[12px] uppercase tracking-[0.04em] text-[rgba(255,255,255,0.4)]">HIGH</p>
                <p className="mt-2 text-[18px] text-[#14e0ae]">{index.high !== null ? index.high.toFixed(2) : '--'}</p>
              </div>
              <div>
                <p className="text-[12px] uppercase tracking-[0.04em] text-[rgba(255,255,255,0.4)]">LOW</p>
                <p className="mt-2 text-[18px] text-[#ff6a6a]">{index.low !== null ? index.low.toFixed(2) : '--'}</p>
              </div>
            </div>

            {index.history.length === 0 ? (
              <p className="mt-5 text-[12px] text-[rgba(255,255,255,0.34)]">Chart history is not available for this snapshot yet.</p>
            ) : null}
          </>
        ) : (
          <div className="rounded-[18px] border border-[rgba(255,255,255,0.09)] bg-[#06080c] px-5 py-5 text-[14px] leading-6 text-[rgba(255,255,255,0.4)]">
            Live market data unavailable for this snapshot.
          </div>
        )}
      </div>
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
  return (
    <div className="flex-1 overflow-y-auto bg-[#07090d]">
      <div className="px-6 py-5 xl:px-8">
        <button
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-[12px] text-[rgba(255,255,255,0.58)] transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </button>

        <div className="mb-7 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-[20px] font-medium text-[rgba(255,255,255,0.96)]">Market Overview</h1>
            <p className="mt-3 text-[13px] leading-7 text-[rgba(255,255,255,0.44)]">Snapshot-based market data for tracked stocks</p>
            <div className="mt-2 flex flex-wrap items-center gap-5 text-[13px] text-[rgba(255,255,255,0.58)]">
              <span className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-[#14e0ae]" />
                {openMarkets} Available
              </span>
              <span className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-[rgba(255,255,255,0.28)]" />
                {closedMarkets} Unavailable
              </span>
            </div>
          </div>

          <div className="inline-flex flex-wrap items-center gap-1 rounded-full border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)] p-1">
            {(['All', 'Big Tech', 'AI', 'Consumer / Media', 'Finance', 'High Volatility'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedFilter(filter)}
                className={`rounded-full px-5 py-2 text-[13px] transition-colors ${
                  selectedFilter === filter
                    ? 'bg-[#1192b7] text-white'
                    : 'text-[rgba(255,255,255,0.52)] hover:bg-[rgba(255,255,255,0.05)] hover:text-white'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          {error && <div className="rounded-[22px] border border-[rgba(255,255,255,0.09)] bg-[rgba(255,255,255,0.04)] p-5 text-[14px] text-[rgba(255,255,255,0.5)]">{error}</div>}
          {!error && marketDataStatus?.isCachedFallback && (
            <div className="rounded-[22px] border border-[rgba(255,255,255,0.09)] bg-[rgba(255,255,255,0.04)] px-5 py-4">
              <div className="text-[15px] font-medium text-[rgba(255,255,255,0.9)]">Market Snapshot</div>
              <div className="mt-2 text-[13px] text-[rgba(255,255,255,0.44)]">
                {marketDataStatus.message || 'Showing most recent available data.'}
                {marketDataStatus.lastUpdatedAt ? ` Last updated ${new Date(marketDataStatus.lastUpdatedAt).toLocaleString('en-GB')}.` : ''}
              </div>
            </div>
          )}
          {!error && !marketDataStatus?.isCachedFallback && indices.length > 0 && (
            <div className="rounded-[22px] border border-[rgba(255,255,255,0.09)] bg-[rgba(255,255,255,0.04)] px-5 py-4">
              <div className="text-[15px] font-medium text-[rgba(255,255,255,0.9)]">Market Snapshot</div>
              <div className="mt-2 text-[13px] text-[rgba(255,255,255,0.44)]">Showing most recent available data for selected tracked stocks.</div>
            </div>
          )}

          <div>
            <h2 className="mb-4 text-[18px] font-medium text-[rgba(255,255,255,0.96)]">Curated Market Snapshot</h2>
            {loading && indices.length === 0 ? (
              <div className="rounded-[22px] border border-[rgba(255,255,255,0.09)] bg-[rgba(255,255,255,0.04)] p-5 text-[14px] text-[rgba(255,255,255,0.4)]">Loading stored market snapshots...</div>
            ) : filteredIndices.length === 0 ? (
              <div className="rounded-[22px] border border-[rgba(255,255,255,0.09)] bg-[rgba(255,255,255,0.04)] p-5 text-[14px] text-[rgba(255,255,255,0.4)]">No stored market snapshots are available for this filter yet.</div>
            ) : (
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
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
