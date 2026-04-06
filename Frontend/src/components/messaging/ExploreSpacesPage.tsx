import { Hash } from 'lucide-react';
import type { ConversationSummary } from '../../api/messaging';

interface ExploreSpacesPageProps {
  spaces: ConversationSummary[];
  joiningKey: string | null;
  onJoin: (conversationKey: string) => Promise<void>;
  onOpen: (conversationKey: string) => void;
}

export function ExploreSpacesPage({ spaces, joiningKey, onJoin, onOpen }: ExploreSpacesPageProps) {
  return (
    <div className="flex-1 overflow-y-auto bg-[#0b0f10]">
      <div className="mx-auto max-w-[980px] px-4 py-6 lg:px-6 lg:py-7">
        <div className="mb-7 px-1">
          <p className="text-[9px] uppercase tracking-[0.28em] text-zinc-500">Discover</p>
          <h2 className="mt-2 text-[22px] font-semibold tracking-tight text-zinc-100">Explore Spaces</h2>
          <p className="mt-2 max-w-2xl text-[12px] leading-5 text-zinc-500">Join public trading communities and move straight into conversation.</p>
        </div>

        <div className="space-y-5">
          {spaces.map((space) => (
            <div
              key={space.conversation_key}
              className="rounded-[18px] border bg-[#14161b] px-5 py-5 transition-colors duration-150"
              style={{ borderColor: 'rgba(255,255,255,0.06)' }}
              onMouseEnter={(event) => {
                event.currentTarget.style.background = '#171920';
                event.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)';
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.background = '#14161b';
                event.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
              }}
            >
              <div className="flex items-center justify-between gap-5">
                <div className="min-w-0 flex-1">
                  <div className="inline-flex rounded-full bg-[rgba(88,122,255,0.12)] px-2.5 py-1 text-[9px] uppercase tracking-[0.18em] text-[rgba(132,153,255,0.88)]">
                    Public Space
                  </div>
                  <h3 className="mt-3 text-[20px] font-semibold tracking-tight text-zinc-100">{space.name}</h3>
                  <p className="mt-2 max-w-3xl text-[13px] leading-6 text-zinc-500">{space.description}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-2.5">
                    {space.channels.map((channel) => (
                      <span
                        key={channel.channel_key}
                        className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] text-zinc-400"
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          borderColor: 'rgba(255,255,255,0.08)',
                        }}
                      >
                        <Hash className="h-3 w-3" />
                        <span>{channel.slug}</span>
                      </span>
                    ))}
                  </div>
                  <p className="mt-4 text-[11px] text-zinc-600">{space.member_count} members</p>
                </div>
                <div className="flex shrink-0 self-center">
                  {space.is_member ? (
                    <button
                      type="button"
                      onClick={() => onOpen(space.conversation_key)}
                      className="rounded-full px-4 py-2 text-[12px] font-medium text-zinc-300 transition-colors duration-150 hover:bg-[rgba(255,255,255,0.1)]"
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '0.5px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      Open
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void onJoin(space.conversation_key)}
                      disabled={joiningKey === space.conversation_key}
                      className="rounded-full px-4 py-2 text-[12px] font-medium text-zinc-300 transition-colors duration-150 hover:bg-[rgba(255,255,255,0.1)] disabled:opacity-60"
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '0.5px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      {joiningKey === space.conversation_key ? 'Joining...' : 'Join'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
