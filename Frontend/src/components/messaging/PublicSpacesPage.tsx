import { Hash } from 'lucide-react';
import type { ConversationSummary } from '../../api/messaging';

interface PublicSpacesPageProps {
  spaces: ConversationSummary[];
  onOpen: (conversationKey: string) => void;
}

export function PublicSpacesPage({ spaces, onOpen }: PublicSpacesPageProps) {
  return (
    <div className="flex-1 overflow-y-auto bg-[#0b0f10]">
      <div className="mx-auto max-w-[980px] px-4 py-5 lg:px-6 lg:py-6">
        <div className="mb-6 px-1">
          <p className="text-[9px] uppercase tracking-[0.28em] text-zinc-500">Messaging</p>
          <h2 className="mt-2 text-[22px] font-semibold tracking-tight text-zinc-100">Public Spaces</h2>
          <p className="mt-2 max-w-2xl text-[12px] leading-5 text-zinc-500">Open the public spaces you have already joined.</p>
        </div>

        {spaces.length === 0 ? (
          <div className="rounded-[16px] border border-white/[0.06] bg-[#111518] px-5 py-5 text-[13px] leading-6 text-zinc-500">
            You have not joined any public spaces yet. Browse available communities from Explore Spaces.
          </div>
        ) : (
          <div className="space-y-4">
            {spaces.map((space) => (
              <button
                key={space.conversation_key}
                type="button"
                onClick={() => onOpen(space.conversation_key)}
                className="w-full rounded-[16px] border bg-[#14161b] px-[18px] py-[18px] text-left transition-colors duration-150"
                style={{
                  borderColor: 'rgba(255,255,255,0.06)',
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.background = '#171a20';
                  event.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)';
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.background = '#14161b';
                  event.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                }}
              >
                <div className="flex items-start justify-between gap-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                      <h3 className="text-[16px] font-medium tracking-tight text-zinc-100">{space.name}</h3>
                      <span className="rounded-full bg-[rgba(88,122,255,0.12)] px-2.5 py-1 text-[9px] uppercase tracking-[0.18em] text-[rgba(132,153,255,0.9)]">
                        Public Space
                      </span>
                    </div>
                    <p className="mt-3 max-w-3xl text-[13px] leading-6 text-zinc-500">{space.description}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {space.channels.map((channel) => (
                        <span
                          key={channel.channel_key}
                          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] text-zinc-500"
                          style={{ background: 'rgba(255,255,255,0.05)' }}
                        >
                          <Hash className="h-3 w-3" />
                          {channel.slug}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="shrink-0 pt-0.5">
                    <span
                      className="inline-flex rounded-[12px] px-4 py-2 text-[12px] font-medium text-zinc-300"
                      style={{
                        background: 'rgba(255,255,255,0.07)',
                        border: '0.5px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      Open
                    </span>
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
