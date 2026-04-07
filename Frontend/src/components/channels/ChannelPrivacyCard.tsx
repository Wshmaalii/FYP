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
  const compactSummary = (() => {
    const scope = scopeLabel.toLowerCase();

    if (scope.includes('public')) {
      return 'Public space · Members and ticker mentions visible';
    }

    if (scope.includes('private')) {
      return 'Private room · Messages, members, and ticker mentions stay inside';
    }

    if (scope.includes('direct')) {
      return 'Direct message · Only participants can see messages and mentions';
    }

    return visibilitySummary;
  })();

  const detailLine = [
    membershipVisibility.replace(/^Room membership is visible only to invited members inside this room\.?$/i, 'Members only'),
    tickerVisibility.replace(/^Ticker mentions stay inside this room and are only visible to invited members\.?$/i, 'Ticker mentions stay inside'),
    metadataVisibility.replace(/^Display name, verification badge, timestamp, and room membership are visible only to invited members\.?$/i, 'Metadata private'),
  ].join(' · ');

  return (
    <div
      style={{
        padding: '10px 24px 12px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-sidebar)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            borderRadius: '999px',
            padding: '5px 10px',
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            background: 'var(--accent-teal-bg)',
            border: '1px solid var(--accent-teal-border)',
            color: 'var(--accent-teal)',
          }}
        >
          {scopeLabel}
        </span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            borderRadius: '999px',
            padding: '5px 10px',
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            background: 'rgba(255,255,255,0.035)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'var(--text-muted)',
          }}
        >
          {audienceLabel}
        </span>
        <span
          style={{
            color: 'var(--text-label)',
            fontSize: '12px',
            lineHeight: 1.4,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            minWidth: 0,
            flex: 1,
          }}
          title={`${visibilitySummary} ${detailLine}`}
        >
          {compactSummary}
        </span>
      </div>
    </div>
  );
}
