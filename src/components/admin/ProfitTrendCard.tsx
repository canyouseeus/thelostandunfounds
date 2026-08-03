import { useState } from 'react';
import { ArrowTrendingUpIcon } from '@heroicons/react/24/outline';
import { ExpandableScreen, ExpandableScreenTrigger, ExpandableScreenContent } from '../ui/expandable-screen';
import { AdminBentoRow } from '../ui/admin-bento-card';
import ProfitGraph from './ProfitGraph';
import { DashboardTile, TileShape } from './DashboardTile';

interface ProfitTrendCardProps {
  affiliateRevenue: number;
  galleryRevenue: number;
  bookingRevenue: number;
}

/** Dashboard tile for the live profit trend — collapsed shows today's revenue mix, expanded renders ProfitGraph. */
export function ProfitTrendCard({ affiliateRevenue, galleryRevenue, bookingRevenue, span }: ProfitTrendCardProps & TileShape) {
  const [isOpen, setIsOpen] = useState(false);
  const total = affiliateRevenue + galleryRevenue + bookingRevenue;

  return (
    <div className="contents">
      <ExpandableScreen isOpen={isOpen} onOpenChange={setIsOpen}>
        <ExpandableScreenTrigger className={`text-left cursor-pointer ${span ?? ''}`}>
          <DashboardTile icon={<ArrowTrendingUpIcon className="w-4 h-4" />} title="Profit Trend">
              <AdminBentoRow label="Total Revenue" valueClassName="text-green-400 font-bold" value={`$${total.toLocaleString()}`} />
              <AdminBentoRow label="Affiliate" value={`$${affiliateRevenue.toLocaleString()}`} />
              <AdminBentoRow label="Gallery" value={`$${galleryRevenue.toLocaleString()}`} />
              <AdminBentoRow label="Bookings" value={`$${bookingRevenue.toLocaleString()}`} />
          </DashboardTile>
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
