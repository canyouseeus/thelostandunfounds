import { useState } from 'react';
import { PlusCircleIcon, TrashIcon } from '@heroicons/react/24/outline';
import { supabase } from '../../lib/supabase';

interface ClientOption {
  id: string;
  name: string;
  business: string | null;
}

interface DraftLineItem {
  description: string;
  quantity: string;
  unit_price: string;
}

const money = (n: number) => `$${n.toFixed(2)}`;
const todayISO = () => new Date().toISOString().slice(0, 10);

/**
 * Creates an invoice, and optionally records the payment in the same write.
 *
 * Recording payment at creation matters: the revenue tiles prefer real
 * invoice_payments rows and only fall back to the invoice total for legacy
 * 'paid' invoices. Invoices created without a payment row rely on that
 * fallback, which is how the ledger drifted from reality before.
 */
export function NewInvoiceForm({
  clients,
  onCreated,
  onCancel,
}: {
  clients: ClientOption[];
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [clientId, setClientId] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [date, setDate] = useState(todayISO());
  const [eventDate, setEventDate] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<DraftLineItem[]>([
    { description: '', quantity: '1', unit_price: '' },
  ]);
  const [contractorName, setContractorName] = useState('');
  const [contractorPayout, setContractorPayout] = useState('');
  const [recordPayment, setRecordPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const creatingNewClient = clientId === '__new__';

  const lineTotal = (li: DraftLineItem) =>
    (parseFloat(li.quantity) || 0) * (parseFloat(li.unit_price) || 0);
  const total = items.reduce((sum, li) => sum + lineTotal(li), 0);

  /**
   * Money already collected on this job. A partial payment is the normal case
   * (deposit taken, balance to follow), so this is an amount rather than a
   * paid/unpaid flag. Clamped to the total: an invoice can't be overpaid here.
   */
  const paidNow = recordPayment ? Math.min(Math.max(parseFloat(paymentAmount) || 0, 0), total) : 0;
  const balance = total - paidNow;
  const paidInFull = recordPayment && paidNow > 0 && balance < 0.005;

  const setItem = (i: number, patch: Partial<DraftLineItem>) =>
    setItems(prev => prev.map((li, idx) => (idx === i ? { ...li, ...patch } : li)));

  /** Next sequential number, e.g. INV-006. Padded to match existing format. */
  const nextInvoiceNumber = async () => {
    const { data } = await supabase
      .from('invoices')
      .select('invoice_number')
      .order('invoice_number', { ascending: false })
      .limit(1);
    const last = data?.[0]?.invoice_number as string | undefined;
    const n = last ? parseInt(last.replace(/\D/g, ''), 10) : 0;
    return `INV-${String((Number.isNaN(n) ? 0 : n) + 1).padStart(3, '0')}`;
  };

  const submit = async () => {
    setErr(null);

    if (!creatingNewClient && !clientId) return setErr('Pick a client');
    if (creatingNewClient && !newClientName.trim()) return setErr('New client needs a name');

    const validItems = items.filter(li => li.description.trim() && lineTotal(li) > 0);
    if (validItems.length === 0)
      return setErr('Each line item needs a description, a quantity and a price');

    const payout = parseFloat(contractorPayout) || 0;
    if (payout > total) return setErr('Contractor payout cannot exceed the invoice total');

    setSaving(true);
    try {
      let resolvedClientId = clientId;

      if (creatingNewClient) {
        const { data: created, error: clientErr } = await supabase
          .from('clients')
          .insert({
            name: newClientName.trim(),
            email: newClientEmail.trim() || null,
          })
          .select('id')
          .single();
        if (clientErr) throw clientErr;
        resolvedClientId = created.id;
      }

      const invoiceNumber = await nextInvoiceNumber();
      const line_items = validItems.map(li => ({
        description: li.description.trim(),
        quantity: parseFloat(li.quantity) || 1,
        unit_price: parseFloat(li.unit_price) || 0,
        amount: lineTotal(li),
      }));

      const { data: invoice, error: invErr } = await supabase
        .from('invoices')
        .insert({
          client_id: resolvedClientId,
          invoice_number: invoiceNumber,
          date,
          event_date: eventDate || null,
          description: description.trim() || null,
          line_items,
          subtotal: total,
          total,
          amount_due: balance,
          // A part-paid job is still owed money, so it stays a draft/invoice,
          // only a fully settled one is 'paid'. See client-documents:
          // "Flip to `paid` only when the full balance is in".
          status: paidInFull ? 'paid' : 'draft',
          payment_method: paidNow > 0 ? paymentMethod.trim() || null : null,
          paid_at: paidInFull ? new Date().toISOString() : null,
          invoice_type: 'standard',
          contractor_name: contractorName.trim() || null,
          contractor_payout: payout,
        })
        .select('id')
        .single();
      if (invErr) throw invErr;

      if (paidNow > 0) {
        const { error: payErr } = await supabase.from('invoice_payments').insert({
          invoice_id: invoice.id,
          amount: paidNow,
          method: paymentMethod.trim() || null,
          paid_at: new Date().toISOString(),
          notes: paidInFull
            ? 'Recorded at invoice creation.'
            : 'Partial payment recorded at invoice creation.',
        });
        if (payErr) throw payErr;
      }

      onCreated();
    } catch (e: any) {
      setErr(e?.message || 'Could not create invoice');
    } finally {
      setSaving(false);
    }
  };

  const field = 'w-full bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:bg-white/10 transition-colors';
  const label = 'block text-[9px] text-white/40 uppercase tracking-widest mb-1.5';

  return (
    <div className="max-w-2xl mx-auto w-full px-4 sm:px-8 pt-20 pb-16">
      <h2 className="text-xl font-black uppercase tracking-wide text-white mb-1">New Invoice</h2>
      <p className="text-white/50 text-sm normal-case mb-8">
        Number is assigned automatically on save
      </p>

      <div className="space-y-5">
        <div>
          <span className={label}>Client</span>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className={field}
          >
            <option value="">Select a client…</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>
                {c.business && c.business !== c.name ? `${c.name}: ${c.business}` : c.name}
              </option>
            ))}
            <option value="__new__">+ New client…</option>
          </select>
        </div>

        {creatingNewClient && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white/[0.02] p-4">
            <label className="block">
              <span className={label}>New client name</span>
              <input value={newClientName} onChange={(e) => setNewClientName(e.target.value)} className={field} />
            </label>
            <label className="block">
              <span className={label}>Email</span>
              <input type="email" value={newClientEmail} onChange={(e) => setNewClientEmail(e.target.value)} className={field} />
            </label>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className={label}>Invoice date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
          </label>
          <label className="block">
            <span className={label}>Event date (optional)</span>
            <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className={field} />
          </label>
        </div>

        <label className="block">
          <span className={label}>Description</span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={field}
            placeholder="e.g. Headshot session: Andrew Lowe"
          />
        </label>

        <div>
          <span className={label}>Line items</span>
          <div className="space-y-3">
            {items.map((li, i) => (
              <div key={i} className="bg-white/[0.02] p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[9px] text-white/30 uppercase tracking-widest">
                    Item {i + 1}
                  </span>
                  <button
                    onClick={() => setItems(prev => prev.filter((_, idx) => idx !== i))}
                    disabled={items.length === 1}
                    className="p-1 text-white/30 hover:text-red-400 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    title="Remove line"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>

                <label className="block">
                  <span className={label}>Description</span>
                  <input
                    value={li.description}
                    onChange={(e) => setItem(i, { description: e.target.value })}
                    className={field}
                    placeholder="e.g. Wall painting (back wall)"
                  />
                </label>

                <div className="grid grid-cols-[5rem_1fr_auto] gap-2 items-end">
                  <label className="block min-w-0">
                    <span className={label}>Qty</span>
                    <input
                      type="number"
                      min="0"
                      inputMode="decimal"
                      value={li.quantity}
                      onChange={(e) => setItem(i, { quantity: e.target.value })}
                      className={`${field} text-center`}
                    />
                  </label>
                  <label className="block min-w-0">
                    <span className={label}>Price</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={li.unit_price}
                      onChange={(e) => setItem(i, { unit_price: e.target.value })}
                      className={field}
                      placeholder="0.00"
                    />
                  </label>
                  <div className="pb-2.5 text-right">
                    <span className="text-sm font-mono text-white/70">{money(lineTotal(li))}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => setItems(prev => [...prev, { description: '', quantity: '1', unit_price: '' }])}
            className="mt-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/50 hover:text-white transition-colors"
          >
            <PlusCircleIcon className="w-3.5 h-3.5" />
            Add line
          </button>
        </div>

        <div className="flex justify-between items-baseline pt-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Total</span>
          <span className="text-2xl font-black font-mono text-green-400">{money(total)}</span>
        </div>

        <div className="grid grid-cols-2 gap-4 bg-white/[0.02] p-4">
          <label className="block">
            <span className={label}>Contractor (optional)</span>
            <input value={contractorName} onChange={(e) => setContractorName(e.target.value)} className={field} placeholder="Name" />
          </label>
          <label className="block">
            <span className={label}>Contractor payout</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={contractorPayout}
              onChange={(e) => setContractorPayout(e.target.value)}
              className={field}
              placeholder="0.00"
            />
          </label>
          {parseFloat(contractorPayout) > 0 && (
            <p className="col-span-2 text-[10px] text-white/40 uppercase tracking-widest">
              Site keeps {money(Math.max(0, total - (parseFloat(contractorPayout) || 0)))}
            </p>
          )}
        </div>

        <div className="bg-white/[0.02] p-4 space-y-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={recordPayment}
              onChange={(e) => setRecordPayment(e.target.checked)}
              className="accent-white"
            />
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">
              Some or all of this is already paid; record the payment now
            </span>
          </label>
          {recordPayment && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className={label}>Amount received</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className={field}
                    placeholder="0.00"
                  />
                </label>
                <label className="block">
                  <span className={label}>Payment method</span>
                  <input
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className={field}
                    placeholder="Venmo, Stripe, Cash…"
                  />
                </label>
              </div>
              <button
                onClick={() => setPaymentAmount(total.toFixed(2))}
                className="text-[10px] font-bold uppercase tracking-widest text-white/50 hover:text-white transition-colors"
              >
                Paid in full ({money(total)})
              </button>
              <p className="text-[10px] uppercase tracking-widest text-white/40">
                {paidInFull
                  ? 'Settled in full: invoice will be marked paid'
                  : `Balance remaining ${money(balance)}`}
              </p>
            </div>
          )}
        </div>
      </div>

      {err && <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-red-400">{err}</p>}

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={submit}
          disabled={saving || total <= 0}
          className="px-5 py-2.5 text-[10px] font-black uppercase tracking-widest bg-white text-black hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Creating…' : 'Create Invoice'}
        </button>
        <button
          onClick={onCancel}
          className="px-5 py-2.5 text-[10px] font-black uppercase tracking-widest bg-white/5 text-white hover:bg-white/10 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
