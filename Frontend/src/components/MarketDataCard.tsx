import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Star, Activity } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface MarketDataCardProps {
  ticker: string;
}

// Mock price data with realistic values for UK stocks
const stockData: Record<string, { 
  name: string;
  base: number; 
  change: number;
  sentiment?: 'Bullish' | 'Bearish' | 'High Volume';
}> = {
  'BARC.L': { name: 'Barclays PLC', base: 186.5, change: 2.36, sentiment: 'Bullish' },
  'LLOY.L': { name: 'Lloyds Banking Group', base: 52.8, change: -2.22, sentiment: 'Bearish' },
  'VOD.L': { name: 'Vodafone Group', base: 73.2, change: 1.11, sentiment: 'High Volume' },
};

// Generate sparkline data
function generateSparklineData(basePrice: number, isPositive: boolean) {
  const data = [];
  let price = basePrice * 0.98;
  
  for (let i = 0; i < 20; i++) {
    const trend = isPositive ? 0.002 : -0.002;
    const noise = (Math.random() - 0.5) * 0.01;
    price = price * (1 + trend + noise);
    data.push({ value: price });
  }
  
  return data;
}

export function MarketDataCard({ ticker }: MarketDataCardProps) {
  const stockInfo = stockData[ticker] || { name: 'Unknown', base: 100, change: 0 };
  const [price, setPrice] = useState(stockInfo.base);
  const changePercent = stockInfo.change;
  const isPositive = changePercent >= 0;
  const [sparklineData] = useState(generateSparklineData(stockInfo.base, isPositive));

  // Simulate small price fluctuations
  useEffect(() => {
    const interval = setInterval(() => {
      setPrice((prev) => {
        const fluctuation = (Math.random() - 0.5) * 0.3;
        return Number((prev + fluctuation).toFixed(2));
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'Bullish':
        return 'bg-emerald-950 text-emerald-400 border-emerald-800';
      case 'Bearish':
        return 'bg-red-950 text-red-400 border-red-800';
      case 'High Volume':
        return 'bg-cyan-950 text-cyan-400 border-cyan-800';
      default:
        return 'bg-zinc-800 text-zinc-400 border-zinc-700';
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 shadow-xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-zinc-100">{ticker}</h4>
            {stockInfo.sentiment && (
              <span className={`text-xs px-2 py-0.5 rounded border ${getSentimentColor(stockInfo.sentiment)}`}>
                {stockInfo.sentiment}
              </span>
            )}
          </div>
          <p className="text-zinc-500 text-sm">{stockInfo.name}</p>
        </div>
        <button className="text-zinc-500 hover:text-cyan-400 transition-colors">
          <Star className="w-4 h-4" />
        </button>
      </div>

      {/* Price & Change */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-zinc-100 text-2xl">{price.toFixed(2)}</span>
            <span className="text-zinc-500 text-sm">GBp</span>
          </div>
          <div className={`flex items-center gap-1 mt-1 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {isPositive ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span className="text-sm">
              {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
            </span>
            <span className="text-xs text-zinc-500">today</span>
          </div>
        </div>

        {/* Sparkline */}
        <div className="w-24 h-12">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparklineData}>
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
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors text-sm">
          Buy
        </button>
        <button className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors text-sm">
          Sell
        </button>
        <button className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-colors text-sm flex items-center justify-center gap-1">
          <Activity className="w-3 h-3" />
          Watch
        </button>
      </div>
    </div>
  );
}
