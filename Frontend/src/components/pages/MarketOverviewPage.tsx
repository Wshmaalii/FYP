import { useEffect, useState } from 'react';
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
    return '—';
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
      className="w-full rounded-[14px] border border-white/[0.08] bg-[#161618] p-[18px] text-left transition-colors hover:border-white/[0.13]"
    >
      <div className="mb-[14px] flex items-start justify-between gap-4">
        <div>
          <div className="text-[13px] font-semibold text-[rgba(255,255,255,0.85)]">{index.name}</div>
          <div className="mt-[2px] text-[11px] text-[rgba(255,255,255,0.3)]">{index.ticker}</div>
        </div>
        <span className="rounded-full border border-[rgba(0,196,160,0.2)] bg-[rgba(0,196,160,0.1)] px-2 py-[3px] text-[9px] font-semibold uppercase tracking-[0.5px] text-[rgba(0,196,160,0.8)]">
          Tracked
        </span>
      </div>

      {index.available ? (
        <>
          <div className="mb-[10px] flex items-baseline gap-[6px]">
            <span className="text-[22px] font-semibold tracking-[-0.5px] text-[rgba(255,255,255,0.9)]">
              {index.price?.toFixed(2)}
            </span>
            <span className="text-[12px] text-[rgba(255,255,255,0.3)]">USD</span>
          </div>
          <div
            className={`mb-[14px] inline-block rounded-[6px] px-2 py-[3px] text-[12px] font-medium ${
              isPositive ? 'bg-[rgba(45,212,170,0.1)] text-[#2dd4aa]' : 'bg-[rgba(242,107,107,0.1)] text-[#f26b6b]'
            }`}
          >
            {isPositive ? '+' : ''}
            {(index.change ?? 0).toFixed(2)} ({isPositive ? '+' : ''}
            {(index.changePercent ?? 0).toFixed(2)}%)
          </div>

          <hr className="mb-3 border-0 border-t border-white/[0.05]" />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="mb-[2px] text-[10px] uppercase tracking-[0.3px] text-[rgba(255,255,255,0.25)]">Open</div>
              <div className="text-[12px] text-[rgba(255,255,255,0.5)]">{index.open !== null ? index.open.toFixed(2) : '—'}</div>
            </div>
            <div>
              <div className="mb-[2px] text-[10px] uppercase tracking-[0.3px] text-[rgba(255,255,255,0.25)]">Volume</div>
              <div className="text-[12px] text-[rgba(255,255,255,0.5)]">{formatVolume(index.volume)}</div>
            </div>
            <div>
              <div className="mb-[2px] text-[10px] uppercase tracking-[0.3px] text-[rgba(255,255,255,0.25)]">High</div>
              <div className="text-[12px] text-[rgba(255,255,255,0.5)]">{index.high !== null ? index.high.toFixed(2) : '—'}</div>
            </div>
            <div>
              <div className="mb-[2px] text-[10px] uppercase tracking-[0.3px] text-[rgba(255,255,255,0.25)]">Low</div>
              <div className="text-[12px] text-[rgba(255,255,255,0.5)]">{index.low !== null ? index.low.toFixed(2) : '—'}</div>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-[12px] border border-white/[0.07] bg-[#111113] px-4 py-5 text-[12px] leading-6 text-zinc-500">
          Live market data is not available for this item in the prototype right now.
        </div>
      )}
    </button>
  );
}

export function MarketOverviewPage({ onBack: _onBack, onSelectStock }: MarketOverviewPageProps) {
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

  return (
    <div className="flex-1 overflow-y-auto bg-[#0e0e10]">
      <div className="border-b border-white/[0.06] bg-[#111113] px-8">
        <div className="flex h-[44px] items-center gap-1">
          {(['All', 'Big Tech', 'AI', 'Consumer / Media', 'Finance', 'High Volatility'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setSelectedFilter(filter)}
              className={`rounded-[6px] px-3 py-[5px] text-[12px] font-medium transition-colors ${
                selectedFilter === filter
                  ? 'bg-[rgba(0,196,160,0.15)] text-[#00c4a0]'
                  : 'text-[rgba(255,255,255,0.35)] hover:text-[rgba(255,255,255,0.6)]'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="px-8 py-8">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-5">
            <div className="text-[18px] font-semibold text-[rgba(255,255,255,0.9)]">Market Snapshot</div>
            <div className="mt-[3px] text-[12px] text-[rgba(255,255,255,0.3)]">
              Stored snapshot · Last updated {marketDataStatus?.lastUpdatedAt ? new Date(marketDataStatus.lastUpdatedAt).toLocaleString('en-GB') : 'not available'}
            </div>
          </div>

          {error && (
            <div className="mb-5 rounded-[12px] border border-white/[0.07] bg-[#161618] p-4 text-[12px] text-zinc-400">
              {error}
            </div>
          )}
          {!error && marketDataStatus?.isCachedFallback && (
            <div className="mb-5 rounded-[12px] border border-white/[0.07] bg-[#161618] px-4 py-3 text-[12px] text-zinc-400">
              {marketDataStatus.message || 'Showing most recent available data.'}
              {marketDataStatus.lastUpdatedAt ? ` Last updated ${new Date(marketDataStatus.lastUpdatedAt).toLocaleString('en-GB')}.` : ''}
            </div>
          )}

          {loading && indices.length === 0 ? (
            <div className="rounded-[12px] border border-white/[0.07] bg-[#161618] p-6 text-[12px] text-zinc-500">
              Loading stored market snapshots...
            </div>
          ) : filteredIndices.length === 0 ? (
            <div className="rounded-[12px] border border-white/[0.07] bg-[#161618] p-6 text-[12px] text-zinc-500">
              No stored market snapshots are available for this filter yet.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-[14px]">
              {filteredIndices.map((index) => (
                <IndexCard key={index.ticker} index={index} onSelectStock={onSelectStock} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
