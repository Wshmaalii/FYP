import { Lock, Shield, Users } from 'lucide-react';
import { useState } from 'react';
import { MessageInput } from '../MessageInput';

interface Member {
  name: string;
  status: 'online' | 'offline';
  verified: boolean;
}

interface Message {
  id: string;
  user: string;
  content: string;
  timestamp: string;
  encrypted: boolean;
}

const members: Member[] = [
  { name: 'Alex Morgan', status: 'online', verified: true },
  { name: 'Sarah Chen', status: 'online', verified: true },
  { name: 'James Fletcher', status: 'online', verified: true },
  { name: 'Emma Thompson', status: 'offline', verified: true },
  { name: 'David Kumar', status: 'offline', verified: false },
];

const messages: Message[] = [
  {
    id: '1',
    user: 'Sarah Chen',
    content: 'Thanks for adding me to this room. Looking forward to discussing strategies.',
    timestamp: '14:32',
    encrypted: true
  },
  {
    id: '2',
    user: 'James Fletcher',
    content: 'Welcome! This is our secure space for discussing positions before making them public.',
    timestamp: '14:35',
    encrypted: true
  },
  {
    id: '3',
    user: 'Alex Morgan',
    content: 'Just opened a position on BARC.L. Will share details here first before posting to main channels.',
    timestamp: '14:38',
    encrypted: true
  },
];

export function PrivateRoomsChannel() {
  const [showMembers, setShowMembers] = useState(false);

  return (
    <>
      {/* Encryption Banner */}
      <div className="bg-cyan-950 border-b border-cyan-900 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-cyan-400" />
          <span className="text-cyan-300 text-sm">End-to-end encrypted • Only members can see messages</span>
        </div>
        <button
          onClick={() => setShowMembers(!showMembers)}
          className="flex items-center gap-2 px-3 py-1 bg-cyan-900 hover:bg-cyan-800 rounded transition-colors"
        >
          <Users className="w-4 h-4 text-cyan-300" />
          <span className="text-cyan-300 text-sm">{members.length} members</span>
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-zinc-950">
          {messages.map((message) => (
            <div key={message.id} className="flex gap-3">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm">{message.user.split(' ').map(n => n[0]).join('')}</span>
              </div>

              {/* Message Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-zinc-100">{message.user}</span>
                  <Lock className="w-3 h-3 text-cyan-400" />
                  <span className="text-zinc-600 text-xs">{message.timestamp}</span>
                </div>

                <div className="bg-zinc-900 rounded-2xl rounded-tl-sm px-4 py-3 border border-cyan-900/30 inline-block max-w-2xl">
                  <p className="text-zinc-300">{message.content}</p>
                </div>
              </div>
            </div>
          ))}

          {/* Empty State Hint */}
          <div className="flex items-center justify-center py-12">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-cyan-400" />
              </div>
              <h3 className="text-zinc-100 mb-2">Secure Private Room</h3>
              <p className="text-zinc-500 text-sm">
                All messages in this room are end-to-end encrypted. Only invited members can read and send messages.
              </p>
            </div>
          </div>
        </div>

        {/* Members Sidebar */}
        {showMembers && (
          <div className="w-72 bg-zinc-900 border-l border-zinc-800 p-4 overflow-y-auto">
            <h3 className="text-zinc-100 mb-4 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Members ({members.length})
            </h3>
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.name}
                  className="flex items-center gap-3 p-2 rounded hover:bg-zinc-800 transition-colors"
                >
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                      <span className="text-white text-sm">{member.name.split(' ').map(n => n[0]).join('')}</span>
                    </div>
                    <div
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-zinc-900 ${
                        member.status === 'online' ? 'bg-emerald-400' : 'bg-zinc-600'
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-zinc-100 text-sm truncate">{member.name}</span>
                      {member.verified && <Shield className="w-3 h-3 text-cyan-400" />}
                    </div>
                    <span className="text-zinc-500 text-xs capitalize">{member.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Message Input */}
      <MessageInput />
    </>
  );
}
