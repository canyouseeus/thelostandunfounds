/**
 * DEMO MODE — checkout, played rather than performed.
 *
 * Stripe is the one flow that cannot be walked for real, because the last step
 * moves money. Everything up to it is genuine: real products, real cart, real
 * shipping form, real totals. Then the pay button is pressed and this takes
 * over — it narrates the stages a live checkout actually goes through, at the
 * pace it actually goes through them, and stops at authorization.
 *
 * The point is that somebody clicking CHECKOUT in the demo sees where the money
 * would go and what the system does at each step, instead of hitting a dead
 * button and being told "that part doesn't work here". Nothing is charged, no
 * session is created, no card is collected — the Stripe call was never made.
 *
 * When it finishes it returns to the start of the flow, the same way every
 * other demo form resets.
 */

import { useCallback, useEffect, useState } from 'react';
import { cn } from '../ui/utils';
import { DEMO_CHECKOUT_EVENT, type DemoCheckoutDetail } from '../../lib/demo/demoFlag';
import { DEMO_LAYER } from '../../lib/demo/layers';

/** The stages a real card checkout moves through, with honest dwell times. */
const STAGES: { label: string; ms: number }[] = [
  { label: 'Creating checkout session', ms: 900 },
  { label: 'Handing off to payment processor', ms: 1000 },
  { label: 'Collecting card details', ms: 1200 },
  { label: 'Authorizing', ms: 1100 },
];

export default function DemoCheckoutOverlay() {
  const [detail, setDetail] = useState<DemoCheckoutDetail | null>(null);
  const [stage, setStage] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const onCheckout = (e: Event) => {
      setDetail((e as CustomEvent<DemoCheckoutDetail>).detail);
      setStage(0);
      setDone(false);
    };
    window.addEventListener(DEMO_CHECKOUT_EVENT, onCheckout);
    return () => window.removeEventListener(DEMO_CHECKOUT_EVENT, onCheckout);
  }, []);

  useEffect(() => {
    if (!detail || done) return;
    if (stage >= STAGES.length) {
      setDone(true);
      return;
    }
    const t = setTimeout(() => setStage(s => s + 1), STAGES[stage].ms);
    return () => clearTimeout(t);
  }, [detail, stage, done]);

  // Back to the beginning. A reload is the honest reset here: the cart, the
  // shipping form and the product state all live in different components, and
  // reloading clears every one of them without this file having to know about
  // any of them. Nothing was persisted, so there is nothing to lose.
  const restart = useCallback(() => {
    window.location.reload();
  }, []);

  if (!detail) return null;

  return (
    <div
      className={`fixed inset-0 ${DEMO_LAYER.checkout} flex items-center justify-center p-6 backdrop-blur-md`}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.95)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-checkout-title"
    >
      <div className="w-full max-w-md bg-white/5 p-8" style={{ borderRadius: 0 }}>
        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 text-left">
          Demo Checkout — {detail.rail}
        </p>

        <h2
          id="demo-checkout-title"
          className="mt-3 text-white text-lg font-black uppercase tracking-[0.2em] text-left"
        >
          {done ? 'Stopped Before Charging' : 'Processing'}
        </h2>

        <p className="mt-2 text-white/60 text-[13px] text-left break-words">
          {detail.label}
          {detail.amount && <span className="text-white/90"> · {detail.amount}</span>}
        </p>

        <ol className="mt-7 space-y-3">
          {STAGES.map((s, i) => {
            const state = i < stage ? 'done' : i === stage && !done ? 'active' : 'waiting';
            return (
              <li key={s.label} className="flex items-center gap-3">
                <span
                  className={cn(
                    'w-2 h-2 shrink-0 transition-colors',
                    state === 'done' && 'bg-green-400',
                    state === 'active' && 'bg-white animate-pulse',
                    state === 'waiting' && 'bg-white/15',
                  )}
                />
                <span
                  className={cn(
                    'text-[11px] font-bold uppercase tracking-widest text-left transition-colors',
                    state === 'done' && 'text-white/50',
                    state === 'active' && 'text-white',
                    state === 'waiting' && 'text-white/20',
                  )}
                >
                  {s.label}
                </span>
              </li>
            );
          })}
          <li className="flex items-center gap-3">
            <span className={cn('w-2 h-2 shrink-0', done ? 'bg-red-500' : 'bg-white/15')} />
            <span
              className={cn(
                'text-[11px] font-bold uppercase tracking-widest text-left',
                done ? 'text-white' : 'text-white/20',
              )}
            >
              Charge card — not in demo
            </span>
          </li>
        </ol>

        {done && (
          <>
            <p className="mt-7 text-white/50 text-[12px] leading-relaxed text-left">
              This is where the live site charges the card and writes the order. In demo
              mode it stops here — no session was created and no card was collected.
            </p>
            <button
              onClick={restart}
              className="mt-6 w-full h-12 bg-white text-black text-[11px] font-black uppercase tracking-[0.25em] hover:bg-white/80 transition-colors"
              style={{ borderRadius: 0 }}
            >
              Start Over
            </button>
          </>
        )}
      </div>
    </div>
  );
}
