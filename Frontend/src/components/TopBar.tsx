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
    <div className="flex h-20 items-center justify-between border-b border-zinc-800 bg-[linear-gradient(180deg,rgba(24,27,34,0.96),rgba(18,21,28,0.98))] px-6 shadow-[inset_0_-1px_0_rgba(255,255,255,0.02)]">
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-[18px] border border-zinc-700 bg-[linear-gradient(135deg,rgba(34,211,238,0.18),rgba(37,99,235,0.18))] shadow-[0_10px_24px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.05)]">
          <span className="text-sm font-semibold tracking-[0.18em] text-white">TL</span>
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-semibold tracking-tight text-zinc-50">{displayTitle}</h1>
            {isPrivateConversation && (
              <Lock className="w-4 h-4 text-cyan-400" />
            )}
          </div>
          {displaySubtitle && <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-zinc-500">{displaySubtitle}</p>}
        </div>
      </div>

      {/* Profile Menu */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          className="flex items-center gap-3 rounded-full border border-zinc-700/80 bg-zinc-950/70 px-3 py-2 transition-all duration-150 hover:border-zinc-600 hover:bg-zinc-800"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-300">{displayName}</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 shadow-[0_10px_24px_rgba(8,145,178,0.18)]">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover rounded-full" />
              ) : (
                <span className="text-white text-sm">{initials}</span>
              )}
            </div>
          </div>
        </button>

        {showProfileMenu && (
          <div className="absolute right-0 z-50 mt-3 w-72 overflow-hidden rounded-[28px] border border-zinc-800 bg-[linear-gradient(180deg,rgba(24,27,36,0.98),rgba(15,18,24,0.98))] shadow-[0_28px_80px_rgba(0,0,0,0.45)]">
            <div className="border-b border-zinc-800 bg-zinc-950/90 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 shadow-[0_12px_30px_rgba(8,145,178,0.18)]">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <span className="text-white">{initials}</span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-zinc-100">{displayName}</h3>
                    <Shield className="w-4 h-4 text-cyan-400" />
                  </div>
                  <p className="text-zinc-500 text-sm">@{userHandle || displayName.toLowerCase().replace(/\s+/g, '')}</p>
                </div>
              </div>
            </div>

            <div className="py-2">
              <button
                onClick={() => {
                  onNavigate('My Profile');
                  setShowProfileMenu(false);
                }}
                className="w-full flex items-center gap-3 px-5 py-3 text-zinc-300 transition-colors hover:bg-zinc-800"
              >
                <User className="w-4 h-4" />
                <span className="text-sm">My Profile</span>
              </button>
              <button
                onClick={() => {
                  onNavigate('Account Settings');
                  setShowProfileMenu(false);
                }}
                className="w-full flex items-center gap-3 px-5 py-3 text-zinc-300 transition-colors hover:bg-zinc-800"
              >
                <Settings className="w-4 h-4" />
                <span className="text-sm">Account Settings</span>
              </button>
              <button className="w-full flex items-center gap-3 px-5 py-3 text-zinc-300 transition-colors hover:bg-zinc-800">
                <Bell className="w-4 h-4" />
                <span className="text-sm">Notifications</span>
              </button>
              <button className="w-full flex items-center gap-3 px-5 py-3 text-zinc-300 transition-colors hover:bg-zinc-800">
                <Shield className="w-4 h-4" />
                <span className="text-sm">Verification Status</span>
              </button>
            </div>

            <div className="border-t border-zinc-800 py-2">
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  void onLogout();
                }}
                className="w-full flex items-center gap-3 px-5 py-3 text-red-400 transition-colors hover:bg-zinc-800"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Log Out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
