import { Plus } from 'lucide-react';
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

const spaceColors = ['#4f6ef7', '#f59e0b', '#2dd4aa', '#f26b6b'];

function NavItem({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-[7px] px-2 py-[7px] text-left text-[13px] transition-all"
      style={{
        background: active ? 'var(--bg-active)' : 'transparent',
        color: active ? 'var(--text-primary)' : 'var(--text-muted)',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'var(--bg-hover)';
          e.currentTarget.style.color = 'var(--text-secondary)';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--text-muted)';
        }
      }}
    >
      {label}
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
    <div
      className="flex w-60 min-w-60 flex-col"
      style={{ background: 'var(--bg-sidebar)', borderRight: '0.5px solid var(--border-secondary)' }}
    >
      <div className="px-4 pt-[18px] pb-3" style={{ borderBottom: '0.5px solid var(--border-subtle)' }}>
        <div className="mb-[14px] flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-[7px] text-[11px] font-bold text-white"
            style={{ background: 'var(--accent-teal)' }}
          >
            TL
          </div>
          <span className="text-[13px] font-semibold tracking-[0.5px]" style={{ color: 'var(--text-primary)' }}>
            TradeLink
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenComposer}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-medium transition-all"
          style={{
            background: 'var(--accent-teal-bg)',
            border: '0.5px solid var(--accent-teal-border)',
            color: 'var(--accent-teal)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--accent-teal-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--accent-teal-bg)';
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          New Chat
        </button>
      </div>

      <div className="px-4 pt-[14px] pb-2" style={{ borderBottom: '0.5px solid var(--border-subtle)' }}>
        <div className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[1.2px]" style={{ color: 'var(--text-label)' }}>
          Discover
        </div>
        <div className="space-y-0.5">
          <NavItem label="Explore Spaces" active={selectedView === 'Explore Spaces'} onClick={() => onNavigate('Explore Spaces')} />
          <NavItem label="Browse Communities" onClick={() => onNavigate('Explore Spaces')} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4">
        <div className="mt-[14px] mb-2 px-2 text-[10px] font-semibold uppercase tracking-[1.2px]" style={{ color: 'var(--text-label)' }}>
          My Spaces
        </div>
        {mySpaces.length === 0 ? (
          <p className="px-2 py-1.5 text-[13px]" style={{ color: 'var(--text-subtle)' }}>
            Create or join a space to get started.
          </p>
        ) : (
          <div className="space-y-0.5">
            {mySpaces.map((space, index) => {
              const isSelected = selectedConversationKey === space.conversation_key;
              const dotColor = spaceColors[index % spaceColors.length];

              return (
                <button
                  key={space.conversation_key}
                  type="button"
                  onClick={() => onOpenConversation(space.conversation_key)}
                  className="flex w-full items-center gap-2 rounded-[7px] px-2 py-1.5 text-left transition-all"
                  style={{
                    background: isSelected ? 'var(--bg-active)' : 'transparent',
                    color: isSelected ? 'var(--text-primary)' : 'var(--text-subtle)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'var(--bg-hover)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <div className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: dotColor }} />
                  <span className="text-[13px]">{space.name}</span>
                </button>
              );
            })}
          </div>
        )}

        {directMessages.length > 0 ? (
          <>
            <div className="mt-[14px] mb-2 px-2 text-[10px] font-semibold uppercase tracking-[1.2px]" style={{ color: 'var(--text-label)' }}>
              Direct Messages
            </div>
            <div className="space-y-0.5">
              {directMessages.map((dm) => {
                const isSelected = selectedConversationKey === dm.conversation_key;
                return (
                  <button
                    key={dm.conversation_key}
                    type="button"
                    onClick={() => onOpenConversation(dm.conversation_key)}
                    className="w-full rounded-[7px] px-2 py-[7px] text-left text-[13px] transition-all"
                    style={{
                      background: isSelected ? 'var(--bg-active)' : 'transparent',
                      color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'var(--bg-hover)';
                        e.currentTarget.style.color = 'var(--text-secondary)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'var(--text-muted)';
                      }
                    }}
                  >
                    {dm.name}
                  </button>
                );
              })}
            </div>
          </>
        ) : null}

        {privateGroups.length > 0 ? (
          <>
            <div className="mt-[14px] mb-2 px-2 text-[10px] font-semibold uppercase tracking-[1.2px]" style={{ color: 'var(--text-label)' }}>
              Private Groups
            </div>
            <div className="space-y-0.5 pb-3">
              {privateGroups.map((group, index) => {
                const isSelected = selectedConversationKey === group.conversation_key;
                const dotColor = spaceColors[(index + mySpaces.length) % spaceColors.length];

                return (
                  <button
                    key={group.conversation_key}
                    type="button"
                    onClick={() => onOpenConversation(group.conversation_key)}
                    className="flex w-full items-center gap-2 rounded-[7px] px-2 py-1.5 text-left transition-all"
                    style={{
                      background: isSelected ? 'var(--bg-active)' : 'transparent',
                      color: isSelected ? 'var(--text-primary)' : 'var(--text-subtle)',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'var(--bg-hover)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <div className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: dotColor }} />
                    <span className="text-[13px]">{group.name}</span>
                  </button>
                );
              })}
            </div>
          </>
        ) : null}
      </div>

      <MarketDashboard onNavigate={onNavigate} onOpenStock={onOpenStock} />
    </div>
  );
}
