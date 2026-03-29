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
    <div className="px-4 py-3">
      <div className="pb-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-[1.2px] text-zinc-600">{title}</h3>
      </div>
      <div className="space-y-1 rounded-[12px]">
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
      className={`w-full border px-4 py-2.5 text-left transition-all duration-200 ease-out ${
        selected
          ? 'rounded-[8px] border-cyan-500/40 bg-[linear-gradient(180deg,rgba(8,145,178,0.26),rgba(14,116,144,0.22))] text-white shadow-[0_12px_26px_rgba(8,145,178,0.14)]'
          : 'rounded-[8px] border-transparent bg-zinc-900/40 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 active:translate-y-px'
      }`}
    >
      <div className="text-sm font-medium leading-5">{label}</div>
      {meta ? <div className={`mt-1 text-xs leading-4 ${selected ? 'text-cyan-100/90' : 'text-zinc-600'}`}>{meta}</div> : null}
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
    <div className="flex w-[300px] flex-col border-r border-white/[0.06] bg-[#111113] text-zinc-100">
      <div className="border-b border-white/[0.06] px-7 py-7">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#18c7b0] text-[21px] font-semibold text-white">
            TL
          </div>
          <div>
            <p className="text-[18px] font-semibold tracking-tight text-white">TradeLink</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenComposer}
          className="mt-7 flex w-full items-center justify-center gap-2 rounded-[14px] border border-[#1a6f63] bg-[#13312d] px-4 py-3 text-[#18c7b0] transition-colors duration-150 hover:bg-[#163a35]"
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span className="text-sm font-medium">New Chat</span>
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-4">
        <Section title="Discover">
          <ConversationButton
            label="Explore Spaces"
            meta="Browse public communities"
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
            <p className="px-4 py-3 text-xs leading-5 text-zinc-600">Create or join a space to get started.</p>
          ) : (
            <div className="space-y-2 px-2">
              {mySpaces.map((space, index) => (
                <button
                  key={space.conversation_key}
                  type="button"
                  onClick={() => onOpenConversation(space.conversation_key)}
                  className="flex w-full items-center gap-3 rounded-[8px] px-2 py-2 text-left transition-colors hover:bg-white/[0.04]"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{
                      backgroundColor: ['#5b74f3', '#f59e0b', '#2dd4aa'][index % 3],
                    }}
                  />
                  <span className={`${selectedConversationKey === space.conversation_key ? 'text-zinc-200' : 'text-zinc-500'} text-[13px] font-medium`}>
                    {space.name}
                  </span>
                </button>
              ))}
            </div>
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

      <div className="mt-auto border-t border-white/[0.06] px-6 pb-5 pt-5">
        <div className="pb-3">
          <button type="button" onClick={() => onNavigate('Market Overview')} className="cursor-pointer text-[10px] font-semibold uppercase tracking-[1.2px] text-zinc-600 transition-colors hover:text-zinc-300">Snapshot</button>
        </div>
        <div className="space-y-0">
          <button type="button" onClick={() => onOpenStock('SPY')} className="flex w-full items-center justify-between rounded-[6px] border-b border-white/[0.04] py-2 text-left transition-colors hover:bg-white/[0.04]">
            <div>
              <p className="text-xs font-semibold text-zinc-100">SPY</p>
              <p className="mt-0.5 text-[10px] text-zinc-500">S&amp;P 500 ETF</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-zinc-200">651.37</p>
              <p className="mt-0.5 text-[10px] font-medium text-red-400">−0.83%</p>
            </div>
          </button>
          <button type="button" onClick={() => onOpenStock('AAPL')} className="flex w-full items-center justify-between rounded-[6px] border-b border-white/[0.04] py-2 text-left transition-colors hover:bg-white/[0.04]">
            <div>
              <p className="text-xs font-semibold text-zinc-100">AAPL</p>
              <p className="mt-0.5 text-[10px] text-zinc-500">Apple</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-zinc-200">256.34</p>
              <p className="mt-0.5 text-[10px] font-medium text-emerald-400">+1.47%</p>
            </div>
          </button>
          <button type="button" onClick={() => onOpenStock('MSFT')} className="flex w-full items-center justify-between rounded-[6px] py-2 text-left transition-colors hover:bg-white/[0.04]">
            <div>
              <p className="text-xs font-semibold text-zinc-100">MSFT</p>
              <p className="mt-0.5 text-[10px] text-zinc-500">Microsoft</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-zinc-200">368.13</p>
              <p className="mt-0.5 text-[10px] font-medium text-red-400">−0.78%</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
