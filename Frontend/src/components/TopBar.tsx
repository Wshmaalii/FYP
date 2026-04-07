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
    <div
      style={{
        display: 'flex',
        minHeight: '58px',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 18px 0 18px',
        background: 'var(--bg-sidebar)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          paddingLeft: '4px',
          minWidth: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            width: '38px',
            height: '38px',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 700,
            background: 'var(--accent-teal-bg)',
            color: 'var(--accent-teal)',
            border: '1px solid var(--accent-teal-border)',
          }}
        >
          TL
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <h1
              style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: 700,
                lineHeight: 1.2,
                letterSpacing: '-0.02em',
                color: 'var(--text-primary)',
              }}
            >
              {displayTitle}
            </h1>
            {isPrivateConversation && (
              <Lock className="w-4 h-4" style={{ color: 'var(--accent-teal)' }} />
            )}
          </div>
          {displaySubtitle ? (
            <p
              style={{
                margin: '3px 0 0',
                fontSize: '11px',
                lineHeight: 1.3,
                color: 'var(--text-faint)',
              }}
            >
              {displaySubtitle}
            </p>
          ) : null}
        </div>
      </div>

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '38px',
            height: '38px',
            borderRadius: '999px',
            padding: 0,
            background: 'var(--bg-card)',
            border: '1px solid rgba(255,255,255,0.08)',
            cursor: 'pointer',
            marginRight: '2px',
          }}
        >
          <div
            style={{
              display: 'flex',
              width: '30px',
              height: '30px',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '999px',
              boxShadow: '0 10px 24px rgba(8,145,178,0.18)',
              background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-teal))',
            }}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover rounded-full" />
            ) : (
              <span className="text-[11px] text-white">{initials}</span>
            )}
          </div>
        </button>

        {showProfileMenu && (
          <div
            className="absolute right-0 z-50 mt-3 w-72 overflow-hidden rounded-[18px] shadow-[0_28px_80px_rgba(0,0,0,0.45)]"
            style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)' }}
          >
            <div className="p-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full shadow-[0_12px_30px_rgba(8,145,178,0.18)]" style={{ background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-teal))' }}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <span className="text-white">{initials}</span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{displayName}</h3>
                    <Shield className="w-4 h-4" style={{ color: 'var(--accent-teal)' }} />
                  </div>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>@{userHandle || displayName.toLowerCase().replace(/\s+/g, '')}</p>
                </div>
              </div>
            </div>

            <div className="py-2">
              <button
                onClick={() => {
                  onNavigate('My Profile');
                  setShowProfileMenu(false);
                }}
                className="w-full flex items-center gap-3 px-5 py-3 transition-colors hover:bg-white/5"
                style={{ color: 'var(--text-muted)' }}
              >
                <User className="w-4 h-4" />
                <span className="text-sm">My Profile</span>
              </button>
              <button
                onClick={() => {
                  onNavigate('Account Settings');
                  setShowProfileMenu(false);
                }}
                className="w-full flex items-center gap-3 px-5 py-3 transition-colors hover:bg-white/5"
                style={{ color: 'var(--text-muted)' }}
              >
                <Settings className="w-4 h-4" />
                <span className="text-sm">Account Settings</span>
              </button>
              <button className="w-full flex items-center gap-3 px-5 py-3 transition-colors hover:bg-white/5" style={{ color: 'var(--text-muted)' }}>
                <Bell className="w-4 h-4" />
                <span className="text-sm">Notifications</span>
              </button>
              <button className="w-full flex items-center gap-3 px-5 py-3 transition-colors hover:bg-white/5" style={{ color: 'var(--text-muted)' }}>
                <Shield className="w-4 h-4" />
                <span className="text-sm">Verification Status</span>
              </button>
            </div>

            <div className="py-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
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
