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

type Lead = {
  id: string;
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

// Researched from public listings, July 2026. Contact details flagged
// `verify` need confirming before outreach — do not treat as authoritative.
const SEED: Lead[] = [
  {
    id: 'precise-machining',
    name: 'Precise Machining Company',
    type: 'CNC Machining',
    phone: '512-528-8771',
    email: 'info@precisemachiningco.com',
    website: 'https://www.precisemachiningco.com',
    area: 'Central TX — verify distance',
    note: 'Overflow jigs/fixtures + one-off prototype parts. Lead with saved machinist hours.',
  },
  {
    id: 'austin-precision-mm',
    name: 'Austin Precision Machining & Mfg',
    type: 'CNC for OEMs',
    website: 'https://austinprecisionmachining.com',
    area: 'Austin — verify address',
    verify: true,
    note: 'OEM shop — pitch printed fixtures/soft-jaws and rapid prototypes between runs.',
  },
  {
    id: 'jj-machine',
    name: 'J&J Machine',
    type: 'CNC Machine Shop',
    website: 'https://jjmachine99.com',
    area: 'Austin — verify address',
    verify: true,
    note: 'General machine shop. Offer same-week custom jigs, no minimum order.',
  },
  {
    id: 'forge-metal-works',
    name: 'Forge Metal Works',
    type: 'Welding / Metal Fab',
    website: 'https://www.forgemw.com',
    area: 'Austin — verify address',
    verify: true,
    note: 'Fab shop — printed weld fixtures, alignment jigs, and pattern/templates.',
  },
  {
    id: 'twisted-metals',
    name: 'Twisted Metals Welding & Fabrication',
    type: 'Welding / Metal Fab',
    website: 'https://twistedmetalswelding.com',
    area: 'Austin — verify address',
    verify: true,
    note: 'Custom fab — printed jigs/templates and one-off plastic parts they can’t weld.',
  },
  {
    id: 'techni-center-weld',
    name: 'Welding / Fab Shop (Techni Center Dr)',
    type: 'Welding / Metal Fab',
    phone: '(512) 358-6330',
    area: '5800 Techni Center Dr, 78721 — ~4 mi',
    verify: true,
    note: 'Close to you (78721). Verify business name on call. Fixtures + templates.',
  },
  {
    id: 'fathom-austin',
    name: 'Fathom Manufacturing (Austin)',
    type: 'Digital Mfg / 3D Print',
    website: 'https://fathommfg.com/locations/austin-tx',
    area: 'Austin',
    note: 'NOT a cold client — large competitor. Approach as overflow/subcontract partner for small resin/FDM jobs.',
  },
];

const MAPS_SEARCH =
  'https://www.google.com/maps/search/machine+shop+OR+fabrication/@30.2617,-97.7141,13z';

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
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({ name: '', type: '', phone: '', email: '', website: '', area: '' });

  useEffect(() => {
    try { localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides)); } catch { /* ignore */ }
  }, [overrides]);
  useEffect(() => {
    try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(custom)); } catch { /* ignore */ }
  }, [custom]);

  const leads = useMemo(() => [...SEED, ...custom], [custom]);

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
        name: draft.name.trim(),
        type: draft.type.trim() || 'Prospect',
        phone: draft.phone.trim() || undefined,
        email: draft.email.trim() || undefined,
        website: draft.website.trim() || undefined,
        area: draft.area.trim() || '—',
        custom: true,
      },
    ]);
    setDraft({ name: '', type: '', phone: '', email: '', website: '', area: '' });
    setShowForm(false);
  };

  const removeLead = (id: string) => {
    setCustom((c) => c.filter((l) => l.id !== id));
    setOverrides((o) => { const n = { ...o }; delete n[id]; return n; });
  };

  const inputClass =
    'w-full px-3 py-2 bg-black border border-white/20 text-white placeholder-white/25 focus:outline-none focus:border-white transition-colors text-sm font-mono';

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <Helmet>
        <title>THE LOST+UNFOUNDS | Sales Pipeline</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="max-w-6xl mx-auto px-6 md:px-8 py-14 md:py-20">
        {/* Header */}
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/30 mb-4">
          Fabrication · Sales Pipeline
        </p>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-4">
          <h1 className="text-[clamp(2rem,6vw,3.5rem)] font-black uppercase tracking-tighter leading-none">
            Machine Shops
          </h1>
          <p className="font-mono text-xs text-white/40">Downtown Austin · 78702 · ~3–5 mi</p>
        </div>

        {/* Pitch reminder */}
        <div className="border border-white/10 p-5 mb-8">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 mb-2">The Pitch</p>
          <p className="text-sm text-white/70 font-light leading-relaxed">
            "I make custom <b className="text-white font-normal">jigs, fixtures, and tooling</b> in-house —
            nylon and carbon-fiber, <b className="text-white font-normal">no minimum order</b>, usually within
            a few days. When you need a one-off and don't want to tie up a machinist, call me."
            Walk in with a printed sample. Lead with <b className="text-white font-normal">saved labor hours</b>,
            not the printer.
          </p>
        </div>

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
            onClick={() => setShowForm((s) => !s)}
            className="px-5 py-3 bg-white text-black font-black uppercase tracking-widest text-[11px] hover:bg-zinc-200 transition-colors flex items-center gap-2"
          >
            <PlusIcon className="w-4 h-4" /> Add Prospect
          </button>
          <a
            href={MAPS_SEARCH}
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
            <input className={inputClass} placeholder="Type (e.g. CNC shop)" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })} />
            <input className={inputClass} placeholder="Phone" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
            <input className={inputClass} placeholder="Email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
            <input className={inputClass} placeholder="Website" value={draft.website} onChange={(e) => setDraft({ ...draft, website: e.target.value })} />
            <input className={inputClass} placeholder="Area / address" value={draft.area} onChange={(e) => setDraft({ ...draft, area: e.target.value })} />
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
          <b className="text-white/60">About this list.</b> Seed prospects were researched from public
          listings (July 2026) and are starting points, not verified records — <b className="text-white/60">confirm
          the company name, address, and phone before contacting</b>, especially rows marked "Verify." A strict
          3-mile radius of 78702 has few general machine shops, so some entries are slightly wider; use
          "Find More on Maps" to expand. Status and notes are saved in <b className="text-white/60">this browser
          only</b> — they won't sync across devices.
        </p>
      </div>
    </div>
  );
}
