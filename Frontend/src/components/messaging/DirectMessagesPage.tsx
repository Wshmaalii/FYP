import { MessageSquare } from 'lucide-react';
import type { ConversationSummary } from '../../api/messaging';

interface DirectMessagesPageProps {
  conversations: ConversationSummary[];
  onOpen: (conversationKey: string) => void;
}

export function DirectMessagesPage({ conversations, onOpen }: DirectMessagesPageProps) {
  return (
    <div className="flex-1 overflow-y-auto bg-[#0b0f10]">
      <div className="mx-auto max-w-[980px] px-4 py-5 lg:px-6 lg:py-6">
        <div className="mb-5 rounded-[20px] border border-zinc-800/80 bg-[#101417] px-4 py-4 lg:px-5">
          <div className="mb-1 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-zinc-700 bg-zinc-950/80">
              <MessageSquare className="h-3.5 w-3.5 text-[#8fb7b2]" />
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-[0.28em] text-zinc-500">Messaging</p>
              <h2 className="mt-1 text-[24px] font-semibold tracking-tight text-zinc-100">Direct Messages</h2>
            </div>
          </div>
          <p className="max-w-2xl text-[12px] leading-5 text-zinc-500">Open your one-to-one conversations.</p>
        </div>

        {conversations.length === 0 ? (
          <div className="rounded-[18px] border border-zinc-800/80 bg-[#111518] px-5 py-5 text-[13px] leading-6 text-zinc-500">
            No direct messages yet. Start a 1:1 conversation from New Chat.
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map((conversation) => (
              <button
                key={conversation.conversation_key}
                type="button"
                onClick={() => onOpen(conversation.conversation_key)}
                className="w-full rounded-[18px] border border-zinc-800/80 bg-[#111518] px-4 py-4 text-left transition-colors duration-150 hover:border-zinc-700 hover:bg-[#14181b]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[15px] font-medium tracking-tight text-zinc-100">{conversation.name}</h3>
                    <p className="mt-1 text-[12px] leading-5 text-zinc-500">
                      {conversation.handle ? `@${conversation.handle}` : 'Direct message'}
                    </p>
                    {conversation.description ? (
                      <p className="mt-2 text-[12px] leading-5 text-zinc-400">{conversation.description}</p>
                    ) : null}
                  </div>
                  <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[9px] uppercase tracking-[0.18em] text-zinc-400">
                    1:1
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
