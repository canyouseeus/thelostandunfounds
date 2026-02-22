
import { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { cn } from '@/components/ui/utils';

interface DashboardChartsProps {
  stats: {
    revenue: number;
    newsletter: number;
    affiliates: number;
  } | null;
  history?: {
    revenue: (string | { date: string; amount: number })[];
    newsletter: string[];
    affiliates: string[];
  };
}

type TimeRange = '1H' | '24H' | '7D' | '30D' | '1Y';
type MetricType = 'revenue' | 'newsletter' | 'affiliates';

export function DashboardCharts({ stats, history }: DashboardChartsProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('7D');
  const [metric, setMetric] = useState<MetricType>('revenue');

  const data = useMemo(() => {
    // If we have history but the requested metric history is empty, 
    // and we have a corresponding stats value, we should still show 0 or a flat line
    // rather than falling back to simulated "fake" data which is misleading.
    const hasAnyHistory = history && (history.revenue.length > 0 || history.newsletter.length > 0 || history.affiliates.length > 0);
    const metricHistory = history?.[metric] || [];

    if (!history) {
      // Fallback to simulated data if no history object provided AT ALL
      const points = timeRange === '1H' ? 60 :
        timeRange === '24H' ? 24 :
          timeRange === '7D' ? 7 :
            timeRange === '30D' ? 30 : 12;

      const baseValue = metric === 'revenue' ? (stats?.revenue || 0) :
        metric === 'newsletter' ? (stats?.newsletter || 0) :
          (stats?.affiliates || 0);

      // If stats are 0, don't simulate growth
      if (baseValue === 0) {
        return Array.from({ length: points }).map((_, i) => ({
          name: i.toString(),
          value: 0
        }));
      }

      return Array.from({ length: points }).map((_, i) => {
        const progress = i / (points - 1);
        const randomVariation = (Math.random() - 0.5) * 0.1;
        const trend = baseValue * (0.7 + (progress * 0.3));
        return {
          name: i.toString(),
          value: Math.max(0, trend + (trend * randomVariation))
        };
      });
    }

    // Process actual history data
    // For revenue: each item has a date and amount, we sum amounts cumulatively
    // For newsletter/affiliates: each item is a date string representing a registration,
    // so we count them cumulatively (1, 2, 3...)
    const isCountMetric = metric === 'newsletter' || metric === 'affiliates';

    const items = metricHistory.map(item => {
      if (typeof item === 'string') {
        return { time: new Date(item).getTime(), amount: isCountMetric ? 1 : 0 };
      }
      return { time: new Date(item.date).getTime(), amount: item.amount };
    }).sort((a, b) => a.time - b.time);

    const now = Date.now();
    let startTime = now;
    let interval = 0;
    let formatLabel = (d: Date) => d.toLocaleDateString();

    switch (timeRange) {
      case '1H':
        startTime = now - 60 * 60 * 1000;
        interval = 60 * 1000; // 1 min
        formatLabel = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        break;
      case '24H':
        startTime = now - 24 * 60 * 60 * 1000;
        interval = 60 * 60 * 1000; // 1 hour
        formatLabel = (d) => d.toLocaleDateString([], { weekday: 'short' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        break;
      case '7D':
        startTime = now - 7 * 24 * 60 * 60 * 1000;
        interval = 24 * 60 * 60 * 1000; // 1 day
        formatLabel = (d) => d.toLocaleDateString([], { weekday: 'short', day: 'numeric' });
        break;
      case '30D':
        startTime = now - 30 * 24 * 60 * 60 * 1000;
        interval = 24 * 60 * 60 * 1000; // 1 day
        formatLabel = (d) => d.toLocaleDateString([], { month: 'short', day: 'numeric' });
        break;
      case '1Y':
        startTime = now - 365 * 24 * 60 * 60 * 1000;
        interval = 30 * 24 * 60 * 60 * 1000; // ~1 month
        formatLabel = (d) => d.toLocaleDateString([], { month: 'short', year: '2-digit', day: 'numeric' });
        break;
    }

    // Generate buckets
    const buckets: { time: number; label: string }[] = [];
    for (let t = startTime; t <= now; t += interval) {
      buckets.push({
        time: t,
        label: formatLabel(new Date(t))
      });
    }

    // Ensure the last bucket reaches current time so the final data point is accurate
    const lastBucket = buckets[buckets.length - 1];
    if (!lastBucket || now - lastBucket.time > interval * 0.1) {
      buckets.push({
        time: now,
        label: formatLabel(new Date(now))
      });
    } else {
      // Snap the last bucket to now so it captures all current data
      lastBucket.time = now;
    }

    // Calculate cumulative values
    return buckets.map(bucket => {
      // For count metrics (newsletter, affiliates): count items created before bucket.time
      // For revenue: sum amounts for items created before bucket.time
      const value = items
        .filter(item => item.time <= bucket.time)
        .reduce((sum, item) => sum + item.amount, 0);

      return {
        name: bucket.label,
        value: value
      };
    });

  }, [timeRange, metric, stats, history]);

  const config = {
    revenue: { color: '#4ade80', label: 'Revenue', prefix: '$' },
    newsletter: { color: '#60a5fa', label: 'Newsletter', prefix: '' },
    affiliates: { color: '#c084fc', label: 'Affiliates', prefix: '' },
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Current Value Display */}
      <div className="flex items-center justify-center gap-4 mb-4">
        <div className="text-center">
          <span className="text-2xl font-bold font-mono" style={{ color: config[metric].color }}>
            {config[metric].prefix}{data.length > 0 ? data[data.length - 1]?.value.toFixed(0) : '0'}
          </span>
          <span className="text-xs text-white/40 ml-2 uppercase">{config[metric].label}</span>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative mb-4">
        <div className="absolute inset-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100} debounce={200}>
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }}
                interval="preserveStartEnd"
                minTickGap={40}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }}
                width={35}
                tickFormatter={(value) => `${config[metric].prefix}${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value.toFixed(0)}`}
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#000',
                  border: 'none',
                  borderRadius: 0,
                  fontSize: '12px',
                  padding: '8px 12px'
                }}
                itemStyle={{ color: config[metric].color }}
                formatter={(value: number | undefined) => [
                  `${config[metric].prefix}${(value ?? 0).toFixed(0)}`,
                  config[metric].label
                ]}
                labelStyle={{ display: 'block', color: '#888', marginBottom: '4px', fontSize: '10px' }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={config[metric].color}
                fill={`${config[metric].color}20`}
                strokeWidth={2}
                dot={{ r: 2, fill: config[metric].color, strokeWidth: 0 }}
                activeDot={{ r: 4, fill: config[metric].color, strokeWidth: 2, stroke: '#000' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Controls Container */}
      <div className="flex flex-col gap-3">
        {/* Time Range Toggle - Full Width */}
        <div className="flex w-full bg-white/5">
          {(['1H', '24H', '7D', '30D', '1Y'] as TimeRange[]).map((t) => (
            <button
              key={t}
              onClick={() => setTimeRange(t)}
              className={cn(
                "flex-1 py-3 text-[10px] md:text-xs uppercase tracking-wider font-medium transition-colors",
                timeRange === t
                  ? "bg-white text-black font-bold"
                  : "text-white/40 hover:text-white hover:bg-white/10"
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Metric Toggle - Full Width */}
        <div className="flex w-full bg-white/5">
          {(['revenue', 'newsletter', 'affiliates'] as MetricType[]).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={cn(
                "flex-1 py-3 text-[10px] md:text-xs uppercase tracking-widest font-bold transition-colors",
                metric === m
                  ? "bg-white text-black"
                  : "text-white/40 hover:text-white hover:bg-white/10"
              )}
            >
              {config[m].label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}




