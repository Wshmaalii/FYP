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
      <div className="pb-[6px]">
        <h3 className="text-[10px] font-semibold uppercase tracking-[1.2px] text-zinc-600">{title}</h3>
      </div>
      <div className="space-y-[1px]">
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
      className={`w-full border px-2 py-[7px] text-left transition-all duration-150 ${
        selected
          ? 'rounded-[7px] border-transparent bg-white/[0.07] text-white'
          : 'rounded-[7px] border-transparent text-[rgba(255,255,255,0.5)] hover:bg-white/[0.05] hover:text-[rgba(255,255,255,0.8)]'
      }`}
    >
      <div className="text-[13px] leading-5">{label}</div>
      {meta ? <div className={`mt-0.5 text-[10px] leading-4 ${selected ? 'text-[rgba(255,255,255,0.45)]' : 'text-[rgba(255,255,255,0.28)]'}`}>{meta}</div> : null}
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
    <div className="flex w-[240px] min-w-[240px] flex-col border-r border-white/[0.07] bg-[#111113] text-zinc-100">
      <div className="border-b border-white/[0.06] px-4 py-[18px]">
        <div className="mb-[14px] flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-[#00c4a0] text-[11px] font-bold text-white">
            TL
          </div>
          <span className="text-[13px] font-semibold tracking-[0.5px] text-[rgba(255,255,255,0.9)]">TradeLink</span>
        </div>
        <button
          type="button"
          onClick={onOpenComposer}
          className="flex w-full items-center gap-[6px] rounded-[8px] border border-[rgba(0,196,160,0.3)] bg-[rgba(0,196,160,0.12)] px-3 py-2 text-[#00c4a0] transition-colors hover:bg-[rgba(0,196,160,0.18)]"
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span className="text-[12px] font-medium">New Chat</span>
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
            <div className="px-2">
              {mySpaces.map((space, index) => (
                <button
                  key={space.conversation_key}
                  type="button"
                  onClick={() => onOpenConversation(space.conversation_key)}
                  className="mb-[1px] flex w-full items-center gap-2 rounded-[7px] px-2 py-[6px] text-left transition-colors hover:bg-white/[0.05]"
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      backgroundColor: ['#4f6ef7', '#f59e0b', '#2dd4aa'][index % 3],
                    }}
                  />
                  <span className={`${selectedConversationKey === space.conversation_key ? 'text-[rgba(255,255,255,0.75)]' : 'text-[rgba(255,255,255,0.45)]'} text-[13px]`}>
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

      <div className="mt-auto border-t border-white/[0.06] px-[14px] py-3">
        <button
          type="button"
          onClick={() => onNavigate('Market Overview')}
          className="mb-2 cursor-pointer text-[10px] font-semibold uppercase tracking-[1px] text-[rgba(255,255,255,0.25)] transition-colors hover:text-[rgba(255,255,255,0.5)]"
        >
          Snapshot
        </button>
        <div>
          <button type="button" onClick={() => onOpenStock('SPY')} className="flex w-full items-center justify-between rounded-[6px] border-b border-white/[0.04] py-[6px] text-left transition-colors hover:bg-white/[0.04]">
            <div>
              <div className="text-[12px] font-semibold text-[rgba(255,255,255,0.75)]">SPY</div>
              <div className="mt-[1px] text-[10px] text-[rgba(255,255,255,0.3)]">S&amp;P 500 ETF</div>
            </div>
            <div className="text-right">
              <div className="text-[12px] font-medium text-[rgba(255,255,255,0.75)]">651.37</div>
              <div className="mt-[1px] text-[10px] text-[#f26b6b]">−0.83%</div>
            </div>
          </button>
          <button type="button" onClick={() => onOpenStock('AAPL')} className="flex w-full items-center justify-between rounded-[6px] border-b border-white/[0.04] py-[6px] text-left transition-colors hover:bg-white/[0.04]">
            <div>
              <div className="text-[12px] font-semibold text-[rgba(255,255,255,0.75)]">AAPL</div>
              <div className="mt-[1px] text-[10px] text-[rgba(255,255,255,0.3)]">Apple</div>
            </div>
            <div className="text-right">
              <div className="text-[12px] font-medium text-[rgba(255,255,255,0.75)]">256.34</div>
              <div className="mt-[1px] text-[10px] text-[#2dd4aa]">+1.47%</div>
            </div>
          </button>
          <button type="button" onClick={() => onOpenStock('MSFT')} className="flex w-full items-center justify-between rounded-[6px] py-[6px] text-left transition-colors hover:bg-white/[0.04]">
            <div>
              <div className="text-[12px] font-semibold text-[rgba(255,255,255,0.75)]">MSFT</div>
              <div className="mt-[1px] text-[10px] text-[rgba(255,255,255,0.3)]">Microsoft</div>
            </div>
            <div className="text-right">
              <div className="text-[12px] font-medium text-[rgba(255,255,255,0.75)]">368.13</div>
              <div className="mt-[1px] text-[10px] text-[#f26b6b]">−0.78%</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
