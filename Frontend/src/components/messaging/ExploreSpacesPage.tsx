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
    <div className="flex-1 overflow-y-auto bg-[var(--bg-app)] px-7 py-6">
      <div className="mx-auto max-w-[1080px]">
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-[var(--bg-card)]">
              <Compass className="h-5 w-5 text-[var(--accent-teal)]" />
            </div>
            <div>
              <h2 className="text-[18px] font-semibold text-[var(--text-primary)]">Explore Spaces</h2>
              <p className="mt-1 text-[12px] text-[var(--text-faint)]">Join public trading communities and move straight into conversation.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          {spaces.map((space) => (
            <div key={space.conversation_key} className="flex items-center justify-between gap-4 rounded-[12px] border border-white/[0.07] bg-[var(--bg-card)] px-[18px] py-4 transition-colors hover:border-white/[0.13]">
              <div className="min-w-0 flex-1">
                <span className="mb-[5px] inline-block rounded-full bg-[#4f6ef7]/10 px-2 py-[2px] text-[9px] font-semibold uppercase tracking-[0.5px] text-[#4f6ef7]">
                      Public Space
                    </span>
                <h3 className="mb-1 text-[14px] font-semibold text-[var(--text-primary)]">{space.name}</h3>
                <p className="max-w-2xl text-[12px] leading-6 text-[var(--text-faint)]">{space.description}</p>
                <div className="mt-3 flex flex-wrap gap-[5px]">
                  {space.channels.map((channel) => (
                    <span key={channel.channel_key} className="rounded-[5px] bg-white/5 px-[7px] py-[2px] text-[10px] text-[var(--text-subtle)]">
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
                    className="whitespace-nowrap rounded-[8px] border border-white/10 bg-white/[0.06] px-4 py-[7px] text-[12px] font-medium text-[var(--text-muted)] transition-colors hover:bg-white/10 hover:text-[var(--text-primary)]"
                  >
                    Open
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void onJoin(space.conversation_key)}
                    disabled={joiningKey === space.conversation_key}
                    className="whitespace-nowrap rounded-[8px] border border-white/10 bg-white/[0.06] px-4 py-[7px] text-[12px] font-medium text-[var(--text-muted)] transition-colors hover:bg-white/10 hover:text-[var(--text-primary)] disabled:opacity-60"
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
