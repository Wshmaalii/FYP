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
      className="tl-market-card"
    >
      <div className="tl-market-card-body">
        <div className="tl-market-card-header">
          <div className="tl-market-card-copy">
            <div className="tl-market-card-title-row">
              <h3 className="tl-market-card-title">{index.name}</h3>
              <span className="tl-market-card-status">
                {statusLabel}
              </span>
            </div>
            <p className="tl-market-card-ticker">{index.ticker}</p>
            {index.sourceLabel ? (
              <p className="tl-market-card-source">Source: {index.sourceLabel}</p>
            ) : null}
          </div>
          <div className="tl-market-card-icon">
            <Globe className="h-5 w-5" />
          </div>
        </div>

        {index.available ? (
          <>
            <div className="tl-market-card-price-panel">
              <div className="tl-market-card-price-row">
                <span className="tl-market-card-price">{index.price?.toFixed(2)}</span>
                <span className="tl-market-card-currency">USD</span>
              </div>
              <div className={`tl-market-card-change ${isPositive ? 'is-positive' : 'is-negative'}`}>
                {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                <span>{isPositive ? '+' : ''}{(index.change ?? 0).toFixed(2)}({isPositive ? '+' : ''}{(index.changePercent ?? 0).toFixed(2)}%)</span>
              </div>
            </div>

            <div className="tl-market-card-stats">
              <div>
                <p className="tl-market-card-stat-label">OPEN</p>
                <p className="tl-market-card-stat-value">{index.open !== null ? index.open.toFixed(2) : '--'}</p>
              </div>
              <div>
                <p className="tl-market-card-stat-label">VOLUME</p>
                <p className="tl-market-card-stat-value">{formatVolume(index.volume)}</p>
              </div>
              <div>
                <p className="tl-market-card-stat-label">HIGH</p>
                <p className="tl-market-card-stat-value is-positive">{index.high !== null ? index.high.toFixed(2) : '--'}</p>
              </div>
              <div>
                <p className="tl-market-card-stat-label">LOW</p>
                <p className="tl-market-card-stat-value is-negative">{index.low !== null ? index.low.toFixed(2) : '--'}</p>
              </div>
            </div>

            {index.history.length === 0 ? (
              <p className="tl-market-card-note">Chart history is not available for this snapshot yet.</p>
            ) : null}
          </>
        ) : (
          <div className="tl-market-card-price-panel tl-market-card-unavailable">
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
    <div className="tl-market-page">
      <div className="tl-market-shell">
        <button
          onClick={onBack}
          className="tl-market-back"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </button>

        <div className="tl-market-header">
          <div className="tl-market-header-copy">
            <h1 className="tl-market-title">Market Overview</h1>
            <p className="tl-market-subtitle">Snapshot-based market data for tracked stocks</p>
            <div className="tl-market-status-row">
              <span className="tl-market-status-item">
                <div className="tl-market-status-dot is-available" />
                {openMarkets} Available
              </span>
              <span className="tl-market-status-item">
                <div className="tl-market-status-dot is-unavailable" />
                {closedMarkets} Unavailable
              </span>
            </div>
          </div>

          <div className="tl-market-filters">
            {(['All', 'Big Tech', 'AI', 'Consumer / Media', 'Finance', 'High Volatility'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedFilter(filter)}
                className={`tl-market-filter ${selectedFilter === filter ? 'is-active' : ''}`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="tl-market-content">
          {error && <div className="tl-market-panel tl-market-panel-text">{error}</div>}
          {!error && marketDataStatus?.isCachedFallback && (
            <div className="tl-market-panel">
              <div className="tl-market-panel-title">Market Snapshot</div>
              <div className="tl-market-panel-text">
                {marketDataStatus.message || 'Showing most recent available data.'}
                {marketDataStatus.lastUpdatedAt ? ` Last updated ${new Date(marketDataStatus.lastUpdatedAt).toLocaleString('en-GB')}.` : ''}
              </div>
            </div>
          )}
          {!error && !marketDataStatus?.isCachedFallback && indices.length > 0 && (
            <div className="tl-market-panel">
              <div className="tl-market-panel-title">Market Snapshot</div>
              <div className="tl-market-panel-text">Showing most recent available data for selected tracked stocks.</div>
            </div>
          )}

          <div>
            <h2 className="tl-market-section-title">Curated Market Snapshot</h2>
            {loading && indices.length === 0 ? (
              <div className="tl-market-panel tl-market-panel-text">Loading stored market snapshots...</div>
            ) : filteredIndices.length === 0 ? (
              <div className="tl-market-panel tl-market-panel-text">No stored market snapshots are available for this filter yet.</div>
            ) : (
              <div className="tl-market-grid">
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
