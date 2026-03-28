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
    <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.04),transparent_18%),linear-gradient(180deg,#0c0f15_0%,#0a0c12_100%)] px-8 py-10">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-900 flex items-center justify-center">
              <Compass className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-zinc-100 text-3xl font-semibold tracking-tight">Explore Spaces</h2>
              <p className="mt-1 text-sm leading-6 text-zinc-500">Join public trading communities and move straight into conversation.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {spaces.map((space) => (
            <div key={space.conversation_key} className="rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(22,25,34,0.92),rgba(14,17,24,0.96))] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.2)] transition-all duration-200 ease-out hover:border-cyan-500/20 hover:shadow-[0_24px_52px_rgba(0,0,0,0.24)]">
              <div className="flex items-start justify-between gap-5 mb-5">
                <div>
                  <div className="flex items-center gap-2 mb-2.5">
                    <h3 className="text-zinc-100 text-lg font-semibold tracking-tight">{space.name}</h3>
                    <span className="rounded border border-cyan-900/70 bg-cyan-950/70 px-2 py-1 text-[11px] uppercase tracking-wider text-cyan-300">
                      Public Space
                    </span>
                  </div>
                  <p className="text-zinc-500 text-sm leading-6">{space.description}</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/8 bg-zinc-950/90">
                  {space.visibility === 'public' ? (
                    <Globe className="w-5 h-5 text-cyan-400" />
                  ) : (
                    <Lock className="w-5 h-5 text-zinc-400" />
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-5">
                {space.channels.map((channel) => (
                  <span key={channel.channel_key} className="rounded border border-white/8 bg-zinc-950/90 px-2 py-1 text-xs text-zinc-400">
                    #{channel.slug}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-zinc-500 text-sm">
                  <Users className="w-4 h-4" />
                  <span>{space.member_count} members</span>
                </div>
                {space.is_member ? (
                  <button
                    type="button"
                    onClick={() => onOpen(space.conversation_key)}
                    className="rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-medium text-white shadow-[0_12px_28px_rgba(8,145,178,0.18)] transition-all duration-150 hover:bg-cyan-500 active:translate-y-px"
                  >
                    Open
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void onJoin(space.conversation_key)}
                    disabled={joiningKey === space.conversation_key}
                    className="rounded-xl bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-100 transition-all duration-150 hover:bg-zinc-700 active:translate-y-px disabled:opacity-60"
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
