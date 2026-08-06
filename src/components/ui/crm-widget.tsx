import { useEffect, useState } from 'react';
import { cn } from './utils';
import { useLongPress } from './use-long-press';
import { DetailSheet } from './detail-sheet';
import { RingGauge } from './viz';
import { CardStack, StackRow, FieldsCard, StackCard } from './card-stack';

export interface CrmWidgetClient {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  business: string | null;
  notes: string | null;
  created_at: string;
  invoiceCount: number;
  billed: number;
  collected: number;
  outstanding: number;
  lastInvoiceDate: string | null;
}

export interface CrmInvoiceRow {
  id: string;
  invoice_number: string | null;
  date: string | null;
  total: number;
  amount_due: number;
  status: string | null;
  description: string | null;
}

export interface CrmWidgetData {
  clients: CrmWidgetClient[];
  totals: { clients: number; billed: number; collected: number; outstanding: number };
}

const money = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
/** $18,420 -> $18.4K where the tile is two units wide. */
const cmoney = (n: number) => (n >= 10_000 ? `$${(n / 1000).toFixed(1)}K` : money(n));
const shortDate = (iso: string | null) =>
  iso ? iso.slice(0, 10) : '—';

const STATUS_LINE = (inv: CrmInvoiceRow) =>
  [inv.status ?? 'unknown', inv.amount_due > 0 ? `${money(inv.amount_due)} due` : 'settled'].join(' — ');

/** The dossier's invoice drill: a client's invoices, then one invoice's fields. */
function ClientInvoices({ clientId, fetchInvoices, nav }: {
  clientId: string;
  fetchInvoices?: (clientId: string) => Promise<CrmInvoiceRow[]>;
  nav: { push: (card: StackCard) => void };
}) {
  const [rows, setRows] = useState<CrmInvoiceRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    fetchInvoices?.(clientId)
      .then(r => { if (alive) setRows(r); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [clientId, fetchInvoices]);

  if (failed) return <p className="text-[11px] uppercase tracking-widest text-white/30 py-4 text-left">Invoices unavailable.</p>;
  if (!rows) return <p className="text-[11px] uppercase tracking-widest text-white/30 py-4 text-left">Loading…</p>;
  if (rows.length === 0) return <p className="text-[11px] uppercase tracking-widest text-white/30 py-4 text-left">No invoices on record.</p>;
  return (
    <div className="space-y-px">
      {rows.map(inv => (
        <StackRow
          key={inv.id}
          label={inv.invoice_number ? `Invoice ${inv.invoice_number}` : 'Invoice'}
          sub={STATUS_LINE(inv)}
          value={money(inv.total)}
          onPress={() => nav.push({
            title: inv.invoice_number ? `Invoice ${inv.invoice_number}` : 'Invoice',
            render: () => (
              <FieldsCard fields={{
                Number: inv.invoice_number ?? '—',
                Date: inv.date ? inv.date.slice(0, 10) : '—',
                Total: money(inv.total),
                'Amount due': money(inv.amount_due),
                Status: inv.status ?? '—',
                Description: inv.description ?? '—',
              }} />
            ),
          })}
        />
      ))}
    </div>
  );
}

/**
 * CRM tile. The ring is its instrument — collected against billed, the dial
 * exception the clock also uses — and the client roster fills the larger
 * shapes as share bars on the book's scale. Click or long-press opens the
 * client explorer: roster → dossier, cards with a way back at every level.
 * Accent: amber, the hero's bookings hue — CRM money is booking money.
 */
export function CrmWidget({ size = '2x2', data, fetchInvoices, className }: {
  size?: string;
  data: CrmWidgetData;
  /** Loads a client's invoices for the dossier's invoice drill. */
  fetchInvoices?: (clientId: string) => Promise<CrmInvoiceRow[]>;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const press = useLongPress(() => setOpen(true));
  const cols = Number(size.split('x')[0]) || 2;
  const rows = Number(size.split('x')[1]) || 2;
  const S = cols >= 4 && rows >= 4 ? 0.55 : 1;
  const u = (n: number) => `${n * S}cqmin`;

  const { totals } = data;
  const maxBilled = Math.max(...data.clients.map(c => c.billed), 1);

  const invoicesCard = (c: CrmWidgetClient): StackCard => ({
    title: `${c.name} — Invoices`,
    render: nav => <ClientInvoices clientId={c.id} fetchInvoices={fetchInvoices} nav={nav} />,
  });

  const dossier = (c: CrmWidgetClient): StackCard => ({
    title: c.name,
    render: nav => (
      <div className="space-y-4">
        <FieldsCard fields={{
          Business: c.business ?? '—',
          Email: c.email ?? '—',
          Phone: c.phone ?? '—',
          'Client since': shortDate(c.created_at),
          Billed: money(c.billed),
          Collected: money(c.collected),
          Outstanding: money(c.outstanding),
          'Last invoice': shortDate(c.lastInvoiceDate),
        }} />
        {fetchInvoices && c.invoiceCount > 0 && (
          <StackRow
            label="Invoices"
            value={String(c.invoiceCount)}
            onPress={() => nav.push(invoicesCard(c))}
          />
        )}
        {c.notes && (
          <div className="px-3 py-2.5 bg-white/[0.03]">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Notes</p>
            <p className="text-xs text-white/80 whitespace-pre-wrap">{c.notes}</p>
          </div>
        )}
      </div>
    ),
  });

  const root: StackCard = {
    title: 'CRM Clients',
    render: nav => (
      <div className="space-y-4">
        <div className="space-y-px">
          <StackRow label="Clients" value={String(totals.clients)} />
          <StackRow label="Billed" value={money(totals.billed)} />
          <StackRow label="Collected" value={money(totals.collected)} />
          <StackRow label="Outstanding" value={money(totals.outstanding)} />
        </div>
        <div className="space-y-px">
          {data.clients.length === 0 ? (
            <p className="text-[11px] uppercase tracking-widest text-white/30 py-4 text-left">No clients yet.</p>
          ) : data.clients.map(c => (
            <StackRow
              key={c.id}
              label={c.name}
              sub={[c.business, `${c.invoiceCount} invoice${c.invoiceCount === 1 ? '' : 's'}`].filter(Boolean).join(' — ')}
              value={money(c.billed)}
              onPress={() => nav.push(dossier(c))}
            />
          ))}
        </div>
      </div>
    ),
  };

  const figure = (label: string, value: string, big: boolean) => (
    <div className="flex flex-col text-left shrink-0">
      <span className="font-black uppercase tracking-widest opacity-40" style={{ fontSize: u(big ? 6 : 5), lineHeight: 1 }}>
        {label}
      </span>
      <span className="font-black leading-none tabular-nums" style={{ fontSize: u(big ? 21 : 11), marginTop: u(2) }}>
        {value}
      </span>
    </div>
  );

  return (
    <>
      <div
        {...press}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(true); } }}
        aria-label="CRM — open client explorer"
        className={cn(
          'relative bg-black text-white flex flex-col cursor-pointer touch-manipulation select-none overflow-hidden',
          className,
        )}
        style={{
          borderRadius: 0,
          containerType: 'size',
          WebkitTouchCallout: 'none',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <div className="relative flex-1 min-h-0 flex flex-col" style={{ padding: '7cqmin' }}>
          {cols === 2 && rows === 2 ? (
            /* The face: the ring holds the upper right — collected against
               billed — and the client count holds the bottom-left. */
            <div className="flex-1 min-h-0 relative">
              <div className="absolute text-amber-500" style={{ top: 0, right: 0, width: '42cqmin', height: '42cqmin' }}>
                <RingGauge value={totals.collected} max={Math.max(totals.billed, 1)} className="w-full h-full" />
              </div>
              <div className="absolute left-0 bottom-0 flex flex-col text-left">
                <span className="font-black uppercase tracking-widest opacity-40" style={{ fontSize: '9cqmin', lineHeight: 1, marginBottom: '3cqmin' }}>
                  Clients
                </span>
                <span className="font-black leading-none tabular-nums" style={{ fontSize: '30cqmin' }}>
                  {totals.clients}
                </span>
              </div>
            </div>
          ) : (
            /* Composed: figures and ring on top, the roster as share bars on
               the book's scale filling the rest. */
            <div className="flex-1 min-h-0 flex flex-col justify-between" style={{ gap: u(5) }}>
              {cols >= 4 ? (
                <div className="flex items-center justify-between" style={{ gap: u(6) }}>
                  {figure('Clients', String(totals.clients), true)}
                  {figure('Billed', money(totals.billed), false)}
                  {figure('Out', money(totals.outstanding), false)}
                  <div className="text-amber-500 shrink-0" style={{ width: u(22), height: u(22) }}>
                    <RingGauge value={totals.collected} max={Math.max(totals.billed, 1)} className="w-full h-full" />
                  </div>
                </div>
              ) : (
                /* Two units wide: count and dial share the top row, the money
                   figures take their own line — four across doesn't fit. */
                <div className="flex flex-col" style={{ gap: u(4) }}>
                  <div className="flex items-center justify-between" style={{ gap: u(6) }}>
                    {figure('Clients', String(totals.clients), true)}
                    <div className="text-amber-500 shrink-0" style={{ width: u(24), height: u(24) }}>
                      <RingGauge value={totals.collected} max={Math.max(totals.billed, 1)} className="w-full h-full" />
                    </div>
                  </div>
                  <div className="flex items-baseline justify-between" style={{ gap: u(4) }}>
                    {figure('Billed', cmoney(totals.billed), false)}
                    {figure('Out', cmoney(totals.outstanding), false)}
                  </div>
                </div>
              )}
              <div className={cn('flex flex-col', rows >= 4 && 'flex-1 justify-evenly')} style={{ gap: rows >= 4 ? undefined : u(2.5) }}>
                {data.clients.slice(0, rows >= 4 ? 6 : 3).map(c => (
                  /* Two lines: the name gets the full width (no fixed column to
                     clip it), the bar runs beneath on the book's scale. */
                  <div key={c.id} className="flex flex-col" style={{ gap: u(1.5) }}>
                    <div
                      className="flex items-baseline justify-between uppercase tracking-widest tabular-nums"
                      style={{ fontSize: u(5.4), lineHeight: 1.2, gap: u(4) }}
                    >
                      <span className="opacity-40 truncate">{c.name}</span>
                      <span className="font-bold shrink-0">{cmoney(c.billed)}</span>
                    </div>
                    <span className="relative block text-amber-500" style={{ height: u(1.3) }}>
                      <span className="absolute inset-0 bg-current opacity-10" />
                      <span className="absolute top-0 bottom-0 left-0 bg-current" style={{ width: `${(c.billed / maxBilled) * 100}%` }} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {open && (
        <DetailSheet onClose={() => setOpen(false)} label="Close client explorer" wide>
          <CardStack root={root} onClose={() => setOpen(false)} />
        </DetailSheet>
      )}
    </>
  );
}
