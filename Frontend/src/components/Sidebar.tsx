import { Hash, Lock, TrendingUp, MessageSquare } from 'lucide-react';
import { MarketDashboard } from './MarketDashboard';
import { View } from '../App';

interface SidebarProps {
  selectedChannel: View;
  onChannelSelect: (channel: View) => void;
}

const channels = [
  { id: 'FTSE100' as View, name: 'Markets', icon: TrendingUp, public: true },
  { id: 'Earnings Watch' as View, name: 'Earnings Watch', icon: Hash, public: true },
  { id: 'Market Chat' as View, name: 'Market Chat', icon: MessageSquare, public: true },
  { id: 'Private Rooms' as View, name: 'Private Rooms', icon: Lock, public: false },
];

export function Sidebar({ selectedChannel, onChannelSelect }: SidebarProps) {
  return (
    <div className="w-80 bg-zinc-950 border-r border-zinc-800 text-zinc-100 flex flex-col">
      {/* Workspace Header */}
      <div className="h-16 border-b border-zinc-800 flex items-center px-4">
        <div>
          <h2 className="text-white">TradeLink</h2>
        </div>
      </div>

      {/* Channels List */}
      <div className="border-b border-zinc-800 py-4">
        <div className="px-3 mb-2">
          <h3 className="text-zinc-500 text-xs uppercase tracking-wider px-2">Channels</h3>
        </div>
        <div className="space-y-1 px-2">
          {channels.map((channel) => {
            const Icon = channel.icon;
            const isSelected = selectedChannel === channel.id;
            
            return (
              <button
                key={channel.id}
                onClick={() => onChannelSelect(channel.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded transition-colors relative ${
                  isSelected
                    ? 'bg-cyan-600 text-white'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100'
                }`}
              >
                {isSelected && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400 rounded-r" />
                )}
                <Icon className="w-4 h-4" />
                <span className="text-sm">{channel.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Market Dashboard */}
      <MarketDashboard onNavigate={onChannelSelect} />
    </div>
  );
}
