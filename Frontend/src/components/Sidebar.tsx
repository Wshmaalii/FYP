import type { ReactNode } from 'react';
import { MessageSquarePlus } from 'lucide-react';
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
    <div className="px-4 py-3">
      <div className="pb-3">
        <h3 className="text-[10px] font-semibold uppercase tracking-[1.2px] text-[var(--text-muted)]">{title}</h3>
      </div>
      <div className="space-y-1">
        {children}
      </div>
    </div>
  );
}

function ConversationButton({
  label,
  meta,
  selected,
  onClick,
}: {
  label: string;
  meta?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-[7px] px-2 py-[7px] text-left transition-colors duration-150 ${
        selected
          ? 'bg-white/5 text-[var(--text-primary)]'
          : 'text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]'
      }`}
    >
      <div className="text-[13px] leading-5">{label}</div>
      {meta ? <div className={`mt-1 text-[10px] leading-4 ${selected ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]'}`}>{meta}</div> : null}
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
    <div className="flex w-60 flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)]">
      <div className="border-b border-[var(--border-subtle)] px-4 py-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[1.2px] text-[var(--text-primary)]">TradeLink</p>
          <h2 className="mt-2 text-[15px] font-semibold leading-6 text-[var(--text-primary)]">Messaging for trader communities</h2>
          <p className="mt-1.5 text-[12px] leading-5 text-[var(--text-secondary)]">Private groups, public spaces, and market context in one calm workspace.</p>
        </div>
        <button
          type="button"
          onClick={onOpenComposer}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--accent-teal-border)] bg-[var(--accent-teal-bg)] px-3 py-2 text-[12px] font-medium text-[var(--accent-teal)] transition-colors hover:bg-[rgba(0,196,160,0.16)]"
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span>New Chat</span>
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto border-b border-[var(--border-subtle)] py-2">
        <Section title="Discover">
          <ConversationButton
            label="Explore Spaces"
            meta="Browse public communities"
            selected={selectedView === 'Explore Spaces'}
            onClick={() => onNavigate('Explore Spaces')}
          />
        </Section>

        <Section title="My Spaces">
          {mySpaces.length === 0 ? (
            <p className="px-2 py-[7px] text-[12px] leading-5 text-[var(--text-secondary)]">Create or join a space to get started.</p>
          ) : (
            mySpaces.map((space) => (
              <ConversationButton
                key={space.conversation_key}
                label={space.name}
                meta={space.channels.map((channel) => `#${channel.slug}`).join(' • ')}
                selected={selectedConversationKey === space.conversation_key}
                onClick={() => onOpenConversation(space.conversation_key)}
              />
            ))
          )}
        </Section>

        <Section title="Direct Messages">
          {directMessages.length === 0 ? (
            <p className="px-2 py-[7px] text-[12px] leading-5 text-[var(--text-secondary)]">Start a direct message from New Chat.</p>
          ) : (
            directMessages.map((dm) => (
              <ConversationButton
                key={dm.conversation_key}
                label={dm.name}
                meta={dm.handle ? `@${dm.handle}` : 'Direct message'}
                selected={selectedConversationKey === dm.conversation_key}
                onClick={() => onOpenConversation(dm.conversation_key)}
              />
            ))
          )}
        </Section>

        <Section title="Private Groups">
          {privateGroups.length === 0 ? (
            <p className="px-2 py-[7px] text-[12px] leading-5 text-[var(--text-secondary)]">Create a private group for invite-only discussions.</p>
          ) : (
            privateGroups.map((group) => (
              <ConversationButton
                key={group.conversation_key}
                label={group.name}
                meta={`${group.member_count} invited members`}
                selected={selectedConversationKey === group.conversation_key}
                onClick={() => onOpenConversation(group.conversation_key)}
              />
            ))
          )}
        </Section>
      </div>

      <div className="mt-auto px-4 py-4">
        <div className="overflow-hidden">
          <MarketDashboard onNavigate={onNavigate} onOpenStock={onOpenStock} />
        </div>
      </div>
    </div>
  );
}
