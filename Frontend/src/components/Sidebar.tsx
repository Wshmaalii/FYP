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
    <div className="px-3.5 py-0.5">
      <div className="px-2 pb-1.5">
        <h3 className="text-[9px] font-semibold uppercase tracking-[0.24em] text-zinc-500">{title}</h3>
      </div>
      <div className="space-y-0.5 rounded-[18px] border border-zinc-800/70 bg-[#111518] p-1">
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
      className={`w-full rounded-[14px] border px-3 py-2 text-left transition-colors duration-150 ${
        selected
          ? 'border-[#284744] bg-[#131f1f] text-zinc-50'
          : 'border-transparent bg-transparent text-zinc-400 hover:border-zinc-800 hover:bg-zinc-900/70 hover:text-zinc-100 active:translate-y-px'
      }`}
    >
      <div className="text-[12px] font-medium leading-[18px]">{label}</div>
      {meta ? <div className={`mt-0.5 text-[10px] leading-4 ${selected ? 'text-[#8fb7b2]' : 'text-zinc-600'}`}>{meta}</div> : null}
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
    <div className="flex w-[280px] shrink-0 flex-col border-r border-zinc-800/80 bg-[#0b0e10] text-zinc-100">
      <div className="border-b border-zinc-800/80 px-3.5 pb-3.5 pt-3.5">
        <div className="flex items-start gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-zinc-700/80 bg-[#12171a] text-[10px] font-semibold tracking-[0.22em] text-[#94bcb6]">
            TL
          </div>
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-[0.26em] text-zinc-500">TradeLink</p>
            <h2 className="mt-0.5 text-[14px] font-semibold tracking-tight text-zinc-100">Trader messaging</h2>
            <p className="mt-1 text-[10px] leading-[18px] text-zinc-500">Public spaces, private groups, and market context in one workspace.</p>
          </div>
        </div>
      </div>

      <div className="px-3.5 pb-2.5 pt-3">
        <button
          type="button"
          onClick={onOpenComposer}
          className="flex w-full items-center justify-center gap-2 rounded-[14px] border border-[#284744] bg-[#131f1f] px-3.5 py-2.5 text-[12px] font-medium text-[#d4ece8] transition-colors duration-150 hover:bg-[#182625] active:translate-y-px"
        >
          <MessageSquarePlus className="h-3.5 w-3.5" />
          <span>New Chat</span>
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-2.5 pt-0.5">
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
            <p className="px-4 py-3 text-xs leading-5 text-zinc-600">Create or join a space to get started.</p>
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

      <div className="border-t border-zinc-800/80 px-3.5 pb-3.5 pt-2.5">
        <div className="overflow-hidden rounded-[18px] border border-zinc-800/80 bg-[#111518]">
          <div className="px-3.5 py-3">
            <div className="flex items-center justify-between pb-2">
              <button type="button" onClick={() => onNavigate('Market Overview')} className="cursor-pointer text-[9px] font-medium uppercase tracking-[0.24em] text-zinc-500 transition-colors hover:text-zinc-200">Snapshot</button>
              <span className="text-[9px] uppercase tracking-[0.2em] text-zinc-600">Tracked</span>
            </div>
            <div className="divide-y divide-zinc-800/80">
              <button type="button" onClick={() => onOpenStock('SPY')} className="flex w-full cursor-pointer items-center justify-between rounded-lg py-2 text-left transition-colors hover:bg-white/5">
                <div>
                  <p className="text-[11px] font-semibold text-zinc-100">SPY</p>
                  <p className="mt-0.5 text-[9px] uppercase tracking-[0.18em] text-zinc-600">ETF</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-medium text-zinc-100">651.37</p>
                  <p className="text-[10px] font-medium text-red-400">-0.83%</p>
                </div>
              </button>
              <button type="button" onClick={() => onOpenStock('AAPL')} className="flex w-full cursor-pointer items-center justify-between rounded-lg py-2 text-left transition-colors hover:bg-white/5">
                <div>
                  <p className="text-[11px] font-semibold text-zinc-100">AAPL</p>
                  <p className="mt-0.5 text-[9px] uppercase tracking-[0.18em] text-zinc-600">Equity</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-medium text-zinc-100">256.34</p>
                  <p className="text-[10px] font-medium text-emerald-400">+1.47%</p>
                </div>
              </button>
              <button type="button" onClick={() => onOpenStock('MSFT')} className="flex w-full cursor-pointer items-center justify-between rounded-lg py-2 text-left transition-colors hover:bg-white/5">
                <div>
                  <p className="text-[11px] font-semibold text-zinc-100">MSFT</p>
                  <p className="mt-0.5 text-[9px] uppercase tracking-[0.18em] text-zinc-600">Equity</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-medium text-zinc-100">368.13</p>
                  <p className="text-[10px] font-medium text-red-400">-0.78%</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
