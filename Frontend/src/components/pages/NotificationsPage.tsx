import { useEffect, useMemo, useState } from 'react';
import { AtSign, BellRing, TrendingDown, TrendingUp, UserPlus } from 'lucide-react';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationsRead,
  type ConnectionRequestNotificationPayload,
  type MentionNotificationPayload,
  type NotificationRecord,
  type WatchlistAlertNotificationPayload,
} from '../../api/notifications';
import { acceptConnectionRequest, declineConnectionRequest } from '../../api/messaging';

interface NotificationsPageProps {
  onOpenMention: (notification: NotificationRecord) => Promise<void> | void;
  onOpenWatchlistAlert: (ticker: string) => void;
  onUnreadCountChange?: (count: number) => void;
}

type NotificationTab = 'mentions' | 'watchlist_alerts' | 'connections';

function formatRelativeTime(value: string | null) {
  if (!value) {
    return 'Just now';
  }

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return 'Just now';
  }

  const diffMinutes = Math.max(1, Math.floor((Date.now() - timestamp) / 60000));
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function sectionLabelStyle() {
  return {
    margin: 0,
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.16em',
    textTransform: 'uppercase' as const,
    color: 'var(--text-label)',
  };
}

export function NotificationsPage({
  onOpenMention,
  onOpenWatchlistAlert,
  onUnreadCountChange,
}: NotificationsPageProps) {
  const [tab, setTab] = useState<NotificationTab>('mentions');
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [counts, setCounts] = useState({ mentions: 0, watchlist_alerts: 0, connections: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [actingRequestId, setActingRequestId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadNotifications = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchNotifications();
        if (!isMounted) {
          return;
        }
        setNotifications(data.notifications);
        setCounts(data.counts);
        onUnreadCountChange?.(data.unread_count);
      } catch (err) {
        if (!isMounted) {
          return;
        }
        setError(err instanceof Error ? err.message : 'Failed to load notifications');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadNotifications();
    return () => {
      isMounted = false;
    };
  }, [onUnreadCountChange]);

  const mentionNotifications = useMemo(
    () => notifications.filter((notification) => notification.type === 'mention'),
    [notifications],
  );
  const watchlistNotifications = useMemo(
    () => notifications.filter((notification) => notification.type === 'watchlist_alert'),
    [notifications],
  );
  const connectionNotifications = useMemo(
    () => notifications.filter((notification) => notification.type === 'connection_request'),
    [notifications],
  );
  const activeNotifications = tab === 'mentions'
    ? mentionNotifications
    : tab === 'watchlist_alerts'
      ? watchlistNotifications
      : connectionNotifications;
  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications],
  );

  const handleOpenNotification = async (notification: NotificationRecord) => {
    if (notification.type === 'connection_request') {
      return;
    }

    if (!notification.is_read) {
      try {
        const result = await markNotificationsRead([notification.id]);
        setNotifications((current) => current.map((item) => (item.id === notification.id ? { ...item, is_read: true } : item)));
        onUnreadCountChange?.(result.unread_count);
      } catch {
        // Keep the row interactive even if read-state sync fails.
      }
    }

    if (notification.type === 'mention') {
      await onOpenMention(notification);
      return;
    }

    const payload = notification.payload as WatchlistAlertNotificationPayload;
    onOpenWatchlistAlert(payload.ticker);
  };

  const handleConnectionAction = async (notification: NotificationRecord, action: 'accept' | 'decline') => {
    const payload = notification.payload as ConnectionRequestNotificationPayload;
    if (!payload.request_id) {
      return;
    }

    setActingRequestId(payload.request_id);
    setError(null);

    try {
      if (action === 'accept') {
        await acceptConnectionRequest(payload.request_id);
      } else {
        await declineConnectionRequest(payload.request_id);
      }

      const wasUnread = !notification.is_read;
      setNotifications((current) => current.filter((item) => item.id !== notification.id));
      setCounts((current) => ({ ...current, connections: Math.max(0, current.connections - 1) }));
      onUnreadCountChange?.(Math.max(0, unreadCount - (wasUnread ? 1 : 0)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update connection request');
    } finally {
      setActingRequestId(null);
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAllRead(true);
    try {
      const result = await markAllNotificationsRead();
      setNotifications((current) => current.map((item) => ({ ...item, is_read: true })));
      onUnreadCountChange?.(result.unread_count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark notifications read');
    } finally {
      setMarkingAllRead(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-950">
      <div
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: 'var(--bg-sidebar)',
          padding: '24px 32px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '20px',
          }}
        >
          <div>
            <p style={sectionLabelStyle()}>Inbox</p>
            <h1
              style={{
                margin: '10px 0 0',
                color: 'var(--text-primary)',
                fontSize: '28px',
                fontWeight: 700,
                letterSpacing: '-0.03em',
              }}
            >
              Notifications
            </h1>
            <p
              style={{
                margin: '8px 0 0',
                color: 'var(--text-muted)',
                fontSize: '14px',
                lineHeight: 1.6,
              }}
            >
              Mentions in your spaces, price movement alerts, and incoming connection requests.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleMarkAllRead()}
            disabled={unreadCount === 0 || markingAllRead}
            style={{
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.03)',
              padding: '10px 14px',
              fontSize: '12px',
              fontWeight: 600,
              color: unreadCount > 0 ? 'var(--text-primary)' : 'var(--text-label)',
              cursor: unreadCount === 0 || markingAllRead ? 'not-allowed' : 'pointer',
              opacity: unreadCount === 0 || markingAllRead ? 0.65 : 1,
            }}
          >
            {markingAllRead ? 'Marking…' : 'Mark all read'}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '1040px', margin: '0 auto', padding: '24px 24px 32px' }}>
        <div
          style={{
            display: 'inline-flex',
            gap: '6px',
            borderRadius: '14px',
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.03)',
            padding: '4px',
            marginBottom: '20px',
          }}
        >
          {[
            { key: 'mentions' as const, label: 'Mentions', count: counts.mentions },
            { key: 'watchlist_alerts' as const, label: 'Watchlist Alerts', count: counts.watchlist_alerts },
            { key: 'connections' as const, label: 'Connections', count: counts.connections },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              style={{
                borderRadius: '999px',
                border: 'none',
                background: tab === item.key ? 'var(--accent-teal-bg)' : 'transparent',
                color: tab === item.key ? 'var(--accent-teal)' : 'var(--text-muted)',
                padding: '8px 14px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {item.label} ({item.count})
            </button>
          ))}
        </div>

        {error && (
          <div
            style={{
              marginBottom: '16px',
              borderRadius: '16px',
              border: '1px solid rgba(127,29,29,0.7)',
              background: 'rgba(69,10,10,0.3)',
              padding: '14px 16px',
              color: '#fca5a5',
              fontSize: '13px',
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            borderRadius: '18px',
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.03)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '16px 18px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <p style={sectionLabelStyle()}>
              {tab === 'mentions' ? 'Mentions' : tab === 'watchlist_alerts' ? 'Watchlist Alerts' : 'Connections'}
            </p>
          </div>

          {loading ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
              Loading notifications...
            </div>
          ) : activeNotifications.length === 0 ? (
            <div
              style={{
                display: 'flex',
                minHeight: '280px',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '32px',
                textAlign: 'center',
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    width: '52px',
                    height: '52px',
                    margin: '0 auto 14px',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '999px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  {tab === 'mentions' ? (
                    <AtSign className="w-5 h-5" style={{ color: 'var(--text-label)' }} />
                  ) : tab === 'watchlist_alerts' ? (
                    <BellRing className="w-5 h-5" style={{ color: 'var(--text-label)' }} />
                  ) : (
                    <UserPlus className="w-5 h-5" style={{ color: 'var(--text-label)' }} />
                  )}
                </div>
                <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: '15px', fontWeight: 600 }}>
                  {tab === 'mentions' ? 'No mentions yet' : tab === 'watchlist_alerts' ? 'No watchlist alerts yet' : 'No connection requests yet'}
                </p>
                <p style={{ margin: '8px 0 0', color: 'var(--text-label)', fontSize: '13px', lineHeight: 1.6 }}>
                  {tab === 'mentions'
                    ? 'When someone mentions your username in a space channel, it will appear here.'
                    : tab === 'watchlist_alerts'
                      ? 'Price movement alerts for stocks on your watchlist will appear here.'
                      : 'Incoming connection requests will appear here.'}
                </p>
              </div>
            </div>
          ) : (
            activeNotifications.map((notification, index) => {
              const unread = !notification.is_read;
              const rowStyle = {
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '16px',
                width: '100%',
                border: 'none',
                borderBottom: index < activeNotifications.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                background: unread ? 'rgba(8,145,178,0.08)' : 'transparent',
                padding: '16px 18px',
                textAlign: 'left' as const,
                cursor: notification.type === 'connection_request' ? 'default' : 'pointer',
              };

              if (notification.type === 'mention') {
                const payload = notification.payload as MentionNotificationPayload;
                return (
                  <button key={notification.id} type="button" onClick={() => void handleOpenNotification(notification)} style={rowStyle}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                        <span style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600 }}>
                          {payload.space_name}
                        </span>
                        <span style={{ color: 'var(--text-label)', fontSize: '12px' }}>#{payload.channel_name.toLowerCase()}</span>
                        {unread ? (
                          <span style={{ width: '8px', height: '8px', borderRadius: '999px', background: '#ef4444' }} />
                        ) : null}
                      </div>
                      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.6 }}>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{payload.mentioned_by_name}</span> mentioned you: {payload.message_preview}
                      </p>
                    </div>
                    <span style={{ flexShrink: 0, color: 'var(--text-label)', fontSize: '12px' }}>{formatRelativeTime(notification.created_at)}</span>
                  </button>
                );
              }

              if (notification.type === 'connection_request') {
                const payload = notification.payload as ConnectionRequestNotificationPayload;
                const isActing = actingRequestId === payload.request_id;
                return (
                  <div key={notification.id} style={rowStyle}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                        <span style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 700 }}>
                          {payload.requester_name}
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>@{payload.requester_username}</span>
                        {unread ? (
                          <span style={{ width: '8px', height: '8px', borderRadius: '999px', background: '#ef4444' }} />
                        ) : null}
                      </div>
                      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.6 }}>
                        Sent you a connection request. Accepting will allow direct messages in your main inbox.
                      </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
                      <span style={{ color: 'var(--text-label)', fontSize: '12px' }}>{formatRelativeTime(notification.created_at)}</span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => void handleConnectionAction(notification, 'decline')}
                          disabled={isActing}
                          style={{
                            borderRadius: '10px',
                            border: '1px solid rgba(255,255,255,0.08)',
                            background: 'rgba(255,255,255,0.03)',
                            padding: '8px 10px',
                            fontSize: '12px',
                            color: 'var(--text-muted)',
                            cursor: isActing ? 'not-allowed' : 'pointer',
                            opacity: isActing ? 0.65 : 1,
                          }}
                        >
                          Decline
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleConnectionAction(notification, 'accept')}
                          disabled={isActing}
                          style={{
                            borderRadius: '10px',
                            border: '1px solid var(--accent-teal-border)',
                            background: 'var(--accent-teal-bg)',
                            padding: '8px 10px',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: 'var(--accent-teal)',
                            cursor: isActing ? 'not-allowed' : 'pointer',
                            opacity: isActing ? 0.65 : 1,
                          }}
                        >
                          {isActing ? 'Working…' : 'Accept'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              const payload = notification.payload as WatchlistAlertNotificationPayload;
              const isPositive = (payload.change_percent || 0) >= 0;
              return (
                <button key={notification.id} type="button" onClick={() => void handleOpenNotification(notification)} style={rowStyle}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <span style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 700 }}>
                        {payload.ticker}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{payload.stock_name}</span>
                      {unread ? (
                        <span style={{ width: '8px', height: '8px', borderRadius: '999px', background: '#ef4444' }} />
                      ) : null}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                        {payload.price !== null ? `${payload.price.toFixed(2)}` : '--'}
                      </span>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          borderRadius: '999px',
                          padding: '4px 9px',
                          background: isPositive ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)',
                          border: `1px solid ${isPositive ? 'rgba(52,211,153,0.18)' : 'rgba(248,113,113,0.18)'}`,
                          color: isPositive ? '#34d399' : '#f87171',
                          fontSize: '12px',
                          fontWeight: 600,
                        }}
                      >
                        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {payload.movement_label}
                      </span>
                    </div>
                  </div>
                  <span style={{ flexShrink: 0, color: 'var(--text-label)', fontSize: '12px' }}>{formatRelativeTime(notification.created_at)}</span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
