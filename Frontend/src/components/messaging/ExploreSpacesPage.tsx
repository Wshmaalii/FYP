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
    <div className="flex-1 overflow-y-auto bg-zinc-950 px-8 py-10">
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

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {spaces.map((space) => (
            <div key={space.conversation_key} className="rounded-[28px] border border-zinc-800 bg-[linear-gradient(180deg,rgba(26,29,38,0.96),rgba(18,21,28,0.98))] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.03)] transition-all duration-200 ease-out hover:border-zinc-700 hover:bg-[linear-gradient(180deg,rgba(28,32,41,0.98),rgba(19,22,30,1))] hover:shadow-[0_24px_52px_rgba(0,0,0,0.24)]">
              <div className="mb-5 flex items-start justify-between gap-5">
                <div>
                  <div className="mb-3 flex items-center gap-2.5">
                    <h3 className="text-xl font-semibold tracking-tight text-zinc-100">{space.name}</h3>
                    <span className="rounded-full border border-cyan-900/60 bg-cyan-950/40 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-cyan-300">
                      Public Space
                    </span>
                  </div>
                  <p className="max-w-xl text-sm leading-6 text-zinc-400">{space.description}</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-950/90">
                  {space.visibility === 'public' ? (
                    <Globe className="w-5 h-5 text-cyan-400" />
                  ) : (
                    <Lock className="w-5 h-5 text-zinc-400" />
                  )}
                </div>
              </div>

              <div className="mb-6 flex flex-wrap gap-2">
                {space.channels.map((channel) => (
                  <span key={channel.channel_key} className="rounded-full border border-zinc-700 bg-zinc-950/80 px-3 py-1.5 text-[11px] text-zinc-400">
                    #{channel.slug}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-zinc-800/80 bg-zinc-950/60 px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                  <Users className="w-4 h-4" />
                  <span>{space.member_count} members</span>
                </div>
                {space.is_member ? (
                  <button
                    type="button"
                    onClick={() => onOpen(space.conversation_key)}
                    className="rounded-2xl bg-cyan-600 px-4 py-2.5 text-sm font-medium text-white shadow-[0_12px_28px_rgba(8,145,178,0.16)] transition-all duration-150 hover:bg-cyan-500 active:translate-y-px"
                  >
                    Open
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void onJoin(space.conversation_key)}
                    disabled={joiningKey === space.conversation_key}
                    className="rounded-2xl bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-100 transition-all duration-150 hover:bg-zinc-700 active:translate-y-px disabled:opacity-60"
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
