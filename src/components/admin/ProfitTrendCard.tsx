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
          {/* Desktop tile */}
          <div className="hidden md:flex flex-col h-full min-h-[190px] bg-black hover:bg-[#0a0a0a] transition-colors duration-300 p-4">
            <div className="flex items-center gap-2 mb-2">
              <ArrowTrendingUpIcon className="w-4 h-4 text-white/50" />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-white/80 truncate">Profit Trend</h3>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden space-y-4 pt-2">
              <AdminBentoRow label="Total Revenue" valueClassName="text-green-400 font-bold" value={`$${total.toLocaleString()}`} />
              <AdminBentoRow label="Affiliate" value={`$${affiliateRevenue.toLocaleString()}`} />
              <AdminBentoRow label="Gallery" value={`$${galleryRevenue.toLocaleString()}`} />
              <AdminBentoRow label="Bookings" value={`$${bookingRevenue.toLocaleString()}`} />
            </div>
          </div>

          {/* Mobile tile */}
          <div className="flex md:hidden flex-col items-center justify-center p-2.5 bg-white/5 aspect-square w-full active:scale-95 transition-all duration-200">
            <div className="p-2 bg-white/10 rounded-full mb-1">
              <ArrowTrendingUpIcon className="w-4 h-4 text-white/40" />
            </div>
            <span className="text-[8px] font-black uppercase tracking-[0.05em] text-center leading-tight text-white/60 px-1">Profit</span>
            <span className="text-[6px] font-bold uppercase tracking-[0.05em] text-center leading-none text-white/30">Trend</span>
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
