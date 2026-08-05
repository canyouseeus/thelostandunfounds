/**
 * DEMO MODE — the dashboard, with the chat beside it.
 *
 * The metric grid is the four readables. The rail on the right is the running
 * chat and the request queue, which is what makes "I like that graph" into a
 * tracked item instead of a message that scrolls away: hitting USE THIS on a
 * card files a request pinned to that chart, and it shows up in the queue below
 * the conversation about it.
 */

import { useState } from 'react';
import { cn } from '../../components/ui/utils';
import MetricCard from '../../components/demo/MetricCard';
import { useDemo } from '../../lib/demo/DemoContext';
import {
  DEMO_METRICS,
  DEMO_MESSAGES,
  DEMO_REQUESTS,
  type DemoMetric,
  type DemoMessage,
} from '../../lib/demo/fixtures';

const STATUS_TONE: Record<string, string> = {
  open: 'text-white/40',
  building: 'text-amber-500',
  shipped: 'text-green-400',
};

export default function DemoDashboard() {
  const { intercept } = useDemo();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  // Local only — cleared on every send, and gone on reload. Demo messages never
  // leave the tab.
  const [messages] = useState<DemoMessage[]>(DEMO_MESSAGES);

  const send = async () => {
    if (!draft.trim() || sending) return;
    setSending(true);
    await new Promise(r => setTimeout(r, 350));
    await intercept({
      action: 'Send message',
      table: 'messages',
      payload: { author: 'you', body: draft.trim(), context_ref: null },
    });
    setDraft('');
    setSending(false);
  };

  const useThis = async (metric: DemoMetric) => {
    await intercept({
      action: 'File feature request',
      table: 'requests',
      payload: {
        title: `${metric.label} card on the other dashboard`,
        context_ref: `chart:${metric.key}`,
        status: 'open',
      },
    });
  };

  return (
    <div>
      <h1 className="text-white text-2xl sm:text-4xl font-black uppercase tracking-[0.2em] text-left">
        Dashboard
      </h1>
      <p className="mt-3 text-white/40 text-[13px] text-left max-w-2xl">
        Flow, capacity, geography, money. Hit SOURCE on any card to see what feeds it.
      </p>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* items-start: a card that opens its source panel grows, and without
            this its row-mates stretch to match and gain dead space. */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 content-start items-start">
          {DEMO_METRICS.map(m => (
            <MetricCard key={m.key} metric={m} onUseThis={useThis} />
          ))}
        </div>

        <aside className="flex flex-col gap-6">
          <div className="bg-white/5 p-5 flex flex-col" style={{ borderRadius: 0 }}>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 text-left">
              Chat
            </p>

            <div className="mt-4 space-y-4 max-h-80 overflow-y-auto">
              {messages.map(m => (
                <div key={m.id}>
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/30 text-left">
                    {m.author === 'you' ? 'You' : 'Jack'}
                    {m.contextRef && <span className="text-white/20"> · {m.contextRef}</span>}
                  </p>
                  <p className="mt-1.5 text-white/75 text-[13px] leading-relaxed text-left">
                    {m.body}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                rows={2}
                placeholder="Write a message"
                className="w-full bg-black text-white text-[13px] p-3 resize-none placeholder:text-white/20 focus:outline-none"
                style={{ borderRadius: 0 }}
              />
              <button
                onClick={send}
                disabled={sending || !draft.trim()}
                className={cn(
                  'h-10 text-[10px] font-black uppercase tracking-[0.25em] transition-colors',
                  sending || !draft.trim()
                    ? 'bg-white/5 text-white/20'
                    : 'bg-white text-black hover:bg-white/80',
                )}
                style={{ borderRadius: 0 }}
              >
                {sending ? 'Sending' : 'Send'}
              </button>
            </div>
          </div>

          <div className="bg-white/5 p-5" style={{ borderRadius: 0 }}>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 text-left">
              Requests
            </p>
            <ul className="mt-4 space-y-3">
              {DEMO_REQUESTS.map(r => (
                <li key={r.id}>
                  <p className="text-white/75 text-[13px] leading-snug text-left">{r.title}</p>
                  <p className="mt-1 text-[9px] font-black uppercase tracking-[0.25em] text-left">
                    <span className={STATUS_TONE[r.status]}>{r.status}</span>
                    <span className="text-white/20"> · from {r.from}</span>
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
