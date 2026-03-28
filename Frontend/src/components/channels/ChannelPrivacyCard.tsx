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
    <div className="border-b border-white/6 bg-[linear-gradient(180deg,rgba(18,21,29,0.92),rgba(14,16,24,0.92))] px-8 py-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded border border-cyan-800/70 bg-cyan-950/70 px-2 py-1 text-[11px] uppercase tracking-wider text-cyan-300">
          {scopeLabel}
        </span>
        <span className="rounded border border-white/8 bg-zinc-950/90 px-2 py-1 text-[11px] uppercase tracking-wider text-zinc-400">
          {audienceLabel}
        </span>
      </div>
      <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-zinc-500">What is visible here?</p>
      <div className="mt-3 rounded-2xl border border-white/8 bg-zinc-950/90 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
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
