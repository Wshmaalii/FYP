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
    <div className="flex-1 overflow-y-auto bg-zinc-950 px-8 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-900 flex items-center justify-center">
              <Compass className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-zinc-100 text-2xl">Explore Spaces</h2>
              <p className="text-zinc-500 text-sm">Join public trading communities and move straight into conversation.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {spaces.map((space) => (
            <div key={space.conversation_key} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-zinc-100">{space.name}</h3>
                    <span className="px-2 py-1 rounded border border-cyan-900 bg-cyan-950 text-cyan-300 text-[11px] uppercase tracking-wider">
                      Public Space
                    </span>
                  </div>
                  <p className="text-zinc-500 text-sm">{space.description}</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center">
                  {space.visibility === 'public' ? (
                    <Globe className="w-5 h-5 text-cyan-400" />
                  ) : (
                    <Lock className="w-5 h-5 text-zinc-400" />
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
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
                    className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-sm transition-colors"
                  >
                    Open
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void onJoin(space.conversation_key)}
                    disabled={joiningKey === space.conversation_key}
                    className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-60 text-zinc-100 text-sm transition-colors"
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
