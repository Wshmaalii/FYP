import { ArrowLeft, Star, Bell, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { useState } from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface WatchlistPageProps {
  onBack: () => void;
}

interface WatchlistStock {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: string;
  sentiment?: 'Bullish' | 'Bearish' | 'Neutral';
  sparkline: number[];
}

const generateSparkline = (baseValue: number, trend: 'up' | 'down' | 'neutral') => {
  const data = [];
  let value = baseValue * 0.97;
  for (let i = 0; i < 10; i++) {
    let direction = 0;
    if (trend === 'up') direction = 0.003;
    else if (trend === 'down') direction = -0.003;
    value = value * (1 + direction + (Math.random() - 0.5) * 0.01);
    data.push(value);
  }
  return data;
};

const watchlistStocks: WatchlistStock[] = [
  { ticker: 'BARC.L', name: 'Barclays PLC', price: 186.5, change: 4.3, changePercent: 2.36, volume: '45.2M', sentiment: 'Bullish', sparkline: generateSparkline(186.5, 'up') },
  { ticker: 'LLOY.L', name: 'Lloyds Banking Group', price: 52.8, change: -1.2, changePercent: -2.22, volume: '67.3M', sentiment: 'Bearish', sparkline: generateSparkline(52.8, 'down') },
  { ticker: 'VOD.L', name: 'Vodafone Group', price: 73.2, change: 0.8, changePercent: 1.11, volume: '89.1M', sentiment: 'Neutral', sparkline: generateSparkline(73.2, 'neutral') },
  { ticker: 'HSBA.L', name: 'HSBC Holdings', price: 658.4, change: -2.1, changePercent: -0.32, volume: '28.1M', sentiment: 'Neutral', sparkline: generateSparkline(658.4, 'neutral') },
  { ticker: 'GSK.L', name: 'GSK', price: 1542.0, change: 15.5, changePercent: 1.01, volume: '12.4M', sentiment: 'Bullish', sparkline: generateSparkline(1542.0, 'up') },
  { ticker: 'BP.L', name: 'BP PLC', price: 445.6, change: 8.9, changePercent: 2.04, volume: '32.8M', sentiment: 'Bullish', sparkline: generateSparkline(445.6, 'up') },
];

function WatchlistRow({ stock, onRemove, onSetAlert }: { stock: WatchlistStock; onRemove: (ticker: string) => void; onSetAlert: (ticker: string) => void }) {
  const isPositive = stock.change >= 0;
  
  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'Bullish':
        return 'bg-emerald-950 text-emerald-400 border-emerald-800';
      case 'Bearish':
        return 'bg-red-950 text-red-400 border-red-800';
      default:
        return 'bg-zinc-800 text-zinc-400 border-zinc-700';
    }
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-zinc-900 border border-zinc-800 rounded hover:border-cyan-600 transition-colors">
      <Star className="w-5 h-5 text-amber-400 fill-amber-400 flex-shrink-0" />
      
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

      {stock.sentiment && (
        <span className={`text-xs px-3 py-1 rounded border ${getSentimentColor(stock.sentiment)} min-w-[80px] text-center`}>
          {stock.sentiment}
        </span>
      )}

      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={() => onSetAlert(stock.ticker)}
          className="p-2 bg-zinc-950 hover:bg-cyan-600 border border-zinc-800 hover:border-cyan-600 rounded transition-colors"
          title="Set Alert"
        >
          <Bell className="w-4 h-4 text-zinc-400" />
        </button>
        <button
          onClick={() => onRemove(stock.ticker)}
          className="p-2 bg-zinc-950 hover:bg-red-600 border border-zinc-800 hover:border-red-600 rounded transition-colors"
          title="Remove from Watchlist"
        >
          <Trash2 className="w-4 h-4 text-zinc-400" />
        </button>
      </div>
    </div>
  );
}

export function WatchlistPage({ onBack }: WatchlistPageProps) {
  const [stocks, setStocks] = useState(watchlistStocks);

  const handleRemove = (ticker: string) => {
    console.log('Removing from watchlist:', ticker);
    setStocks(stocks.filter(s => s.ticker !== ticker));
  };

  const handleSetAlert = (ticker: string) => {
    console.log('Setting alert for:', ticker);
    // In a real app, this would open an alert modal
  };

  const totalValue = stocks.reduce((sum, stock) => sum + stock.price, 0);
  const totalGain = stocks.filter(s => s.change >= 0).length;
  const totalLoss = stocks.filter(s => s.change < 0).length;

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
            <h1 className="text-white text-2xl mb-2">My Watchlist</h1>
            <p className="text-zinc-400">Track your favorite stocks and market movements</p>
          </div>

          {/* Summary Stats */}
          <div className="flex gap-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 min-w-[120px]">
              <p className="text-zinc-500 text-xs mb-1">Total Stocks</p>
              <p className="text-white text-2xl">{stocks.length}</p>
            </div>
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 min-w-[120px]">
              <p className="text-zinc-500 text-xs mb-1">Gainers</p>
              <p className="text-emerald-400 text-2xl">{totalGain}</p>
            </div>
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 min-w-[120px]">
              <p className="text-zinc-500 text-xs mb-1">Losers</p>
              <p className="text-red-400 text-2xl">{totalLoss}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Portfolio View */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-zinc-100">Portfolio View</h2>
          <div className="flex items-center gap-2 text-zinc-500 text-sm">
            <span>Real-time updates</span>
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          </div>
        </div>

        {stocks.length === 0 ? (
          <div className="flex items-center justify-center py-12 bg-zinc-900 border border-zinc-800 rounded-lg">
            <div className="text-center">
              <Star className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <h3 className="text-zinc-100 mb-2">Your watchlist is empty</h3>
              <p className="text-zinc-500 text-sm">Add stocks to start tracking their performance</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {stocks.map((stock) => (
              <WatchlistRow
                key={stock.ticker}
                stock={stock}
                onRemove={handleRemove}
                onSetAlert={handleSetAlert}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
