import { ArrowLeft, TrendingUp, TrendingDown, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { getTopMovers, TopMoverItem } from '../../api/market';

interface TopMoversPageProps {
  onBack: () => void;
}

interface Stock {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: string;
  volumeValue: number;
  sparkline: number[];
}

const generateSparkline = (baseValue: number, trend: 'up' | 'down') => {
  const data = [];
  let value = baseValue * 0.97;
  for (let i = 0; i < 10; i++) {
    const direction = trend === 'up' ? 0.003 : -0.003;
    value = value * (1 + direction + (Math.random() - 0.5) * 0.01);
    data.push(value);
  }
  return data;
};

const fallbackGainers: Stock[] = [
  { ticker: 'BARC.L', name: 'Barclays PLC', price: 186.5, change: 4.3, changePercent: 2.36, volume: '45.2M', volumeValue: 45200000, sparkline: generateSparkline(186.5, 'up') },
  { ticker: 'BP.L', name: 'BP PLC', price: 445.6, change: 8.9, changePercent: 2.04, volume: '32.8M', volumeValue: 32800000, sparkline: generateSparkline(445.6, 'up') },
  { ticker: 'GSK.L', name: 'GSK', price: 1542.0, change: 15.5, changePercent: 1.01, volume: '12.4M', volumeValue: 12400000, sparkline: generateSparkline(1542.0, 'up') },
  { ticker: 'HSBA.L', name: 'HSBC Holdings', price: 658.4, change: 6.2, changePercent: 0.95, volume: '28.1M', volumeValue: 28100000, sparkline: generateSparkline(658.4, 'up') },
  { ticker: 'RIO.L', name: 'Rio Tinto', price: 5234.0, change: 47.8, changePercent: 0.92, volume: '8.3M', volumeValue: 8300000, sparkline: generateSparkline(5234.0, 'up') },
];

const fallbackLosers: Stock[] = [
  { ticker: 'LLOY.L', name: 'Lloyds Banking Group', price: 52.8, change: -1.2, changePercent: -2.22, volume: '67.3M', volumeValue: 67300000, sparkline: generateSparkline(52.8, 'down') },
  { ticker: 'VOD.L', name: 'Vodafone Group', price: 73.2, change: -1.6, changePercent: -2.14, volume: '89.1M', volumeValue: 89100000, sparkline: generateSparkline(73.2, 'down') },
  { ticker: 'BT.L', name: 'BT Group', price: 142.8, change: -2.8, changePercent: -1.92, volume: '42.5M', volumeValue: 42500000, sparkline: generateSparkline(142.8, 'down') },
  { ticker: 'TESCO.L', name: 'Tesco PLC', price: 298.4, change: -4.2, changePercent: -1.39, volume: '35.7M', volumeValue: 35700000, sparkline: generateSparkline(298.4, 'down') },
  { ticker: 'IAG.L', name: 'IAG', price: 168.5, change: -1.8, changePercent: -1.06, volume: '52.8M', volumeValue: 52800000, sparkline: generateSparkline(168.5, 'down') },
];

function StockRow({
  stock,
  onAddToWatchlist,
  onToggleExpand,
  isExpanded,
  updatedAt,
}: {
  stock: Stock;
  onAddToWatchlist: (ticker: string) => void;
  onToggleExpand: (ticker: string) => void;
  isExpanded: boolean;
  updatedAt?: string;
}) {
  const isPositive = stock.change >= 0;

  return (
    <div
      className="bg-zinc-900 border border-zinc-800 rounded hover:border-cyan-600 transition-colors cursor-pointer"
      onClick={() => onToggleExpand(stock.ticker)}
    >
      <div className="flex items-center gap-4 p-4">
        <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded flex items-center justify-center flex-shrink-0">
          <span className="text-white text-sm">{stock.ticker.substring(0, 2)}</span>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-zinc-100">{stock.ticker}</h3>
          <p className="text-zinc-500 text-sm truncate">{stock.name}</p>
        </div>

        <div className="w-24 h-12">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stock.sparkline.map(value => ({ value }))}>
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={isPositive ? '#34d399' : '#f87171'} 
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="text-right min-w-[100px]">
          <p className="text-zinc-100">{stock.price.toFixed(2)}p</p>
          <p className="text-zinc-500 text-sm">Vol: {stock.volume}</p>
        </div>

        <div className={`flex items-center gap-2 min-w-[120px] justify-end ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
          {isPositive ? (
            <TrendingUp className="w-5 h-5" />
          ) : (
            <TrendingDown className="w-5 h-5" />
          )}
          <div className="text-right">
            <p>{isPositive ? '+' : ''}{stock.change.toFixed(2)}</p>
            <p className="text-sm">{isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%</p>
          </div>
        </div>

        <button
          onClick={(event) => {
            event.stopPropagation();
            onAddToWatchlist(stock.ticker);
          }}
          className="p-2 bg-zinc-950 hover:bg-cyan-600 border border-zinc-800 hover:border-cyan-600 rounded transition-colors flex-shrink-0"
          title="Add to Watchlist"
        >
          <Plus className="w-4 h-4 text-zinc-400 hover:text-white" />
        </button>
      </div>

      {isExpanded && (
        <div className="border-t border-zinc-800 px-4 py-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Live quote details</span>
            <span className="text-zinc-500">{updatedAt ? `Updated: ${updatedAt}` : 'Updated: --'}</span>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div className="bg-zinc-950 border border-zinc-800 rounded p-3">
              <p className="text-zinc-500 text-xs mb-1">Last Price</p>
              <p className="text-zinc-100">{stock.price.toFixed(2)}p</p>
            </div>
            <div className="bg-zinc-950 border border-zinc-800 rounded p-3">
              <p className="text-zinc-500 text-xs mb-1">Day Change</p>
              <p className={isPositive ? 'text-emerald-400' : 'text-red-400'}>
                {isPositive ? '+' : ''}{stock.change.toFixed(2)} ({isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%)
              </p>
            </div>
            <div className="bg-zinc-950 border border-zinc-800 rounded p-3">
              <p className="text-zinc-500 text-xs mb-1">Volume</p>
              <p className="text-zinc-100">{stock.volumeValue.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function TopMoversPage({ onBack }: TopMoversPageProps) {
  const [selectedFilter, setSelectedFilter] = useState<'FTSE100' | 'FTSE250' | 'Global'>('FTSE100');
  const [gainers, setGainers] = useState<Stock[]>(fallbackGainers);
  const [losers, setLosers] = useState<Stock[]>(fallbackLosers);
  const [expandedTicker, setExpandedTicker] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  const formatVolume = (volume: number) => {
    if (volume >= 1_000_000_000) {
      return `${(volume / 1_000_000_000).toFixed(1)}B`;
    }
    if (volume >= 1_000_000) {
      return `${(volume / 1_000_000).toFixed(1)}M`;
    }
    if (volume >= 1_000) {
      return `${(volume / 1_000).toFixed(1)}K`;
    }
    return `${volume}`;
  };

  const mapMoverToStock = (mover: TopMoverItem): Stock => ({
    ticker: mover.ticker,
    name: mover.name,
    price: mover.price,
    change: mover.change,
    changePercent: mover.changePercent,
    volume: formatVolume(mover.volume),
    volumeValue: mover.volume,
    sparkline: generateSparkline(mover.price, mover.changePercent >= 0 ? 'up' : 'down'),
  });

  useEffect(() => {
    let isMounted = true;

    const loadTopMovers = async () => {
      try {
        const data = await getTopMovers(selectedFilter);
        if (!isMounted) {
          return;
        }

        if (data.gainers.length > 0) {
          setGainers(data.gainers.map(mapMoverToStock));
        }
        if (data.losers.length > 0) {
          setLosers(data.losers.map(mapMoverToStock));
        }
        setLastUpdatedAt(data.updatedAt);
      } catch {
        if (!isMounted) {
          return;
        }

        setGainers(fallbackGainers);
        setLosers(fallbackLosers);
        setLastUpdatedAt(null);
      }
    };

    void loadTopMovers();
    const interval = setInterval(() => {
      void loadTopMovers();
    }, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedFilter]);

  const toggleExpanded = (ticker: string) => {
    setExpandedTicker((current) => (current === ticker ? null : ticker));
  };

  const handleAddToWatchlist = (ticker: string) => {
    console.log('Adding to watchlist:', ticker);
    // In a real app, this would update the watchlist
  };

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900 p-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-zinc-400 hover:text-zinc-100 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back to FTSE100</span>
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white text-2xl mb-2">Top Movers</h1>
            <p className="text-zinc-400">Biggest gainers and losers in the market</p>
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2">
            {(['FTSE100', 'FTSE250', 'Global'] as const).map((filter) => (
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
        {/* Gainers */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <h2 className="text-zinc-100">Top Gainers</h2>
            <span className="text-zinc-500 text-sm">({gainers.length} stocks)</span>
          </div>
          <div className="space-y-3">
            {gainers.map((stock) => (
              <StockRow
                key={stock.ticker}
                stock={stock}
                onAddToWatchlist={handleAddToWatchlist}
                onToggleExpand={toggleExpanded}
                isExpanded={expandedTicker === stock.ticker}
                updatedAt={lastUpdatedAt || undefined}
              />
            ))}
          </div>
        </div>

        {/* Losers */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="w-5 h-5 text-red-400" />
            <h2 className="text-zinc-100">Top Losers</h2>
            <span className="text-zinc-500 text-sm">({losers.length} stocks)</span>
          </div>
          <div className="space-y-3">
            {losers.map((stock) => (
              <StockRow
                key={stock.ticker}
                stock={stock}
                onAddToWatchlist={handleAddToWatchlist}
                onToggleExpand={toggleExpanded}
                isExpanded={expandedTicker === stock.ticker}
                updatedAt={lastUpdatedAt || undefined}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
