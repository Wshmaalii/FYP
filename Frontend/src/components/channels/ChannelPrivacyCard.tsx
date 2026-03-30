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
    <div className="px-6 py-3" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-sidebar)' }}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded px-2 py-1 text-[10px] uppercase tracking-[0.18em]" style={{ background: 'var(--accent-teal-bg)', border: '0.5px solid var(--accent-teal-border)', color: 'var(--accent-teal)' }}>
          {scopeLabel}
        </span>
        <span className="rounded px-2 py-1 text-[10px] uppercase tracking-[0.18em]" style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)', color: 'var(--text-muted)' }}>
          {audienceLabel}
        </span>
        <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{visibilitySummary}</p>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]" style={{ color: 'var(--text-label)' }}>
        <span>Membership: {membershipVisibility}</span>
        <span>Ticker mentions: {tickerVisibility}</span>
        <span>Metadata: {metadataVisibility}</span>
      </div>
    </div>
  );
}
