interface ChannelPrivacyCardProps {
  scopeLabel: string;
  audienceLabel: string;
  visibilitySummary: string;
  membershipVisibility: string;
  tickerVisibility: string;
  metadataVisibility: string;
}

export function ChannelPrivacyCard({
  scopeLabel,
  audienceLabel,
  visibilitySummary,
  membershipVisibility,
  tickerVisibility,
  metadataVisibility,
}: ChannelPrivacyCardProps) {
  return (
    <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-4">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className="px-2 py-1 text-[11px] uppercase tracking-wider rounded border border-cyan-800 bg-cyan-950 text-cyan-300">
          {scopeLabel}
        </span>
        <span className="px-2 py-1 text-[11px] uppercase tracking-wider rounded border border-zinc-700 bg-zinc-950 text-zinc-400">
          {audienceLabel}
        </span>
      </div>
      <p className="text-zinc-500 text-xs uppercase tracking-wider mb-2">What is visible here?</p>
      <p className="text-zinc-300 text-sm">{visibilitySummary}</p>
      <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
        <div className="bg-zinc-950 border border-zinc-800 rounded p-3">
          <span className="block text-zinc-500 mb-1">Who can read messages?</span>
          <span className="text-zinc-300">{visibilitySummary}</span>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 rounded p-3">
          <span className="block text-zinc-500 mb-1">Is membership visible?</span>
          <span className="text-zinc-300">{membershipVisibility}</span>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 rounded p-3">
          <span className="block text-zinc-500 mb-1">Are ticker mentions visible?</span>
          <span className="text-zinc-300">{tickerVisibility}</span>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 rounded p-3">
          <span className="block text-zinc-500 mb-1">What metadata is shown?</span>
          <span className="text-zinc-300">{metadataVisibility}</span>
        </div>
      </div>
    </div>
  );
}
