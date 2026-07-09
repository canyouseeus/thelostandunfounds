import { useEffect, useState } from 'react';
import { ReceiptRefundIcon } from '@heroicons/react/24/outline';
import { ExpandableScreen, ExpandableScreenTrigger, ExpandableScreenContent } from '../ui/expandable-screen';
import { AdminBentoRow } from '../ui/admin-bento-card';
import { LoadingSpinner } from '../Loading';
import { supabase } from '../../lib/supabase';

interface RefundRow {
  id: string;
  stripe_charge_id: string;
  source: 'shop' | 'gallery' | 'booking' | 'event' | 'unknown';
  source_id: string | null;
  amount_cents: number;
  currency: string;
  reason: string | null;
  customer_email: string | null;
  created_at: string;
}

const SOURCE_LABEL: Record<string, string> = {
  shop: 'Shop',
  gallery: 'Gallery',
  booking: 'Booking',
  event: 'Event',
  unknown: 'Unmatched',
};

/** Dashboard tile surfacing the refunds ledger — previously invisible (webhook only logged to console). */
export function RefundsCard() {
  const [isOpen, setIsOpen] = useState(false);
  const [refunds, setRefunds] = useState<RefundRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('refunds')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) {
          // Migration not applied yet — treat as empty state rather than an error.
          setTableMissing(true);
          setRefunds([]);
        } else {
          setRefunds(data || []);
        }
      } catch {
        setTableMissing(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totalRefundedCents = refunds.reduce((sum, r) => sum + (r.amount_cents || 0), 0);
  const last30dCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const last30dCents = refunds
    .filter(r => new Date(r.created_at).getTime() >= last30dCutoff)
    .reduce((sum, r) => sum + (r.amount_cents || 0), 0);

  return (
    <div className="contents">
      <ExpandableScreen isOpen={isOpen} onOpenChange={setIsOpen}>
        <ExpandableScreenTrigger className="w-full h-full text-left cursor-pointer">
          {/* Desktop tile */}
          <div className="hidden md:flex flex-col h-full min-h-[190px] bg-black hover:bg-[#0a0a0a] transition-colors duration-300 p-4">
            <div className="flex items-center gap-2 mb-2">
              <ReceiptRefundIcon className="w-4 h-4 text-white/50" />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-white/80 truncate">Refunds</h3>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden space-y-4 pt-2">
              <AdminBentoRow
                label="Last 30 Days"
                valueClassName={last30dCents > 0 ? 'text-amber-400 font-bold' : ''}
                value={`$${(last30dCents / 100).toLocaleString()}`}
              />
              <AdminBentoRow label="All Time" value={`$${(totalRefundedCents / 100).toLocaleString()}`} />
              <AdminBentoRow label="Count" value={refunds.length} />
            </div>
          </div>

          {/* Mobile tile */}
          <div className="flex md:hidden flex-col items-center justify-center p-2.5 bg-white/5 aspect-square w-full active:scale-95 transition-all duration-200">
            <div className="p-2 bg-white/10 rounded-full mb-1">
              <ReceiptRefundIcon className="w-4 h-4 text-white/40" />
            </div>
            <span className="text-[8px] font-black uppercase tracking-[0.05em] text-center leading-tight text-white/60 px-1">Refunds</span>
          </div>
        </ExpandableScreenTrigger>

        <ExpandableScreenContent className="overflow-x-hidden">
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="max-w-4xl mx-auto w-full px-4 sm:px-8 pt-20 pb-16">
              <div className="flex items-center gap-3 mb-1">
                <ReceiptRefundIcon className="w-5 h-5 text-white/40" />
                <h2 className="text-xl font-black uppercase tracking-wide text-white">Refunds</h2>
              </div>
              <p className="text-white/50 text-sm normal-case mb-8">Stripe charge.refunded events, most recent first</p>

              {loading ? (
                <div className="py-16 flex justify-center">
                  <LoadingSpinner size="lg" />
                </div>
              ) : tableMissing ? (
                <div className="py-16 text-center text-white/40 text-xs uppercase font-bold tracking-widest">
                  Refunds ledger not set up yet — run the refunds_ledger migration
                </div>
              ) : refunds.length === 0 ? (
                <div className="py-16 text-center text-white/40 text-xs uppercase font-bold tracking-widest">
                  No refunds recorded
                </div>
              ) : (
                <div className="space-y-10">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white/5 p-4">
                      <div className="text-[9px] text-white/40 uppercase tracking-widest mb-1">Last 30 Days</div>
                      <div className="text-2xl font-black font-mono text-white">${(last30dCents / 100).toLocaleString()}</div>
                    </div>
                    <div className="bg-white/5 p-4">
                      <div className="text-[9px] text-white/40 uppercase tracking-widest mb-1">All Time</div>
                      <div className="text-2xl font-black font-mono text-white">${(totalRefundedCents / 100).toLocaleString()}</div>
                    </div>
                    <div className="bg-white/5 p-4">
                      <div className="text-[9px] text-white/40 uppercase tracking-widest mb-1">Count</div>
                      <div className="text-2xl font-black font-mono text-white">{refunds.length}</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {refunds.map(r => (
                      <div key={r.id} className="flex items-center justify-between gap-4 bg-white/5 px-4 py-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[8px] font-black uppercase px-1.5 py-0.5 bg-white/10 text-white/60">
                              {SOURCE_LABEL[r.source] || r.source}
                            </span>
                            <span className="text-xs text-white/70 truncate">{r.customer_email || 'Unknown customer'}</span>
                          </div>
                          <div className="text-[10px] text-white/30 mt-1">
                            {new Date(r.created_at).toLocaleString()}
                            {r.reason ? ` — ${r.reason.replace(/_/g, ' ')}` : ''}
                          </div>
                        </div>
                        <span className="text-sm font-mono font-bold text-amber-400 shrink-0">
                          -${((r.amount_cents || 0) / 100).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </ExpandableScreenContent>
      </ExpandableScreen>
    </div>
  );
}
