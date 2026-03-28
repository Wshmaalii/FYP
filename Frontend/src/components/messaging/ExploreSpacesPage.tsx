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
              <p className="text-zinc-500 text-sm mt-1">Join public trading communities and move straight into conversation.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {spaces.map((space) => (
            <div key={space.conversation_key} className="bg-zinc-900 border border-zinc-800 rounded-[24px] p-6 transition-all duration-200 ease-out hover:border-zinc-700 hover:shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
              <div className="flex items-start justify-between gap-5 mb-5">
                <div>
                  <div className="flex items-center gap-2 mb-2.5">
                    <h3 className="text-zinc-100 text-lg font-semibold tracking-tight">{space.name}</h3>
                    <span className="px-2 py-1 rounded border border-cyan-900 bg-cyan-950 text-cyan-300 text-[11px] uppercase tracking-wider">
                      Public Space
                    </span>
                  </div>
                  <p className="text-zinc-500 text-sm leading-6">{space.description}</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center">
                  {space.visibility === 'public' ? (
                    <Globe className="w-5 h-5 text-cyan-400" />
                  ) : (
                    <Lock className="w-5 h-5 text-zinc-400" />
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-5">
                {space.channels.map((channel) => (
                  <span key={channel.channel_key} className="px-2 py-1 rounded bg-zinc-950 border border-zinc-800 text-zinc-400 text-xs">
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
                    className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 active:translate-y-px text-white text-sm font-medium transition-all duration-150 shadow-[0_10px_24px_rgba(8,145,178,0.16)]"
                  >
                    Open
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void onJoin(space.conversation_key)}
                    disabled={joiningKey === space.conversation_key}
                    className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:translate-y-px disabled:opacity-60 text-zinc-100 text-sm font-medium transition-all duration-150"
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
