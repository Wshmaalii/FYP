import type { ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { MarketDashboard } from './MarketDashboard';
import type { ConversationSummary } from '../api/messaging';
import { View } from '../App';

interface SidebarProps {
  selectedView: View;
  selectedConversationKey: string | null;
  mySpaces: ConversationSummary[];
  directMessages: ConversationSummary[];
  privateGroups: ConversationSummary[];
  onNavigate: (view: View) => void;
  onOpenConversation: (conversationKey: string) => void;
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
    <section className="pb-3.5">
      <h3
        className="mb-1.5 px-1 text-[9px] font-medium uppercase tracking-[0.26em]"
        style={{ color: 'rgba(255,255,255,0.24)', fontWeight: 500 }}
      >
        {title}
      </h3>
      <div className="space-y-0.5">{children}</div>
    </section>
  );
}

function EmptyState({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return (
    <div
      className={`rounded-[7px] px-2.5 ${compact ? 'py-1' : 'py-1.5'} text-[11px] leading-[1.4]`}
      style={{ color: 'rgba(255,255,255,0.27)' }}
    >
      {children}
    </div>
  );
}

function DiscoverButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-[10px] px-3 py-[6px] text-left text-[11px] font-normal leading-[1.35] tracking-[-0.01em] transition-all duration-150"
      style={{
        background: 'transparent',
        color: 'rgba(255,255,255,0.52)',
        fontWeight: 500,
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.background = 'rgba(255,255,255,0.03)';
        event.currentTarget.style.color = 'rgba(255,255,255,0.66)';
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.background = 'transparent';
        event.currentTarget.style.color = 'rgba(255,255,255,0.52)';
      }}
    >
      {label}
    </button>
  );
}

function ConversationButton({
  label,
  dotColor,
  selected,
  onClick,
}: {
  label: string;
  dotColor: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-[14px] px-3 py-1.5 text-left transition-all duration-150 active:translate-y-px"
      style={{
        background: selected ? 'rgba(255,255,255,0.085)' : 'transparent',
        color: selected ? 'rgba(255,255,255,0.84)' : 'rgba(255,255,255,0.41)',
      }}
      onMouseEnter={(event) => {
        if (!selected) {
          event.currentTarget.style.background = 'rgba(255,255,255,0.03)';
        }
      }}
      onMouseLeave={(event) => {
        if (!selected) {
          event.currentTarget.style.background = 'transparent';
        }
      }}
    >
      <span
        className="h-[8px] w-[8px] flex-shrink-0 rounded-full"
        style={{ background: dotColor }}
      />
      <span className="truncate text-[11px] font-normal tracking-[-0.01em]" style={{ fontWeight: selected ? 500 : 400 }}>{label}</span>
    </button>
  );
}

export function Sidebar({
  selectedView,
  selectedConversationKey,
  mySpaces,
  directMessages,
  privateGroups,
  onNavigate,
  onOpenConversation,
  onOpenComposer,
  onOpenStock,
}: SidebarProps) {
  return (
    <aside
      className="flex w-60 min-w-60 flex-col"
      style={{ background: '#111214', borderRight: '0.5px solid rgba(255,255,255,0.05)' }}
    >
      <div className="px-4 pb-2.5 pt-4" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
        <div className="mb-2.5 flex items-center gap-2">
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
          className="flex w-full items-center justify-center gap-1.5 rounded-full px-4 py-1.5 text-[11px] font-medium transition-colors"
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
        <div className="px-4 pb-4 pt-4" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
          <div
            className="mb-1.5 px-1 text-[9px] font-medium uppercase tracking-[0.26em]"
            style={{ color: 'rgba(255,255,255,0.26)', fontWeight: 500 }}
          >
            Discover
          </div>
          <div className="space-y-1">
            <DiscoverButton
              label="Explore Spaces"
              onClick={() => onNavigate('Explore Spaces')}
            />
          </div>
        </div>

        <div className="px-4 pb-2.5 pt-3.5">
          <Section title="Public Spaces">
            {mySpaces.length === 0 ? (
              <EmptyState compact>Create or join a public space to get started.</EmptyState>
            ) : (
              mySpaces.map((space) => (
                <ConversationButton
                  key={space.conversation_key}
                  label={space.name}
                  dotColor="var(--accent-blue)"
                  selected={selectedConversationKey === space.conversation_key}
                  onClick={() => onOpenConversation(space.conversation_key)}
                />
              ))
            )}
          </Section>

          <Section title="Direct Messages">
            {directMessages.length === 0 ? (
              <EmptyState compact>Start a direct message from New Chat.</EmptyState>
            ) : (
              directMessages.map((dm) => (
                <ConversationButton
                  key={dm.conversation_key}
                  label={dm.name}
                  dotColor="var(--accent-teal)"
                  selected={selectedConversationKey === dm.conversation_key}
                  onClick={() => onOpenConversation(dm.conversation_key)}
                />
              ))
            )}
          </Section>

          <Section title="Private Rooms">
            {privateGroups.length === 0 ? (
              <EmptyState compact>Create a private room for invite-only discussions.</EmptyState>
            ) : (
              privateGroups.map((group) => (
                <ConversationButton
                  key={group.conversation_key}
                  label={group.name}
                  dotColor="var(--color-red)"
                  selected={selectedConversationKey === group.conversation_key}
                  onClick={() => onOpenConversation(group.conversation_key)}
                />
              ))
            )}
          </Section>
        </div>
      </div>

      <div style={{ borderTop: '0.5px solid var(--border-subtle)' }}>
        <MarketDashboard onNavigate={onNavigate} onOpenStock={onOpenStock} />
      </div>
    </aside>
  );
}
