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
      className={`w-full rounded-[7px] border px-2 py-[7px] text-left transition-all duration-150 ${
        selected
          ? 'border-transparent bg-white/[0.07] text-[rgba(255,255,255,0.9)]'
          : 'border-transparent text-[rgba(255,255,255,0.5)] hover:bg-white/[0.05] hover:text-[rgba(255,255,255,0.75)]'
      }`}
    >
      <div className="text-[13px] font-medium leading-5">{label}</div>
      {meta ? <div className={`mt-px text-[12px] leading-4 ${selected ? 'text-[rgba(255,255,255,0.45)]' : 'text-[rgba(255,255,255,0.35)]'}`}>{meta}</div> : null}
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
    <div className="flex w-60 min-w-60 flex-col bg-[#111113] text-zinc-100">
      <div className="border-b border-white/[0.06] px-4 pb-3 pt-[18px]">
        <div className="mb-[14px] flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-[#00c4a0] text-[11px] font-bold text-white">
            TL
          </div>
          <span className="text-[13px] font-semibold tracking-[0.5px] text-[rgba(255,255,255,0.9)]">TradeLink</span>
        </div>
        <button
          type="button"
          onClick={onOpenComposer}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[rgba(0,196,160,0.3)] bg-[rgba(0,196,160,0.12)] px-3 py-2 text-[12px] font-medium text-[#00c4a0] transition-colors hover:bg-[rgba(0,196,160,0.18)]"
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
            <p className="px-2 py-1.5 text-[13px] text-[rgba(255,255,255,0.35)]">Create or join a space to get started.</p>
          ) : (
            mySpaces.map((space, index) => (
              <button
                key={space.conversation_key}
                type="button"
                onClick={() => onOpenConversation(space.conversation_key)}
                className="flex w-full items-center gap-2 rounded-[7px] px-2 py-1.5 text-left transition-all hover:bg-white/[0.05]"
                style={{
                  background: selectedConversationKey === space.conversation_key ? 'rgba(255,255,255,0.07)' : 'transparent',
                }}
              >
                <span
                  className="h-2 w-2 flex-shrink-0 rounded-full"
                  style={{ background: ['#4f6ef7', '#f59e0b', '#2dd4aa'][index % 3] }}
                />
                <span className={`text-[13px] ${selectedConversationKey === space.conversation_key ? 'text-[rgba(255,255,255,0.9)]' : 'text-[rgba(255,255,255,0.35)]'}`}>
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

      <div className="px-4 pb-3 pt-2">
        <div className="overflow-hidden rounded-[22px] border border-zinc-800/90 bg-[linear-gradient(180deg,rgba(18,21,28,0.94),rgba(12,15,20,0.98))] shadow-[0_12px_24px_rgba(0,0,0,0.12)]">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between pb-2">
              <button type="button" onClick={() => onNavigate('Market Overview')} className="cursor-pointer text-[10px] font-medium uppercase tracking-[0.24em] text-zinc-600/90 transition-colors hover:text-zinc-300">Snapshot</button>
            </div>
            <div className="divide-y divide-zinc-800/90">
              <button type="button" onClick={() => onOpenStock('SPY')} className="flex w-full cursor-pointer items-center justify-between rounded-lg py-2.5 text-left transition-colors hover:bg-white/5">
                <div>
                  <p className="text-xs font-semibold text-zinc-100">SPY</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-zinc-100">651.37</p>
                  <p className="text-xs font-medium text-red-400">-0.83%</p>
                </div>
              </button>
              <button type="button" onClick={() => onOpenStock('AAPL')} className="flex w-full cursor-pointer items-center justify-between rounded-lg py-2.5 text-left transition-colors hover:bg-white/5">
                <div>
                  <p className="text-xs font-semibold text-zinc-100">AAPL</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-zinc-100">256.34</p>
                  <p className="text-xs font-medium text-emerald-400">+1.47%</p>
                </div>
              </button>
              <button type="button" onClick={() => onOpenStock('MSFT')} className="flex w-full cursor-pointer items-center justify-between rounded-lg py-2.5 text-left transition-colors hover:bg-white/5">
                <div>
                  <p className="text-xs font-semibold text-zinc-100">MSFT</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-zinc-100">368.13</p>
                  <p className="text-xs font-medium text-red-400">-0.78%</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
