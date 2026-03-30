import { Compass } from 'lucide-react';
import type { ConversationSummary } from '../../api/messaging';

interface ExploreSpacesPageProps {
  spaces: ConversationSummary[];
  joiningKey: string | null;
  onJoin: (conversationKey: string) => Promise<void>;
  onOpen: (conversationKey: string) => void;
}

export function ExploreSpacesPage({ spaces, joiningKey, onJoin, onOpen }: ExploreSpacesPageProps) {
  return (
    <div className="flex-1 overflow-y-auto px-7 py-6" style={{ background: 'var(--bg-app)' }}>
      <div className="mx-auto max-w-[1080px]">
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ border: '0.5px solid var(--border-primary)', background: 'var(--bg-card)' }}>
              <Compass className="h-5 w-5" style={{ color: 'var(--accent-teal)' }} />
            </div>
            <div>
              <h2 className="text-[18px] font-semibold" style={{ color: 'var(--text-primary)' }}>Explore Spaces</h2>
              <p className="mt-1 text-[12px]" style={{ color: 'var(--text-faint)' }}>Join public trading communities and move straight into conversation.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          {spaces.map((space) => (
            <div
              key={space.conversation_key}
              className="flex items-center justify-between gap-4 rounded-[12px] px-[18px] py-4 transition-colors"
              style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-secondary)' }}
            >
              <div className="min-w-0 flex-1">
                <span className="mb-[5px] inline-block rounded-full px-2 py-[2px] text-[9px] font-semibold uppercase tracking-[0.5px]" style={{ background: 'rgba(79,110,247,0.12)', color: '#4f6ef7' }}>
                  Public Space
                </span>
                <h3 className="mb-1 text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{space.name}</h3>
                <p className="max-w-2xl text-[12px] leading-6" style={{ color: 'var(--text-faint)' }}>{space.description}</p>
                <div className="mt-3 flex flex-wrap gap-[5px]">
                  {space.channels.map((channel) => (
                    <span key={channel.channel_key} className="rounded-[5px] px-[7px] py-[2px] text-[10px]" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-subtle)' }}>
                      #{channel.slug}
                    </span>
                  ))}
                </div>
              </div>
              <div className="shrink-0">
                {space.is_member ? (
                  <button
                    type="button"
                    onClick={() => onOpen(space.conversation_key)}
                    className="whitespace-nowrap rounded-[8px] px-4 py-[7px] text-[12px] font-medium transition-colors"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)' }}
                  >
                    Open
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void onJoin(space.conversation_key)}
                    disabled={joiningKey === space.conversation_key}
                    className="whitespace-nowrap rounded-[8px] px-4 py-[7px] text-[12px] font-medium transition-colors disabled:opacity-60"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)' }}
                  >
                    {joiningKey === space.conversation_key ? 'Joining...' : 'Join'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
