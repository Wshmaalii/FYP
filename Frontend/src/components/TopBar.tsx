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
}

export function TopBar({ currentView, onNavigate, onLogout, userName, userHandle, avatarUrl, avatarSeed }: TopBarProps) {
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
  const displayTitle = isProfileView ? currentView : 'TradeLink';
  const displaySubtitle = !isProfileView ? `#${currentView}` : undefined;
  const displayName = userName || 'Trader';
  const initials = avatarSeed || displayName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="h-16 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded flex items-center justify-center">
          <span className="text-white">TL</span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-zinc-100">{displayTitle}</h1>
            {currentView === 'Private Rooms' && (
              <Lock className="w-4 h-4 text-cyan-400" />
            )}
          </div>
          {displaySubtitle && <p className="text-zinc-500 text-xs">{displaySubtitle}</p>}
        </div>
      </div>

      {/* Profile Menu */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          className="flex items-center gap-3 px-3 py-2 rounded hover:bg-zinc-800 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 text-sm">{displayName}</span>
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover rounded-full" />
              ) : (
                <span className="text-white text-sm">{initials}</span>
              )}
            </div>
          </div>
        </button>

        {showProfileMenu && (
          <div className="absolute right-0 mt-2 w-64 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl overflow-hidden z-50">
            <div className="p-4 border-b border-zinc-800 bg-zinc-950">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <span className="text-white">{initials}</span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-zinc-100">{displayName}</h3>
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
                className="w-full flex items-center gap-3 px-4 py-2 text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                <User className="w-4 h-4" />
                <span className="text-sm">My Profile</span>
              </button>
              <button
                onClick={() => {
                  onNavigate('Account Settings');
                  setShowProfileMenu(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2 text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span className="text-sm">Account Settings</span>
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-2 text-zinc-300 hover:bg-zinc-800 transition-colors">
                <Bell className="w-4 h-4" />
                <span className="text-sm">Notifications</span>
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-2 text-zinc-300 hover:bg-zinc-800 transition-colors">
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
                className="w-full flex items-center gap-3 px-4 py-2 text-red-400 hover:bg-zinc-800 transition-colors"
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
