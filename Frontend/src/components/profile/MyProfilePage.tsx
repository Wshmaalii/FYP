import { ArrowLeft, Shield, Calendar, MessageSquare, TrendingUp, Star } from 'lucide-react';

interface MyProfilePageProps {
  onBack: () => void;
  userName?: string;
  userEmail?: string;
}

const watchlistPreview = [
  { ticker: 'BARC.L', price: 186.5, change: 2.36 },
  { ticker: 'LLOY.L', price: 52.8, change: -2.22 },
  { ticker: 'VOD.L', price: 73.2, change: 1.11 },
];

export function MyProfilePage({ onBack, userName, userEmail }: MyProfilePageProps) {
  const displayName = userName || 'Alex Morgan';
  const initials = displayName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const derivedHandle = userEmail ? `@${userEmail.split('@')[0]}` : '@alexmorgan';

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900 p-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-zinc-400 hover:text-zinc-100 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back to channels</span>
        </button>

        <div className="flex items-start gap-6">
          {/* Profile Picture */}
          <div className="w-32 h-32 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-4xl">{initials}</span>
          </div>

          {/* Profile Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-white text-2xl">{displayName}</h1>
              <div className="flex items-center gap-1 px-3 py-1 bg-cyan-950 border border-cyan-800 rounded">
                <Shield className="w-4 h-4 text-cyan-400" />
                <span className="text-cyan-400 text-sm">Verified Trader</span>
              </div>
            </div>
            <p className="text-zinc-400 mb-3">{derivedHandle}</p>
            <p className="text-zinc-300 mb-4 max-w-xl">
              Day Trader • Options Focus • Specializing in UK equities and FTSE 100 constituents. 
              Trading since 2018. Not financial advice.
            </p>
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2 text-zinc-400">
                <Calendar className="w-4 h-4" />
                <span>Joined March 2021</span>
              </div>
            </div>
          </div>

          {/* Edit Profile Button */}
          <button className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded transition-colors">
            Edit Profile
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="border-b border-zinc-800 p-6">
        <h2 className="text-zinc-100 mb-4">Activity Summary</h2>
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-cyan-400" />
              <span className="text-zinc-500 text-sm">Messages Sent</span>
            </div>
            <p className="text-white text-2xl">2,847</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-zinc-500 text-sm">Tickers Shared</span>
            </div>
            <p className="text-white text-2xl">342</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-4 h-4 text-amber-400" />
              <span className="text-zinc-500 text-sm">Watchlist Items</span>
            </div>
            <p className="text-white text-2xl">18</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span className="text-zinc-500 text-sm">Trust Score</span>
            </div>
            <p className="text-white text-2xl">94%</p>
          </div>
        </div>
      </div>

      {/* Watchlist Preview */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-zinc-100">Watchlist Preview</h2>
          <button className="text-cyan-400 hover:text-cyan-300 text-sm transition-colors">
            View All
          </button>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {watchlistPreview.map((stock) => {
            const isPositive = stock.change >= 0;
            return (
              <div
                key={stock.ticker}
                className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-cyan-600 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-zinc-100">{stock.ticker}</span>
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                </div>
                <p className="text-white text-xl mb-1">{stock.price.toFixed(2)}p</p>
                <p className={`text-sm ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isPositive ? '+' : ''}{stock.change.toFixed(2)}%
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="p-6 border-t border-zinc-800">
        <h2 className="text-zinc-100 mb-4">Recent Activity</h2>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
            <div className="w-2 h-2 bg-emerald-400 rounded-full mt-2" />
            <div className="flex-1">
              <p className="text-zinc-300 text-sm">
                Shared analysis on <span className="text-cyan-400">BARC.L</span> in Market Chat
              </p>
              <p className="text-zinc-600 text-xs mt-1">2 hours ago</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
            <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2" />
            <div className="flex-1">
              <p className="text-zinc-300 text-sm">
                Added <span className="text-cyan-400">GSK.L</span> to watchlist
              </p>
              <p className="text-zinc-600 text-xs mt-1">5 hours ago</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
            <div className="w-2 h-2 bg-amber-400 rounded-full mt-2" />
            <div className="flex-1">
              <p className="text-zinc-300 text-sm">
                Joined Private Rooms channel
              </p>
              <p className="text-zinc-600 text-xs mt-1">Yesterday</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
