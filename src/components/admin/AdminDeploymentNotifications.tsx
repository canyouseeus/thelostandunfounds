import { useEffect, useRef, useState } from 'react';
import { BellIcon, BellAlertIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { supabase } from '../../lib/supabase';
import { cn } from '../ui/utils';
import { logApiCall, logError } from '../../lib/adminErrorLog';

interface DeployNotification {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  read: boolean;
  created_at: string;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function AdminDeploymentNotifications() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<DeployNotification[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    loadNotifications();

    const channel = supabase
      .channel('admin_deployment_notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'admin_notifications', filter: 'type=eq.deployment' },
        (payload) => {
          const row = payload.new as DeployNotification;
          setNotifications(prev => [row, ...prev].slice(0, 10));

          if (row.severity === 'error' && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification(row.title, { body: row.message });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  async function loadNotifications() {
    const { data, error } = await supabase
      .from('admin_notifications')
      .select('id, title, message, severity, read, created_at')
      .eq('type', 'deployment')
      .order('created_at', { ascending: false })
      .limit(10);

    logApiCall('GET', '/admin_notifications', error ? 500 : 200, error ? error.message : `${data?.length || 0} rows`);
    if (error) {
      logError(`Failed to load deployment notifications: ${error.message}`);
      return;
    }
    setNotifications(data || []);
  }

  async function markAllRead() {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;

    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    const { error } = await supabase.from('admin_notifications').update({ read: true }).in('id', unreadIds);
    if (error) logError(`Failed to mark notifications read: ${error.message}`);
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) markAllRead();
        }}
        className="relative p-2 bg-white text-black hover:bg-white/90 transition"
        style={{ borderRadius: 0 }}
        title="Deployment notifications"
        aria-label="Deployment notifications"
      >
        {unreadCount > 0 ? <BellAlertIcon className="w-5 h-5" /> : <BellIcon className="w-5 h-5" />}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-black">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute top-full right-0 mt-2 w-80 max-w-[90vw] bg-black shadow-2xl z-50 max-h-[70vh] overflow-y-auto"
          style={{ borderRadius: 0 }}
        >
          <div className="px-4 py-3 bg-white/10">
            <h3 className="text-xs font-black uppercase tracking-widest text-white">Deployments</h3>
          </div>
          {notifications.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest">No deployment events yet</p>
            </div>
          ) : (
            <div className="divide-y divide-transparent">
              {notifications.map(n => (
                <div key={n.id} className={cn('px-4 py-3', n.severity === 'error' ? 'bg-red-500/10' : 'bg-white/5')}>
                  <div className="flex items-start gap-2">
                    {n.severity === 'error' ? (
                      <ExclamationTriangleIcon className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn(
                          'text-xs font-bold uppercase tracking-wide',
                          n.severity === 'error' ? 'text-red-400' : 'text-green-400'
                        )}>
                          {n.title}
                        </span>
                        <span className="text-[9px] text-white/30 whitespace-nowrap">{timeAgo(n.created_at)}</span>
                      </div>
                      <p className="text-[11px] text-white/70 mt-1 whitespace-pre-line break-words">{n.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
