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

const SPACE_DOT_COLORS = ['#5b74f3', '#f5a524', '#2dd4aa', '#d946ef', '#f26b6b'];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="px-5 py-4">
      <div className="pb-3">
        <h3 className="text-[10px] font-medium uppercase tracking-[1.2px] text-[rgba(255,255,255,0.28)]">{title}</h3>
      </div>
      <div className="space-y-1">{children}</div>
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
      className={`w-full rounded-[8px] border border-transparent px-4 py-3 text-left transition-all duration-150 ${
        selected
          ? 'bg-[rgba(255,255,255,0.09)] text-[rgba(255,255,255,0.9)]'
          : 'text-[rgba(255,255,255,0.45)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[rgba(255,255,255,0.9)]'
      }`}
    >
      <div className="text-[13px] font-medium leading-5">{label}</div>
      {meta ? <div className={`mt-1 text-[10px] leading-4 ${selected ? 'text-[rgba(255,255,255,0.45)]' : 'text-[rgba(255,255,255,0.28)]'}`}>{meta}</div> : null}
    </button>
  );
}

function SpaceButton({
  label,
  selected,
  color,
  onClick,
}: {
  label: string;
  selected: boolean;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-[8px] px-4 py-2.5 text-left transition-colors ${
        selected ? 'bg-[rgba(255,255,255,0.04)] text-[rgba(255,255,255,0.9)]' : 'text-[rgba(255,255,255,0.45)] hover:bg-[rgba(255,255,255,0.03)] hover:text-[rgba(255,255,255,0.9)]'
      }`}
    >
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-[13px] font-medium">{label}</span>
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
    <div className="flex w-[240px] flex-col border-r border-[rgba(255,255,255,0.07)] bg-[#111113] text-[rgba(255,255,255,0.9)]">
      <div className="border-b border-[rgba(255,255,255,0.07)] px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-[42px] w-[42px] items-center justify-center rounded-[14px] bg-[#18c7b0] text-[16px] font-semibold text-white">
            TL
          </div>
          <div>
            <p className="text-[16px] font-semibold tracking-tight text-[rgba(255,255,255,0.9)]">TradeLink</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenComposer}
          className="mt-5 flex w-full items-center gap-2 rounded-[8px] border border-[rgba(255,255,255,0.1)] bg-transparent px-4 py-3 text-[15px] font-semibold text-[rgba(255,255,255,0.9)] transition-colors hover:bg-[rgba(255,255,255,0.04)]"
        >
          <MessageSquarePlus className="h-4 w-4" />
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
          <ConversationButton
            label="Browse Communities"
            selected={false}
            onClick={() => onNavigate('Explore Spaces')}
          />
        </Section>

        <Section title="My Spaces">
          {mySpaces.length === 0 ? (
            <p className="px-4 py-2 text-[12px] leading-5 text-[rgba(255,255,255,0.28)]">Create or join a space to get started.</p>
          ) : (
            mySpaces.map((space, index) => (
              <SpaceButton
                key={space.conversation_key}
                label={space.name}
                color={SPACE_DOT_COLORS[index % SPACE_DOT_COLORS.length]}
                selected={selectedConversationKey === space.conversation_key}
                onClick={() => onOpenConversation(space.conversation_key)}
              />
            ))
          )}
        </Section>

        <Section title="Direct Messages">
          {directMessages.length === 0 ? (
            <p className="px-4 py-2 text-[12px] leading-5 text-[rgba(255,255,255,0.28)]">Start a direct message from New Chat.</p>
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
            <p className="px-4 py-2 text-[12px] leading-5 text-[rgba(255,255,255,0.28)]">Create a private group for invite-only discussions.</p>
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

      <div className="border-t border-[rgba(255,255,255,0.07)] px-4 pb-4 pt-4">
        <div className="overflow-hidden">
          <MarketDashboard onNavigate={onNavigate} onOpenStock={onOpenStock} />
        </div>
      </div>
    </div>
  );
}
