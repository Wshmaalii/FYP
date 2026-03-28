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
    <div className="bg-zinc-900 border-b border-zinc-800 px-8 py-5">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="px-2 py-1 text-[11px] uppercase tracking-wider rounded border border-cyan-800 bg-cyan-950 text-cyan-300">
          {scopeLabel}
        </span>
        <span className="px-2 py-1 text-[11px] uppercase tracking-wider rounded border border-zinc-700 bg-zinc-950 text-zinc-400">
          {audienceLabel}
        </span>
      </div>
      <p className="text-zinc-500 text-[11px] uppercase tracking-[0.18em] mb-2">What is visible here?</p>
      <div className="mt-3 bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
        <ul className="space-y-3 text-sm">
          <li className="text-zinc-300">
            <span className="text-zinc-500">• Audience:</span> {visibilitySummary}
          </li>
          <li className="text-zinc-300">
            <span className="text-zinc-500">• Membership:</span> {membershipVisibility}
          </li>
          <li className="text-zinc-300">
            <span className="text-zinc-500">• Ticker mentions:</span> {tickerVisibility}
          </li>
          <li className="text-zinc-300">
            <span className="text-zinc-500">• Metadata shown:</span> {metadataVisibility}
          </li>
        </ul>
      </div>
    </div>
  );
}
