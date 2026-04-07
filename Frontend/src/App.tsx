import { useEffect, useMemo, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { MyProfilePage } from './components/profile/MyProfilePage';
import { AccountSettingsPage } from './components/profile/AccountSettingsPage';
import { TopMoversPage } from './components/pages/TopMoversPage';
import { WatchlistPage } from './components/pages/WatchlistPage';
import { MarketOverviewPage } from './components/pages/MarketOverviewPage';
import { StockDetailPage } from './components/pages/StockDetailPage';
import { NotificationsPage } from './components/pages/NotificationsPage';
import { LoginPage } from './components/auth/LoginPage';
import { SignupPage } from './components/auth/SignupPage';
import { ConversationPage } from './components/messaging/ConversationPage';
import { ExploreSpacesPage } from './components/messaging/ExploreSpacesPage';
import { PublicSpacesPage } from './components/messaging/PublicSpacesPage';
import { DirectMessagesPage } from './components/messaging/DirectMessagesPage';
import { PrivateRoomsPage } from './components/messaging/PrivateRoomsPage';
import { NewChatModal } from './components/messaging/NewChatModal';
import { AuthUser, clearStoredToken, getCurrentUser, getStoredToken, login, logout, signup } from './api/auth';
import { fetchMyProfile, type UserProfile } from './api/profile';
import { fetchNotifications, type NotificationRecord } from './api/notifications';
import { fetchSettings } from './api/settings';
import { applyDarkModePreference, restoreStoredThemePreference } from './theme';
import {
  createSpace,
  createDirectMessage,
  createPrivateGroup,
  fetchConversation,
  fetchMessagingSidebar,
  fetchSpaces,
  joinSpace,
  searchMessagingUsers,
  type ConversationSummary,
  type MessagingSidebarData,
  type MessagingUser,
} from './api/messaging';

export type View =
  | 'Explore Spaces'
  | 'Public Spaces'
  | 'Direct Messages'
  | 'Private Rooms'
  | 'Conversation'
  | 'My Profile'
  | 'Account Settings'
  | 'Top Movers'
  | 'Watchlist'
  | 'Market Overview'
  | 'Notifications'
  | 'Stock Detail';
type NavigableView = Exclude<View, 'Stock Detail'>;
type AuthView = 'login' | 'signup';
type AuthStatus = 'loading' | 'guest' | 'authed';

const EMPTY_SIDEBAR: MessagingSidebarData = {
  my_spaces: [],
  direct_messages: [],
  private_groups: [],
};

export default function App() {
  const [currentView, setCurrentView] = useState<View>(() => (
    typeof window !== 'undefined' && window.location.pathname === '/notifications'
      ? 'Notifications'
      : 'Explore Spaces'
  ));
  const [authView, setAuthView] = useState<AuthView>('login');
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  const [sidebarData, setSidebarData] = useState<MessagingSidebarData>(EMPTY_SIDEBAR);
  const [spaces, setSpaces] = useState<ConversationSummary[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationSummary | null>(null);
  const [selectedChannelKey, setSelectedChannelKey] = useState<string | null>(null);
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  const [stockDetailBackView, setStockDetailBackView] = useState<NavigableView>('Explore Spaces');
  const [conversationDraft, setConversationDraft] = useState<string | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<MessagingUser[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [joiningSpaceKey, setJoiningSpaceKey] = useState<string | null>(null);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);

  useEffect(() => {
    restoreStoredThemePreference();
  }, []);

  const refreshMessagingState = async () => {
    const [sidebar, publicSpaces] = await Promise.all([fetchMessagingSidebar(), fetchSpaces()]);
    setSidebarData(sidebar);
    setSpaces(publicSpaces.spaces);
    return { sidebar, publicSpaces: publicSpaces.spaces };
  };

  const openConversation = async (
    conversationKey: string,
    fallbackConversation?: ConversationSummary | null,
    preferredChannelKey: string | null = null,
  ) => {
    const conversation = fallbackConversation && fallbackConversation.conversation_key === conversationKey
      ? fallbackConversation
      : await fetchConversation(conversationKey);
    setSelectedConversation(conversation);
    setSelectedChannelKey(preferredChannelKey || conversation.channels[0]?.channel_key || null);
    setHighlightedMessageId(null);
    setCurrentView('Conversation');
  };

  const refreshNotificationSummary = async () => {
    try {
      const data = await fetchNotifications(1);
      setNotificationUnreadCount(data.unread_count);
    } catch {
      // Keep the existing badge state if refresh fails.
    }
  };

  useEffect(() => {
    const bootstrapAuth = async () => {
      const token = getStoredToken();

      if (!token) {
        setAuthStatus('guest');
        return;
      }

      try {
        const [user, profile] = await Promise.all([getCurrentUser(token), fetchMyProfile()]);
        setCurrentUser(user);
        setCurrentProfile(profile);
        try {
          const settings = await fetchSettings();
          applyDarkModePreference(settings.dark_mode);
        } catch {
          // Keep the last applied local theme if settings cannot be loaded.
        }
        const { sidebar } = await refreshMessagingState();
        setAuthStatus('authed');
        await refreshNotificationSummary();
        if (currentView !== 'Notifications' && sidebar.my_spaces.length > 0) {
          await openConversation(sidebar.my_spaces[0].conversation_key, sidebar.my_spaces[0]);
        } else if (currentView !== 'Notifications') {
          setCurrentView('Explore Spaces');
        }
      } catch {
        clearStoredToken();
        setAuthStatus('guest');
      }
    };

    void bootstrapAuth();
  }, []);

  const handleLogin = async (username: string, password: string) => {
    const user = await login(username, password);
    const profile = await fetchMyProfile();
    setCurrentUser(user);
    setCurrentProfile(profile);
    try {
      const settings = await fetchSettings();
      applyDarkModePreference(settings.dark_mode);
    } catch {
      // Keep the previously applied theme if settings fetch fails.
    }
    const { sidebar } = await refreshMessagingState();
    setAuthStatus('authed');
    await refreshNotificationSummary();
    if (currentView !== 'Notifications' && sidebar.my_spaces.length > 0) {
      await openConversation(sidebar.my_spaces[0].conversation_key, sidebar.my_spaces[0]);
    } else if (currentView !== 'Notifications') {
      setCurrentView('Explore Spaces');
    }
  };

  const handleSignup = async (username: string, password: string, name?: string) => {
    const user = await signup(username, password, name);
    const profile = await fetchMyProfile();
    setCurrentUser(user);
    setCurrentProfile(profile);
    try {
      const settings = await fetchSettings();
      applyDarkModePreference(settings.dark_mode);
    } catch {
      // Keep the previously applied theme if settings fetch fails.
    }
    await refreshMessagingState();
    setAuthStatus('authed');
    await refreshNotificationSummary();
    if (currentView !== 'Notifications') {
      setCurrentView('Explore Spaces');
    }
  };

  const handleLogout = async () => {
    await logout(getStoredToken());
    setCurrentUser(null);
    setCurrentProfile(null);
    setSidebarData(EMPTY_SIDEBAR);
    setSpaces([]);
    setSelectedConversation(null);
    setSelectedChannelKey(null);
    setNotificationUnreadCount(0);
    setAuthStatus('guest');
    setAuthView('login');
    setCurrentView('Explore Spaces');
  };

  const handleProfileUpdated = (profile: UserProfile) => {
    setCurrentProfile(profile);
    setCurrentUser((current) => (
      current
        ? {
            ...current,
            name: profile.full_name,
            username: profile.username,
          }
        : current
    ));
  };

  const handleAccountDeleted = () => {
    clearStoredToken();
    setCurrentUser(null);
    setCurrentProfile(null);
    setSidebarData(EMPTY_SIDEBAR);
    setSpaces([]);
    setSelectedConversation(null);
    setSelectedChannelKey(null);
    setSelectedStock(null);
    setConversationDraft(null);
    setHighlightedMessageId(null);
    setNewChatOpen(false);
    setSearchResults([]);
    setNotificationUnreadCount(0);
    setAuthStatus('guest');
    setAuthView('login');
    setCurrentView('Explore Spaces');
  };

  const openStockDetail = (ticker: string) => {
    if (currentView !== 'Stock Detail') {
      setStockDetailBackView(currentView);
    }
    setSelectedStock(ticker);
    setCurrentView('Stock Detail');
  };

  const handleMentionInChat = async (ticker: string) => {
    const draft = `$${ticker} `;
    setConversationDraft(draft);

    if (selectedConversation) {
      setCurrentView('Conversation');
      return;
    }

    if (sidebarData.my_spaces.length > 0) {
      await openConversation(sidebarData.my_spaces[0].conversation_key, sidebarData.my_spaces[0]);
      return;
    }

    if (spaces.length > 0) {
      const joined = await joinSpace(spaces[0].conversation_key);
      const { sidebar } = await refreshMessagingState();
      const joinedConversation = sidebar.my_spaces.find((space) => space.conversation_key === joined.conversation_key) || joined;
      await openConversation(joined.conversation_key, joinedConversation);
      return;
    }

    setCurrentView('Explore Spaces');
  };

  const handleJoinSpace = async (conversationKey: string) => {
    setJoiningSpaceKey(conversationKey);
    try {
      const joined = await joinSpace(conversationKey);
      const { sidebar } = await refreshMessagingState();
      const conversation = sidebar.my_spaces.find((space) => space.conversation_key === conversationKey) || joined;
      await openConversation(conversationKey, conversation);
    } finally {
      setJoiningSpaceKey(null);
    }
  };

  const handleSearchUsers = async (query: string) => {
    setSearchingUsers(true);
    try {
      const results = await searchMessagingUsers(query);
      setSearchResults(results);
    } finally {
      setSearchingUsers(false);
    }
  };

  const handleStartDm = async (username: string) => {
    const conversation = await createDirectMessage(username);
    const { sidebar } = await refreshMessagingState();
    const resolved = sidebar.direct_messages.find((item) => item.conversation_key === conversation.conversation_key) || conversation;
    await openConversation(conversation.conversation_key, resolved);
  };

  const handleCreateGroup = async (name: string, usernames: string[]) => {
    const conversation = await createPrivateGroup(name, usernames);
    const { sidebar } = await refreshMessagingState();
    const resolved = sidebar.private_groups.find((item) => item.conversation_key === conversation.conversation_key) || conversation;
    await openConversation(conversation.conversation_key, resolved);
  };

  const handleCreateSpace = async (name: string, description: string, visibility: 'public' | 'private') => {
    const conversation = await createSpace(name, description, visibility);
    const { sidebar, publicSpaces } = await refreshMessagingState();
    const resolved = sidebar.my_spaces.find((item) => item.conversation_key === conversation.conversation_key)
      || publicSpaces.find((item) => item.conversation_key === conversation.conversation_key)
      || conversation;
    await openConversation(conversation.conversation_key, resolved);
  };

  const headerTitle = useMemo(() => {
    if (currentView === 'Conversation' && selectedConversation) {
      return selectedConversation.name;
    }
    if (currentView === 'Explore Spaces' || currentView === 'Public Spaces' || currentView === 'Direct Messages' || currentView === 'Private Rooms') {
      return currentView;
    }
    if (currentView === 'Stock Detail' && selectedStock) {
      return selectedStock;
    }
    return currentView === 'My Profile' || currentView === 'Account Settings' ? currentView : 'TradeLink';
  }, [currentView, selectedConversation, selectedStock]);

  const headerSubtitle = useMemo(() => {
    if (currentView === 'Conversation' && selectedConversation) {
      if (selectedConversation.kind === 'direct_message') {
        return '@' + (selectedConversation.handle || selectedConversation.name.toLowerCase().replace(/\s+/g, ''));
      }
      if (selectedConversation.kind === 'private_group') {
        return 'Invite-only group';
      }
      const activeChannel = selectedConversation.channels.find((channel) => channel.channel_key === selectedChannelKey) || selectedConversation.channels[0];
      return activeChannel ? `#${activeChannel.slug}` : 'Public space';
    }
    if (currentView === 'Explore Spaces') {
      return 'Public spaces and private conversations';
    }
    if (currentView === 'Public Spaces') {
      return 'Joined public spaces';
    }
    if (currentView === 'Direct Messages') {
      return '1:1 conversations';
    }
    if (currentView === 'Private Rooms') {
      return 'Invite-only group conversations';
    }
    if (currentView === 'Market Overview') {
      return '#market-overview';
    }
    if (currentView === 'Watchlist') {
      return '#watchlist';
    }
    if (currentView === 'Notifications') {
      return 'Mentions and watchlist alerts';
    }
    return undefined;
  }, [currentView, selectedConversation, selectedChannelKey]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const desiredPath = currentView === 'Notifications' ? '/notifications' : '/';
    if (window.location.pathname !== desiredPath) {
      window.history.replaceState({ view: currentView }, '', desiredPath);
    }
  }, [currentView]);

  useEffect(() => {
    if (authStatus !== 'authed') {
      return;
    }

    void refreshNotificationSummary();
    const intervalId = window.setInterval(() => {
      void refreshNotificationSummary();
    }, 60000);

    return () => window.clearInterval(intervalId);
  }, [authStatus]);

  const sidebarSelectedView = useMemo<View>(() => {
    if (currentView === 'Conversation' && selectedConversation) {
      if (selectedConversation.kind === 'direct_message') {
        return 'Direct Messages';
      }
      return 'Conversation';
    }

    return currentView;
  }, [currentView, selectedConversation]);

  const renderView = () => {
    switch (currentView) {
      case 'Explore Spaces':
        return (
          <ExploreSpacesPage
            spaces={spaces}
            joiningKey={joiningSpaceKey}
            onJoin={handleJoinSpace}
            onOpen={(conversationKey) => void openConversation(conversationKey)}
          />
        );
      case 'Public Spaces':
        return (
          <PublicSpacesPage
            spaces={sidebarData.my_spaces}
            onOpen={(conversationKey) => void openConversation(conversationKey)}
          />
        );
      case 'Direct Messages':
        return (
          <DirectMessagesPage
            conversations={sidebarData.direct_messages}
            onOpen={(conversationKey) => void openConversation(conversationKey)}
          />
        );
      case 'Private Rooms':
        return (
          <PrivateRoomsPage
            conversations={sidebarData.private_groups}
            onOpen={(conversationKey) => void openConversation(conversationKey)}
          />
        );
      case 'Conversation':
        return selectedConversation ? (
          <ConversationPage
            conversation={selectedConversation}
            selectedChannelKey={selectedChannelKey}
            onChannelSelect={setSelectedChannelKey}
            prefilledMessage={conversationDraft}
            onDraftConsumed={() => setConversationDraft(null)}
            highlightedMessageId={highlightedMessageId}
            onHighlightConsumed={() => setHighlightedMessageId(null)}
          />
        ) : (
          <ExploreSpacesPage
            spaces={spaces}
            joiningKey={joiningSpaceKey}
            onJoin={handleJoinSpace}
            onOpen={(conversationKey) => void openConversation(conversationKey)}
          />
        );
      case 'My Profile':
        return (
          <MyProfilePage
            onBack={() => setCurrentView(selectedConversation ? 'Conversation' : 'Explore Spaces')}
            onViewWatchlist={() => setCurrentView('Watchlist')}
            onProfileUpdated={setCurrentProfile}
          />
        );
      case 'Account Settings':
        return (
          <AccountSettingsPage
            currentProfile={currentProfile}
            onBack={() => setCurrentView(selectedConversation ? 'Conversation' : 'Explore Spaces')}
            onProfileUpdated={handleProfileUpdated}
            onAccountDeleted={handleAccountDeleted}
          />
        );
      case 'Top Movers':
        return <TopMoversPage onBack={() => setCurrentView('Conversation')} />;
      case 'Watchlist':
        return <WatchlistPage onBack={() => setCurrentView(selectedConversation ? 'Conversation' : 'Explore Spaces')} onSelectStock={openStockDetail} />;
      case 'Market Overview':
        return <MarketOverviewPage onBack={() => setCurrentView(selectedConversation ? 'Conversation' : 'Explore Spaces')} onSelectStock={openStockDetail} />;
      case 'Notifications':
        return (
          <NotificationsPage
            onOpenMention={async (notification: NotificationRecord) => {
              if (notification.type !== 'mention') {
                return;
              }
              const payload = notification.payload as {
                conversation_key: string;
                channel_key: string;
                message_id: string;
              };
              await openConversation(payload.conversation_key, null, payload.channel_key);
              setHighlightedMessageId(payload.message_id);
            }}
            onOpenWatchlistAlert={openStockDetail}
            onUnreadCountChange={setNotificationUnreadCount}
          />
        );
      case 'Stock Detail':
        return selectedStock ? (
          <StockDetailPage
            ticker={selectedStock}
            onBack={() => setCurrentView(stockDetailBackView)}
            onMentionInChat={handleMentionInChat}
          />
        ) : (
          <MarketOverviewPage onBack={() => setCurrentView(selectedConversation ? 'Conversation' : 'Explore Spaces')} onSelectStock={openStockDetail} />
        );
      default:
        return null;
    }
  };

  if (authStatus === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: 'var(--bg-body)' }}>
        <div className="rounded-2xl px-5 py-4 text-sm shadow-[0_24px_64px_rgba(0,0,0,0.35)]" style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)', color: 'var(--text-muted)' }}>
          Checking session...
        </div>
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
    <div className="flex h-screen" style={{ background: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      <Sidebar
        selectedView={sidebarSelectedView}
        selectedConversationKey={selectedConversation?.conversation_key || null}
        selectedConversationKind={selectedConversation?.kind || null}
        mySpaces={sidebarData.my_spaces}
        onNavigate={setCurrentView}
        onOpenSpace={(conversationKey) => void openConversation(conversationKey)}
        onOpenComposer={() => setNewChatOpen(true)}
        onOpenStock={openStockDetail}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          currentView={currentView}
          onNavigate={setCurrentView}
          onLogout={handleLogout}
          userName={currentProfile?.full_name || currentUser?.name}
          userHandle={currentProfile?.username}
          avatarUrl={currentProfile?.avatar_url || undefined}
          avatarSeed={currentProfile?.avatar_seed}
          headerTitle={headerTitle}
          headerSubtitle={headerSubtitle}
          isPrivateConversation={selectedConversation?.kind === 'private_group' || selectedConversation?.kind === 'direct_message'}
          unreadNotificationCount={notificationUnreadCount}
        />
        {renderView()}
      </div>
      <NewChatModal
        isOpen={newChatOpen}
        searchResults={searchResults}
        searching={searchingUsers}
        onClose={() => setNewChatOpen(false)}
        onSearch={handleSearchUsers}
        onStartDm={handleStartDm}
        onCreateGroup={handleCreateGroup}
        onCreateSpace={handleCreateSpace}
      />
    </div>
  );
}
