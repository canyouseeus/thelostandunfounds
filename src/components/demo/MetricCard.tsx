/**
 * DEMO MODE — a metric card that can explain itself.
 *
 * This is the answer to "I like that graph, where did you get it?". Every card
 * carries a provenance toggle: what feeds the number, in plain English, plus a
 * USE THIS action that files a request rather than starting a conversation that
 * gets lost. Six weeks later the answer is still sitting next to the thing it
 * explains.
 *
 * The chart is the platform's one dialect per the GRAPH STYLE RULE — Sparkline
 * from ui/viz, categories told apart by CHART_ACCENTS colour only. No new chart
 * style is introduced here and none should be.
 */

import { useState } from 'react';
import { cn } from '../ui/utils';
import { CHART_ACCENTS, Sparkline } from '../ui/viz';
import type { DemoMetric } from '../../lib/demo/fixtures';

export default function MetricCard({
  metric,
  onUseThis,
}: {
  metric: DemoMetric;
  onUseThis?: (metric: DemoMetric) => void;
}) {
  const [showSource, setShowSource] = useState(false);
  const up = metric.delta >= 0;

  return (
    <div className="bg-white/5 p-5 flex flex-col" style={{ borderRadius: 0 }}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40 text-left">
          {metric.label}
        </p>
        <button
          onClick={() => setShowSource(v => !v)}
          aria-expanded={showSource}
          aria-label={`Show where ${metric.label} comes from`}
          className={cn(
            'text-[10px] font-black uppercase tracking-[0.2em] shrink-0 transition-colors',
            showSource ? 'text-white' : 'text-white/25 hover:text-white/70',
          )}
        >
          Source
        </button>
      </div>

      <div className="mt-3 flex items-baseline gap-3">
        <span className="text-white text-2xl font-black tabular-nums">{metric.value}</span>
        <span
          className={cn(
            'text-[11px] font-bold tabular-nums',
            up ? 'text-green-400' : 'text-red-500',
          )}
        >
          {up ? '+' : ''}{metric.delta}%
        </span>
      </div>

      <div className={cn('mt-4 h-14', CHART_ACCENTS[metric.accent])}>
        <Sparkline values={metric.series} className="h-full" />
      </div>

      {showSource && (
        <div className="mt-4 bg-black p-4" style={{ borderRadius: 0 }}>
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 text-left">
            Where this comes from
          </p>
          <p className="mt-2 text-[12px] leading-relaxed text-white/70 text-left break-words">
            {metric.source}
          </p>
          {onUseThis && (
            <button
              onClick={() => onUseThis(metric)}
              className="mt-4 h-9 px-4 bg-white text-black text-[10px] font-black uppercase tracking-[0.25em] hover:bg-white/80 transition-colors"
              style={{ borderRadius: 0 }}
            >
              Use This
            </button>
          )}
        </div>
      )}
    </div>
  );
}
