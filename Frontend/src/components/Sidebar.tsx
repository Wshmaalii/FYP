import type { ReactNode } from 'react';
import { Globe, Lock, MessageSquare, Plus } from 'lucide-react';
import { MarketDashboard } from './MarketDashboard';
import { View } from '../App';

interface SidebarProps {
  selectedView: View;
  onNavigate: (view: View) => void;
  onOpenComposer: () => void;
  onOpenStock: (ticker: string) => void;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="pb-2.5">
      <h3
        className="mb-1 px-0 text-[9px] font-medium uppercase tracking-[0.22em]"
        style={{ color: 'rgba(255,255,255,0.24)', fontWeight: 500 }}
      >
        {title}
      </h3>
      <div className="space-y-0.5">{children}</div>
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
      className="flex w-full items-center gap-1.5 rounded-[10px] px-2 py-1.5 text-left text-[11px] font-normal leading-[1.35] tracking-[-0.01em] transition-all duration-150"
      style={{
        background: selected ? 'rgba(255,255,255,0.085)' : 'transparent',
        color: selected ? 'rgba(255,255,255,0.84)' : 'rgba(255,255,255,0.52)',
        fontWeight: selected ? 500 : 400,
      }}
      onMouseEnter={(event) => {
        if (!selected) {
          event.currentTarget.style.background = 'rgba(255,255,255,0.03)';
          event.currentTarget.style.color = 'rgba(255,255,255,0.66)';
        }
      }}
      onMouseLeave={(event) => {
        if (!selected) {
          event.currentTarget.style.background = 'transparent';
          event.currentTarget.style.color = 'rgba(255,255,255,0.52)';
        }
      }}
    >
      {Icon ? (
        <Icon className="h-3.5 w-3.5 flex-shrink-0" style={{ color: selected ? '#67c8b5' : 'rgba(255,255,255,0.34)' }} />
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
      className="w-full rounded-[10px] px-2 py-[6px] text-left text-[11px] font-normal leading-[1.35] tracking-[-0.01em] transition-all duration-150"
      style={{
        background: selected ? 'rgba(255,255,255,0.085)' : 'transparent',
        color: selected ? 'rgba(255,255,255,0.84)' : 'rgba(255,255,255,0.52)',
        fontWeight: selected ? 500 : 500,
      }}
      onMouseEnter={(event) => {
        if (!selected) {
          event.currentTarget.style.background = 'rgba(255,255,255,0.03)';
          event.currentTarget.style.color = 'rgba(255,255,255,0.66)';
        }
      }}
      onMouseLeave={(event) => {
        if (!selected) {
          event.currentTarget.style.background = 'transparent';
          event.currentTarget.style.color = 'rgba(255,255,255,0.52)';
        }
      }}
    >
      {label}
    </button>
  );
}

export function Sidebar({
  selectedView,
  onNavigate,
  onOpenComposer,
  onOpenStock,
}: SidebarProps) {
  return (
    <aside
      className="flex w-[11.75rem] min-w-[11.75rem] flex-col"
      style={{ background: '#111214', borderRight: '0.5px solid rgba(255,255,255,0.05)' }}
    >
      <div className="px-2.5 pb-2 pt-3" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
        <div className="mb-2 flex items-center gap-1.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-[10px] text-[10px] font-bold text-white"
            style={{ background: '#63c4af' }}
          >
            TL
          </div>
          <span className="text-[11px] font-medium tracking-[-0.01em]" style={{ color: 'rgba(255,255,255,0.84)' }}>
            TradeLink
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenComposer}
          className="flex w-full items-center justify-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-medium transition-colors"
          style={{
            background: 'rgba(99,196,175,0.09)',
            border: '0.5px solid rgba(99,196,175,0.24)',
            color: '#67c8b5',
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.background = 'rgba(99,196,175,0.12)';
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.background = 'rgba(99,196,175,0.09)';
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Chat</span>
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="px-2.5 pb-3 pt-3" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
          <div
            className="mb-1 px-0 text-[9px] font-medium uppercase tracking-[0.22em]"
            style={{ color: 'rgba(255,255,255,0.26)', fontWeight: 500 }}
          >
            Discover
          </div>
          <div className="space-y-0.5">
            <DiscoverButton
              label="Explore Spaces"
              selected={selectedView === 'Explore Spaces'}
              onClick={() => onNavigate('Explore Spaces')}
            />
          </div>
        </div>

        <div className="px-2.5 pb-1.5 pt-2.5">
          <Section title="Messaging">
            <NavigationButton
              label="Public Spaces"
              icon={Globe}
              selected={selectedView === 'Public Spaces'}
              onClick={() => onNavigate('Public Spaces')}
            />
            <NavigationButton
              label="Direct Messages"
              icon={MessageSquare}
              selected={selectedView === 'Direct Messages'}
              onClick={() => onNavigate('Direct Messages')}
            />
            <NavigationButton
              label="Private Rooms"
              icon={Lock}
              selected={selectedView === 'Private Rooms'}
              onClick={() => onNavigate('Private Rooms')}
            />
          </Section>
        </div>
      </div>

      <div style={{ borderTop: '0.5px solid var(--border-subtle)' }}>
        <MarketDashboard onNavigate={onNavigate} onOpenStock={onOpenStock} />
      </div>
    </aside>
  );
}
