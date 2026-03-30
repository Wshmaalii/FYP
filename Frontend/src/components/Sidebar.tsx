import type { ReactNode } from 'react';
import { MessageSquarePlus } from 'lucide-react';
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
    <div className="px-4 pt-3">
      <div className="px-2 pb-1.5">
        <h3 className="tl-section-label">{title}</h3>
      </div>
      <div className="space-y-0.5">{children}</div>
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
      className={`w-full rounded-[8px] px-2 py-[7px] text-left transition-colors duration-150 ${
        selected
          ? 'bg-white/[0.07] text-[var(--tl-text-primary)]'
          : 'text-[var(--tl-text-secondary)] hover:bg-white/[0.05] hover:text-[var(--tl-text-primary)]'
      }`}
    >
      <div className="text-[13px] font-medium leading-5">{label}</div>
      {meta ? (
        <div className={`${selected ? 'text-[var(--tl-text-secondary)]' : 'text-[var(--tl-text-muted)]'} mt-0.5 text-[11px] leading-4`}>
          {meta}
        </div>
      ) : null}
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
    <div className="tl-sidebar flex flex-col text-zinc-100">
      <div className="border-b border-[var(--tl-border-subtle)] px-4 pt-[18px] pb-3">
        <div className="mb-[14px] flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-[var(--tl-accent)] text-[11px] font-bold text-white">
            TL
          </div>
          <span className="text-[13px] font-semibold tracking-[0.5px] text-[var(--tl-text-primary)]">TradeLink</span>
        </div>
        <button
          type="button"
          onClick={onOpenComposer}
          className="tl-btn-primary flex w-full items-center gap-1.5"
        >
          <MessageSquarePlus className="h-3.5 w-3.5" />
          <span>New Chat</span>
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <Section title="Discover">
          <ConversationButton
            label="Explore Spaces"
            selected={selectedView === 'Explore Spaces'}
            onClick={() => onNavigate('Explore Spaces')}
          />
          <ConversationButton
            label="Browse Communities"
            selected={false}
            onClick={() => onNavigate('Explore Spaces')}
          />
        </Section>

        <Section title="My Spaces">
          {mySpaces.length === 0 ? (
            <p className="px-2 py-1.5 text-[12px] leading-5 text-[var(--tl-text-muted)]">Create or join a space to get started.</p>
          ) : (
            mySpaces.map((space) => (
              <button
                key={space.conversation_key}
                type="button"
                onClick={() => onOpenConversation(space.conversation_key)}
                className={`flex w-full items-center gap-2 rounded-[7px] px-2 py-1.5 text-left transition-colors ${
                  selectedConversationKey === space.conversation_key
                    ? 'bg-white/[0.06]'
                    : 'hover:bg-white/[0.04]'
                }`}
              >
                <div className="h-2 w-2 rounded-full bg-[#4f6ef7]" />
                <span
                  className={`text-[13px] ${
                    selectedConversationKey === space.conversation_key ? 'text-[var(--tl-text-primary)]' : 'text-[var(--tl-text-secondary)]'
                  }`}
                >
                  {space.name}
                </span>
              </button>
            ))
          )}
        </Section>

        <Section title="Direct Messages">
          {directMessages.length === 0 ? (
            <p className="px-4 py-3 text-xs leading-5 text-zinc-600">Start a direct message from New Chat.</p>
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
            <p className="px-4 py-3 text-xs leading-5 text-zinc-600">Create a private group for invite-only discussions.</p>
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

      <div className="mt-auto border-t border-[var(--tl-border-subtle)] px-[14px] py-3">
        <button
          type="button"
          onClick={() => onNavigate('Market Overview')}
          className="tl-section-label mb-2 cursor-pointer transition-colors hover:text-[var(--tl-text-secondary)]"
        >
          Snapshot
        </button>
        <div className="overflow-hidden rounded-[12px] bg-[var(--tl-bg-muted)] px-2">
          <button type="button" onClick={() => onOpenStock('SPY')} className="tl-snapshot-row w-full rounded-[6px] px-1 text-left hover:bg-white/[0.04]">
            <div>
              <p className="text-[12px] font-semibold text-[var(--tl-text-primary)]">SPY</p>
              <p className="text-[10px] text-[var(--tl-text-muted)]">S&amp;P 500 ETF</p>
            </div>
            <div className="text-right">
              <p className="text-[12px] font-medium text-[var(--tl-text-primary)]">651.37</p>
              <p className="text-[10px] font-medium text-[var(--tl-danger)]">-0.83%</p>
            </div>
          </button>
          <button type="button" onClick={() => onOpenStock('AAPL')} className="tl-snapshot-row w-full rounded-[6px] px-1 text-left hover:bg-white/[0.04]">
            <div>
              <p className="text-[12px] font-semibold text-[var(--tl-text-primary)]">AAPL</p>
              <p className="text-[10px] text-[var(--tl-text-muted)]">Apple</p>
            </div>
            <div className="text-right">
              <p className="text-[12px] font-medium text-[var(--tl-text-primary)]">256.34</p>
              <p className="text-[10px] font-medium text-[var(--tl-positive)]">+1.47%</p>
            </div>
          </button>
          <button type="button" onClick={() => onOpenStock('MSFT')} className="tl-snapshot-row w-full rounded-[6px] px-1 text-left hover:bg-white/[0.04]">
            <div>
              <p className="text-[12px] font-semibold text-[var(--tl-text-primary)]">MSFT</p>
              <p className="text-[10px] text-[var(--tl-text-muted)]">Microsoft</p>
            </div>
            <div className="text-right">
              <p className="text-[12px] font-medium text-[var(--tl-text-primary)]">368.13</p>
              <p className="text-[10px] font-medium text-[var(--tl-danger)]">-0.78%</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
