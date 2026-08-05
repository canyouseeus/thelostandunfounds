/**
 * DEMO MODE — the SEO panel.
 *
 * Shaped to the Ahrefs API's actual response so the component does not change
 * when it is pointed at the live endpoints — the fixture is the contract. Each
 * row carries what the metric actually tells you, because the numbers are
 * useless to anybody who has not already learned what they mean, and learning
 * that is the point of putting the panel here at all.
 */

import { cn } from '../../components/ui/utils';
import { CHART_ACCENTS, Sparkline } from '../../components/ui/viz';
import { DEMO_SEO } from '../../lib/demo/fixtures';

export default function DemoSeo() {
  return (
    <div>
      <h1 className="text-white text-2xl sm:text-4xl font-black uppercase tracking-[0.2em] text-left">
        Search
      </h1>
      <p className="mt-3 text-white/40 text-[13px] text-left max-w-2xl">
        Two years of monthly readings. Referring domains is the one to watch — links
        earned now show up in rankings roughly three months later.
      </p>

      <div className="mt-10 flex flex-col gap-4 max-w-4xl">
        {DEMO_SEO.map(row => (
          <div
            key={row.metric}
            className="bg-white/5 p-6 grid gap-5 sm:grid-cols-[200px_1fr_140px] sm:items-center"
            style={{ borderRadius: 0 }}
          >
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40 text-left">
                {row.metric}
              </p>
              <p className="mt-2 text-white text-xl font-black tabular-nums text-left">
                {row.value}
              </p>
            </div>

            <p className="text-white/55 text-[13px] leading-relaxed text-left">{row.meaning}</p>

            <div className={cn('h-12', CHART_ACCENTS.analytics)}>
              <Sparkline values={row.series} className="h-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
