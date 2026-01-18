
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
    revenue: string[];
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
    if (!history) {
      // Fallback to simulated data if no history provided
      const points = timeRange === '1H' ? 60 :
        timeRange === '24H' ? 24 :
          timeRange === '7D' ? 7 :
            timeRange === '30D' ? 30 : 12;

      const baseValue = metric === 'revenue' ? (stats?.revenue || 1000) :
        metric === 'newsletter' ? (stats?.newsletter || 100) :
          (stats?.affiliates || 50);

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
    const dates = history[metric].map(d => new Date(d).getTime()).sort((a, b) => a - b);
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
        formatLabel = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        break;
      case '7D':
        startTime = now - 7 * 24 * 60 * 60 * 1000;
        interval = 24 * 60 * 60 * 1000; // 1 day
        formatLabel = (d) => d.toLocaleDateString([], { weekday: 'short' });
        break;
      case '30D':
        startTime = now - 30 * 24 * 60 * 60 * 1000;
        interval = 24 * 60 * 60 * 1000; // 1 day
        formatLabel = (d) => d.toLocaleDateString([], { month: 'short', day: 'numeric' });
        break;
      case '1Y':
        startTime = now - 365 * 24 * 60 * 60 * 1000;
        interval = 30 * 24 * 60 * 60 * 1000; // ~1 month
        formatLabel = (d) => d.toLocaleDateString([], { month: 'short', year: '2-digit' });
        break;
    }

    // Generate buckets
    const buckets: { time: number; count: number; label: string }[] = [];
    for (let t = startTime; t <= now; t += interval) {
      buckets.push({
        time: t,
        label: formatLabel(new Date(t)),
        count: 0
      });
    }

    // Calculate cumulative counts
    // For each bucket, count how many items were created BEFORE that time
    const valueMultiplier = metric === 'revenue' ? 9.99 : 1;

    return buckets.map(bucket => {
      // Count items created before bucket.time
      const count = dates.filter(d => d <= bucket.time).length;
      return {
        name: bucket.label,
        value: count * valueMultiplier
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
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {(['revenue', 'newsletter', 'affiliates'] as MetricType[]).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={cn(
                "px-2 py-1 text-[10px] uppercase tracking-wider font-medium transition-colors border border-transparent rounded-none",
                metric === m
                  ? "bg-white/10 text-white border-white/10"
                  : "text-white/40 hover:text-white hover:bg-white/5"
              )}
            >
              {config[m].label}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {(['1H', '24H', '7D', '30D', '1Y'] as TimeRange[]).map((t) => (
            <button
              key={t}
              onClick={() => setTimeRange(t)}
              className={cn(
                "px-1.5 py-0.5 text-[10px] font-medium transition-colors rounded-none",
                timeRange === t
                  ? "text-white bg-white/10"
                  : "text-white/40 hover:text-white"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 relative">
        <div className="absolute inset-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="name"
                hide={true}
              />
              <YAxis
                hide={true}
                domain={['dataMin', 'dataMax']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#000',
                  borderColor: 'rgba(255,255,255,0.1)',
                  borderRadius: 0,
                  fontSize: '12px'
                }}
                itemStyle={{ color: config[metric].color }}
                formatter={(value: number) => [
                  `${config[metric].prefix}${value.toFixed(0)}`,
                  config[metric].label
                ]}
                labelStyle={{ display: 'block', color: '#666', marginBottom: '4px' }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={config[metric].color}
                fill="transparent"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}




