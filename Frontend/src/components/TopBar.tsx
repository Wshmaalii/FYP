import { useState, useRef, useEffect } from 'react';
import { User, Settings, Bell, Shield, LogOut, Lock } from 'lucide-react';
import { View } from '../App';

interface TopBarProps {
  currentView: View;
  onNavigate: (view: View) => void;
  onLogout: () => Promise<void>;
  userName?: string;
  userHandle?: string;
  avatarUrl?: string;
  avatarSeed?: string;
  headerTitle?: string;
  headerSubtitle?: string;
  isPrivateConversation?: boolean;
}

export function TopBar({
  currentView,
  onNavigate,
  onLogout,
  userName,
  userHandle,
  avatarUrl,
  avatarSeed,
  headerTitle,
  headerSubtitle,
  isPrivateConversation = false,
}: TopBarProps) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isProfileView = currentView === 'My Profile' || currentView === 'Account Settings';
  const displayTitle = headerTitle || (isProfileView ? currentView : 'TradeLink');
  const displaySubtitle = headerSubtitle || undefined;
  const displayName = userName || 'Trader';
  const initials = avatarSeed || displayName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex h-16 items-center justify-between border-b border-zinc-800/80 bg-[#0d1113] px-5 lg:px-6">
      <div className="flex min-w-0 items-center gap-3.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-700/80 bg-zinc-900 text-[11px] font-semibold tracking-[0.22em] text-[#a6d4cf]">
          <span>TL</span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-[15px] font-semibold tracking-tight text-zinc-50">{displayTitle}</h1>
            {isPrivateConversation && (
              <Lock className="h-3.5 w-3.5 text-[#8fc8c1]" />
            )}
          </div>
          {displaySubtitle && <p className="mt-0.5 truncate text-[10px] uppercase tracking-[0.22em] text-zinc-500">{displaySubtitle}</p>}
        </div>
      </div>

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          className="flex items-center gap-3 rounded-full border border-zinc-700/80 bg-zinc-950/70 px-2.5 py-1.5 transition-colors duration-150 hover:border-zinc-600 hover:bg-zinc-900"
        >
          <div className="flex items-center gap-2">
            <span className="max-w-[120px] truncate text-[13px] text-zinc-300">{displayName}</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 bg-[#17302e] text-[#d8f1ed]">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover rounded-full" />
              ) : (
                <span className="text-xs font-medium">{initials}</span>
              )}
            </div>
          </div>
        </button>

        {showProfileMenu && (
          <div className="absolute right-0 z-50 mt-2.5 w-72 overflow-hidden rounded-2xl border border-zinc-800 bg-[#111518] shadow-[0_20px_60px_rgba(0,0,0,0.42)]">
            <div className="border-b border-zinc-800 bg-zinc-950/70 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-700 bg-[#17302e] text-[#d8f1ed]">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <span className="text-sm font-medium">{initials}</span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-zinc-100">{displayName}</h3>
                    <Shield className="w-4 h-4 text-[#8fc8c1]" />
                  </div>
                  <p className="text-sm text-zinc-500">@{userHandle || displayName.toLowerCase().replace(/\s+/g, '')}</p>
                </div>
              </div>
            </div>

            <div className="py-2">
              <button
                onClick={() => {
                  onNavigate('My Profile');
                  setShowProfileMenu(false);
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-zinc-300 transition-colors hover:bg-zinc-800/80"
              >
                <User className="w-4 h-4" />
                <span className="text-[13px]">My Profile</span>
              </button>
              <button
                onClick={() => {
                  onNavigate('Account Settings');
                  setShowProfileMenu(false);
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-zinc-300 transition-colors hover:bg-zinc-800/80"
              >
                <Settings className="w-4 h-4" />
                <span className="text-[13px]">Account Settings</span>
              </button>
              <button className="flex w-full items-center gap-3 px-4 py-3 text-zinc-300 transition-colors hover:bg-zinc-800/80">
                <Bell className="w-4 h-4" />
                <span className="text-[13px]">Notifications</span>
              </button>
              <button className="flex w-full items-center gap-3 px-4 py-3 text-zinc-300 transition-colors hover:bg-zinc-800/80">
                <Shield className="w-4 h-4" />
                <span className="text-[13px]">Verification Status</span>
              </button>
            </div>

            <div className="border-t border-zinc-800 py-2">
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  void onLogout();
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-red-400 transition-colors hover:bg-zinc-800/80"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-[13px]">Log Out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
