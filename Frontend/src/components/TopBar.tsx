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
    <div className="tl-topbar flex items-center justify-between px-6">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[rgba(0,196,160,0.15)] text-[11px] font-bold tracking-[0.08em] text-[var(--tl-accent)]">
          TL
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="tl-page-title truncate">{displayTitle}</h1>
            {isPrivateConversation && (
              <Lock className="w-4 h-4 text-cyan-400" />
            )}
          </div>
          {displaySubtitle && <p className="tl-page-subtitle truncate">{displaySubtitle}</p>}
        </div>
      </div>

      {/* Profile Menu */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          className="flex items-center gap-3 rounded-full border border-white/6 bg-white/[0.02] px-1.5 py-1.5 transition-all duration-150 hover:border-white/10 hover:bg-white/[0.04]"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--tl-text-secondary)]">{displayName}</span>
            <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[#4f6ef7]">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover rounded-full" />
              ) : (
                <span className="text-[11px] font-semibold text-white">{initials}</span>
              )}
            </div>
          </div>
        </button>

        {showProfileMenu && (
          <div className="absolute right-0 z-50 mt-3 w-72 overflow-hidden rounded-[20px] border border-white/8 bg-[#161618] shadow-[0_28px_80px_rgba(0,0,0,0.45)]">
            <div className="border-b border-white/6 bg-black/10 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#4f6ef7]">
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
                className="w-full flex items-center gap-3 px-5 py-3 text-zinc-300 transition-colors hover:bg-white/5"
              >
                <User className="w-4 h-4" />
                <span className="text-sm">My Profile</span>
              </button>
              <button
                onClick={() => {
                  onNavigate('Account Settings');
                  setShowProfileMenu(false);
                }}
                className="w-full flex items-center gap-3 px-5 py-3 text-zinc-300 transition-colors hover:bg-white/5"
              >
                <Settings className="w-4 h-4" />
                <span className="text-sm">Account Settings</span>
              </button>
              <button className="w-full flex items-center gap-3 px-5 py-3 text-zinc-300 transition-colors hover:bg-white/5">
                <Bell className="w-4 h-4" />
                <span className="text-sm">Notifications</span>
              </button>
              <button className="w-full flex items-center gap-3 px-5 py-3 text-zinc-300 transition-colors hover:bg-white/5">
                <Shield className="w-4 h-4" />
                <span className="text-sm">Verification Status</span>
              </button>
            </div>

            <div className="border-t border-white/6 py-2">
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  void onLogout();
                }}
                className="w-full flex items-center gap-3 px-5 py-3 text-red-400 transition-colors hover:bg-white/5"
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
