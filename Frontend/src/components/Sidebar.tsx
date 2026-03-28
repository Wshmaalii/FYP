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
    <div className="border-b border-zinc-800 py-6">
      <div className="px-4 mb-3">
        <h3 className="text-zinc-600 text-[11px] uppercase tracking-[0.18em]">{title}</h3>
      </div>
      <div className="space-y-2 px-3">{children}</div>
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
      className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 ease-out ${
        selected
          ? 'bg-cyan-600 text-white shadow-[0_10px_24px_rgba(8,145,178,0.18)]'
          : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 hover:border-zinc-700 active:translate-y-px'
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
    <div className="w-80 bg-zinc-950 border-r border-zinc-800 text-zinc-100 flex flex-col">
      <div className="min-h-16 border-b border-zinc-800 flex items-center px-5 py-4">
        <div>
          <h2 className="text-white text-lg font-semibold tracking-tight">TradeLink</h2>
          <p className="text-zinc-500 text-xs mt-1">Messaging for trader communities</p>
        </div>
      </div>

      <div className="px-4 py-5 border-b border-zinc-800">
        <button
          type="button"
          onClick={onOpenComposer}
          className="w-full rounded-2xl bg-cyan-600 hover:bg-cyan-700 active:translate-y-px text-white px-4 py-3.5 flex items-center justify-center gap-2 transition-all duration-200 ease-out shadow-[0_14px_32px_rgba(8,145,178,0.18)]"
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span className="text-sm font-medium">New Chat</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
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
            <p className="text-zinc-600 text-xs px-4 py-2 leading-5">Create or join a space to get started.</p>
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
            <p className="text-zinc-600 text-xs px-4 py-2 leading-5">Start a direct message from New Chat.</p>
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
            <p className="text-zinc-600 text-xs px-4 py-2 leading-5">Create a private group for invite-only discussions.</p>
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

      <MarketDashboard onNavigate={onNavigate} onOpenStock={onOpenStock} />
    </div>
  );
}
