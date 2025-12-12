import { ArrowLeft, TrendingUp, TrendingDown, Clock, Globe } from 'lucide-react';
import { useState, useEffect } from 'react';

interface MarketOverviewPageProps {
  onBack: () => void;
}

interface IndexData {
  name: string;
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  volume: string;
  region: 'Europe' | 'US' | 'Asia';
  status: 'Open' | 'Closed';
}

const indices: IndexData[] = [
  { name: 'FTSE 100', ticker: 'UKX', price: 7523.45, change: 45.23, changePercent: 0.61, open: 7478.22, high: 7535.67, low: 7465.12, volume: '458.2M', region: 'Europe', status: 'Open' },
  { name: 'DAX', ticker: 'DAX', price: 16834.32, change: -23.12, changePercent: -0.14, open: 16857.44, high: 16892.15, low: 16801.23, volume: '312.8M', region: 'Europe', status: 'Open' },
  { name: 'CAC 40', ticker: 'CAC', price: 7456.89, change: 12.45, changePercent: 0.17, open: 7444.44, high: 7468.32, low: 7431.56, volume: '245.6M', region: 'Europe', status: 'Open' },
  { name: 'S&P 500', ticker: 'SPX', price: 4783.23, change: 18.56, changePercent: 0.39, open: 4764.67, high: 4795.43, low: 4756.12, volume: '2.3B', region: 'US', status: 'Closed' },
  { name: 'Dow Jones', ticker: 'DJI', price: 37234.56, change: -45.78, changePercent: -0.12, open: 37280.34, high: 37312.45, low: 37198.23, volume: '1.8B', region: 'US', status: 'Closed' },
  { name: 'Nikkei 225', ticker: 'NKY', price: 33234.78, change: 234.56, changePercent: 0.71, open: 33000.22, high: 33289.45, low: 32987.34, volume: '1.2B', region: 'Asia', status: 'Closed' },
  { name: 'Hang Seng', ticker: 'HSI', price: 16543.21, change: -87.34, changePercent: -0.53, open: 16630.55, high: 16678.92, low: 16512.43, volume: '892.4M', region: 'Asia', status: 'Closed' },
];

const sectorHeatmap = [
  { sector: 'Financials', change: 1.2, size: 28 },
  { sector: 'Energy', change: 0.8, size: 15 },
  { sector: 'Healthcare', change: 0.5, size: 12 },
  { sector: 'Consumer', change: -0.3, size: 18 },
  { sector: 'Industrials', change: -0.7, size: 14 },
  { sector: 'Technology', change: 1.5, size: 8 },
  { sector: 'Materials', change: 0.2, size: 5 },
  { sector: 'Utilities', change: -0.1, size: 6 },
  { sector: 'Real Estate', change: 0.4, size: 7 },
  { sector: 'Telecom', change: -0.5, size: 4 },
];

function IndexCard({ index }: { index: IndexData }) {
  const isPositive = index.change >= 0;
  
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-cyan-600 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-zinc-100">{index.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded ${
              index.status === 'Open' 
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
                : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
            }`}>
              {index.status}
            </span>
          </div>
          <p className="text-zinc-500 text-sm">{index.ticker}</p>
        </div>
        <Globe className={`w-4 h-4 ${
          index.region === 'Europe' ? 'text-blue-400' :
          index.region === 'US' ? 'text-purple-400' :
          'text-orange-400'
        }`} />
      </div>

      <div className="mb-3">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-white text-2xl">{index.price.toFixed(2)}</span>
          <div className={`flex items-center gap-1 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>{isPositive ? '+' : ''}{index.change.toFixed(2)}</span>
            <span className="text-sm">({isPositive ? '+' : ''}{index.changePercent.toFixed(2)}%)</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-zinc-500 text-xs">Open</p>
          <p className="text-zinc-100">{index.open.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-zinc-500 text-xs">Volume</p>
          <p className="text-zinc-100">{index.volume}</p>
        </div>
        <div>
          <p className="text-zinc-500 text-xs">High</p>
          <p className="text-emerald-400">{index.high.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-zinc-500 text-xs">Low</p>
          <p className="text-red-400">{index.low.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}

export function MarketOverviewPage({ onBack }: MarketOverviewPageProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedRegion, setSelectedRegion] = useState<'All' | 'Europe' | 'US' | 'Asia'>('All');

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const filteredIndices = selectedRegion === 'All' 
    ? indices 
    : indices.filter(i => i.region === selectedRegion);

  const openMarkets = indices.filter(i => i.status === 'Open').length;
  const closedMarkets = indices.filter(i => i.status === 'Closed').length;

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-950">
      {/* Header */}
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
                  {openMarkets} Open
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-zinc-600 rounded-full" />
                  {closedMarkets} Closed
                </span>
              </div>
            </div>
          </div>

          {/* Region Filter */}
          <div className="flex gap-2">
            {(['All', 'Europe', 'US', 'Asia'] as const).map((region) => (
              <button
                key={region}
                onClick={() => setSelectedRegion(region)}
                className={`px-4 py-2 rounded transition-colors ${
                  selectedRegion === region
                    ? 'bg-cyan-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                {region}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Global Indices */}
        <div>
          <h2 className="text-zinc-100 mb-4">Global Indices</h2>
          <div className="grid grid-cols-3 gap-4">
            {filteredIndices.map((index) => (
              <IndexCard key={index.ticker} index={index} />
            ))}
          </div>
        </div>

        {/* Sector Heatmap */}
        <div>
          <h2 className="text-zinc-100 mb-4">Sector Performance Heatmap</h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <div className="grid grid-cols-5 gap-3">
              {sectorHeatmap.map((sector) => {
                const isPositive = sector.change >= 0;
                const intensity = Math.min(Math.abs(sector.change) * 40, 100);
                
                return (
                  <div
                    key={sector.sector}
                    className="rounded p-4 relative overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                    style={{
                      backgroundColor: isPositive 
                        ? `rgba(16, 185, 129, ${intensity / 100})` 
                        : `rgba(239, 68, 68, ${intensity / 100})`,
                      height: `${Math.max(sector.size * 4, 80)}px`,
                    }}
                  >
                    <div className="flex flex-col justify-between h-full">
                      <span className="text-white text-sm">{sector.sector}</span>
                      <div>
                        <span className={`text-lg ${isPositive ? 'text-emerald-200' : 'text-red-200'}`}>
                          {isPositive ? '+' : ''}{sector.change.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Market Summary */}
        <div>
          <h2 className="text-zinc-100 mb-4">Market Summary</h2>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <p className="text-zinc-500 text-sm mb-2">Markets Advancing</p>
              <p className="text-emerald-400 text-2xl">{indices.filter(i => i.change > 0).length}</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <p className="text-zinc-500 text-sm mb-2">Markets Declining</p>
              <p className="text-red-400 text-2xl">{indices.filter(i => i.change < 0).length}</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <p className="text-zinc-500 text-sm mb-2">Sectors Up</p>
              <p className="text-emerald-400 text-2xl">{sectorHeatmap.filter(s => s.change > 0).length}</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <p className="text-zinc-500 text-sm mb-2">Sectors Down</p>
              <p className="text-red-400 text-2xl">{sectorHeatmap.filter(s => s.change < 0).length}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
