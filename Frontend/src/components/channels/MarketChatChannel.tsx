import { AlertTriangle } from 'lucide-react';
import { ChatMessage } from '../ChatMessage';
import { MessageInput } from '../MessageInput';

interface Message {
  id: string;
  user: string;
  verified: boolean;
  content: string;
  timestamp: string;
  tickers?: string[];
}

const mockMessages: Message[] = [
  {
    id: '1',
    user: 'James Fletcher',
    verified: true,
    content: 'Morning all. Watching BARC.L closely today after the quarterly results.',
    timestamp: '09:42',
    tickers: ['BARC.L']
  },
  {
    id: '2',
    user: 'Sarah Chen',
    verified: true,
    content: 'Strong resistance at 185p. Worth keeping an eye on volume.',
    timestamp: '09:45',
  },
  {
    id: '3',
    user: 'Michael Roberts',
    verified: false,
    content: 'Anyone looking at LLOY.L and VOD.L this morning? Both showing interesting movement.',
    timestamp: '09:48',
    tickers: ['LLOY.L', 'VOD.L']
  },
  {
    id: '4',
    user: 'Emma Thompson',
    verified: true,
    content: 'Market sentiment seems cautious ahead of the BoE announcement. Keeping positions small.',
    timestamp: '09:52',
  },
  {
    id: '5',
    user: 'David Kumar',
    verified: false,
    content: 'BARC.L breaking through resistance now. Volume spike confirmed.',
    timestamp: '09:55',
    tickers: ['BARC.L']
  },
];

export function MarketChatChannel() {
  return (
    <>
      {/* Warning Banner */}
      <div className="bg-amber-950 border-b border-amber-900 px-6 py-3 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-400" />
        <span className="text-amber-300 text-sm">Market data may be delayed by 15 seconds.</span>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-zinc-950">
        {mockMessages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
      </div>

      {/* Message Input */}
      <MessageInput />
    </>
  );
}
