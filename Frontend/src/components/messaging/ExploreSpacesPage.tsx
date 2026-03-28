import { Compass, Users } from 'lucide-react';
import type { ConversationSummary } from '../../api/messaging';

interface ExploreSpacesPageProps {
  spaces: ConversationSummary[];
  joiningKey: string | null;
  onJoin: (conversationKey: string) => Promise<void>;
  onOpen: (conversationKey: string) => void;
}

export function ExploreSpacesPage({ spaces, joiningKey, onJoin, onOpen }: ExploreSpacesPageProps) {
  return (
    <div className="flex-1 overflow-y-auto bg-[#0e0e10] px-8 py-10">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10">
          <div className="mb-4 flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-[rgba(255,255,255,0.07)] bg-[#161618]">
              <Compass className="h-5 w-5 text-[rgba(255,255,255,0.45)]" />
            </div>
            <div>
              <h2 className="text-[20px] font-semibold tracking-tight text-[rgba(255,255,255,0.9)]">Public Spaces</h2>
              <p className="mt-1 text-[13px] leading-6 text-[rgba(255,255,255,0.45)]">Join public trading communities and move straight into conversation.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-[14px]">
          {spaces.map((space) => (
            <div key={space.conversation_key} className="flex items-center justify-between gap-6 rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[#161618] px-9 py-8">
              <div className="min-w-0 flex-1">
                <div className="mb-3">
                  <span className="inline-flex rounded-full border border-[rgba(79,110,247,0.2)] bg-[rgba(79,110,247,0.16)] px-3 py-1 text-[10px] font-medium uppercase tracking-[1.2px] text-[#7b8fff]">
                    Public Space
                  </span>
                </div>
                <div className="mb-3">
                  <h3 className="text-[15px] font-semibold tracking-tight text-[rgba(255,255,255,0.9)]">{space.name}</h3>
                </div>
                <p className="max-w-3xl text-[13px] leading-6 text-[rgba(255,255,255,0.45)]">{space.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {space.channels.map((channel) => (
                    <span
                      key={channel.channel_key}
                      className="rounded-[5px] bg-[rgba(255,255,255,0.05)] px-2.5 py-1.5 text-[10px] text-[rgba(255,255,255,0.45)]"
                    >
                      #{channel.slug}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-2 text-[12px] text-[rgba(255,255,255,0.45)]">
                  <Users className="h-4 w-4" />
                  <span>{space.member_count} members</span>
                </div>
              </div>
              <div className="shrink-0">
                {space.is_member ? (
                  <button
                    type="button"
                    onClick={() => onOpen(space.conversation_key)}
                    className="rounded-[8px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.06)] px-8 py-3 text-[13px] font-semibold text-[rgba(255,255,255,0.9)] transition-colors hover:bg-[rgba(255,255,255,0.1)]"
                  >
                    Open
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void onJoin(space.conversation_key)}
                    disabled={joiningKey === space.conversation_key}
                    className="rounded-[8px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.06)] px-8 py-3 text-[13px] font-semibold text-[rgba(255,255,255,0.9)] transition-colors hover:bg-[rgba(255,255,255,0.1)] disabled:opacity-60"
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
