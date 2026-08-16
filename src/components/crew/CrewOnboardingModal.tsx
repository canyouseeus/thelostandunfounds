import { useCallback, useEffect, useState } from 'react';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import { supabase } from '../../lib/supabase';

/**
 * The setup walkthrough, on the dashboard, every time they sign in.
 *
 * The email that brings someone here has exactly one button. That is the whole
 * design: a list of tasks read in an inbox is a list of tasks in the wrong
 * place, where none of them can be done and all of them can be forgotten. So
 * the email gets them through the door and this picks it up from there, one
 * step at a time, next to the things the steps are about.
 *
 * Three rules it has to hold to:
 *
 *  - **Skippable, always.** Somebody who signed in to check whether they got
 *    paid should be able to get to that in one click. A walkthrough you cannot
 *    dismiss is a walkthrough people learn to resent.
 *  - **Back on the next sign-in.** Skipping is "not now", not "never". The
 *    dismissal lives in `sessionStorage`, so it holds for the session they are
 *    in and is gone the next time they come back.
 *  - **Stops for good when there is nothing left.** Only gear and Stripe hold
 *    it open. Blocking out dates rides along because it is the new thing and
 *    worth seeing, but it is not a task somebody with an open diary can
 *    finish, and gating on it would nag them forever for being available.
 */

interface SetupStep {
  key: 'gear' | 'stripe' | 'calendar';
  title: string;
  body: string;
  action: string;
  href: string;
  done: boolean;
  required: boolean;
}

interface SetupResponse {
  onRoster: boolean;
  photographer?: { id: string; name: string };
  steps: SetupStep[];
  remaining: number;
  complete: boolean;
}

const dismissKey = (userId: string) => `tlau_crew_setup_skipped_${userId}`;

export default function CrewOnboardingModal({ userId }: { userId: string }) {
  const [setup, setSetup] = useState<SetupResponse | null>(null);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/crew/setup', {
        headers: { Authorization: `Bearer ${session?.access_token || ''}` },
      });
      if (!res.ok) return;
      const payload: SetupResponse = await res.json();
      setSetup(payload);

      // Nothing outstanding, or not on the roster at all: never show.
      if (!payload.onRoster || payload.complete) return;
      if (sessionStorage.getItem(dismissKey(userId))) return;

      // Open on the first thing they actually still owe.
      const first = payload.steps.findIndex((step) => !step.done);
      setIndex(first === -1 ? 0 : first);
      setOpen(true);
    } catch {
      /* the dashboard works without this; never block it on a failed fetch */
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const skip = useCallback(() => {
    sessionStorage.setItem(dismissKey(userId), '1');
    setOpen(false);
  }, [userId]);

  // Escape closes, same as the backdrop. Trapping someone in a walkthrough is
  // the one thing this must never do.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') skip(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, skip]);

  if (!open || !setup) return null;

  const steps = setup.steps;
  const step = steps[index];
  if (!step) return null;

  const isLast = index === steps.length - 1;

  const act = async () => {
    setError(null);

    if (step.key === 'gear') {
      // Full navigation rather than a router push: the kit form is its own
      // page and they come back to the dashboard when they're done.
      window.location.href = step.href;
      return;
    }

    if (step.key === 'stripe') {
      // Minted on click, never held in state: Stripe Account Links expire
      // within minutes, so one fetched when the modal opened would be dead by
      // the time somebody got to this step.
      setBusy(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch('/api/crew/connect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token || ''}`,
          },
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || !body.url) {
          setError(body?.error || 'Could not open Stripe. Try the button on your payouts panel.');
          return;
        }
        window.location.href = body.url;
      } catch {
        setError('Could not reach Stripe. Try again in a moment.');
      } finally {
        setBusy(false);
      }
      return;
    }

    // Calendar: closing is the point. It is on the page behind this.
    skip();
    document.getElementById('crew-calendar')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={skip}
      role="dialog"
      aria-modal="true"
      aria-label="Finish setting up your account"
    >
      <div
        className="bg-[#0A0A0A] w-full max-w-lg p-6 sm:p-8 relative my-8 max-h-[calc(100vh-4rem)] overflow-y-auto custom-scrollbar text-left"
        style={{ borderRadius: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={skip}
          className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
          aria-label="Close"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>

        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-2">
          {setup.remaining > 0
            ? `${setup.remaining} thing${setup.remaining === 1 ? '' : 's'} left`
            : 'One more thing'}
        </p>
        <h2 className="text-2xl font-black uppercase tracking-tight text-white mb-1">
          FINISH SETTING UP
        </h2>
        <p className="text-sm text-white/50 mb-6">
          {setup.photographer?.name
            ? `${setup.photographer.name.trim().split(/\s+/)[0]}, this takes about five minutes.`
            : 'This takes about five minutes.'}
        </p>

        {/* Progress rail. Tone and a check, no outlines. */}
        <div className="flex gap-1 mb-6">
          {steps.map((s, i) => (
            <button
              key={s.key}
              onClick={() => setIndex(i)}
              aria-label={s.title}
              className={`h-1 flex-1 transition-colors ${
                s.done ? 'bg-green-400' : i === index ? 'bg-white' : 'bg-white/15'
              }`}
            />
          ))}
        </div>

        <div className="bg-white/5 p-5 mb-6">
          <div className="flex items-start gap-3">
            {step.done && (
              <span className="bg-green-500/20 text-green-300 p-1 shrink-0 mt-0.5">
                <CheckIcon className="w-4 h-4" />
              </span>
            )}
            <div>
              <h3 className="text-base font-black uppercase tracking-tight text-white">
                {step.title}
              </h3>
              {step.done && (
                <p className="text-[10px] font-black uppercase tracking-widest text-green-400 mt-1">
                  Already done
                </p>
              )}
            </div>
          </div>
          <p className="text-sm text-white/70 mt-3">{step.body}</p>
        </div>

        {error && <p className="text-sm text-red-300 mb-4">{error}</p>}

        <div className="flex flex-wrap items-center gap-2">
          {!step.done && (
            <button
              onClick={act}
              disabled={busy}
              className="px-5 py-3 text-[11px] font-black uppercase tracking-widest bg-white text-black hover:bg-white/80 transition-colors disabled:opacity-40"
              style={{ borderRadius: 0 }}
            >
              {busy ? 'Opening…' : step.action}
            </button>
          )}

          {!isLast && (
            <button
              onClick={() => setIndex((i) => Math.min(i + 1, steps.length - 1))}
              className="px-5 py-3 text-[11px] font-black uppercase tracking-widest bg-white/10 text-white hover:bg-white hover:text-black transition-colors"
              style={{ borderRadius: 0 }}
            >
              {step.done ? 'Next' : 'Later'}
            </button>
          )}

          <button
            onClick={skip}
            className="px-5 py-3 text-[11px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors ml-auto"
            style={{ borderRadius: 0 }}
          >
            Skip for now
          </button>
        </div>

        <p className="text-[11px] text-white/25 mt-5">
          You can close this and come back to it. It'll be here next time you sign in until
          your gear and Stripe are sorted.
        </p>
      </div>
    </div>
  );
}
