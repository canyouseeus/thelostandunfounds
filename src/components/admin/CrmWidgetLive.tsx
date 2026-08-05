import { CrmWidget, CrmInvoiceRow } from '../ui/crm-widget';
import { supabase } from '../../lib/supabase';
import { useCrmClients } from './CrmDirectory';

/**
 * The dashboard's CRM tile: the drawn widget fed by the same roster hook the
 * CRM directory uses, so the tile, the explorer and the panel never disagree.
 */
export function CrmWidgetLive({ size, className }: { size?: string; className?: string }) {
  const { clients, totals, loading } = useCrmClients();
  if (loading) {
    return (
      <div className={className + ' bg-black flex items-center'} style={{ borderRadius: 0, containerType: 'size' }}>
        <span className="uppercase tracking-widest text-white/30 text-left" style={{ fontSize: '9cqmin', padding: '7cqmin' }}>
          Loading…
        </span>
      </div>
    );
  }
  const fetchInvoices = async (clientId: string): Promise<CrmInvoiceRow[]> => {
    const { data, error } = await supabase
      .from('invoices')
      .select('id, invoice_number, date, total, amount_due, status, description')
      .eq('client_id', clientId)
      .order('date', { ascending: false })
      .limit(24);
    if (error) throw error;
    return (data ?? []).map(r => ({ ...r, total: Number(r.total ?? 0), amount_due: Number(r.amount_due ?? 0) }));
  };
  return <CrmWidget size={size} className={className} data={{ clients, totals }} fetchInvoices={fetchInvoices} />;
}
