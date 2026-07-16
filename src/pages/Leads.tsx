import { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  PhoneIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  MapPinIcon,
  PlusIcon,
  MapIcon,
} from '@heroicons/react/24/outline';

/**
 * Sales pipeline tracker for the fabrication service. Internal / admin-gated.
 * Prospect status + notes persist in the browser (localStorage) so the page
 * is a working tracker without a backend. Seed leads were researched from
 * public listings (July 2026) — VERIFY flags mark unconfirmed contact info.
 */

type Status = 'New' | 'Contacted' | 'Quoted' | 'Won' | 'Pass';
const STATUSES: Status[] = ['New', 'Contacted', 'Quoted', 'Won', 'Pass'];

type Category = 'Machine Shop' | 'Dental Lab' | 'Repair Shop';
const CATEGORIES: Category[] = ['Machine Shop', 'Dental Lab', 'Repair Shop'];

type Lead = {
  id: string;
  category: Category;
  name: string;
  type: string;
  phone?: string;
  email?: string;
  website?: string;
  area: string;
  note?: string;
  verify?: boolean;
  custom?: boolean;
};

const OVERRIDES_KEY = 'lau_leads_overrides_v1';
const CUSTOM_KEY = 'lau_leads_custom_v1';

const PITCH: Record<Category, JSX.Element> = {
  'Machine Shop': (
    <>
      "I make custom <b className="text-white font-normal">jigs, fixtures, and tooling</b> in-house — nylon and
      carbon-fiber, <b className="text-white font-normal">no minimum order</b>, usually within a few days. When you
      need a one-off and don't want to tie up a machinist, call me." Walk in with a printed sample. Lead with{' '}
      <b className="text-white font-normal">saved labor hours</b>, not the printer.
    </>
  ),
  'Dental Lab': (
    <>
      "I run a <b className="text-white font-normal">9K resin printer with biocompatible and castable resin</b> — I can
      turn around <b className="text-white font-normal">models, dies, and aligner molds</b> fast when you're backed up.
      Think of me as overflow capacity." Lead with <b className="text-white font-normal">accuracy + same-day
      turnaround</b> during their busy weeks.
    </>
  ),
  'Repair Shop': (
    <>
      "When a part's <b className="text-white font-normal">discontinued or backordered</b>, I reverse-engineer and
      reprint it in <b className="text-white font-normal">nylon or PC</b> — days, not 'never.' Send me the broken
      piece." Lead with <b className="text-white font-normal">unblocking a repair</b> they otherwise can't finish.
    </>
  ),
};

const MAPS: Record<Category, string> = {
  'Machine Shop': 'https://www.google.com/maps/search/machine+shop+OR+fabrication/@30.2617,-97.7141,12z',
  'Dental Lab': 'https://www.google.com/maps/search/dental+laboratory/@30.2617,-97.7141,12z',
  'Repair Shop': 'https://www.google.com/maps/search/appliance+OR+RV+repair/@30.2617,-97.7141,12z',
};

// Researched from public listings, July 2026. Contact details flagged
// `verify` need confirming before outreach — do not treat as authoritative.
const SEED: Lead[] = [
  // ---------- Machine Shops ----------
  {
    id: 'precise-machining', category: 'Machine Shop',
    name: 'Precise Machining Company', type: 'CNC Machining',
    phone: '512-528-8771', email: 'info@precisemachiningco.com', website: 'https://www.precisemachiningco.com',
    area: 'Central TX — address unconfirmed', verify: true,
    note: 'Overflow jigs/fixtures + one-off prototypes. Confirm they are local before visiting.',
  },
  {
    id: 'austin-precision-mm', category: 'Machine Shop',
    name: 'Austin Precision Machining & Mfg', type: 'CNC for OEMs',
    website: 'https://austinprecisionmachining.com', area: 'Austin — verify address', verify: true,
    note: 'OEM shop — pitch printed soft-jaws / fixtures and rapid prototypes between runs.',
  },
  {
    id: 'jj-machine', category: 'Machine Shop',
    name: 'J&J Machine (Austin page)', type: 'CNC Machine Shop',
    website: 'https://jjmachine99.com', area: 'Austin? — verify', verify: true,
    note: '⚠ Listed number uses a non-local area code; site may be SEO, not a local shop. Verify on Maps first.',
  },
  {
    id: 'twisted-metals', category: 'Machine Shop',
    name: 'Twisted Metals Welding & Fabrication', type: 'Welding / Metal Fab',
    website: 'https://twistedmetalswelding.com', area: 'Austin — verify address', verify: true,
    note: 'Custom fab — printed jigs/templates and one-off plastic parts they can’t weld.',
  },
  {
    id: 'techni-center-weld', category: 'Machine Shop',
    name: 'Welding / Fab Shop (Techni Center Dr)', type: 'Welding / Metal Fab',
    phone: '(512) 358-6330', area: '5800 Techni Center Dr, 78721 — ~4 mi', verify: true,
    note: 'Closest to you. Confirm the business name when you call. Fixtures + templates.',
  },
  {
    id: 'forge-metal-works', category: 'Machine Shop',
    name: 'Forge Metal Works', type: 'Welding / Metal Fab',
    website: 'https://www.forgemw.com', area: 'Jarrell, TX — ~40 mi N',
    note: 'Out of range (checked) — deprioritize unless they have an Austin drop-off.',
  },
  {
    id: 'fathom-austin', category: 'Machine Shop',
    name: 'Fathom Manufacturing (Austin)', type: 'Digital Mfg / 3D Print',
    website: 'https://fathommfg.com/locations/austin-tx', area: 'Austin',
    note: 'NOT a cold client — large competitor. Approach as overflow / subcontract partner.',
  },

  // ---------- Dental Labs ----------
  {
    id: 'electric-arts', category: 'Dental Lab',
    name: 'Electric Arts Dental Lab', type: 'Full-Service Dental Lab',
    website: 'https://www.electricartsdentallab.com', area: 'Austin — verify address', verify: true,
    note: 'Strongest dental target — a real full lab. Pitch overflow models, dies, aligner molds, same-day turnaround.',
  },
  {
    id: 'great-state-dental', category: 'Dental Lab',
    name: 'Great State Dental Lab', type: 'Digital Implant Lab',
    website: 'https://www.greatstatedental.com', area: 'Austin — verify address', verify: true,
    note: 'Digital implant lab — offer overflow model & surgical-guide printing.',
  },
  {
    id: 'implanttx', category: 'Dental Lab',
    name: 'ImplantTx Dental Lab', type: 'Implant Lab',
    website: 'https://www.implanttx.com', area: 'Austin — verify address', verify: true,
    note: 'Implant lab — surgical guides and models are the resin sweet spot.',
  },
  {
    id: 'shoal-creek-prostho', category: 'Dental Lab',
    name: 'Shoal Creek Prosthodontic Group', type: 'In-House Prostho Lab',
    phone: '(512) 451-7491', area: '1500 W 38th St Ste 34, 78731 — ~5 mi', verify: true,
    note: 'Runs an in-house lab; may not outsource — but worth a call for overflow capacity.',
  },
  {
    id: 'lucent-dentistry', category: 'Dental Lab',
    name: 'Lucent Dentistry', type: 'Dentist (same-day crowns)',
    phone: '512-458-5600', area: '3909 N IH-35 Suite A1, 78722 — ~2 mi',
    note: 'Very close, but likely mills crowns in-house — low priority. Good for a warm intro / referral.',
  },

  // ---------- Repair Shops ----------
  {
    id: 'express-appliance', category: 'Repair Shop',
    name: 'Express Appliance Repair of Austin', type: 'Appliance Repair',
    phone: '(512) 548-0025', area: 'Serves 78702 / 78721 — verify shop address', verify: true,
    note: 'May be mobile. Best fit = shops that bench-repair units with obsolete plastic parts.',
  },
  {
    id: 'austin-appliance', category: 'Repair Shop',
    name: 'Austin Appliance Repair', type: 'Appliance Repair',
    phone: '(512) 399-4425', area: 'Serves 78702 / 78721 — verify', verify: true,
    note: 'Confirm it is a real local bench shop, not a dispatch/lead-gen line.',
  },
  {
    id: 'tony-appliance', category: 'Repair Shop',
    name: 'Tony Appliance Repair', type: 'Appliance Repair',
    area: 'Near 78721 (Yelp) — find contact', verify: true,
    note: 'Yelp-listed near you. Look up on Yelp/Maps for phone + address before contacting.',
  },
  {
    id: 'artifix-appliance', category: 'Repair Shop',
    name: 'ArtiFix Appliance Repair', type: 'Appliance Repair',
    area: 'Austin (Yelp) — find contact', verify: true,
    note: 'Yelp-listed; verify contact. Ask what parts they most often can’t source.',
  },
  {
    id: 'yarrow-appliance', category: 'Repair Shop',
    name: 'Yarrow Appliance Repair', type: 'Appliance Repair',
    area: 'Austin (Yelp) — find contact', verify: true,
    note: 'Yelp-listed; verify contact. Vintage/discontinued parts = your best pitch.',
  },
];

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

const statusStyle: Record<Status, string> = {
  New: 'bg-white/10 text-white/70',
  Contacted: 'bg-white/20 text-white',
  Quoted: 'bg-white text-black',
  Won: 'bg-white text-black',
  Pass: 'bg-white/5 text-white/30 line-through',
};

export default function Leads() {
  const [overrides, setOverrides] = useState<Record<string, { status?: Status; notes?: string }>>(
    () => loadJSON(OVERRIDES_KEY, {})
  );
  const [custom, setCustom] = useState<Lead[]>(() => loadJSON(CUSTOM_KEY, []));
  const [filter, setFilter] = useState<Category | 'All'>('Machine Shop');
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<{ name: string; type: string; phone: string; email: string; website: string; area: string; category: Category }>(
    { name: '', type: '', phone: '', email: '', website: '', area: '', category: 'Machine Shop' }
  );

  useEffect(() => {
    try { localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides)); } catch { /* ignore */ }
  }, [overrides]);
  useEffect(() => {
    try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(custom)); } catch { /* ignore */ }
  }, [custom]);

  const allLeads = useMemo(() => [...SEED, ...custom], [custom]);
  const leads = useMemo(
    () => (filter === 'All' ? allLeads : allLeads.filter((l) => l.category === filter)),
    [allLeads, filter]
  );

  const statusOf = (id: string): Status => overrides[id]?.status ?? 'New';
  const notesOf = (id: string): string => overrides[id]?.notes ?? '';

  const setStatus = (id: string, status: Status) =>
    setOverrides((o) => ({ ...o, [id]: { ...o[id], status } }));
  const setNotes = (id: string, notes: string) =>
    setOverrides((o) => ({ ...o, [id]: { ...o[id], notes } }));

  const counts = useMemo(() => {
    const c: Record<string, number> = { Total: leads.length };
    STATUSES.forEach((s) => (c[s] = 0));
    leads.forEach((l) => { c[statusOf(l.id)]++; });
    return c;
  }, [leads, overrides]); // eslint-disable-line react-hooks/exhaustive-deps

  const addLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim()) return;
    const id = `custom-${Date.now()}`;
    setCustom((c) => [
      ...c,
      {
        id,
        category: draft.category,
        name: draft.name.trim(),
        type: draft.type.trim() || 'Prospect',
        phone: draft.phone.trim() || undefined,
        email: draft.email.trim() || undefined,
        website: draft.website.trim() || undefined,
        area: draft.area.trim() || '—',
        custom: true,
      },
    ]);
    setDraft({ name: '', type: '', phone: '', email: '', website: '', area: '', category: draft.category });
    setShowForm(false);
  };

  const removeLead = (id: string) => {
    setCustom((c) => c.filter((l) => l.id !== id));
    setOverrides((o) => { const n = { ...o }; delete n[id]; return n; });
  };

  const inputClass =
    'w-full px-3 py-2 bg-black border border-white/20 text-white placeholder-white/25 focus:outline-none focus:border-white transition-colors text-sm font-mono';
  const mapsHref = filter === 'All' ? MAPS['Machine Shop'] : MAPS[filter];

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <Helmet>
        <title>THE LOST+UNFOUNDS | Sales Pipeline</title>
        <meta name="description" content="Internal sales pipeline tracker for the fabrication service — prospects, status, and notes." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="max-w-6xl mx-auto px-6 md:px-8 py-14 md:py-20">
        {/* Header */}
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/30 mb-4">
          Fabrication · Sales Pipeline
        </p>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-6">
          <h1 className="text-[clamp(2rem,6vw,3.5rem)] font-black uppercase tracking-tighter leading-none">
            Pipeline
          </h1>
          <p className="font-mono text-xs text-white/40">Downtown Austin · 78702 · ~3–5 mi</p>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(['All', ...CATEGORIES] as const).map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`text-[11px] font-black uppercase tracking-widest px-4 py-2 transition-colors ${
                filter === c ? 'bg-white text-black' : 'border border-white/15 text-white/50 hover:border-white/40'
              }`}
            >
              {c}
              {c !== 'All' && (
                <span className="ml-2 text-white/40 font-mono">{allLeads.filter((l) => l.category === c).length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Pitch reminder (category-aware) */}
        {filter !== 'All' && (
          <div className="border border-white/10 p-5 mb-8">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 mb-2">
              The Pitch — {filter}
            </p>
            <p className="text-sm text-white/70 font-light leading-relaxed">{PITCH[filter]}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-px bg-white/10 border border-white/10 mb-8">
          {['Total', ...STATUSES].map((k) => (
            <div key={k} className="bg-black px-4 py-4 text-center">
              <p className="text-2xl font-black tabular-nums">{counts[k] ?? 0}</p>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 mt-1">{k}</p>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 mb-8">
          <button
            onClick={() => { setShowForm((s) => !s); setDraft((d) => ({ ...d, category: filter === 'All' ? 'Machine Shop' : filter })); }}
            className="px-5 py-3 bg-white text-black font-black uppercase tracking-widest text-[11px] hover:bg-zinc-200 transition-colors flex items-center gap-2"
          >
            <PlusIcon className="w-4 h-4" /> Add Prospect
          </button>
          <a
            href={mapsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-3 border border-white/20 text-white font-black uppercase tracking-widest text-[11px] hover:border-white transition-colors flex items-center gap-2"
          >
            <MapIcon className="w-4 h-4" /> Find More on Maps
          </a>
        </div>

        {/* Add form */}
        {showForm && (
          <form onSubmit={addLead} className="border border-white/20 p-5 mb-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input className={inputClass} placeholder="Company name *" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            <select className={inputClass} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as Category })}>
              {CATEGORIES.map((c) => <option key={c} value={c} className="bg-black">{c}</option>)}
            </select>
            <input className={inputClass} placeholder="Type (e.g. CNC shop)" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })} />
            <input className={inputClass} placeholder="Area / address" value={draft.area} onChange={(e) => setDraft({ ...draft, area: e.target.value })} />
            <input className={inputClass} placeholder="Phone" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
            <input className={inputClass} placeholder="Email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
            <input className={`${inputClass} sm:col-span-2`} placeholder="Website" value={draft.website} onChange={(e) => setDraft({ ...draft, website: e.target.value })} />
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" className="px-5 py-2.5 bg-white text-black font-black uppercase tracking-widest text-[11px] hover:bg-zinc-200 transition-colors">Save</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 border border-white/20 font-black uppercase tracking-widest text-[11px] hover:border-white transition-colors">Cancel</button>
            </div>
          </form>
        )}

        {/* Lead cards */}
        <div className="space-y-3">
          {leads.map((l) => {
            const status = statusOf(l.id);
            return (
              <div key={l.id} className="border border-white/10 p-5 hover:border-white/25 transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  {/* Left: identity + contact */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-1">
                      <h3 className="text-lg font-black uppercase tracking-tight">{l.name}</h3>
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 border border-white/15 px-2 py-0.5">{l.type}</span>
                      {l.verify && <span className="text-[9px] font-black uppercase tracking-[0.2em] text-black bg-white/80 px-2 py-0.5">Verify</span>}
                    </div>
                    <div className="flex items-center gap-1.5 text-white/40 text-xs font-mono mb-3">
                      <MapPinIcon className="w-3.5 h-3.5 shrink-0" /> {l.area}
                    </div>
                    <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
                      {l.phone && (
                        <a href={`tel:${l.phone.replace(/[^0-9+]/g, '')}`} className="flex items-center gap-1.5 text-white/70 hover:text-white font-mono">
                          <PhoneIcon className="w-4 h-4" /> {l.phone}
                        </a>
                      )}
                      {l.email && (
                        <a href={`mailto:${l.email}`} className="flex items-center gap-1.5 text-white/70 hover:text-white font-mono break-all">
                          <EnvelopeIcon className="w-4 h-4 shrink-0" /> {l.email}
                        </a>
                      )}
                      {l.website && (
                        <a href={l.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-white/70 hover:text-white font-mono">
                          <GlobeAltIcon className="w-4 h-4" /> Website
                        </a>
                      )}
                    </div>
                    {l.note && <p className="text-xs text-white/40 font-light mt-3 max-w-2xl">{l.note}</p>}
                  </div>

                  {/* Right: status control */}
                  <div className="flex flex-col gap-2 lg:items-end shrink-0">
                    <div className="flex flex-wrap gap-1.5">
                      {STATUSES.map((s) => (
                        <button
                          key={s}
                          onClick={() => setStatus(l.id, s)}
                          className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 transition-colors ${
                            status === s ? statusStyle[s] : 'bg-transparent text-white/30 border border-white/10 hover:border-white/30'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                    {l.custom && (
                      <button onClick={() => removeLead(l.id)} className="text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-white transition-colors">
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <textarea
                  value={notesOf(l.id)}
                  onChange={(e) => setNotes(l.id, e.target.value)}
                  placeholder="Call notes — who you spoke to, next step, quote sent…"
                  rows={2}
                  className="w-full mt-4 px-3 py-2 bg-white/[0.03] border border-white/10 text-white/80 placeholder-white/20 focus:outline-none focus:border-white/40 transition-colors text-sm font-light resize-none"
                />
              </div>
            );
          })}
        </div>

        {/* Disclaimer */}
        <p className="text-[11px] text-white/30 font-light mt-10 leading-relaxed border-t border-white/10 pt-6">
          <b className="text-white/60">About this list.</b> Seed prospects were researched from public listings
          (July 2026) and are starting points, not verified records — <b className="text-white/60">confirm the company
          name, address, and phone before contacting</b>, especially rows marked "Verify." A strict 3-mile radius of
          78702 is sparse for these trades, so some entries sit wider (a few are out of range and flagged). Many
          "appliance repair" web results are lead-gen dispatch numbers, not real shops — prefer bench-repair shops
          you confirm on Yelp/Maps. Status and notes are saved in <b className="text-white/60">this browser only</b>.
        </p>
      </div>
    </div>
  );
}
