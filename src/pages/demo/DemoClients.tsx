/**
 * DEMO MODE — the CRM profile shape.
 *
 * One page shape for every client, which is the thing that makes this a CRM
 * rather than a pile of one-offs: identity, stage, what they are worth, the
 * billing trace, what is open. Same layout for a retained client and a cold
 * inquiry — the fields just come back empty, and an empty state is a real state
 * worth showing.
 */

import { useState } from 'react';
import { cn } from '../../components/ui/utils';
import { CHART_ACCENTS, Sparkline } from '../../components/ui/viz';
import { DEMO_CLIENTS, type DemoClient } from '../../lib/demo/fixtures';

const STAGE_TONE: Record<DemoClient['stage'], string> = {
  inquiry: 'text-blue-400',
  proposal: 'text-purple-400',
  active: 'text-green-400',
  retained: 'text-green-400',
  dormant: 'text-white/30',
};

function money(n: number) {
  return n === 0 ? '—' : `$${n.toLocaleString()}`;
}

export default function DemoClients() {
  const [selectedId, setSelectedId] = useState(DEMO_CLIENTS[0].id);
  const selected = DEMO_CLIENTS.find(c => c.id === selectedId) ?? DEMO_CLIENTS[0];

  return (
    <div>
      <h1 className="text-white text-2xl sm:text-4xl font-black uppercase tracking-[0.2em] text-left">
        Clients
      </h1>

      <div className="mt-10 grid gap-6 lg:grid-cols-[280px_1fr]">
        <ul className="flex flex-col gap-1">
          {DEMO_CLIENTS.map(c => (
            <li key={c.id}>
              <button
                onClick={() => setSelectedId(c.id)}
                className={cn(
                  'w-full text-left p-4 transition-colors',
                  c.id === selectedId ? 'bg-white text-black' : 'bg-white/5 hover:bg-white/10',
                )}
                style={{ borderRadius: 0 }}
              >
                <p className="text-[12px] font-black uppercase tracking-[0.2em] truncate">
                  {c.name}
                </p>
                <p
                  className={cn(
                    'mt-1 text-[9px] font-black uppercase tracking-[0.25em]',
                    c.id === selectedId ? 'text-black/50' : STAGE_TONE[c.stage],
                  )}
                >
                  {c.stage}
                </p>
              </button>
            </li>
          ))}
        </ul>

        <div className="bg-white/5 p-6 sm:p-8" style={{ borderRadius: 0 }}>
          <h2 className="text-white text-lg sm:text-xl font-black uppercase tracking-[0.2em] text-left">
            {selected.name}
          </h2>
          <p className="mt-2 text-white/50 text-[13px] text-left">
            {selected.contact} · {selected.email}
          </p>

          <dl className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Stage', value: selected.stage, tone: STAGE_TONE[selected.stage] },
              { label: 'Region', value: selected.region },
              { label: 'Monthly', value: money(selected.monthlyValue) },
              { label: 'Open Requests', value: String(selected.openRequests) },
            ].map(f => (
              <div key={f.label}>
                <dt className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 text-left">
                  {f.label}
                </dt>
                <dd
                  className={cn(
                    'mt-2 text-[14px] font-bold uppercase tracking-wider text-left',
                    f.tone ?? 'text-white',
                  )}
                >
                  {f.value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-10">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 text-left">
              Billed, last 12 weeks
            </p>
            <div className={cn('mt-4 h-24', CHART_ACCENTS.crm)}>
              <Sparkline values={selected.billing} className="h-full" />
            </div>
          </div>

          <p className="mt-10 text-white/25 text-[11px] uppercase tracking-[0.2em] text-left">
            Client since {selected.since}
          </p>
        </div>
      </div>
    </div>
  );
}
