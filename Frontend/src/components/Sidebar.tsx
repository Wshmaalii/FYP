import type { ReactNode } from 'react';
import { Compass, Hash, Lock, MessageSquare, MessageSquarePlus } from 'lucide-react';
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

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div
      className="rounded-[10px] px-3 py-2.5 text-[12px] leading-5"
      style={{ color: 'var(--text-label)' }}
    >
      {children}
    </div>
  );
}

function ConversationButton({
  label,
  meta,
  icon: Icon,
  tone,
  selected,
  onClick,
}: {
  label: string;
  meta?: string;
  icon: typeof Compass;
  tone: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-[10px] border px-3 py-2 text-left transition-all duration-150 active:translate-y-px"
      style={{
        background: selected ? 'var(--bg-active)' : 'transparent',
        borderColor: selected ? 'var(--border-secondary)' : 'transparent',
        color: selected ? 'var(--text-primary)' : 'var(--text-muted)',
      }}
    >
      <div className="flex items-start gap-2.5">
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[8px]" style={{ background: selected ? 'rgba(255,255,255,0.04)' : 'transparent' }}>
          <Icon className="h-3.5 w-3.5" style={{ color: tone }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium leading-5">{label}</div>
          {meta ? (
            <div
              className="mt-0.5 truncate text-[11px] leading-4"
              style={{ color: selected ? 'var(--text-secondary)' : 'var(--text-label)' }}
            >
              {meta}
            </div>
          ) : null}
        </div>
      </div>
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
      className="flex w-72 min-w-72 flex-col"
      style={{ background: 'var(--bg-sidebar)', borderRight: '1px solid var(--border-secondary)' }}
    >
      <div className="px-4 pb-3 pt-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="mb-3 flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-[10px] text-[11px] font-semibold text-white"
            style={{ background: 'var(--accent-teal)' }}
          >
            TL
          </div>
          <div>
            <p className="text-[13px] font-semibold tracking-[0.4px]" style={{ color: 'var(--text-primary)' }}>TradeLink</p>
            <p className="text-[11px]" style={{ color: 'var(--text-label)' }}>Secure messaging</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenComposer}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[12px] font-medium transition-colors"
          style={{
            background: 'var(--accent-teal-bg)',
            border: '0.5px solid var(--accent-teal-border)',
            color: 'var(--accent-teal)',
          }}
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span>New Chat</span>
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <Section title="Discover">
          <ConversationButton
            label="Explore Spaces"
            meta="Browse public communities"
            icon={Compass}
            tone="var(--accent-teal)"
            selected={selectedView === 'Explore Spaces'}
            onClick={() => onNavigate('Explore Spaces')}
          />
        </Section>

        <Section title="My Spaces">
          {mySpaces.length === 0 ? (
            <EmptyState>Create or join a space to get started.</EmptyState>
          ) : (
            mySpaces.map((space) => (
              <ConversationButton
                key={space.conversation_key}
                label={space.name}
                meta={space.channels.map((channel) => `#${channel.slug}`).join(' • ')}
                icon={Hash}
                tone="var(--accent-blue)"
                selected={selectedConversationKey === space.conversation_key}
                onClick={() => onOpenConversation(space.conversation_key)}
              />
            ))
          )}
        </Section>

        <Section title="Direct Messages">
          {directMessages.length === 0 ? (
            <EmptyState>Start a direct message from New Chat.</EmptyState>
          ) : (
            directMessages.map((dm) => (
              <ConversationButton
                key={dm.conversation_key}
                label={dm.name}
                meta={dm.handle ? `@${dm.handle}` : 'Direct message'}
                icon={MessageSquare}
                tone="var(--accent-teal)"
                selected={selectedConversationKey === dm.conversation_key}
                onClick={() => onOpenConversation(dm.conversation_key)}
              />
            ))
          )}
        </Section>

        <Section title="Private Groups">
          {privateGroups.length === 0 ? (
            <EmptyState>Create a private group for invite-only discussions.</EmptyState>
          ) : (
            privateGroups.map((group) => (
              <ConversationButton
                key={group.conversation_key}
                label={group.name}
                meta={`${group.member_count} invited members`}
                icon={Lock}
                tone="var(--color-orange)"
                selected={selectedConversationKey === group.conversation_key}
                onClick={() => onOpenConversation(group.conversation_key)}
              />
            ))
          )}
        </Section>
      </div>

      <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <MarketDashboard onNavigate={onNavigate} onOpenStock={onOpenStock} />
      </div>
    </aside>
  );
}
