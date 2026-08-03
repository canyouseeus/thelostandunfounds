import { useState } from 'react';
import { UserGroupIcon } from '@heroicons/react/24/outline';
import { ExpandableScreen, ExpandableScreenTrigger, ExpandableScreenContent } from '../ui/expandable-screen';
import { AdminBentoRow } from '../ui/admin-bento-card';
import { useCrmClients, CrmDirectoryScreen } from './CrmDirectory';
import { DashboardTile, TileShape } from './DashboardTile';

const money = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export function CrmCard({ span }: TileShape = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const { totals, loading } = useCrmClients();

  const val = (n: number, fmt: (v: number) => string) => (loading ? '…' : fmt(n));

  return (
    <div className="contents">
      <ExpandableScreen isOpen={isOpen} onOpenChange={setIsOpen}>
        <ExpandableScreenTrigger className={`text-left cursor-pointer ${span ?? ''}`}>
          <DashboardTile icon={<UserGroupIcon className="w-4 h-4" />} title="CRM Clients">
              <AdminBentoRow label="Clients" value={val(totals.clients, (n) => String(n))} />
              <AdminBentoRow label="Billed" value={val(totals.billed, money)} />
              <AdminBentoRow label="Outstanding" value={val(totals.outstanding, money)} />
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
