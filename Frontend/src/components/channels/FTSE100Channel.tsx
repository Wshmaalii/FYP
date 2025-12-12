import { TrendingUp, TrendingDown } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

const ftseData = [
  { time: '09:00', value: 7478 },
  { time: '10:00', value: 7492 },
  { time: '11:00', value: 7485 },
  { time: '12:00', value: 7501 },
  { time: '13:00', value: 7515 },
  { time: '14:00', value: 7523 },
  { time: '15:00', value: 7520 },
  { time: '16:00', value: 7523 },
];

const topMovers = [
  { ticker: 'BARC.L', name: 'Barclays', price: 186.5, change: 4.3, changePercent: 2.36, volume: '45.2M' },
  { ticker: 'BP.L', name: 'BP PLC', price: 445.6, change: 8.9, changePercent: 2.04, volume: '32.8M' },
  { ticker: 'GSK.L', name: 'GSK', price: 1542.0, change: 15.5, changePercent: 1.01, volume: '12.4M' },
  { ticker: 'LLOY.L', name: 'Lloyds', price: 52.8, change: -1.2, changePercent: -2.22, volume: '67.3M' },
  { ticker: 'VOD.L', name: 'Vodafone', price: 73.2, change: -0.8, changePercent: -1.08, volume: '89.1M' },
];

const heatmapData = [
  { sector: 'Financials', change: 1.2, size: 28 },
  { sector: 'Energy', change: 0.8, size: 15 },
  { sector: 'Healthcare', change: 0.5, size: 12 },
  { sector: 'Consumer', change: -0.3, size: 18 },
  { sector: 'Industrials', change: -0.7, size: 14 },
  { sector: 'Technology', change: 1.5, size: 8 },
  { sector: 'Materials', change: 0.2, size: 5 },
];

export function FTSE100Channel() {
  return (
    <div className="flex-1 overflow-y-auto bg-zinc-950">
      {/* Index Header */}
      <div className="border-b border-zinc-800 p-6">
        <div className="flex items-end gap-6">
          <div>
            <h2 className="text-zinc-500 text-sm mb-2">FTSE 100 Index</h2>
            <div className="flex items-baseline gap-3">
              <span className="text-white text-4xl">7,523.45</span>
              <div className="flex items-center gap-2 text-emerald-400">
                <TrendingUp className="w-5 h-5" />
                <span className="text-xl">+45.23</span>
                <span className="text-lg">(+0.61%)</span>
              </div>
            </div>
            <p className="text-zinc-500 text-sm mt-2">As of 16:30 GMT • Market Open</p>
          </div>
          <div className="flex gap-6 pb-2">
            <div>
              <p className="text-zinc-500 text-xs">Open</p>
              <p className="text-zinc-100">7,478.22</p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs">High</p>
              <p className="text-zinc-100">7,535.67</p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs">Low</p>
              <p className="text-zinc-100">7,465.12</p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs">Volume</p>
              <p className="text-zinc-100">458.2M</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 p-6">
        {/* Intraday Chart */}
        <div className="col-span-2 bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h3 className="text-zinc-100 mb-4">Intraday Performance</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ftseData}>
                <XAxis 
                  dataKey="time" 
                  stroke="#71717a"
                  tick={{ fill: '#71717a' }}
                />
                <YAxis 
                  domain={[7460, 7540]}
                  stroke="#71717a"
                  tick={{ fill: '#71717a' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#18181b', 
                    border: '1px solid #3f3f46',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: '#a1a1aa' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#06b6d4" 
                  strokeWidth={3}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sector Heatmap */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h3 className="text-zinc-100 mb-4">Sector Heatmap</h3>
          <div className="space-y-2">
            {heatmapData.map((sector) => {
              const isPositive = sector.change >= 0;
              const intensity = Math.min(Math.abs(sector.change) * 40, 100);
              
              return (
                <div
                  key={sector.sector}
                  className="rounded p-3 relative overflow-hidden"
                  style={{
                    backgroundColor: isPositive 
                      ? `rgba(16, 185, 129, ${intensity / 100})` 
                      : `rgba(239, 68, 68, ${intensity / 100})`,
                    height: `${sector.size * 3}px`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-white text-sm">{sector.sector}</span>
                    <span className={`text-sm ${isPositive ? 'text-emerald-200' : 'text-red-200'}`}>
                      {isPositive ? '+' : ''}{sector.change.toFixed(2)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Movers */}
        <div className="col-span-3 bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h3 className="text-zinc-100 mb-4">Top Movers</h3>
          <div className="space-y-3">
            {topMovers.map((stock) => {
              const isPositive = stock.change >= 0;
              
              return (
                <div 
                  key={stock.ticker}
                  className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded hover:border-cyan-600 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded flex items-center justify-center">
                      <span className="text-white text-sm">{stock.ticker.substring(0, 2)}</span>
                    </div>
                    <div>
                      <h4 className="text-zinc-100">{stock.ticker}</h4>
                      <p className="text-zinc-500 text-sm">{stock.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="text-zinc-100">{stock.price.toFixed(2)}p</p>
                      <p className="text-zinc-500 text-sm">Volume: {stock.volume}</p>
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
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
