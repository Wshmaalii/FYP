import { ArrowLeft } from 'lucide-react';
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
      className="w-full rounded-[14px] p-[18px] text-left transition-colors"
      style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)' }}
    >
      <div className="mb-[14px] flex items-start justify-between gap-4">
        <div>
          <div className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{index.name}</div>
          <div className="mt-[2px] text-[11px]" style={{ color: 'var(--text-faint)' }}>{index.ticker}</div>
        </div>
        <span
          className="rounded-full px-2 py-[3px] text-[9px] font-semibold uppercase tracking-[0.5px]"
          style={index.available
            ? { border: '0.5px solid var(--accent-teal-border)', background: 'var(--accent-teal-bg)', color: 'var(--accent-teal)' }
            : { border: '0.5px solid var(--border-primary)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-subtle)' }}
        >
          {index.available ? 'Tracked' : 'Unavailable'}
        </span>
      </div>

      {index.available ? (
        <>
          <div className="mb-2.5 flex items-baseline gap-1.5">
            <span className="text-[22px] font-semibold tracking-[-0.5px]" style={{ color: 'var(--text-primary)' }}>{index.price?.toFixed(2)}</span>
            <span className="text-[12px]" style={{ color: 'var(--text-faint)' }}>USD</span>
          </div>

          <div className={`mb-[14px] inline-block rounded-md px-2 py-[3px] text-[12px] font-medium ${isPositive ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400'}`}>
            {isPositive ? '+' : '-'}{Math.abs(index.change ?? 0).toFixed(2)} ({isPositive ? '+' : '-'}{Math.abs(index.changePercent ?? 0).toFixed(2)}%)
          </div>

          <hr className="mb-3 border-none" style={{ borderTop: '0.5px solid var(--border-faint)' }} />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="mb-0.5 text-[10px] uppercase tracking-[0.3px]" style={{ color: 'var(--text-label)' }}>Open</div>
              <div className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{index.open !== null ? index.open.toFixed(2) : '--'}</div>
            </div>
            <div>
              <div className="mb-0.5 text-[10px] uppercase tracking-[0.3px]" style={{ color: 'var(--text-label)' }}>Volume</div>
              <div className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{formatVolume(index.volume)}</div>
            </div>
            <div>
              <div className="mb-0.5 text-[10px] uppercase tracking-[0.3px]" style={{ color: 'var(--text-label)' }}>High</div>
              <div className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{index.high !== null ? index.high.toFixed(2) : '--'}</div>
            </div>
            <div>
              <div className="mb-0.5 text-[10px] uppercase tracking-[0.3px]" style={{ color: 'var(--text-label)' }}>Low</div>
              <div className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{index.low !== null ? index.low.toFixed(2) : '--'}</div>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-[12px] px-4 py-5 text-sm leading-6" style={{ border: '0.5px solid var(--border-primary)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-muted)' }}>Live market data is not available for this item right now.</div>
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

  return (
    <div className="flex flex-1 flex-col" style={{ background: 'var(--bg-app)' }}>
      <div className="flex h-11 items-center gap-1 px-6" style={{ background: 'var(--bg-sidebar)', borderBottom: '0.5px solid var(--border-subtle)' }}>
        {(['All', 'Big Tech', 'AI', 'Consumer / Media', 'Finance', 'High Volatility'] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setSelectedFilter(filter)}
            className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
              selectedFilter === filter
                ? ''
                : ''
            }`}
            style={selectedFilter === filter
              ? { background: 'var(--accent-teal-bg)', color: 'var(--accent-teal)' }
              : { color: 'var(--text-subtle)' }}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-7 py-6">
        <button onClick={onBack} className="mb-4 flex items-center gap-2 text-sm transition-colors" style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </button>

        <div className="mb-5">
          <div className="text-[18px] font-semibold" style={{ color: 'var(--text-primary)' }}>Market Snapshot</div>
          <div className="mt-1 text-[12px]" style={{ color: 'var(--text-faint)' }}>
            {marketDataStatus?.lastUpdatedAt
              ? `Stored snapshot · Last updated ${new Date(marketDataStatus.lastUpdatedAt).toLocaleString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}`
              : 'Stored snapshot · Last updated 26 Mar 2026, 16:06'}
          </div>
        </div>

        {error && <div className="mb-5 rounded-[14px] p-4 text-sm" style={{ border: '0.5px solid var(--border-primary)', background: 'var(--bg-card)', color: 'var(--text-muted)' }}>{error}</div>}
        {!error && marketDataStatus?.isCachedFallback && (
          <div className="mb-5 rounded-[14px] px-5 py-4 text-sm" style={{ border: '0.5px solid var(--border-primary)', background: 'var(--bg-card)', color: 'var(--text-muted)' }}>
            {marketDataStatus.message || 'Showing most recent available data.'}
            {marketDataStatus.lastUpdatedAt ? ` Last updated ${new Date(marketDataStatus.lastUpdatedAt).toLocaleString('en-GB')}.` : ''}
          </div>
        )}
        {loading && indices.length === 0 ? (
          <div className="rounded-[14px] p-6 text-sm" style={{ border: '0.5px solid var(--border-primary)', background: 'var(--bg-card)', color: 'var(--text-muted)' }}>Loading stored market snapshots...</div>
        ) : filteredIndices.length === 0 ? (
          <div className="rounded-[14px] p-6 text-sm" style={{ border: '0.5px solid var(--border-primary)', background: 'var(--bg-card)', color: 'var(--text-muted)' }}>No stored market snapshots are available for this filter yet.</div>
        ) : (
          <div className="grid grid-cols-3 gap-[14px]">
            {filteredIndices.map((index) => (
              <IndexCard key={index.ticker} index={index} onSelectStock={onSelectStock} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
