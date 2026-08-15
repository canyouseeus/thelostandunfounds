import { useEffect, useState } from 'react';
import { NotificationsWidget, NotificationItem } from '../ui/notifications-widget';

/**
 * The dashboard's notifications tile, fed by the real feed
 * (/api/admin/notifications: admin_notifications plus each deployment
 * notification's commit and error context) and the review queue count.
 */
export function NotificationsWidgetLive({ size, pendingReviews, onOpenPanel, className }: {
  size?: string;
  pendingReviews: number;
  onOpenPanel?: (panel: string) => void;
  className?: string;
}) {
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  useEffect(() => {
    let alive = true;
    fetch('/api/admin/notifications')
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(d => { if (alive) setItems(d.notifications ?? []); })
      .catch(() => { if (alive) setItems([]); });
    return () => { alive = false; };
  }, []);
  if (items === null) {
    return (
      <div className={className + ' bg-black flex items-center'} style={{ borderRadius: 0, containerType: 'size' }}>
        <span className="uppercase tracking-widest text-white/30 text-left" style={{ fontSize: '9cqmin', padding: '7cqmin' }}>
          Loading…
        </span>
      </div>
    );
  }
  return (
    <NotificationsWidget
      size={size}
      className={className}
      data={{ items, pendingReviews }}
      onOpenPanel={onOpenPanel}
    />
  );
}
