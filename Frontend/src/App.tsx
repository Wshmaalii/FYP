import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { FTSE100Channel } from './components/channels/FTSE100Channel';
import { EarningsWatchChannel } from './components/channels/EarningsWatchChannel';
import { MarketChatChannel } from './components/channels/MarketChatChannel';
import { PrivateRoomsChannel } from './components/channels/PrivateRoomsChannel';
import { MyProfilePage } from './components/profile/MyProfilePage';
import { AccountSettingsPage } from './components/profile/AccountSettingsPage';
import { TopMoversPage } from './components/pages/TopMoversPage';
import { WatchlistPage } from './components/pages/WatchlistPage';
import { MarketOverviewPage } from './components/pages/MarketOverviewPage';

export type View = 'FTSE100' | 'Earnings Watch' | 'Market Chat' | 'Private Rooms' | 'My Profile' | 'Account Settings' | 'Top Movers' | 'Watchlist' | 'Market Overview';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('Market Chat');

  const renderView = () => {
    switch (currentView) {
      case 'FTSE100':
        return <FTSE100Channel />;
      case 'Earnings Watch':
        return <EarningsWatchChannel />;
      case 'Market Chat':
        return <MarketChatChannel />;
      case 'Private Rooms':
        return <PrivateRoomsChannel />;
      case 'My Profile':
        return <MyProfilePage onBack={() => setCurrentView('Market Chat')} />;
      case 'Account Settings':
        return <AccountSettingsPage onBack={() => setCurrentView('Market Chat')} />;
      case 'Top Movers':
        return <TopMoversPage onBack={() => setCurrentView('FTSE100')} />;
      case 'Watchlist':
        return <WatchlistPage onBack={() => setCurrentView('FTSE100')} />;
      case 'Market Overview':
        return <MarketOverviewPage onBack={() => setCurrentView('FTSE100')} />;
      default:
        return <MarketChatChannel />;
    }
  };

  return (
    <div className="flex h-screen bg-black">
      <Sidebar selectedChannel={currentView} onChannelSelect={setCurrentView} />
      <div className="flex-1 flex flex-col">
        <TopBar currentView={currentView} onNavigate={setCurrentView} />
        {renderView()}
      </div>
    </div>
  );
}