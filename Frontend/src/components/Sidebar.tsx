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
    <div className="border-b border-zinc-800 py-4">
      <div className="px-3 mb-2">
        <h3 className="text-zinc-500 text-xs uppercase tracking-wider px-2">{title}</h3>
      </div>
      <div className="space-y-1 px-2">{children}</div>
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
      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
        selected ? 'bg-cyan-600 text-white' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100'
      }`}
    >
      <div className="text-sm">{label}</div>
      {meta ? <div className={`text-xs mt-0.5 ${selected ? 'text-cyan-100' : 'text-zinc-600'}`}>{meta}</div> : null}
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
      <div className="h-16 border-b border-zinc-800 flex items-center px-4">
        <div>
          <h2 className="text-white">TradeLink</h2>
          <p className="text-zinc-500 text-xs">Messaging for trader communities</p>
        </div>
      </div>

      <div className="px-4 py-4 border-b border-zinc-800">
        <button
          type="button"
          onClick={onOpenComposer}
          className="w-full rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-3 flex items-center justify-center gap-2 transition-colors"
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span className="text-sm">New Chat</span>
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
            <p className="text-zinc-600 text-xs px-3 py-2">Join a public space to add it here.</p>
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
            <p className="text-zinc-600 text-xs px-3 py-2">Start a DM from New Chat.</p>
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
            <p className="text-zinc-600 text-xs px-3 py-2">Create an invite-only group from New Chat.</p>
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
