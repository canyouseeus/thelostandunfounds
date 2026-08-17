import { useState } from 'react';
import { UserGroupIcon } from '@heroicons/react/24/outline';
import { ExpandableScreen, ExpandableScreenTrigger, ExpandableScreenContent } from '../ui/expandable-screen';
import { AdminBentoRow } from '../ui/admin-bento-card';
import { useCrmClients, CrmDirectoryScreen } from './CrmDirectory';
import { DashboardTile, TileShape } from './DashboardTile';
import { RingGauge } from '../ui/viz';

const money = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export function CrmCard({ span, light, size }: TileShape = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const { totals, loading } = useCrmClients();

  const val = (n: number, fmt: (v: number) => string) => (loading ? '…' : fmt(n));

  return (
    <div className="contents">
      <ExpandableScreen isOpen={isOpen} onOpenChange={setIsOpen}>
        {/* `block w-full h-full`: see DashboardCategoryCard: without it the
            button sizes to its content and the tile sits short in its cell. */}
        <ExpandableScreenTrigger className={`block w-full h-full text-left cursor-pointer ${span ?? ''}`}>
          <DashboardTile
            light={light}
            size={size}
            icon={<UserGroupIcon className="w-4 h-4" />}
            primary={loading ? '…' : totals.clients}
            caption="CRM clients"
          >
            <div className="flex items-center justify-center gap-3">
              <RingGauge
                className="w-16 h-16 sm:w-20 sm:h-20"
                value={totals.billed}
                max={Math.max(totals.billed + totals.outstanding, 1)}
              />
              <span className="text-[11px] uppercase tracking-widest text-white/40 tabular-nums">
                {val(totals.billed, money)} billed
              </span>
            </div>
          </DashboardTile>
        </ExpandableScreenTrigger>

        <ExpandableScreenContent className="overflow-x-hidden">
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <CrmDirectoryScreen />
          </div>
        </ExpandableScreenContent>
      </ExpandableScreen>
    </div>
  );
}
