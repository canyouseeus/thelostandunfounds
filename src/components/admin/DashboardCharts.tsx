
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
          <ResponsiveContainer width="99%" height="100%" minWidth={0} minHeight={0} debounce={200}>
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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




