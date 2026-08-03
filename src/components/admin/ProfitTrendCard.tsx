import { useState } from 'react';
import { ArrowTrendingUpIcon } from '@heroicons/react/24/outline';
import { ExpandableScreen, ExpandableScreenTrigger, ExpandableScreenContent } from '../ui/expandable-screen';
import { AdminBentoRow } from '../ui/admin-bento-card';
import ProfitGraph from './ProfitGraph';

interface ProfitTrendCardProps {
  affiliateRevenue: number;
  galleryRevenue: number;
  bookingRevenue: number;
}

/** Dashboard tile for the live profit trend — collapsed shows today's revenue mix, expanded renders ProfitGraph. */
export function ProfitTrendCard({ affiliateRevenue, galleryRevenue, bookingRevenue }: ProfitTrendCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const total = affiliateRevenue + galleryRevenue + bookingRevenue;

  return (
    <div className="contents">
      <ExpandableScreen isOpen={isOpen} onOpenChange={setIsOpen}>
        <ExpandableScreenTrigger className="w-full h-full text-left cursor-pointer">
          {/* Square at-a-glance widget, matching the rest of the grid. */}
          <div className="bg-black hover:bg-[#0a0a0a] active:scale-95 transition-all duration-300 aspect-square w-full flex flex-col p-3 md:p-4 overflow-hidden">
            <div className="flex items-center gap-1.5 md:gap-2 mb-1.5 md:mb-2 shrink-0">
              <ArrowTrendingUpIcon className="w-3.5 h-3.5 md:w-4 md:h-4 text-white/50" />
              <h3 className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-white/80 truncate">
                Profit <span className="text-white/40">Trend</span>
              </h3>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden [zoom:0.72] md:[zoom:1]">
              <AdminBentoRow label="Total Revenue" valueClassName="text-green-400 font-bold" value={`$${total.toLocaleString()}`} />
              <AdminBentoRow label="Affiliate" value={`$${affiliateRevenue.toLocaleString()}`} />
              <AdminBentoRow label="Gallery" value={`$${galleryRevenue.toLocaleString()}`} />
              <AdminBentoRow label="Bookings" value={`$${bookingRevenue.toLocaleString()}`} />
            </div>
          </div>
        </ExpandableScreenTrigger>

        <ExpandableScreenContent className="overflow-x-hidden">
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="max-w-4xl mx-auto w-full px-4 sm:px-8 pt-20 pb-16">
              <div className="flex items-center gap-3 mb-8">
                <ArrowTrendingUpIcon className="w-5 h-5 text-white/40" />
                <h2 className="text-xl font-black uppercase tracking-wide text-white">Profit Trend</h2>
              </div>
              <ProfitGraph />
            </div>
          </div>
        </ExpandableScreenContent>
      </ExpandableScreen>
    </div>
  );
}
