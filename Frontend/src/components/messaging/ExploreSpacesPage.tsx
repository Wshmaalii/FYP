import { Compass, Globe, Lock } from 'lucide-react';
import type { ConversationSummary } from '../../api/messaging';

interface ExploreSpacesPageProps {
  spaces: ConversationSummary[];
  joiningKey: string | null;
  onJoin: (conversationKey: string) => Promise<void>;
  onOpen: (conversationKey: string) => void;
}

export function ExploreSpacesPage({ spaces, joiningKey, onJoin, onOpen }: ExploreSpacesPageProps) {
  return (
    <div className="flex-1 overflow-y-auto bg-[#0e0e10] px-8 py-8">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#16312c]">
              <Compass className="h-4 w-4 text-[#18c7b0]" />
            </div>
            <div>
              <h2 className="text-[18px] font-semibold tracking-tight text-zinc-100">Explore Spaces</h2>
              <p className="mt-1 text-[12px] leading-5 text-zinc-500">Join public trading communities and move straight into conversation.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {spaces.map((space) => (
            <div key={space.conversation_key} className="flex items-center justify-between gap-6 rounded-[16px] border border-white/[0.07] bg-[#161618] px-[18px] py-4 transition-colors hover:border-white/[0.13]">
              <div className="min-w-0 flex-1">
                <div className="mb-1.5">
                  <span className="inline-block rounded-full bg-[#4f6ef7]/10 px-2 py-[2px] text-[9px] font-semibold uppercase tracking-[0.5px] text-[#4f6ef7]">
                      Public Space
                    </span>
                </div>
                <h3 className="text-[14px] font-semibold text-zinc-100">{space.name}</h3>
                <p className="mt-1 text-[12px] leading-5 text-zinc-500">{space.description}</p>
                <div className="mt-3 flex flex-wrap gap-[5px]">
                  {space.channels.map((channel) => (
                    <span key={channel.channel_key} className="rounded-[5px] bg-white/[0.05] px-[7px] py-[2px] text-[10px] text-zinc-400">
                      #{channel.slug}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-white/[0.08] bg-[#111113]">
                  {space.visibility === 'public' ? (
                    <Globe className="h-4 w-4 text-cyan-400" />
                  ) : (
                    <Lock className="h-4 w-4 text-zinc-500" />
                  )}
                </div>
                {space.is_member ? (
                  <button
                    type="button"
                    onClick={() => onOpen(space.conversation_key)}
                    className="whitespace-nowrap rounded-[8px] border border-white/10 bg-white/[0.06] px-4 py-[7px] text-[12px] font-medium text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-100"
                  >
                    Open
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void onJoin(space.conversation_key)}
                    disabled={joiningKey === space.conversation_key}
                    className="whitespace-nowrap rounded-[8px] border border-white/10 bg-white/[0.06] px-4 py-[7px] text-[12px] font-medium text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-100 disabled:opacity-60"
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
