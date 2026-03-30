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
    <section className="pb-5">
      <h3
        className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[1.2px]"
        style={{ color: 'var(--text-label)' }}
      >
        {title}
      </h3>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function EmptyState({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return (
    <div
      className={`rounded-[7px] px-2 ${compact ? 'py-1.5' : 'py-2'} text-[12px] leading-5`}
      style={{ color: 'var(--text-label)' }}
    >
      {children}
    </div>
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
      className="w-full rounded-[7px] px-2 py-[7px] text-left text-[13px] transition-all duration-150 active:translate-y-px"
      style={{
        background: selected ? 'var(--bg-active)' : 'transparent',
        color: selected ? 'var(--text-secondary)' : 'var(--text-muted)',
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
      className="flex w-full items-center gap-2 rounded-[7px] px-2 py-1.5 text-left transition-all duration-150 active:translate-y-px"
      style={{
        background: selected ? 'var(--bg-active)' : 'transparent',
        color: selected ? 'var(--text-primary)' : 'var(--text-subtle)',
      }}
      onMouseEnter={(event) => {
        if (!selected) {
          event.currentTarget.style.background = 'var(--bg-hover)';
        }
      }}
      onMouseLeave={(event) => {
        if (!selected) {
          event.currentTarget.style.background = 'transparent';
        }
      }}
    >
      <span
        className="h-2 w-2 flex-shrink-0 rounded-full"
        style={{ background: dotColor }}
      />
      <span className="truncate text-[13px]">{label}</span>
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
      style={{ background: 'var(--bg-sidebar)', borderRight: '0.5px solid var(--border-secondary)' }}
    >
      <div className="px-4 pb-3 pt-[18px]" style={{ borderBottom: '0.5px solid var(--border-subtle)' }}>
        <div className="mb-[14px] flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-[7px] text-[11px] font-bold text-white"
            style={{ background: 'var(--accent-teal)' }}
          >
            TL
          </div>
          <span className="text-[13px] font-semibold tracking-[0.5px]" style={{ color: 'var(--text-primary)' }}>
            TradeLink
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenComposer}
          className="flex w-full items-center justify-center gap-1.5 rounded-[18px] px-3 py-2 text-[12px] font-medium transition-colors"
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

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="px-4 pb-2 pt-[14px]" style={{ borderBottom: '0.5px solid var(--border-subtle)' }}>
          <Section title="Discover">
            <DiscoverButton
              label="Explore Spaces"
              selected={selectedView === 'Explore Spaces'}
              onClick={() => onNavigate('Explore Spaces')}
            />
            <DiscoverButton
              label="Browse Communities"
              selected={false}
              onClick={() => onNavigate('Explore Spaces')}
            />
          </Section>
        </div>

        <div className="px-4 pb-4 pt-[14px]">
          <Section title="My Spaces">
            {mySpaces.length === 0 ? (
              <EmptyState compact>Create or join a space to get started.</EmptyState>
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

          <Section title="Private Groups">
            {privateGroups.length === 0 ? (
              <EmptyState compact>Create a private group for invite-only discussions.</EmptyState>
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
