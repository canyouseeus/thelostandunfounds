import { useEffect, useState } from 'react';
import {
  UserGroupIcon,
  EnvelopeIcon,
  PhoneIcon,
  BuildingOffice2Icon,
} from '@heroicons/react/24/outline';
import { supabase } from '../../lib/supabase';
import { LoadingSpinner } from '../Loading';
import { ExpandableScreen, ExpandableScreenContent } from '../ui/expandable-screen';

export interface CrmClient {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  business: string | null;
  notes: string | null;
  created_at: string;
  /** Affiliate who referred this client — the lifetime-attribution fallback. */
  referred_by_code?: string | null;
  invoiceCount: number;
  billed: number;
  collected: number;
  outstanding: number;
  lastInvoiceDate: string | null;
}

export interface CrmTotals {
  clients: number;
  billed: number;
  collected: number;
  outstanding: number;
}

const money = (n: number) =>
  `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const shortDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

/**
 * Loads the client roster and rolls each client's invoices up into
 * billed / collected / outstanding.
 *
 * "Collected" mirrors the revenue-tile logic: prefer real invoice_payments
 * rows, and fall back to the invoice total for legacy 'paid' invoices that
 * predate invoice_payments being populated. Unlike the revenue tiles this is
 * NOT net of contractor payout — a CRM answers "what has this client paid me",
 * not "what did the site keep".
 */
export function useCrmClients() {
  const [clients, setClients] = useState<CrmClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** Patch one client in place after a successful save — avoids a full refetch. */
  const applyClientUpdate = (id: string, patch: Partial<CrmClient>) =>
    setClients(prev => prev.map(c => (c.id === id ? { ...c, ...patch } : c)));

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [clientsRes, invoicesRes, paymentsRes] = await Promise.all([
          supabase.from('clients').select('id, name, email, phone, business, notes, created_at, referred_by_code'),
          supabase.from('invoices').select('id, client_id, total, status, date, paid_at'),
          supabase.from('invoice_payments').select('invoice_id, amount'),
        ]);

        if (clientsRes.error) throw clientsRes.error;

        const paidByInvoice = new Map<string, number>();
        for (const p of paymentsRes.data || []) {
          paidByInvoice.set(p.invoice_id, (paidByInvoice.get(p.invoice_id) || 0) + Number(p.amount || 0));
        }

        // Only issued invoices count toward what a client has been billed.
        // A draft was never sent, and void/cancelled were withdrawn — counting
        // either overstates billed and leaves phantom money outstanding. A test
        // invoice raised in error showed as $301.50 owed until this.
        const COUNTS_AS_BILLED = new Set(['sent', 'paid', 'overdue']);

        const byClient = new Map<string, { count: number; billed: number; collected: number; last: string | null }>();
        for (const inv of invoicesRes.data || []) {
          if (!inv.client_id) continue;
          if (!COUNTS_AS_BILLED.has(String(inv.status || ''))) continue;
          const agg = byClient.get(inv.client_id) || { count: 0, billed: 0, collected: 0, last: null };
          const total = Number(inv.total || 0);
          const recorded = paidByInvoice.get(inv.id);
          const collected = recorded != null ? recorded : inv.status === 'paid' ? total : 0;

          agg.count += 1;
          agg.billed += total;
          agg.collected += collected;

          const stamp = inv.paid_at || inv.date;
          if (stamp && (!agg.last || new Date(stamp) > new Date(agg.last))) agg.last = stamp;

          byClient.set(inv.client_id, agg);
        }

        const rows: CrmClient[] = (clientsRes.data || []).map((c) => {
          const agg = byClient.get(c.id) || { count: 0, billed: 0, collected: 0, last: null };
          return {
            ...c,
            invoiceCount: agg.count,
            billed: agg.billed,
            collected: agg.collected,
            outstanding: Math.max(0, agg.billed - agg.collected),
            lastInvoiceDate: agg.last,
          };
        });

        // Most valuable clients first; never-invoiced clients sink to the bottom.
        rows.sort((a, b) => b.billed - a.billed || a.name.localeCompare(b.name));

        if (!cancelled) setClients(rows);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Failed to load clients');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const totals: CrmTotals = clients.reduce(
    (acc, c) => ({
      clients: acc.clients + 1,
      billed: acc.billed + c.billed,
      collected: acc.collected + c.collected,
      outstanding: acc.outstanding + c.outstanding,
    }),
    { clients: 0, billed: 0, collected: 0, outstanding: 0 },
  );

  return { clients, totals, loading, error, applyClientUpdate };
}

const EDITABLE_FIELDS = [
  { key: 'name' as const, label: 'Name', type: 'text' },
  { key: 'business' as const, label: 'Business', type: 'text' },
  { key: 'email' as const, label: 'Email', type: 'email' },
  { key: 'phone' as const, label: 'Phone', type: 'tel' },
];

function ClientEditor({
  client,
  onSaved,
  onClose,
}: {
  client: CrmClient;
  onSaved: (patch: Partial<CrmClient>) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState({
    name: client.name || '',
    business: client.business || '',
    email: client.email || '',
    phone: client.phone || '',
    notes: client.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const dirty =
    draft.name !== (client.name || '') ||
    draft.business !== (client.business || '') ||
    draft.email !== (client.email || '') ||
    draft.phone !== (client.phone || '') ||
    draft.notes !== (client.notes || '');

  const save = async () => {
    if (!draft.name.trim()) {
      setErr('Name is required');
      return;
    }
    setSaving(true);
    setErr(null);

    // Blank inputs are stored as NULL, not '' — keeps "missing" a single state.
    const patch = {
      name: draft.name.trim(),
      business: draft.business.trim() || null,
      email: draft.email.trim() || null,
      phone: draft.phone.trim() || null,
      notes: draft.notes.trim() || null,
    };

    const { error } = await supabase.from('clients').update(patch).eq('id', client.id);
    setSaving(false);

    if (error) {
      setErr(error.message);
      return;
    }
    onSaved(patch);
    setSavedAt(Date.now());
  };

  return (
    <div className="max-w-2xl mx-auto w-full px-4 sm:px-8 pt-20 pb-16">
      <div className="flex items-center gap-3 mb-1">
        <UserGroupIcon className="w-5 h-5 text-white/40" />
        <h2 className="text-xl font-black uppercase tracking-wide text-white truncate">{client.name}</h2>
      </div>
      <p className="text-white/50 text-sm normal-case mb-8">
        {client.invoiceCount > 0
          ? `${client.invoiceCount} ${client.invoiceCount === 1 ? 'invoice' : 'invoices'} · ${money(client.billed)} billed · last ${shortDate(client.lastInvoiceDate)}`
          : 'No invoices yet'}
      </p>

      <div className="space-y-4">
        {EDITABLE_FIELDS.map(({ key, label, type }) => (
          <label key={key} className="block">
            <span className="block text-[9px] text-white/40 uppercase tracking-widest mb-1.5">{label}</span>
            <input
              type={type}
              value={draft[key]}
              onChange={(e) => setDraft(d => ({ ...d, [key]: e.target.value }))}
              className="w-full bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:bg-white/10 transition-colors"
              placeholder={`No ${label.toLowerCase()} on record`}
            />
          </label>
        ))}

        <label className="block">
          <span className="block text-[9px] text-white/40 uppercase tracking-widest mb-1.5">Notes</span>
          <textarea
            value={draft.notes}
            onChange={(e) => setDraft(d => ({ ...d, notes: e.target.value }))}
            rows={5}
            className="w-full bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:bg-white/10 transition-colors resize-y"
            placeholder="Anything worth remembering about this client…"
          />
        </label>

        {/*
          Read-only on purpose. Attribution is first-touch and permanent — it is
          recorded when the client books through an affiliate link, and an admin
          editing a phone number must not be able to move a customer from one
          affiliate to another by accident.
        */}
        <div className="block">
          <span className="block text-[9px] text-white/40 uppercase tracking-widest mb-1.5">Referred By</span>
          <div className="w-full bg-white/5 px-3 py-2.5 text-sm">
            {client.referred_by_code ? (
              <span className="text-white font-bold tracking-widest">{client.referred_by_code}</span>
            ) : (
              <span className="text-white/30 normal-case">No affiliate referral on record</span>
            )}
          </div>
        </div>
      </div>

      {err && (
        <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-red-400">{err}</p>
      )}

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving || !dirty}
          className="px-5 py-2.5 text-[10px] font-black uppercase tracking-widest bg-white text-black hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
        <button
          onClick={onClose}
          className="px-5 py-2.5 text-[10px] font-black uppercase tracking-widest bg-white/5 text-white hover:bg-white/10 transition-colors"
        >
          Close
        </button>
        {savedAt && !dirty && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-green-400">Saved</span>
        )}
      </div>
    </div>
  );
}

export function CrmDirectory() {
  const { clients, totals, loading, error, applyClientUpdate } = useCrmClients();
  const [editing, setEditing] = useState<CrmClient | null>(null);

  if (loading) {
    return (
      <div className="py-16 flex justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-16 text-center text-red-400 text-xs uppercase font-bold tracking-widest">{error}</div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="py-16 text-center text-white/40 text-xs uppercase font-bold tracking-widest">
        No clients yet
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white/5 p-4">
          <div className="text-[9px] text-white/40 uppercase tracking-widest mb-1">Clients</div>
          <div className="text-2xl font-black font-mono text-white">{totals.clients}</div>
        </div>
        <div className="bg-white/5 p-4">
          <div className="text-[9px] text-white/40 uppercase tracking-widest mb-1">Billed</div>
          <div className="text-2xl font-black font-mono text-white">{money(totals.billed)}</div>
        </div>
        <div className="bg-white/5 p-4">
          <div className="text-[9px] text-white/40 uppercase tracking-widest mb-1">Collected</div>
          <div className="text-2xl font-black font-mono text-green-400">{money(totals.collected)}</div>
        </div>
        <div className="bg-white/5 p-4">
          <div className="text-[9px] text-white/40 uppercase tracking-widest mb-1">Outstanding</div>
          <div
            className={`text-2xl font-black font-mono ${totals.outstanding > 0 ? 'text-amber-400' : 'text-white/40'}`}
          >
            {money(totals.outstanding)}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {clients.map((c) => (
          <div
            key={c.id}
            role="button"
            tabIndex={0}
            onClick={() => setEditing(c)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setEditing(c); } }}
            className="bg-white/5 p-4 cursor-pointer hover:bg-white/[0.08] transition-colors"
          >
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black uppercase tracking-wide text-white truncate">{c.name}</span>
                  {c.invoiceCount > 0 && (
                    <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest shrink-0">
                      {c.invoiceCount} {c.invoiceCount === 1 ? 'invoice' : 'invoices'}
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex flex-col gap-1 text-[11px] text-white/50">
                  {c.business && (
                    <span className="flex items-center gap-1.5 truncate">
                      <BuildingOffice2Icon className="w-3 h-3 text-white/30 shrink-0" />
                      {c.business}
                    </span>
                  )}
                  {c.email && (
                    <a
                      href={`mailto:${c.email}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1.5 truncate hover:text-white transition-colors"
                    >
                      <EnvelopeIcon className="w-3 h-3 text-white/30 shrink-0" />
                      {c.email}
                    </a>
                  )}
                  {c.phone && (
                    <a
                      href={`tel:${c.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1.5 truncate hover:text-white transition-colors"
                    >
                      <PhoneIcon className="w-3 h-3 text-white/30 shrink-0" />
                      {c.phone}
                    </a>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-lg font-black font-mono text-white">{money(c.billed)}</div>
                <div className="text-[9px] uppercase tracking-widest text-white/30">billed</div>
                {c.outstanding > 0 && (
                  <div className="mt-1 text-[10px] font-bold font-mono text-amber-400">
                    {money(c.outstanding)} due
                  </div>
                )}
                <div className="mt-1 text-[9px] uppercase tracking-widest text-white/30">
                  last {shortDate(c.lastInvoiceDate)}
                </div>
              </div>
            </div>

            {c.notes && <p className="mt-3 text-[11px] text-white/40 normal-case">{c.notes}</p>}
          </div>
        ))}
      </div>

      {/* Editor — full-screen card, same pattern as the rest of the dashboard */}
      <ExpandableScreen isOpen={!!editing} onOpenChange={(open) => { if (!open) setEditing(null); }}>
        <ExpandableScreenContent className="overflow-x-hidden">
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            {editing && (
              <ClientEditor
                key={editing.id}
                client={editing}
                onSaved={(patch) => {
                  applyClientUpdate(editing.id, patch);
                  setEditing(e => (e ? { ...e, ...patch } : e));
                }}
                onClose={() => setEditing(null)}
              />
            )}
          </div>
        </ExpandableScreenContent>
      </ExpandableScreen>
    </div>
  );
}

export function CrmDirectoryScreen() {
  return (
    <div className="max-w-4xl mx-auto w-full px-4 sm:px-8 pt-20 pb-16">
      <div className="flex items-center gap-3 mb-1">
        <UserGroupIcon className="w-5 h-5 text-white/40" />
        <h2 className="text-xl font-black uppercase tracking-wide text-white">CRM</h2>
      </div>
      <p className="text-white/50 text-sm normal-case mb-8">Client directory and billing history</p>
      <CrmDirectory />
    </div>
  );
}
