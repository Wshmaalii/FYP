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
    <div className="px-4 pt-[14px] pb-2">
      <div className="px-2 pb-1.5">
        <h3 className="text-[10px] font-semibold uppercase tracking-[1.2px] text-[rgba(255,255,255,0.28)]">{title}</h3>
      </div>
      <div className="space-y-0.5">
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
      className={`w-full rounded-[7px] px-2 py-[7px] text-left transition-all duration-150 ${
        selected
          ? 'bg-[rgba(255,255,255,0.07)] text-[rgba(255,255,255,0.9)]'
          : 'text-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[rgba(255,255,255,0.8)]'
      }`}
    >
      <div className="text-[13px] leading-[18px]">{label}</div>
      {meta ? (
        <div className={`mt-px text-[10px] leading-4 ${selected ? 'text-[rgba(255,255,255,0.55)]' : 'text-[rgba(255,255,255,0.32)]'}`}>
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
    <div className="flex w-60 shrink-0 flex-col border-r border-[rgba(255,255,255,0.07)] bg-[#111113] text-zinc-100">
      <div className="border-b border-[rgba(255,255,255,0.06)] px-4 pb-3 pt-[18px]">
        <div className="mb-[14px] flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-[#00c4a0] text-[11px] font-bold text-white">
            TL
          </div>
          <span className="text-[13px] font-semibold tracking-[0.5px] text-[rgba(255,255,255,0.9)]">TradeLink</span>
        </div>

        <button
          type="button"
          onClick={onOpenComposer}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[rgba(0,196,160,0.3)] bg-[rgba(0,196,160,0.12)] px-3 py-2 text-[12px] font-medium text-[#00c4a0] transition-colors duration-150 hover:bg-[rgba(0,196,160,0.18)] active:translate-y-px"
        >
          <MessageSquarePlus className="h-3.5 w-3.5" />
          <span>New Chat</span>
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
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
            <p className="px-2 py-[7px] text-[13px] text-[rgba(255,255,255,0.35)]">Create or join a space to get started.</p>
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
            <p className="px-2 py-[7px] text-[13px] text-[rgba(255,255,255,0.35)]">Start a direct message from New Chat.</p>
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
            <p className="px-2 py-[7px] text-[13px] text-[rgba(255,255,255,0.35)]">Create a private group for invite-only discussions.</p>
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

      <div className="mt-auto border-t border-[rgba(255,255,255,0.06)] px-[14px] pb-3 pt-3">
        <button
          type="button"
          onClick={() => onNavigate('Market Overview')}
          className="mb-2 block cursor-pointer text-[10px] font-semibold uppercase tracking-[1px] text-[rgba(255,255,255,0.25)] transition-colors hover:text-[rgba(255,255,255,0.5)]"
        >
          Snapshot
        </button>

        <div className="divide-y divide-[rgba(255,255,255,0.04)]">
          <button
            type="button"
            onClick={() => onOpenStock('SPY')}
            className="flex w-full items-center justify-between rounded-md py-1.5 text-left transition-colors hover:bg-[rgba(255,255,255,0.04)]"
          >
            <div>
              <p className="text-[12px] font-semibold text-[rgba(255,255,255,0.75)]">SPY</p>
              <p className="mt-px text-[10px] text-[rgba(255,255,255,0.3)]">S&amp;P 500 ETF</p>
            </div>
            <div className="text-right">
              <p className="text-[12px] font-medium text-[rgba(255,255,255,0.75)]">651.37</p>
              <p className="mt-px text-[10px] text-[#f26b6b]">-0.83%</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onOpenStock('AAPL')}
            className="flex w-full items-center justify-between rounded-md py-1.5 text-left transition-colors hover:bg-[rgba(255,255,255,0.04)]"
          >
            <div>
              <p className="text-[12px] font-semibold text-[rgba(255,255,255,0.75)]">AAPL</p>
              <p className="mt-px text-[10px] text-[rgba(255,255,255,0.3)]">Apple</p>
            </div>
            <div className="text-right">
              <p className="text-[12px] font-medium text-[rgba(255,255,255,0.75)]">256.34</p>
              <p className="mt-px text-[10px] text-[#2dd4aa]">+1.47%</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onOpenStock('MSFT')}
            className="flex w-full items-center justify-between rounded-md py-1.5 text-left transition-colors hover:bg-[rgba(255,255,255,0.04)]"
          >
            <div>
              <p className="text-[12px] font-semibold text-[rgba(255,255,255,0.75)]">MSFT</p>
              <p className="mt-px text-[10px] text-[rgba(255,255,255,0.3)]">Microsoft</p>
            </div>
            <div className="text-right">
              <p className="text-[12px] font-medium text-[rgba(255,255,255,0.75)]">368.13</p>
              <p className="mt-px text-[10px] text-[#f26b6b]">-0.78%</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
