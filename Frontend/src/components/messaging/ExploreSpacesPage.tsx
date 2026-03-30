import { Compass, Globe, Lock, Users } from 'lucide-react';
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
      <div className="mx-auto max-w-[1060px] px-4 py-5 lg:px-6 lg:py-6">
        <div className="mb-5 rounded-[20px] border border-zinc-800/80 bg-[#101417] px-4 py-4 lg:px-5">
          <div className="mb-1 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-zinc-700 bg-zinc-950/80">
              <Compass className="h-3.5 w-3.5 text-[#8fb7b2]" />
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-[0.28em] text-zinc-500">Discover</p>
              <h2 className="mt-1 text-[24px] font-semibold tracking-tight text-zinc-100">Explore Spaces</h2>
            </div>
          </div>
          <p className="max-w-2xl text-[12px] leading-5 text-zinc-500">Join public trading communities and move straight into conversation.</p>
        </div>

        <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-2">
          {spaces.map((space) => (
            <div key={space.conversation_key} className="rounded-[18px] border border-zinc-800/80 bg-[#111518] px-4 py-4 transition-colors duration-150 hover:border-zinc-700 hover:bg-[#14181b]">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <h3 className="text-[15px] font-medium tracking-tight text-zinc-100">{space.name}</h3>
                    <span className="shrink-0 rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[9px] uppercase tracking-[0.18em] text-zinc-400">
                      Public Space
                    </span>
                  </div>
                  <p className="max-w-xl text-[12px] leading-5 text-zinc-400">{space.description}</p>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-zinc-700 bg-zinc-950/80">
                  {space.visibility === 'public' ? (
                    <Globe className="h-3.5 w-3.5 text-[#8fb7b2]" />
                  ) : (
                    <Lock className="h-3.5 w-3.5 text-zinc-400" />
                  )}
                </div>
              </div>

              <div className="mb-3 rounded-[14px] border border-zinc-800/80 bg-zinc-950/55 px-3.5 py-3.5">
                <div className="flex flex-wrap gap-2">
                  {space.channels.map((channel) => (
                    <span key={channel.channel_key} className="rounded-full border border-zinc-700 bg-zinc-950/80 px-2.5 py-1 text-[10px] leading-none text-zinc-400">
                      #{channel.slug}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-[14px] border border-zinc-800/80 bg-zinc-950/65 px-3.5 py-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-[12px] text-zinc-500">
                    <Users className="w-3.5 h-3.5" />
                    <span>{space.member_count} members</span>
                  </div>
                  <div className="shrink-0">
                    {space.is_member ? (
                      <button
                        type="button"
                        onClick={() => onOpen(space.conversation_key)}
                        className="rounded-[12px] border border-[#284744] bg-[#131f1f] px-3.5 py-1.5 text-[12px] font-medium text-[#d4ece8] transition-colors duration-150 hover:bg-[#182625] active:translate-y-px"
                      >
                        Open
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void onJoin(space.conversation_key)}
                        disabled={joiningKey === space.conversation_key}
                        className="rounded-[12px] border border-zinc-700 bg-zinc-900 px-3.5 py-1.5 text-[12px] font-medium text-zinc-100 transition-colors duration-150 hover:bg-zinc-800 active:translate-y-px disabled:opacity-60"
                      >
                        {joiningKey === space.conversation_key ? 'Joining...' : 'Join'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
