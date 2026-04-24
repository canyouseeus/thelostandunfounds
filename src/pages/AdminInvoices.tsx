import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  UserIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PlusCircleIcon,
} from '@heroicons/react/24/outline';
import { supabase } from '../lib/supabase';
import { cn } from '../components/ui/utils';

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  business: string | null;
  notes: string | null;
  created_at: string;
}

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

interface Invoice {
  id: string;
  client_id: string | null;
  invoice_number: string;
  date: string;
  event_date: string | null;
  description: string | null;
  line_items: LineItem[];
  subtotal: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  payment_method: string | null;
  paid_at: string | null;
  created_at: string;
  clients?: Client | null;
}

interface InvoicePayment {
  id: string;
  invoice_id: string;
  amount: number;
  method: string | null;
  paid_at: string;
  notes: string | null;
}

const STATUS_CONFIG = {
  paid:    { label: 'PAID',    color: 'text-green-400',  bg: 'bg-green-400/10',  Icon: CheckCircleIcon },
  sent:    { label: 'SENT',    color: 'text-blue-400',   bg: 'bg-blue-400/10',   Icon: ClockIcon },
  draft:   { label: 'DRAFT',   color: 'text-white/40',   bg: 'bg-white/5',       Icon: DocumentTextIcon },
  overdue: { label: 'OVERDUE', color: 'text-red-400',    bg: 'bg-red-400/10',    Icon: ExclamationTriangleIcon },
};

function StatusBadge({ status }: { status: Invoice['status'] }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest', cfg.color, cfg.bg)}>
      <cfg.Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function fmt(date: string) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtUSD(n: number) {
  return `$${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

export default function AdminInvoices() {
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Record<string, InvoicePayment[]>>({});
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [clientsRes, invoicesRes] = await Promise.all([
        supabase.from('clients').select('*').order('created_at', { ascending: false }),
        supabase.from('invoices').select('*, clients(*)').order('date', { ascending: false }),
      ]);

      const clientList: Client[] = clientsRes.data || [];
      const invoiceList: Invoice[] = (invoicesRes.data || []).map((inv: any) => ({
        ...inv,
        line_items: Array.isArray(inv.line_items) ? inv.line_items : [],
        subtotal: Number(inv.subtotal || 0),
        total: Number(inv.total || 0),
      }));

      setClients(clientList);
      setInvoices(invoiceList);

      // Fetch payments for all invoices
      if (invoiceList.length > 0) {
        const ids = invoiceList.map(i => i.id);
        const { data: payData } = await supabase
          .from('invoice_payments')
          .select('*')
          .in('invoice_id', ids)
          .order('paid_at', { ascending: true });

        const byInvoice: Record<string, InvoicePayment[]> = {};
        for (const p of payData || []) {
          if (!byInvoice[p.invoice_id]) byInvoice[p.invoice_id] = [];
          byInvoice[p.invoice_id].push(p);
        }
        setPayments(byInvoice);
      }
    } finally {
      setLoading(false);
    }
  }

  const paidInvoices  = invoices.filter(i => i.status === 'paid');
  const totalRevenue  = paidInvoices.reduce((s, i) => s + i.total, 0);
  const pending       = invoices.filter(i => i.status === 'sent' || i.status === 'overdue');
  const pendingTotal  = pending.reduce((s, i) => s + i.total, 0);

  function toggleClient(id: string) {
    setExpandedClients(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const clientInvoices = (clientId: string) => invoices.filter(i => i.client_id === clientId);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/admin" className="text-white/40 hover:text-white transition-colors">
            <ArrowLeftIcon className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-sm font-bold uppercase tracking-[0.2em]">Invoices & CRM</h1>
            <p className="text-[10px] text-white/30 uppercase tracking-widest">THE LOST+UNFOUNDS</p>
          </div>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 bg-white text-black text-[10px] font-bold uppercase tracking-widest hover:bg-white/90 transition-colors"
          onClick={() => alert('Invoice creation coming soon.')}
        >
          <PlusCircleIcon className="w-4 h-4" />
          New Invoice
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 space-y-10">

        {/* ── Revenue Summary ────────────────────────────────────────────── */}
        <section>
          <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] mb-4">Revenue Summary</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/5">
            {[
              { label: 'Total Collected',  value: fmtUSD(totalRevenue),   sub: `${paidInvoices.length} paid` },
              { label: 'Pending',          value: fmtUSD(pendingTotal),   sub: `${pending.length} outstanding` },
              { label: 'Total Invoices',   value: invoices.length,        sub: 'all time' },
              { label: 'Clients',          value: clients.length,         sub: 'on record' },
            ].map(({ label, value, sub }) => (
              <div key={label} className="bg-black px-6 py-5">
                <p className="text-[9px] text-white/30 uppercase tracking-widest mb-1">{label}</p>
                <p className="text-2xl font-black font-mono text-white">{value}</p>
                <p className="text-[9px] text-white/20 mt-1">{sub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Invoice List ───────────────────────────────────────────────── */}
        <section>
          <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] mb-4">All Invoices</p>
          {loading ? (
            <div className="py-16 text-center text-white/20 text-xs uppercase tracking-widest">Loading…</div>
          ) : invoices.length === 0 ? (
            <div className="py-16 text-center text-white/20 text-xs uppercase tracking-widest">No invoices yet.</div>
          ) : (
            <div className="divide-y divide-white/5">
              {invoices.map(inv => (
                <div
                  key={inv.id}
                  className={cn(
                    'flex items-center justify-between px-4 py-4 cursor-pointer hover:bg-white/[0.02] transition-colors',
                    selectedInvoice?.id === inv.id && 'bg-white/[0.04]'
                  )}
                  onClick={() => setSelectedInvoice(selectedInvoice?.id === inv.id ? null : inv)}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <DocumentTextIcon className="w-5 h-5 text-white/20 shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-sm font-bold font-mono">{inv.invoice_number}</span>
                        <StatusBadge status={inv.status} />
                      </div>
                      <p className="text-[10px] text-white/40 mt-0.5 truncate">
                        {(inv.clients as any)?.name || 'Unknown Client'} &nbsp;·&nbsp; {fmt(inv.date)}
                        {inv.event_date && <> &nbsp;·&nbsp; Event: {fmt(inv.event_date)}</>}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-lg font-black font-mono text-white">{fmtUSD(inv.total)}</p>
                    <p className="text-[9px] text-white/20 uppercase tracking-wider">
                      {inv.payment_method || '—'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Invoice Detail ─────────────────────────────────────────────── */}
        {selectedInvoice && (
          <section className="bg-white/[0.02] p-6 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-black font-mono tracking-tighter">
                  {selectedInvoice.invoice_number}
                </h2>
                <p className="text-[10px] text-white/30 mt-1 uppercase tracking-widest">
                  {selectedInvoice.description}
                </p>
              </div>
              <StatusBadge status={selectedInvoice.status} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[11px]">
              {[
                { label: 'Invoice Date', value: fmt(selectedInvoice.date) },
                { label: 'Event Date',   value: selectedInvoice.event_date ? fmt(selectedInvoice.event_date) : '—' },
                { label: 'Client',       value: (selectedInvoice.clients as any)?.name || '—' },
                { label: 'Paid On',      value: selectedInvoice.paid_at ? fmt(selectedInvoice.paid_at) : '—' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[9px] text-white/20 uppercase tracking-widest mb-0.5">{label}</p>
                  <p className="text-white/80">{value}</p>
                </div>
              ))}
            </div>

            {/* Line Items */}
            <div>
              <p className="text-[9px] text-white/20 uppercase tracking-widest mb-2">Line Items</p>
              <div className="divide-y divide-white/5">
                {selectedInvoice.line_items.map((item, i) => (
                  <div key={i} className="flex justify-between py-3 text-sm">
                    <span className="text-white/70">{item.description}</span>
                    <span className="font-mono font-bold text-white">{fmtUSD(item.amount)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between pt-4 mt-2 border-t border-white/10">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Total</span>
                <span className="text-xl font-black font-mono text-green-400">{fmtUSD(selectedInvoice.total)}</span>
              </div>
            </div>

            {/* Payments */}
            {payments[selectedInvoice.id]?.length > 0 && (
              <div>
                <p className="text-[9px] text-white/20 uppercase tracking-widest mb-2">Payments Received</p>
                <div className="divide-y divide-white/5">
                  {payments[selectedInvoice.id].map(p => (
                    <div key={p.id} className="flex justify-between py-3 text-sm">
                      <div>
                        <p className="text-white/70">{p.method || 'Payment'}</p>
                        <p className="text-[9px] text-white/30">{fmt(p.paid_at)}{p.notes && ` · ${p.notes}`}</p>
                      </div>
                      <span className="font-mono font-bold text-green-400">{fmtUSD(p.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment methods note */}
            {selectedInvoice.payment_method && (
              <p className="text-[10px] text-white/30 uppercase tracking-widest">
                Accepted: {selectedInvoice.payment_method}
              </p>
            )}
          </section>
        )}

        {/* ── Clients ───────────────────────────────────────────────────── */}
        <section>
          <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] mb-4">Clients</p>
          {loading ? (
            <div className="py-8 text-center text-white/20 text-xs uppercase tracking-widest">Loading…</div>
          ) : clients.length === 0 ? (
            <div className="py-8 text-center text-white/20 text-xs uppercase tracking-widest">No clients yet.</div>
          ) : (
            <div className="divide-y divide-white/5">
              {clients.map(client => {
                const cInvoices = clientInvoices(client.id);
                const isExpanded = expandedClients.has(client.id);
                const clientTotal = cInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0);
                return (
                  <div key={client.id}>
                    <div
                      className="flex items-center justify-between px-4 py-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                      onClick={() => toggleClient(client.id)}
                    >
                      <div className="flex items-center gap-4">
                        {isExpanded
                          ? <ChevronDownIcon className="w-4 h-4 text-white/30" />
                          : <ChevronRightIcon className="w-4 h-4 text-white/30" />}
                        <div>
                          <p className="text-sm font-bold">{client.name}</p>
                          <p className="text-[10px] text-white/30 mt-0.5">
                            {client.business && <>{client.business} &nbsp;·&nbsp;</>}
                            {cInvoices.length} invoice{cInvoices.length !== 1 && 's'}
                            {client.email && <> &nbsp;·&nbsp; {client.email}</>}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-white">{fmtUSD(clientTotal)}</p>
                        <p className="text-[9px] text-white/20 uppercase tracking-wider">collected</p>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="bg-white/[0.015] px-6 pb-4 space-y-2">
                        {client.notes && (
                          <p className="text-[11px] text-white/40 pt-3 italic">{client.notes}</p>
                        )}
                        {cInvoices.length === 0 ? (
                          <p className="text-[11px] text-white/20 pt-3">No invoices for this client.</p>
                        ) : (
                          <div className="pt-2 space-y-1">
                            {cInvoices.map(inv => (
                              <div
                                key={inv.id}
                                className="flex items-center justify-between py-2 cursor-pointer hover:bg-white/5 px-2 transition-colors"
                                onClick={(e) => { e.stopPropagation(); setSelectedInvoice(inv); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-[10px] font-mono text-white/50">{inv.invoice_number}</span>
                                  <StatusBadge status={inv.status} />
                                  <span className="text-[10px] text-white/30">{fmt(inv.date)}</span>
                                </div>
                                <span className="font-mono text-sm font-bold">{fmtUSD(inv.total)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
