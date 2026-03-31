import { Globe, Hash, Users } from 'lucide-react';
import type { ConversationSummary } from '../../api/messaging';

interface PublicSpacesPageProps {
  spaces: ConversationSummary[];
  onOpen: (conversationKey: string) => void;
}

export function PublicSpacesPage({ spaces, onOpen }: PublicSpacesPageProps) {
  return (
    <div className="flex-1 overflow-y-auto bg-[#0b0f10]">
      <div className="mx-auto max-w-[980px] px-4 py-5 lg:px-6 lg:py-6">
        <div className="mb-5 rounded-[20px] border border-zinc-800/80 bg-[#101417] px-4 py-4 lg:px-5">
          <div className="mb-1 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-zinc-700 bg-zinc-950/80">
              <Globe className="h-3.5 w-3.5 text-[#8fb7b2]" />
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-[0.28em] text-zinc-500">Messaging</p>
              <h2 className="mt-1 text-[24px] font-semibold tracking-tight text-zinc-100">Public Spaces</h2>
            </div>
          </div>
          <p className="max-w-2xl text-[12px] leading-5 text-zinc-500">Open the public spaces you have already joined.</p>
        </div>

        {spaces.length === 0 ? (
          <div className="rounded-[18px] border border-zinc-800/80 bg-[#111518] px-5 py-5 text-[13px] leading-6 text-zinc-500">
            You have not joined any public spaces yet. Browse available communities from Explore Spaces.
          </div>
        ) : (
          <div className="space-y-3">
            {spaces.map((space) => (
              <button
                key={space.conversation_key}
                type="button"
                onClick={() => onOpen(space.conversation_key)}
                className="w-full rounded-[18px] border border-zinc-800/80 bg-[#111518] px-4 py-4 text-left transition-colors duration-150 hover:border-zinc-700 hover:bg-[#14181b]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <h3 className="text-[15px] font-medium tracking-tight text-zinc-100">{space.name}</h3>
                      <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[9px] uppercase tracking-[0.18em] text-zinc-400">
                        Public Space
                      </span>
                    </div>
                    <p className="text-[12px] leading-5 text-zinc-400">{space.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {space.channels.map((channel) => (
                        <span key={channel.channel_key} className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-950/80 px-2.5 py-1 text-[10px] text-zinc-400">
                          <Hash className="h-3 w-3" />
                          {channel.slug}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[12px] text-zinc-500">
                    <Users className="h-3.5 w-3.5" />
                    <span>{space.member_count}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
