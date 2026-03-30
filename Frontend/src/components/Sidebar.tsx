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
        <h3 className="text-[10px] font-semibold uppercase tracking-[1.2px] text-[var(--text-label)]">{title}</h3>
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
          ? 'border-transparent bg-[var(--bg-active)] text-[var(--text-primary)]'
          : 'border-transparent text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]'
      }`}
    >
      <div className="text-[13px] font-medium leading-5">{label}</div>
      {meta ? <div className={`mt-px text-[12px] leading-4 ${selected ? 'text-[var(--text-muted)]' : 'text-[var(--text-subtle)]'}`}>{meta}</div> : null}
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
    <div className="flex w-60 min-w-60 flex-col" style={{ background: 'var(--bg-sidebar)', borderRight: '0.5px solid var(--border-secondary)' }}>
      <div className="px-4 pb-3 pt-[18px]" style={{ borderBottom: '0.5px solid var(--border-subtle)' }}>
        <div className="mb-[14px] flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-[7px] text-[11px] font-bold text-white" style={{ background: 'var(--accent-teal)' }}>
            TL
          </div>
          <span className="text-[13px] font-semibold tracking-[0.5px]" style={{ color: 'var(--text-primary)' }}>TradeLink</span>
        </div>
        <button
          type="button"
          onClick={onOpenComposer}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-medium transition-colors"
          style={{
            background: 'var(--accent-teal-bg)',
            border: '0.5px solid var(--accent-teal-border)',
            color: 'var(--accent-teal)',
          }}
        >
          <MessageSquarePlus className="h-3.5 w-3.5" />
          <span>New Chat</span>
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="px-4 pt-[14px] pb-2" style={{ borderBottom: '0.5px solid var(--border-subtle)' }}>
          <div className="px-2 pb-1.5">
            <h3 className="text-[10px] font-semibold uppercase tracking-[1.2px] text-[var(--text-label)]">Discover</h3>
          </div>
          <div className="space-y-0.5">
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
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4">
          <div className="mb-2 mt-[14px] px-2">
            <h3 className="text-[10px] font-semibold uppercase tracking-[1.2px] text-[var(--text-label)]">My Spaces</h3>
          </div>
          <div className="space-y-0.5">
            {mySpaces.map((space, index) => (
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
                <span className={`text-[13px] ${selectedConversationKey === space.conversation_key ? 'text-[var(--text-primary)]' : 'text-[var(--text-subtle)]'}`}>
                  {space.name}
                </span>
              </button>
            ))}
          </div>

          {mySpaces.length === 0 ? (
            <p className="px-2 py-1.5 text-[13px] text-[var(--text-subtle)]">Create or join a space to get started.</p>
          ) : null}

          {directMessages.length > 0 ? (
            <Section title="Direct Messages">
              {directMessages.map((dm) => (
                <ConversationButton
                  key={dm.conversation_key}
                  label={dm.name}
                  meta={dm.handle ? `@${dm.handle}` : 'Direct message'}
                  selected={selectedConversationKey === dm.conversation_key}
                  onClick={() => onOpenConversation(dm.conversation_key)}
                />
              ))}
            </Section>
          ) : null}

          {privateGroups.length > 0 ? (
            <Section title="Private Groups">
              {privateGroups.map((group) => (
                <ConversationButton
                  key={group.conversation_key}
                  label={group.name}
                  meta={`${group.member_count} invited members`}
                  selected={selectedConversationKey === group.conversation_key}
                  onClick={() => onOpenConversation(group.conversation_key)}
                />
              ))}
            </Section>
          ) : null}
        </div>
      </div>

      <MarketDashboard onNavigate={onNavigate} onOpenStock={onOpenStock} />
    </div>
  );
}
