import { useEffect, useState } from 'react';
import { cn } from './utils';
import { useLongPress } from './use-long-press';
import { DetailSheet } from './detail-sheet';
import { CardStack, StackRow, FieldsCard, StackCard } from './card-stack';

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success' | string;
  read: boolean;
  created_at: string;
  deployment?: {
    id: string;
    status: string;
    sha: string | null;
    commit: string | null;
    url: string | null;
    errorExcerpt: string | null;
  } | null;
}

export interface NotificationsWidgetData {
  items: NotificationItem[];
  pendingReviews: number;
}

/** Severity is state, drawn as the square marks the status tiles use. */
const SEV_BG: Record<string, string> = {
  error: 'bg-red-500',
  warning: 'bg-amber-500',
  success: 'bg-green-400',
  info: 'bg-white/50',
};

const when = (iso: string) => iso.slice(0, 10);

/** The explorer: queue → notification card → (deployments) the error log. */
function notificationsRoot(data: NotificationsWidgetData, onOpenPanel?: (panel: string) => void): StackCard {
  const itemCard = (n: NotificationItem): StackCard => ({
    title: n.title,
    render: nav => (
      <div className="space-y-4">
        <FieldsCard fields={{
          Severity: n.severity,
          Type: n.type,
          When: n.created_at.replace('T', ' ').slice(0, 16),
          Read: n.read ? 'yes' : 'no',
        }} />
        <div className="px-3 py-2.5 bg-white/[0.03]">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Message</p>
          <p className="text-xs text-white/80 whitespace-pre-wrap break-words">{n.message}</p>
        </div>
        {n.deployment && (
          <>
            <FieldsCard fields={{
              Deployment: n.deployment.id,
              Status: n.deployment.status,
              Commit: n.deployment.commit?.split('\n')[0] ?? '—',
              SHA: n.deployment.sha?.slice(0, 7) ?? '—',
              URL: n.deployment.url ?? '—',
            }} />
            {n.deployment.errorExcerpt && (
              <StackRow
                label="Error log"
                sub="what the build said when it broke"
                onPress={() => nav.push({
                  title: 'Error Log',
                  render: () => (
                    <pre className="px-3 py-2.5 bg-white/[0.03] text-[11px] leading-relaxed text-red-400 whitespace-pre-wrap break-words overflow-x-auto">
                      {n.deployment!.errorExcerpt}
                    </pre>
                  ),
                })}
              />
            )}
          </>
        )}
      </div>
    ),
  });

  return {
    title: 'Notifications',
    render: nav => (
      <div className="space-y-4">
        {data.pendingReviews > 0 && onOpenPanel && (
          <button
            onClick={() => onOpenPanel('submissions')}
            className="w-full flex items-center justify-between px-3 py-2.5 bg-amber-400/10 hover:bg-amber-400/20 transition-colors"
            style={{ borderRadius: 0 }}
          >
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Pending Reviews</span>
            <span className="text-sm font-bold text-amber-400 tabular-nums">{data.pendingReviews}</span>
          </button>
        )}
        <div className="space-y-px">
          {data.items.length === 0 ? (
            <p className="text-[11px] uppercase tracking-widest text-white/30 py-4 text-left">Nothing to report.</p>
          ) : data.items.map(n => (
            <StackRow
              key={n.id}
              label={n.title}
              sub={`${n.severity}${n.read ? '' : ' — unread'} — ${when(n.created_at)}`}
              onPress={() => nav.push(itemCard(n))}
            />
          ))}
        </div>
      </div>
    ),
  };
}

/**
 * Notifications tile: the things that want attention, from the real feed
 * (admin_notifications — deploys and anything webhooks report) plus the
 * review queue. The face is the unread count with severity marks; larger
 * shapes list the latest items. No accent hue: severity IS the color here,
 * drawn as square marks per noir-design.
 */
export function NotificationsWidget({ size = '2x2', data, onOpenPanel, className }: {
  size?: string;
  data: NotificationsWidgetData;
  onOpenPanel?: (panel: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const press = useLongPress(() => setOpen(true));
  const cols = Number(size.split('x')[0]) || 2;
  const rows = Number(size.split('x')[1]) || 2;
  const S = cols >= 4 && rows >= 4 ? 0.55 : 1;
  const u = (n: number) => `${n * S}cqmin`;

  const unread = data.items.filter(n => !n.read).length + data.pendingReviews;
  const latest = data.items[0];

  return (
    <>
      <div
        {...press}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(true); } }}
        aria-label="Notifications — open"
        className={cn(
          'relative bg-black text-white flex flex-col cursor-pointer touch-manipulation select-none overflow-hidden',
          className,
        )}
        style={{
          borderRadius: 0,
          containerType: 'size',
          WebkitTouchCallout: 'none',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <div className="relative flex-1 min-h-0 flex flex-col" style={{ padding: '7cqmin' }}>
          {cols === 2 && rows === 2 ? (
            /* The face: severity marks of the latest items top-right, the
               unread count bottom-left — the family composition. */
            <div className="flex-1 min-h-0 relative">
              <div className="absolute top-0 right-0 grid grid-cols-4" style={{ gap: '3cqmin' }}>
                {data.items.slice(0, 8).map(n => (
                  <span key={n.id} className={cn('block', SEV_BG[n.severity] ?? 'bg-white/50')}
                        style={{ width: '7cqmin', height: '7cqmin', opacity: n.read ? 0.35 : 1 }} />
                ))}
              </div>
              <div className="absolute left-0 bottom-0 flex flex-col text-left">
                <span className="font-black uppercase tracking-widest opacity-40" style={{ fontSize: '9cqmin', lineHeight: 1, marginBottom: '3cqmin' }}>
                  Unread
                </span>
                <span className="font-black leading-none tabular-nums" style={{ fontSize: '30cqmin' }}>
                  {unread}
                </span>
              </div>
            </div>
          ) : (
            /* Composed: count and the latest item's title on top, then the
               list — mark, title, date — filling the height. */
            <div className="flex-1 min-h-0 flex flex-col justify-between" style={{ gap: u(5) }}>
              <div className="flex items-baseline justify-between" style={{ gap: u(6) }}>
                <div className="flex flex-col text-left shrink-0">
                  <span className="font-black uppercase tracking-widest opacity-40" style={{ fontSize: u(6), lineHeight: 1 }}>Unread</span>
                  <span className="font-black leading-none tabular-nums" style={{ fontSize: u(21), marginTop: u(2) }}>{unread}</span>
                </div>
                {latest && cols >= 4 && (
                  <span className="min-w-0 truncate text-right uppercase tracking-widest opacity-50" style={{ fontSize: u(5), lineHeight: 1.3 }}>
                    {latest.title}
                  </span>
                )}
              </div>
              <div className={cn('flex flex-col', rows >= 4 && 'flex-1 justify-evenly')} style={{ gap: rows >= 4 ? undefined : u(3) }}>
                {data.pendingReviews > 0 && (
                  <div className="flex items-center" style={{ gap: u(3) }}>
                    <span className="shrink-0 bg-amber-500" style={{ width: u(3.5), height: u(3.5) }} />
                    <span className="min-w-0 flex-1 truncate uppercase tracking-wider text-amber-500" style={{ fontSize: u(5.4), lineHeight: 1.2 }}>
                      {data.pendingReviews} pending review{data.pendingReviews === 1 ? '' : 's'}
                    </span>
                  </div>
                )}
                {data.items.slice(0, rows >= 4 ? 7 : 2).map(n => (
                  <div key={n.id} className="flex items-center" style={{ gap: u(3) }}>
                    <span className={cn('shrink-0', SEV_BG[n.severity] ?? 'bg-white/50')} style={{ width: u(3.5), height: u(3.5) }} />
                    <span className={cn('min-w-0 flex-1 truncate uppercase tracking-wider', n.read ? 'opacity-40' : 'opacity-90')}
                          style={{ fontSize: u(5.4), lineHeight: 1.2 }}>
                      {n.title}
                    </span>
                    {/* Two units wide, the date costs the title its ending —
                        the explorer carries the timestamps. */}
                    {cols >= 4 && (
                      <span className="shrink-0 tabular-nums opacity-30" style={{ fontSize: u(4.6) }}>{when(n.created_at)}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {open && (
        <DetailSheet onClose={() => setOpen(false)} label="Close notifications" wide>
          <CardStack root={notificationsRoot(data, onOpenPanel)} onClose={() => setOpen(false)} />
        </DetailSheet>
      )}
    </>
  );
}
