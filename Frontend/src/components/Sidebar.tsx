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
    <div className="px-4 py-2.5">
      <div className="px-3 pb-2.5">
        <h3 className="text-[10px] font-medium uppercase tracking-[0.24em] text-zinc-600">{title}</h3>
      </div>
      <div className="space-y-1.5 rounded-[26px] border border-zinc-900/80 bg-zinc-900/45 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
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
      className={`w-full rounded-2xl border px-4 py-3.5 text-left transition-all duration-200 ease-out ${
        selected
          ? 'border-cyan-500/40 bg-[linear-gradient(180deg,rgba(8,145,178,0.26),rgba(14,116,144,0.22))] text-white shadow-[0_12px_26px_rgba(8,145,178,0.14)]'
          : 'border-transparent text-zinc-400 hover:border-zinc-800 hover:bg-zinc-900/80 hover:text-zinc-100 active:translate-y-px'
      }`}
    >
      <div className="text-sm font-medium leading-5">{label}</div>
      {meta ? <div className={`text-xs mt-1 leading-4 ${selected ? 'text-cyan-100/90' : 'text-zinc-600'}`}>{meta}</div> : null}
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
    <div className="flex w-80 flex-col border-r border-zinc-800 bg-[linear-gradient(180deg,#090b10_0%,#0d1016_100%)] text-zinc-100 shadow-[inset_-1px_0_0_rgba(255,255,255,0.02)]">
      <div className="px-4 pt-4">
        <div className="rounded-[28px] border border-zinc-800 bg-[linear-gradient(180deg,rgba(25,29,39,0.92),rgba(17,20,28,0.96))] px-5 py-5 shadow-[0_20px_50px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.03)]">
          <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/80">TradeLink</p>
          <h2 className="mt-2 text-lg font-semibold tracking-tight text-white">Messaging for trader communities</h2>
          <p className="mt-2 text-xs leading-5 text-zinc-500">Private groups, public spaces, and market context in one calm workspace.</p>
        </div>
      </div>

      <div className="px-4 pb-3 pt-4">
        <button
          type="button"
          onClick={onOpenComposer}
          className="flex w-full items-center justify-center gap-2 rounded-[18px] bg-cyan-600 px-4 py-3.5 text-white shadow-[0_16px_38px_rgba(8,145,178,0.18)] transition-all duration-200 ease-out hover:bg-cyan-500 active:translate-y-px"
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span className="text-sm font-medium">New Chat</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pt-1">
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

      <div className="px-4 pb-4 pt-3">
        <div className="overflow-hidden rounded-[28px] border border-zinc-800 bg-[linear-gradient(180deg,rgba(22,25,33,0.94),rgba(14,17,23,0.98))] shadow-[0_18px_40px_rgba(0,0,0,0.18)]">
          <MarketDashboard onNavigate={onNavigate} onOpenStock={onOpenStock} />
        </div>
      </div>
    </div>
  );
}
