import { useEffect, useState } from 'react';
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
import { StockDetailPage } from './components/pages/StockDetailPage';
import { LoginPage } from './components/auth/LoginPage';
import { SignupPage } from './components/auth/SignupPage';
import { AuthUser, clearStoredToken, getCurrentUser, getStoredToken, login, logout, signup } from './api/auth';
import { fetchMyProfile, type UserProfile } from './api/profile';

export type View = 'FTSE100' | 'Earnings Watch' | 'Market Chat' | 'Private Rooms' | 'My Profile' | 'Account Settings' | 'Top Movers' | 'Watchlist' | 'Market Overview' | 'Stock Detail';
type NavigableView = Exclude<View, 'Stock Detail'>;
type AuthView = 'login' | 'signup';
type AuthStatus = 'loading' | 'guest' | 'authed';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('Market Chat');
  const [authView, setAuthView] = useState<AuthView>('login');
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  const [marketChatDraft, setMarketChatDraft] = useState<string | null>(null);
  const [stockDetailBackView, setStockDetailBackView] = useState<NavigableView>('Market Overview');

  useEffect(() => {
    const bootstrapAuth = async () => {
      const token = getStoredToken();

      if (!token) {
        setAuthStatus('guest');
        return;
      }

      try {
        const user = await getCurrentUser(token);
        setCurrentUser(user);
        const profile = await fetchMyProfile();
        setCurrentProfile(profile);
        setAuthStatus('authed');
      } catch {
        clearStoredToken();
        setAuthStatus('guest');
      }
    };

    void bootstrapAuth();
  }, []);

  const handleLogin = async (email: string, password: string) => {
    const user = await login(email, password);
    const profile = await fetchMyProfile();
    setCurrentUser(user);
    setCurrentProfile(profile);
    setAuthStatus('authed');
  };

  const handleSignup = async (name: string, email: string, password: string) => {
    const user = await signup(name, email, password);
    const profile = await fetchMyProfile();
    setCurrentUser(user);
    setCurrentProfile(profile);
    setAuthStatus('authed');
  };

  const handleLogout = async () => {
    await logout(getStoredToken());
    setCurrentUser(null);
    setCurrentProfile(null);
    setAuthStatus('guest');
    setAuthView('login');
    setCurrentView('Market Chat');
  };

  const openStockDetail = (ticker: string) => {
    if (currentView !== 'Stock Detail') {
      setStockDetailBackView(currentView);
    }
    setSelectedStock(ticker);
    setCurrentView('Stock Detail');
  };

  const handleMentionInChat = (ticker: string) => {
    setMarketChatDraft(`$${ticker} `);
    setCurrentView('Market Chat');
  };

  const renderView = () => {
    switch (currentView) {
      case 'FTSE100':
        return <FTSE100Channel onSelectStock={openStockDetail} />;
      case 'Earnings Watch':
        return <EarningsWatchChannel />;
      case 'Market Chat':
        return <MarketChatChannel prefilledMessage={marketChatDraft} onDraftConsumed={() => setMarketChatDraft(null)} />;
      case 'Private Rooms':
        return <PrivateRoomsChannel />;
      case 'My Profile':
        return (
          <MyProfilePage
            onBack={() => setCurrentView('Market Chat')}
            onViewWatchlist={() => setCurrentView('Watchlist')}
            onProfileUpdated={setCurrentProfile}
          />
        );
      case 'Account Settings':
        return <AccountSettingsPage onBack={() => setCurrentView('Market Chat')} />;
      case 'Top Movers':
        return <TopMoversPage onBack={() => setCurrentView('FTSE100')} />;
      case 'Watchlist':
        return <WatchlistPage onBack={() => setCurrentView('FTSE100')} onSelectStock={openStockDetail} />;
      case 'Market Overview':
        return <MarketOverviewPage onBack={() => setCurrentView('FTSE100')} onSelectStock={openStockDetail} />;
      case 'Stock Detail':
        return selectedStock ? (
          <StockDetailPage
            ticker={selectedStock}
            onBack={() => setCurrentView(stockDetailBackView)}
            onMentionInChat={handleMentionInChat}
          />
        ) : (
          <MarketOverviewPage onBack={() => setCurrentView('FTSE100')} onSelectStock={openStockDetail} />
        );
      default:
        return <MarketChatChannel prefilledMessage={marketChatDraft} onDraftConsumed={() => setMarketChatDraft(null)} />;
    }
  };

  if (authStatus === 'loading') {
    return (
      <div className="flex h-screen bg-black items-center justify-center">
        <div className="text-zinc-400 text-sm">Checking session...</div>
      </div>
    );
  }

  if (authStatus === 'guest') {
    return authView === 'login' ? (
      <LoginPage onLogin={handleLogin} onSwitchToSignup={() => setAuthView('signup')} />
    ) : (
      <SignupPage onSignup={handleSignup} onSwitchToLogin={() => setAuthView('login')} />
    );
  }

  return (
    <div className="flex h-screen bg-black">
      <Sidebar selectedChannel={currentView} onChannelSelect={setCurrentView} onOpenStock={openStockDetail} />
      <div className="flex-1 flex flex-col">
        <TopBar
          currentView={currentView}
          onNavigate={setCurrentView}
          onLogout={handleLogout}
          userName={currentProfile?.full_name || currentUser?.name}
          userHandle={currentProfile?.username}
          avatarUrl={currentProfile?.avatar_url || undefined}
          avatarSeed={currentProfile?.avatar_seed}
        />
        {renderView()}
      </div>
    </div>
  );
}
