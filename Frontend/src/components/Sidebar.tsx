import type { ReactNode } from 'react';
import { MessageSquare, Plus } from 'lucide-react';
import { MarketDashboard } from './MarketDashboard';
import { View } from '../App';
import type { ConversationSummary } from '../api/messaging';

interface SidebarProps {
  selectedView: View;
  selectedConversationKey: string | null;
  selectedConversationKind: ConversationSummary['kind'] | null;
  mySpaces: ConversationSummary[];
  onNavigate: (view: View) => void;
  onOpenSpace: (conversationKey: string) => void;
  onOpenComposer: () => void;
  onOpenStock: (ticker: string) => void;
  isMobileViewport?: boolean;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

const SPACE_DOT_COLORS = ['#4f6ef7', '#f59e0b', '#2dd4aa', '#f26b6b', '#8b5cf6', '#00c4a0'];

function getSpaceDotColor(seed: string, index: number) {
  const total = [...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return SPACE_DOT_COLORS[(total + index) % SPACE_DOT_COLORS.length];
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section style={{ paddingBottom: '0.75rem' }}>
      <h3
        style={{
          marginBottom: '0.75rem',
          color: 'var(--text-label)',
          fontSize: '9px',
          fontWeight: 500,
          letterSpacing: '0.26em',
          textTransform: 'uppercase',
        }}
      >
        {title}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>{children}</div>
    </section>
  );
}

function NavigationButton({
  label,
  icon: Icon,
  selected,
  onClick,
}: {
  label: string;
  icon?: typeof Globe;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-1.5 rounded-[10px] text-left transition-all duration-150"
      style={{
        background: selected ? 'var(--bg-active)' : 'transparent',
        color: selected ? 'var(--text-primary)' : 'var(--text-muted)',
        fontWeight: selected ? 500 : 400,
        fontSize: '11px',
        lineHeight: 1.35,
        letterSpacing: '-0.01em',
        padding: '0.45rem 0.5rem',
      }}
      onMouseEnter={(event) => {
        if (!selected) {
          event.currentTarget.style.background = 'var(--bg-hover)';
          event.currentTarget.style.color = 'var(--text-secondary)';
        }
      }}
      onMouseLeave={(event) => {
        if (!selected) {
          event.currentTarget.style.background = 'transparent';
          event.currentTarget.style.color = 'var(--text-muted)';
        }
      }}
    >
      {Icon ? (
        <Icon className="h-3.5 w-3.5 flex-shrink-0" style={{ color: selected ? 'var(--accent-teal)' : 'var(--text-subtle)' }} />
      ) : null}
      <span>{label}</span>
    </button>
  );
}

function DiscoverButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-[10px] text-left transition-all duration-150"
      style={{
        background: selected ? 'var(--bg-active)' : 'transparent',
        color: selected ? 'var(--text-primary)' : 'var(--text-muted)',
        fontWeight: selected ? 500 : 500,
        fontSize: '11px',
        lineHeight: 1.35,
        letterSpacing: '-0.01em',
        padding: '0.45rem 0.5rem',
      }}
      onMouseEnter={(event) => {
        if (!selected) {
          event.currentTarget.style.background = 'var(--bg-hover)';
          event.currentTarget.style.color = 'var(--text-secondary)';
        }
      }}
      onMouseLeave={(event) => {
        if (!selected) {
          event.currentTarget.style.background = 'transparent';
          event.currentTarget.style.color = 'var(--text-muted)';
        }
      }}
    >
      {label}
    </button>
  );
}

function SpaceButton({
  label,
  selected,
  dotColor,
  onClick,
}: {
  label: string;
  selected: boolean;
  dotColor: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center rounded-[10px] text-left transition-all duration-150"
      style={{
        alignItems: 'center',
        gap: '0.75rem',
        background: selected ? 'var(--bg-active)' : 'transparent',
        color: selected ? 'var(--text-primary)' : 'var(--text-muted)',
        fontSize: '11px',
        lineHeight: 1.35,
        letterSpacing: '-0.01em',
        padding: '0.45rem 0.5rem',
      }}
      onMouseEnter={(event) => {
        if (!selected) {
          event.currentTarget.style.background = 'var(--bg-hover)';
          event.currentTarget.style.color = 'var(--text-secondary)';
        }
      }}
      onMouseLeave={(event) => {
        if (!selected) {
          event.currentTarget.style.background = 'transparent';
          event.currentTarget.style.color = 'var(--text-muted)';
        }
      }}
    >
      <span
        style={{
          width: '0.65rem',
          height: '0.65rem',
          borderRadius: '999px',
          background: dotColor,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
    </button>
  );
}

export function Sidebar({
  selectedView,
  selectedConversationKey,
  selectedConversationKind,
  mySpaces,
  onNavigate,
  onOpenSpace,
  onOpenComposer,
  onOpenStock,
  isMobileViewport = false,
  isMobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const sidebarWidth = '12.75rem';
  const shouldRenderMobileSidebar = isMobileViewport && isMobileOpen;

  const handleOpenSpace = (conversationKey: string) => {
    onOpenSpace(conversationKey);
    onMobileClose?.();
  };

  const handleOpenComposer = () => {
    onOpenComposer();
    onMobileClose?.();
  };

  const handleOpenStock = (ticker: string) => {
    onOpenStock(ticker);
    onMobileClose?.();
  };

  const sidebarContent = (
    <aside
      className="flex shrink-0 flex-col overflow-x-hidden"
      style={{
        background: 'var(--bg-sidebar)',
        borderRight: '0.5px solid var(--border-secondary)',
        width: isMobileViewport ? 'min(85vw, 18rem)' : sidebarWidth,
        minWidth: isMobileViewport ? 'min(85vw, 18rem)' : sidebarWidth,
        maxWidth: isMobileViewport ? 'min(85vw, 18rem)' : sidebarWidth,
        flex: isMobileViewport ? '0 0 min(85vw, 18rem)' : `0 0 ${sidebarWidth}`,
        height: isMobileViewport ? '100dvh' : 'auto',
        position: isMobileViewport ? 'relative' : 'static',
        zIndex: isMobileViewport ? 30 : 'auto',
        boxShadow: isMobileViewport ? '0 20px 48px rgba(0,0,0,0.28)' : 'none',
        animation: isMobileViewport ? 'tl-mobile-sidebar-enter 180ms ease-out' : 'none',
      }}
    >
      <div
        style={{
          padding: '12px 12px 10px',
          borderBottom: '1px solid var(--border-primary)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            minHeight: '36px',
            marginBottom: '10px',
          }}
        >
          <div
            style={{
              display: 'flex',
              width: '34px',
              height: '34px',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '10px',
              background: '#63c4af',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 700,
            }}
          >
            TL
          </div>
          <span
            style={{
              color: 'var(--text-primary)',
              fontSize: '12px',
              fontWeight: 600,
              letterSpacing: '-0.01em',
              lineHeight: 1.2,
            }}
          >
            TradeLink
          </span>
        </div>
        <button
          type="button"
          onClick={handleOpenComposer}
          className="flex w-full items-center justify-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-medium transition-colors"
          style={{
            background: 'var(--accent-teal-bg)',
            border: '0.5px solid var(--accent-teal-border)',
            color: 'var(--accent-teal)',
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.background = 'var(--accent-teal-hover)';
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.background = 'var(--accent-teal-bg)';
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Chat</span>
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        <div
          style={{
            padding: '1rem 0.625rem 1rem',
            borderBottom: '1px solid var(--border-primary)',
          }}
        >
          <Section title="Discover">
            <DiscoverButton
              label="Explore Spaces"
              selected={selectedView === 'Explore Spaces'}
              onClick={() => onNavigate('Explore Spaces')}
            />
            <DiscoverButton
              label="Browse Communities"
              selected={selectedView === 'Public Spaces'}
              onClick={() => onNavigate('Public Spaces')}
            />
          </Section>

          <Section title="Messages">
            <NavigationButton
              label="Direct Messages"
              icon={MessageSquare}
              selected={selectedView === 'Direct Messages'}
              onClick={() => onNavigate('Direct Messages')}
            />
          </Section>
        </div>

        <div
          style={{
            padding: '1rem 0.625rem 1rem',
            borderBottom: '1px solid var(--border-primary)',
          }}
        >
          <Section title="My Spaces">
            {mySpaces.length > 0 ? mySpaces.map((space, index) => (
              <SpaceButton
                key={space.conversation_key}
                label={space.name}
                selected={selectedConversationKind === 'public_space' && selectedConversationKey === space.conversation_key}
                dotColor={getSpaceDotColor(space.conversation_key, index)}
                onClick={() => handleOpenSpace(space.conversation_key)}
              />
            )) : (
              <div
                style={{
                  color: 'var(--text-subtle)',
                  fontSize: '11px',
                  lineHeight: 1.5,
                  padding: '0.1rem 0.5rem 0',
                }}
              >
                No joined spaces yet.
              </div>
            )}
          </Section>
        </div>
      </div>

      <div className="min-w-0 overflow-hidden">
        <MarketDashboard onNavigate={onNavigate} onOpenStock={handleOpenStock} />
      </div>
    </aside>
  );

  if (isMobileViewport) {
    if (!shouldRenderMobileSidebar) {
      return null;
    }

    return (
      <>
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={onMobileClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.56)',
            border: 'none',
            padding: 0,
            margin: 0,
            zIndex: 20,
            animation: 'tl-mobile-backdrop-enter 160ms ease-out',
          }}
        />
        <div
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: 30,
          }}
        >
          {sidebarContent}
        </div>
      </>
    );
  }

  return sidebarContent;
}
