import { useState } from 'react';
import { UserGroupIcon } from '@heroicons/react/24/outline';
import { ExpandableScreen, ExpandableScreenTrigger, ExpandableScreenContent } from '../ui/expandable-screen';
import { AdminBentoRow } from '../ui/admin-bento-card';
import { useCrmClients, CrmDirectoryScreen } from './CrmDirectory';

const money = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export function CrmCard() {
  const [isOpen, setIsOpen] = useState(false);
  const { totals, loading } = useCrmClients();

  const val = (n: number, fmt: (v: number) => string) => (loading ? '…' : fmt(n));

  return (
    <div className="contents">
      <ExpandableScreen isOpen={isOpen} onOpenChange={setIsOpen}>
        <ExpandableScreenTrigger className="w-full h-full text-left cursor-pointer">
          {/* Square at-a-glance widget, matching the rest of the grid. */}
          <div className="bg-black hover:bg-[#0a0a0a] active:scale-95 transition-all duration-300 aspect-square w-full flex flex-col p-3 md:p-4 overflow-hidden">
            <div className="flex items-center gap-1.5 md:gap-2 mb-1.5 md:mb-2 shrink-0">
              <UserGroupIcon className="w-3.5 h-3.5 md:w-4 md:h-4 text-white/50" />
              <h3 className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-white/80 truncate">
                CRM <span className="text-white/40">Clients</span>
              </h3>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden [zoom:0.72] md:[zoom:1]">
              <AdminBentoRow label="Clients" value={val(totals.clients, (n) => String(n))} />
              <AdminBentoRow label="Billed" value={val(totals.billed, money)} />
              <AdminBentoRow label="Outstanding" value={val(totals.outstanding, money)} />
            </div>
          </div>
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
