import { CrmWidget } from '../ui/crm-widget';
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
  return <CrmWidget size={size} className={className} data={{ clients, totals }} />;
}
