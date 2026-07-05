import { useEffect, useState } from 'react';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  GlobeAltIcon,
  DevicePhoneMobileIcon,
  DeviceTabletIcon,
  ComputerDesktopIcon,
  LinkIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { ExpandableScreen, ExpandableScreenTrigger, ExpandableScreenContent } from '../ui/expandable-screen';
import { AdminBentoRow } from '../ui/admin-bento-card';
import { LoadingSpinner } from '../Loading';

interface SiteStats {
  totalViews: number;
  uniqueVisitors: number;
  bounceRate: number;
  topPages: { page: string; count: number }[];
  deviceBreakdown: { device: string; count: number }[];
  trafficSources: { source: string; count: number }[];
  geography: { country: string; count: number }[];
  trend: { date: string; count: number }[];
}

const DEVICE_ICONS: Record<string, typeof ComputerDesktopIcon> = {
  Mobile: DevicePhoneMobileIcon,
  Tablet: DeviceTabletIcon,
  Desktop: ComputerDesktopIcon,
};

function StatList({ rows, keyField, labelField }: { rows: { count: number; [key: string]: any }[]; keyField: string; labelField: string }) {
  if (rows.length === 0) {
    return <p className="text-white/30 text-xs">No data yet</p>;
  }
  return (
    <div className="space-y-2">
      {rows.map((row) => {
        const Icon = keyField === 'device' ? DEVICE_ICONS[row.device] : null;
        return (
          <div key={row[keyField]} className="flex items-center justify-between bg-white/5 px-3 py-2">
            <span className="flex items-center gap-2 text-xs text-white/80 truncate">
              {Icon && <Icon className="w-3.5 h-3.5 text-white/40 shrink-0" />}
              {row[labelField]}
            </span>
            <span className="text-xs font-mono text-white/50 shrink-0">{row.count}</span>
          </div>
        );
      })}
    </div>
  );
}

export function SiteAnalyticsCard() {
  const [stats, setStats] = useState<SiteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetch('/api/admin/analytics/site-stats')
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && !data.empty) setStats(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const trend = stats?.trend || [];
  const maxTrend = Math.max(1, ...trend.map((t) => t.count));

  return (
    <div className="contents">
      <ExpandableScreen isOpen={isOpen} onOpenChange={setIsOpen}>
        <ExpandableScreenTrigger className="w-full h-full text-left cursor-pointer">
          {/* Desktop tile */}
          <div className="hidden md:flex flex-col h-full min-h-[190px] bg-black hover:bg-[#0a0a0a] transition-colors duration-300 p-4">
            <div className="flex items-center gap-2 mb-2">
              <ChartBarIcon className="w-4 h-4 text-white/50" />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-white/80 truncate">Site Analytics</h3>
            </div>
            <div className="flex-1">
              <AdminBentoRow label="Total Views" value={stats ? stats.totalViews.toLocaleString() : loading ? '…' : '0'} />
              <AdminBentoRow label="Unique Visitors" value={stats ? stats.uniqueVisitors.toLocaleString() : loading ? '…' : '0'} />
              <AdminBentoRow label="Bounce Rate" value={stats ? `${stats.bounceRate.toFixed(1)}%` : loading ? '…' : '—'} />
            </div>
            <div className="flex gap-1 h-8 items-end justify-between mt-2">
              {(trend.length ? trend : Array.from({ length: 14 }, () => ({ count: 0 }))).map((t, i) => (
                <div
                  key={i}
                  className="bg-white/10 w-full hover:bg-white/30 transition-colors"
                  style={{ height: `${Math.max(4, (t.count / maxTrend) * 100)}%` }}
                />
              ))}
            </div>
          </div>

          {/* Mobile tile */}
          <div className="flex md:hidden flex-col items-center justify-center p-2.5 bg-white/5 aspect-square w-full active:scale-95 transition-all duration-200">
            <div className="p-2 bg-white/10 rounded-full mb-1">
              <ChartBarIcon className="w-4 h-4 text-white/40" />
            </div>
            <span className="text-[8px] font-black uppercase tracking-[0.05em] text-center leading-tight text-white/60 px-1">Site</span>
            <span className="text-[6px] font-bold uppercase tracking-[0.05em] text-center leading-none text-white/30">Analytics</span>
          </div>
        </ExpandableScreenTrigger>

        <ExpandableScreenContent className="overflow-x-hidden">
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="max-w-4xl mx-auto w-full px-4 sm:px-8 pt-20 pb-16">
              <div className="flex items-center gap-3 mb-1">
                <ChartBarIcon className="w-5 h-5 text-white/40" />
                <h2 className="text-xl font-black uppercase tracking-wide text-white">Site Analytics</h2>
              </div>
              <p className="text-white/50 text-sm normal-case mb-8">Last 30 days</p>

              {loading ? (
                <div className="py-16 flex justify-center">
                  <LoadingSpinner size="lg" />
                </div>
              ) : !stats || stats.totalViews === 0 ? (
                <div className="py-16 text-center text-white/40 text-xs uppercase font-bold tracking-widest">
                  No analytics data recorded yet
                </div>
              ) : (
                <div className="space-y-10">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white/5 p-4">
                      <div className="text-[9px] text-white/40 uppercase tracking-widest mb-1">Total Views</div>
                      <div className="text-2xl font-black font-mono text-white">{stats.totalViews.toLocaleString()}</div>
                    </div>
                    <div className="bg-white/5 p-4">
                      <div className="text-[9px] text-white/40 uppercase tracking-widest mb-1">Unique Visitors</div>
                      <div className="text-2xl font-black font-mono text-white">{stats.uniqueVisitors.toLocaleString()}</div>
                    </div>
                    <div className="bg-white/5 p-4">
                      <div className="text-[9px] text-white/40 uppercase tracking-widest mb-1">Bounce Rate</div>
                      <div className="text-2xl font-black font-mono text-white">{stats.bounceRate.toFixed(1)}%</div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-white/60 mb-3 flex items-center gap-2">
                      <ArrowTrendingUpIcon className="w-4 h-4" /> Views — Last 14 Days
                    </h3>
                    <div className="flex gap-1.5 h-24 items-end bg-white/5 p-4">
                      {trend.map((t) => (
                        <div
                          key={t.date}
                          className="flex-1 bg-white/20 hover:bg-white/40 transition-colors"
                          style={{ height: `${Math.max(4, (t.count / maxTrend) * 100)}%` }}
                          title={`${t.date}: ${t.count}`}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between mt-1 text-[8px] text-white/30 uppercase">
                      <span>{trend[0]?.date}</span>
                      <span>{trend[trend.length - 1]?.date}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-widest text-white/60 mb-3 flex items-center gap-2">
                        <DocumentTextIcon className="w-4 h-4" /> Top Pages
                      </h3>
                      <StatList rows={stats.topPages} keyField="page" labelField="page" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-widest text-white/60 mb-3 flex items-center gap-2">
                        <LinkIcon className="w-4 h-4" /> Traffic Sources
                      </h3>
                      <StatList rows={stats.trafficSources} keyField="source" labelField="source" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-widest text-white/60 mb-3 flex items-center gap-2">
                        <DevicePhoneMobileIcon className="w-4 h-4" /> Devices
                      </h3>
                      <StatList rows={stats.deviceBreakdown} keyField="device" labelField="device" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-widest text-white/60 mb-3 flex items-center gap-2">
                        <GlobeAltIcon className="w-4 h-4" /> Geography
                      </h3>
                      <StatList rows={stats.geography} keyField="country" labelField="country" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </ExpandableScreenContent>
      </ExpandableScreen>
    </div>
  );
}
