import { useCallback, useEffect, useState } from 'react';
import { PaperAirplaneIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { supabase } from '../../lib/supabase';

/**
 * Send the roster their setup email, from the roster panel.
 *
 * The endpoint behind this was cron-secret-only, which meant the only way to
 * run it was to already hold a secret nobody carries around. That is the wrong
 * shape for a thing the owner does by decision rather than on a schedule, so
 * the route now also accepts a verified admin session and this is the button
 * that carries one.
 *
 * Deliberately two presses, not one. There is no send log and no cooldown
 * behind this: a second run mails everybody a second time, from Joshua's own
 * address. So the first press is a dry run that shows exactly who would be
 * mailed and what each of them is missing, and only then does the real send
 * unlock. The confirm is enforced server-side too, so a stray call cannot skip
 * the step by not rendering this component.
 */

interface Recipient {
  name: string;
  email: string;
  subject: string;
  missing: string[];
  has: {
    login: boolean;
    gearItems: number;
    stripe: boolean;
    galleries: number;
    blockedDays: number;
  };
}

interface SendResult {
  email: string;
  variant: string;
  success: boolean;
  provider?: string;
  error?: string;
}

export default function CrewOnboardingSend() {
  const [preview, setPreview] = useState<Recipient[] | null>(null);
  const [results, setResults] = useState<SendResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [armed, setArmed] = useState(false);

  const call = useCallback(async (body: Record<string, unknown>) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/admin/crew-onboarding-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token || ''}`,
      },
      body: JSON.stringify(body),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(payload?.error || `Request failed (${res.status})`);
    return payload;
  }, []);

  // Arming expires with the preview: if the roster is re-checked, the operator
  // has to look at the new list before the send unlocks again.
  useEffect(() => { setArmed(false); }, [preview]);

  const runDryRun = async () => {
    setBusy(true);
    setError(null);
    setResults(null);
    try {
      const payload = await call({ dryRun: true });
      setPreview(payload.recipients || []);
    } catch (err: any) {
      setError(err?.message || 'Could not reach the server.');
    } finally {
      setBusy(false);
    }
  };

  const runSend = async () => {
    setBusy(true);
    setError(null);
    try {
      const payload = await call({ confirm: true });
      setResults(payload.results || []);
      setPreview(null);
    } catch (err: any) {
      setError(err?.message || 'Could not reach the server.');
    } finally {
      setBusy(false);
    }
  };

  const sendTest = async () => {
    setBusy(true);
    setError(null);
    try {
      await call({ testEmail: 'thelostandunfounds@gmail.com' });
      setError(null);
      setResults(null);
      alert('Preview sent to thelostandunfounds@gmail.com (one copy per variant).');
    } catch (err: any) {
      setError(err?.message || 'Could not reach the server.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white/5 p-5 mb-6 text-left" style={{ borderRadius: 0 }}>
      <h3 className="text-sm font-black uppercase tracking-tight text-white">Setup Email</h3>
      <p className="text-xs text-white/40 mt-1 mb-4">
        Mails each photographer only the steps they still owe, from
        joshua@thelostandunfounds.com. No send log behind it, so running it twice mails everyone
        twice.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={runDryRun}
          disabled={busy}
          className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase tracking-widest bg-white/10 text-white hover:bg-white hover:text-black transition-colors disabled:opacity-40"
          style={{ borderRadius: 0 }}
        >
          <ArrowPathIcon className="w-3 h-3" />
          {busy ? 'Working…' : 'Check who gets what'}
        </button>
        <button
          onClick={sendTest}
          disabled={busy}
          className="px-3 py-2 text-[10px] font-black uppercase tracking-widest bg-white/10 text-white hover:bg-white hover:text-black transition-colors disabled:opacity-40"
          style={{ borderRadius: 0 }}
        >
          Send me a preview
        </button>
      </div>

      {error && <div className="bg-red-500/10 px-4 py-3 text-sm text-red-300 mt-4">{error}</div>}

      {preview && (
        <div className="mt-5">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">
            {preview.length} would be mailed
          </p>
          <ul className="space-y-px mb-4">
            {preview.map((person) => (
              <li key={person.email} className="bg-white/5 px-3 py-2">
                <p className="text-xs font-black uppercase tracking-widest text-white">
                  {person.name}
                  <span className="text-white/30 font-normal normal-case tracking-normal">
                    {' '}· {person.email}
                  </span>
                </p>
                <p className="text-xs text-white/50 mt-1">{person.subject}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-300 mt-1">
                  {person.missing.length ? `Missing: ${person.missing.join(', ')}` : 'Fully set up'}
                </p>
              </li>
            ))}
          </ul>

          <label className="flex items-start gap-2 text-xs text-white/60 mb-3 cursor-pointer">
            <input
              type="checkbox"
              checked={armed}
              onChange={(e) => setArmed(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              I've read the list above and want to send it. This goes to real people and cannot be
              unsent.
            </span>
          </label>

          <button
            onClick={runSend}
            disabled={busy || !armed || preview.length === 0}
            className="flex items-center gap-2 px-4 py-3 text-[11px] font-black uppercase tracking-widest bg-white text-black hover:bg-white/80 transition-colors disabled:opacity-30"
            style={{ borderRadius: 0 }}
          >
            <PaperAirplaneIcon className="w-3 h-3" />
            {busy ? 'Sending…' : `Send to ${preview.length}`}
          </button>
        </div>
      )}

      {results && (
        <div className="mt-5">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">
            Sent {results.filter((r) => r.success).length} of {results.length}
          </p>
          <ul className="space-y-px">
            {results.map((result) => (
              <li key={result.email} className="bg-white/5 px-3 py-2 flex flex-wrap gap-2 justify-between">
                <span className="text-xs text-white/70">{result.email}</span>
                <span
                  className={`text-[10px] font-black uppercase tracking-widest ${
                    result.success ? 'text-green-400' : 'text-red-300'
                  }`}
                >
                  {result.success ? `Sent via ${result.provider}` : result.error || 'Failed'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
