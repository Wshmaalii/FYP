import { AlertTriangle, TrendingUp, TrendingDown, Clock, Calendar } from 'lucide-react';
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

interface EarningsReport {
  ticker: string;
  company: string;
  date: string;
  time: string;
  countdown: string;
  eps: { expected: number; actual?: number };
  revenue: { expected: string; actual?: string };
  tags: Array<'EPS Beat' | 'Revenue Miss' | 'Guidance Raised' | 'EPS Miss' | 'Revenue Beat'>;
}

const upcomingEarnings: EarningsReport[] = [
  {
    ticker: 'TSCO.L',
    company: 'Tesco PLC',
    date: 'Today',
    time: '07:00',
    countdown: '2h 15m',
    eps: { expected: 12.5, actual: 13.2 },
    revenue: { expected: '15.2B', actual: '15.8B' },
    tags: ['EPS Beat', 'Revenue Beat', 'Guidance Raised']
  },
  {
    ticker: 'BARC.L',
    company: 'Barclays PLC',
    date: 'Today',
    time: '07:30',
    countdown: '2h 45m',
    eps: { expected: 8.3 },
    revenue: { expected: '6.2B' },
    tags: []
  },
  {
    ticker: 'ULVR.L',
    company: 'Unilever',
    date: 'Tomorrow',
    time: '07:00',
    countdown: '1d 2h',
    eps: { expected: 45.2 },
    revenue: { expected: '13.8B' },
    tags: []
  },
];

const mockMessages: Message[] = [
  {
    id: '1',
    user: 'Emma Thompson',
    verified: true,
    content: 'TSCO.L earnings just dropped. Strong beat on both EPS and revenue. Guidance raised for Q4.',
    timestamp: '07:05',
    tickers: []
  },
  {
    id: '2',
    user: 'James Fletcher',
    verified: true,
    content: 'Impressive results from Tesco. Digital sales up 18% YoY. Looking strong going into the holiday season.',
    timestamp: '07:12',
  },
  {
    id: '3',
    user: 'Michael Roberts',
    verified: false,
    content: 'Analyst commentary from Barclays suggests BARC.L could surprise to the upside. Strong investment banking activity.',
    timestamp: '08:20',
  },
];

function EarningsCard({ report }: { report: EarningsReport }) {
  const hasReported = report.eps.actual !== undefined;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-cyan-600 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-zinc-100">{report.ticker}</h3>
            {hasReported && (
              <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                REPORTED
              </span>
            )}
          </div>
          <p className="text-zinc-500 text-sm">{report.company}</p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-cyan-400">
            <Clock className="w-3 h-3" />
            <span className="text-sm">{report.countdown}</span>
          </div>
          <p className="text-zinc-500 text-xs mt-1">{report.date} • {report.time}</p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div className="bg-zinc-950 border border-zinc-800 rounded p-3">
          <p className="text-zinc-500 text-xs mb-1">EPS</p>
          {hasReported ? (
            <div className="flex items-baseline gap-2">
              <span className="text-zinc-100">{report.eps.actual}p</span>
              <span className="text-emerald-400 text-sm">vs {report.eps.expected}p</span>
            </div>
          ) : (
            <span className="text-zinc-100">{report.eps.expected}p exp.</span>
          )}
        </div>
        <div className="bg-zinc-950 border border-zinc-800 rounded p-3">
          <p className="text-zinc-500 text-xs mb-1">Revenue</p>
          {hasReported ? (
            <div className="flex items-baseline gap-2">
              <span className="text-zinc-100">£{report.revenue.actual}</span>
              <span className="text-emerald-400 text-sm">vs £{report.revenue.expected}</span>
            </div>
          ) : (
            <span className="text-zinc-100">£{report.revenue.expected} exp.</span>
          )}
        </div>
      </div>

      {/* Tags */}
      {report.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {report.tags.map((tag) => {
            const isBeat = tag.includes('Beat') || tag.includes('Raised');
            return (
              <span
                key={tag}
                className={`text-xs px-2 py-1 rounded ${
                  isBeat
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-red-950 text-red-400 border border-red-800'
                }`}
              >
                {tag}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function EarningsWatchChannel() {
  return (
    <>
      {/* Warning Banner */}
      <div className="bg-amber-950 border-b border-amber-900 px-6 py-3 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-400" />
        <span className="text-amber-300 text-sm">Earnings data is subject to company reporting schedules and may change.</span>
      </div>

      <div className="flex-1 overflow-y-auto bg-zinc-950">
        {/* Upcoming Earnings */}
        <div className="border-b border-zinc-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-cyan-400" />
            <h2 className="text-zinc-100">Upcoming Earnings Reports</h2>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {upcomingEarnings.map((report) => (
              <EarningsCard key={report.ticker} report={report} />
            ))}
          </div>
        </div>

        {/* Chat Messages */}
        <div className="p-6 space-y-4">
          <h2 className="text-zinc-100 mb-4">Analyst Commentary</h2>
          {mockMessages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
        </div>
      </div>

      {/* Message Input */}
      <MessageInput />
    </>
  );
}
