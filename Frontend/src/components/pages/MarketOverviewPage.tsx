import { ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react';
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
      className="w-full rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[#161618] p-[18px] text-left transition-colors hover:bg-[rgba(255,255,255,0.02)]"
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[13px] font-semibold text-[rgba(255,255,255,0.9)]">{index.name}</h3>
          <p className="mt-1 text-[11px] text-[rgba(255,255,255,0.45)]">{index.ticker}</p>
        </div>
        <span className="rounded-full border border-[rgba(0,196,160,0.2)] bg-[rgba(0,196,160,0.1)] px-3 py-1 text-[9px] font-medium uppercase tracking-[1px] text-[rgba(0,196,160,0.7)]">
          Tracked
        </span>
      </div>

      {index.available ? (
        <>
          <div className="mb-4">
            <div className="flex items-baseline gap-2">
              <span className="text-[22px] font-semibold tracking-tight text-[rgba(255,255,255,0.9)]">{index.price?.toFixed(2)}</span>
              <span className="text-[11px] text-[rgba(255,255,255,0.45)]">USD</span>
            </div>
            <div className="mt-3">
              <span className={`inline-flex items-center gap-1 rounded-[8px] px-3 py-2 text-[11px] font-medium ${
                isPositive
                  ? 'bg-[rgba(45,212,170,0.1)] text-[#2dd4aa]'
                  : 'bg-[rgba(242,107,107,0.1)] text-[#f26b6b]'
              }`}>
                {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {isPositive ? '+' : ''}{(index.change ?? 0).toFixed(2)} ({isPositive ? '+' : ''}{(index.changePercent ?? 0).toFixed(2)}%)
              </span>
            </div>
          </div>

          <div className="border-t border-[rgba(255,255,255,0.07)] pt-4">
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <div>
                <p className="text-[10px] uppercase tracking-[1.2px] text-[rgba(255,255,255,0.28)]">Open</p>
                <p className="mt-1 text-[13px] font-medium text-[rgba(255,255,255,0.9)]">{index.open !== null ? index.open.toFixed(2) : '--'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[1.2px] text-[rgba(255,255,255,0.28)]">Volume</p>
                <p className="mt-1 text-[13px] font-medium text-[rgba(255,255,255,0.9)]">{formatVolume(index.volume)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[1.2px] text-[rgba(255,255,255,0.28)]">High</p>
                <p className="mt-1 text-[13px] font-medium text-[rgba(255,255,255,0.9)]">{index.high !== null ? index.high.toFixed(2) : '--'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[1.2px] text-[rgba(255,255,255,0.28)]">Low</p>
                <p className="mt-1 text-[13px] font-medium text-[rgba(255,255,255,0.9)]">{index.low !== null ? index.low.toFixed(2) : '--'}</p>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-[8px] border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.03)] px-4 py-5 text-[12px] leading-6 text-[rgba(255,255,255,0.45)]">Live market data is not available for this item in the prototype right now.</div>
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
    <div className="flex-1 overflow-y-auto bg-[#0e0e10]">
      <div className="border-b border-[rgba(255,255,255,0.06)] bg-[#111113] px-8 py-6">
        <button
          onClick={onBack}
          className="mb-4 flex items-center gap-2 text-[12px] text-[rgba(255,255,255,0.45)] transition-colors hover:text-[rgba(255,255,255,0.9)]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>

        <div className="flex items-start justify-between gap-8">
          <div className="max-w-3xl">
            <h1 className="text-[20px] font-semibold tracking-tight text-[rgba(255,255,255,0.9)]">Market Snapshot</h1>
            <p className="mt-2 text-[13px] leading-6 text-[rgba(255,255,255,0.45)]">Stored snapshot · Last updated {marketDataStatus?.lastUpdatedAt ? new Date(marketDataStatus.lastUpdatedAt).toLocaleString('en-GB') : 'not available'}</p>
            <div className="mt-4 flex flex-wrap items-center gap-5 text-[rgba(255,255,255,0.45)]">
              <div className="flex items-center gap-3 text-[12px]">
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

          <div className="inline-flex gap-1 rounded-[8px] border border-[rgba(255,255,255,0.07)] bg-[#161618] p-1">
            {(['All', 'Big Tech', 'AI', 'Consumer / Media', 'Finance', 'High Volatility'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedFilter(filter)}
                className={`rounded-[8px] px-3 py-2 text-[12px] font-medium transition-colors ${
                  selectedFilter === filter
                    ? 'bg-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.9)]'
                    : 'text-[rgba(255,255,255,0.45)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[rgba(255,255,255,0.9)]'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-8 px-8 py-8">
        {error && <div className="rounded-[14px] border border-[rgba(255,255,255,0.07)] bg-[#161618] p-4 text-[13px] text-[rgba(255,255,255,0.45)]">{error}</div>}
        {!error && marketDataStatus?.isCachedFallback && (
          <div className="rounded-[14px] border border-[rgba(255,255,255,0.07)] bg-[#161618] px-5 py-4 text-[13px] text-[rgba(255,255,255,0.45)]">
            {marketDataStatus.message || 'Showing most recent available data.'}
            {marketDataStatus.lastUpdatedAt ? ` Last updated ${new Date(marketDataStatus.lastUpdatedAt).toLocaleString('en-GB')}.` : ''}
          </div>
        )}
        {!error && !marketDataStatus?.isCachedFallback && indices.length > 0 && (
          <div className="rounded-[14px] border border-[rgba(255,255,255,0.07)] bg-[#161618] px-5 py-4 text-[13px] text-[rgba(255,255,255,0.45)]">
            Showing most recent available data for selected tracked stocks.
          </div>
        )}

        <div>
          <h2 className="mb-5 text-[20px] font-semibold tracking-tight text-[rgba(255,255,255,0.9)]">Market Snapshot</h2>
          {loading && indices.length === 0 ? (
            <div className="rounded-[14px] border border-[rgba(255,255,255,0.07)] bg-[#161618] p-6 text-[13px] text-[rgba(255,255,255,0.45)]">Loading stored market snapshots...</div>
          ) : filteredIndices.length === 0 ? (
            <div className="rounded-[14px] border border-[rgba(255,255,255,0.07)] bg-[#161618] p-6 text-[13px] text-[rgba(255,255,255,0.45)]">No stored market snapshots are available for this filter yet.</div>
          ) : (
            <div className="grid grid-cols-3 gap-[14px]">
              {filteredIndices.map((index) => (
                <IndexCard key={index.ticker} index={index} onSelectStock={onSelectStock} />
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-4 text-[15px] font-semibold tracking-tight text-[rgba(255,255,255,0.9)]">Snapshot Notes</h2>
          <div className="rounded-[14px] border border-[rgba(255,255,255,0.07)] bg-[#161618] p-6">
            <div className="text-[13px] text-[rgba(255,255,255,0.45)]">Market data is stored and refreshed manually for selected tracked stocks. Prices remain visible until a newer snapshot replaces them.</div>
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-[15px] font-semibold tracking-tight text-[rgba(255,255,255,0.9)]">Market Summary</h2>
          <div className="grid grid-cols-4 gap-[14px]">
            <div className="rounded-[14px] border border-[rgba(255,255,255,0.07)] bg-[#161618] px-5 py-5">
              <p className="text-[10px] uppercase tracking-[1.2px] text-[rgba(255,255,255,0.28)]">Markets Advancing</p>
              <p className="mt-3 text-[20px] font-semibold tracking-tight text-[#2dd4aa]">{availableIndices.filter((index) => (index.change ?? 0) > 0).length}</p>
            </div>
            <div className="rounded-[14px] border border-[rgba(255,255,255,0.07)] bg-[#161618] px-5 py-5">
              <p className="text-[10px] uppercase tracking-[1.2px] text-[rgba(255,255,255,0.28)]">Markets Declining</p>
              <p className="mt-3 text-[20px] font-semibold tracking-tight text-[#f26b6b]">{availableIndices.filter((index) => (index.change ?? 0) < 0).length}</p>
            </div>
            <div className="rounded-[14px] border border-[rgba(255,255,255,0.07)] bg-[#161618] px-5 py-5">
              <p className="text-[10px] uppercase tracking-[1.2px] text-[rgba(255,255,255,0.28)]">Stored Snapshots</p>
              <p className="mt-3 text-[20px] font-semibold tracking-tight text-[rgba(255,255,255,0.9)]">{availableIndices.length}</p>
            </div>
            <div className="rounded-[14px] border border-[rgba(255,255,255,0.07)] bg-[#161618] px-5 py-5">
              <p className="text-[10px] uppercase tracking-[1.2px] text-[rgba(255,255,255,0.28)]">Unavailable</p>
              <p className="mt-3 text-[20px] font-semibold tracking-tight text-[rgba(255,255,255,0.9)]">{indices.filter((index) => !index.available).length}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
