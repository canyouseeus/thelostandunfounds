import { useState, useEffect, useMemo, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { PhoneIcon, EnvelopeIcon, GlobeAltIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from '../components/Loading';

/**
 * CleanTex outreach CRM. CleanTex Pressure Washing (Jack Emmel) is a studio
 * client; this is their book of business, scoped by contacts.workspace so it
 * never mixes with THE LOST+UNFOUNDS pipeline.
 *
 * Surfaces are separated by background tone, never borders — see the
 * `no-border-design` skill, which bans border classes outright. The older
 * src/pages/Leads.tsx predates that rule and is not the pattern to copy.
 */

const WORKSPACE = 'cleantex';

type Outcome = 'answered' | 'no_answer' | 'interested' | 'quoted' | 'won' | 'not_now' | null;

type Contact = {
  id: string;
  company: string | null;
  first_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  tier: string | null;
  territory: string | null;
  notes: string | null;
  outcome: Outcome;
  call_count: number;
  last_called_at: string | null;
  callback_at: string | null;
};

/** Why each tier is worth calling — the reason is the pitch. */
const TIERS: Record<string, { label: string; why: string }> = {
  '3': { label: 'CUSTOM BUILDERS', why: 'Their pain is a $1.4M client at final walkthrough staring at mortar splatter.' },
  '4': { label: 'SUBS', why: 'Masonry and stucco crews owe the cleanup inside their own scope and have no equipment. Land one and you inherit every builder they work for.' },
  '5': { label: 'COMMERCIAL GC', why: 'Bigger tickets, night work. Confirm storm-drain discharge and reclaim before bidding flatwork.' },
  '6': { label: 'POOL BUILDERS', why: 'Shotcrete overspray and slurry on a deck the owner is about to see. They build continuously.' },
  '7': { label: 'PRODUCTION', why: 'Ranked by permit volume in the core ring. Ask for the site superintendent, not the office.' },
};

const OUTCOMES: { key: Exclude<Outcome, null>; label: string }[] = [
  { key: 'answered', label: 'ANSWERED' },
  { key: 'no_answer', label: 'NO ANSWER' },
  { key: 'interested', label: 'INTERESTED' },
  { key: 'quoted', label: 'QUOTED' },
  { key: 'won', label: 'WON' },
  { key: 'not_now', label: 'NOT NOW' },
];

const SURFACE = 'bg-white/5';
const SQUARE = { borderRadius: 0 } as const;

const telHref = (phone: string) => `tel:+1${phone.replace(/\D/g, '')}`;
const isDue = (c: Contact) => !!c.callback_at && new Date(c.callback_at) <= new Date();

export default function CleanTexCrm() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tier, setTier] = useState<string>('all');
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('contacts')
      .select('id, company, first_name, email, phone, website, tier, territory, notes, outcome, call_count, last_called_at, callback_at')
      .eq('workspace', WORKSPACE)
      .eq('is_archived', false)
      .order('tier', { ascending: true })
      .order('company', { ascending: true });

    if (err) setError(err.message);
    else { setContacts((data ?? []) as Contact[]); setError(null); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /** Optimistic patch — the call is already happening, the UI shouldn't lag it. */
  const patch = async (id: string, fields: Partial<Contact>) => {
    setSavingId(id);
    setContacts((cs) => cs.map((c) => (c.id === id ? { ...c, ...fields } : c)));
    const { error: err } = await supabase.from('contacts').update(fields).eq('id', id);
    if (err) { setError(err.message); await load(); }
    setSavingId(null);
  };

  const logCall = (c: Contact) =>
    patch(c.id, { call_count: (c.call_count ?? 0) + 1, last_called_at: new Date().toISOString() });

  const setOutcome = (c: Contact, outcome: Exclude<Outcome, null>) => {
    // No answer earns one retry two days out, at a different time of day.
    const callback = outcome === 'no_answer'
      ? new Date(Date.now() + 2 * 86400_000).toISOString()
      : null;
    return patch(c.id, { outcome, callback_at: callback });
  };

  const visible = useMemo(
    () => (tier === 'all' ? contacts : tier === 'due' ? contacts.filter(isDue) : contacts.filter((c) => c.tier === tier)),
    [contacts, tier],
  );

  const stats = useMemo(() => ({
    total: contacts.length,
    called: contacts.filter((c) => (c.call_count ?? 0) > 0).length,
    talked: contacts.filter((c) => c.outcome && c.outcome !== 'no_answer').length,
    due: contacts.filter(isDue).length,
  }), [contacts]);

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <Helmet>
        <title>CLEANTEX CRM | Outreach</title>
        <meta name="description" content="Internal outreach CRM for CleanTex Pressure Washing — builder, subcontractor and commercial GC prospects across the Buda, Kyle and South Austin territory." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="max-w-6xl mx-auto px-6 md:px-8 py-14 md:py-20">
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/30 mb-4">
          CleanTex Pressure Washing · Buda, TX
        </p>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-8">
          <h1 className="text-[clamp(2rem,6vw,3.5rem)] font-black uppercase tracking-tighter leading-none">
            CleanTex CRM
          </h1>
          <div className="flex items-center gap-4">
            <a href="https://www.cleantexpressure.com" target="_blank" rel="noopener noreferrer"
               className="font-mono text-xs text-white/40 hover:text-white transition-colors">
              cleantexpressure.com
            </a>
            <button onClick={load} className="text-white/40 hover:text-white transition-colors" aria-label="Refresh">
              <ArrowPathIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {error && (
          <div className={`${SURFACE} p-4 mb-6`} style={SQUARE}>
            <p className="font-mono text-xs text-white/70">{error}</p>
          </div>
        )}

        {/* Stats — separated by grid gap over a tinted track, not borders */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/10 mb-8" style={SQUARE}>
          {([['PROSPECTS', stats.total], ['CALLED', stats.called], ['CONNECTED', stats.talked], ['CALLBACK DUE', stats.due]] as const).map(
            ([label, value]) => (
              <div key={label} className="bg-black px-4 py-5 text-center">
                <p className="text-2xl font-black tabular-nums">{value}</p>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 mt-1">{label}</p>
              </div>
            ),
          )}
        </div>

        {/* Tier filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { key: 'all', label: 'ALL' },
            { key: 'due', label: `DUE${stats.due ? ` ${stats.due}` : ''}` },
            ...Object.entries(TIERS).map(([k, v]) => ({ key: k, label: v.label })),
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTier(t.key)}
              style={SQUARE}
              className={`text-[11px] font-black uppercase tracking-widest px-4 py-2 transition-colors ${
                tier === t.key ? 'bg-white text-black' : `${SURFACE} text-white/50 hover:text-white`
              }`}
            >
              {t.label}
              {t.key !== 'all' && t.key !== 'due' && (
                <span className="ml-2 text-white/40 font-mono">{contacts.filter((c) => c.tier === t.key).length}</span>
              )}
            </button>
          ))}
        </div>

        {tier !== 'all' && tier !== 'due' && TIERS[tier] && (
          <div className={`${SURFACE} p-5 mb-8`} style={SQUARE}>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 mb-2">Why this tier</p>
            <p className="text-sm text-white/70 font-light leading-relaxed">{TIERS[tier].why}</p>
          </div>
        )}

        {loading ? (
          <LoadingSpinner />
        ) : visible.length === 0 ? (
          <p className="font-mono text-sm text-white/40 py-12 text-center">No prospects in this view.</p>
        ) : (
          <div className="space-y-px bg-white/10" style={SQUARE}>
            {visible.map((c) => (
              <div key={c.id} className="bg-black p-5" style={SQUARE}>
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <h2 className="text-base font-black uppercase tracking-tight">{c.company}</h2>
                      {c.tier && TIERS[c.tier] && (
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">
                          {TIERS[c.tier].label}
                        </span>
                      )}
                      {isDue(c) && (
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] bg-white text-black px-2 py-0.5" style={SQUARE}>
                          Callback due
                        </span>
                      )}
                    </div>
                    <p className="font-mono text-xs text-white/40 mt-1">
                      {[c.first_name, c.territory].filter(Boolean).join(' · ') || '—'}
                    </p>
                    {c.notes && <p className="text-sm text-white/60 font-light mt-2 leading-relaxed">{c.notes}</p>}
                  </div>

                  <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
                    {c.phone ? (
                      <a href={telHref(c.phone)} onClick={() => logCall(c)}
                         className="flex items-center gap-2 font-mono text-sm text-white hover:text-white/60 transition-colors">
                        <PhoneIcon className="w-4 h-4" /> {c.phone}
                      </a>
                    ) : (
                      <span className="font-mono text-xs text-white/25">NO PHONE</span>
                    )}
                    {c.email && (
                      <a href={`mailto:${c.email}`} className="flex items-center gap-2 font-mono text-xs text-white/50 hover:text-white transition-colors">
                        <EnvelopeIcon className="w-3.5 h-3.5" /> {c.email}
                      </a>
                    )}
                    {c.website && (
                      <a href={`https://${c.website}`} target="_blank" rel="noopener noreferrer"
                         className="flex items-center gap-2 font-mono text-xs text-white/40 hover:text-white transition-colors">
                        <GlobeAltIcon className="w-3.5 h-3.5" /> {c.website}
                      </a>
                    )}
                    <p className="font-mono text-[10px] text-white/25">
                      {c.call_count ?? 0} call{(c.call_count ?? 0) === 1 ? '' : 's'}
                      {c.last_called_at && ` · last ${new Date(c.last_called_at).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  {OUTCOMES.map((o) => (
                    <button
                      key={o.key}
                      disabled={savingId === c.id}
                      onClick={() => setOutcome(c, o.key)}
                      style={SQUARE}
                      className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 transition-colors disabled:opacity-40 ${
                        c.outcome === o.key ? 'bg-white text-black' : `${SURFACE} text-white/40 hover:text-white`
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
