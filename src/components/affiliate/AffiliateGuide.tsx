
import {
    BookOpenIcon,
    CurrencyDollarIcon,
    GlobeAmericasIcon,
    ShareIcon,
    TrophyIcon,
    UserGroupIcon
} from '@heroicons/react/24/outline';
import { AdminBentoCard } from '../ui/admin-bento-card';
import BrandName from '../ui/BrandName';
import AffiliateProgramName from '../ui/AffiliateProgramName';

export default function AffiliateGuide() {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AdminBentoCard
                    title="Program Overview"
                    icon={<GlobeAmericasIcon className="w-4 h-4" />}
                    className="min-h-[250px]"
                >
                    <div className="space-y-4">
                        <p className="text-white/50 text-xs leading-relaxed tracking-wide">
                            Welcome to <AffiliateProgramName className="text-white" /> at <BrandName />. You are now part of an exclusive network of agents earning high commissions by sharing art and stories.
                        </p>
                        <div className="space-y-px">
                            <div className="flex items-start gap-3 p-3 bg-white/5">
                                <CurrencyDollarIcon className="w-4 h-4 text-white/30 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-white text-[10px] uppercase tracking-[0.25em] font-black mb-1">42% of Profit — Direct Commission</h4>
                                    <p className="text-white/40 text-xs">Earn 42% of the profit on every sale generated through your direct link.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-3 bg-white/5">
                                <UserGroupIcon className="w-4 h-4 text-white/30 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-white text-[10px] uppercase tracking-[0.25em] font-black mb-1">Team Earnings</h4>
                                    <p className="text-white/40 text-xs">Earn 2% from affiliates you recruit (Level 1) and 1% from their recruits (Level 2).</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </AdminBentoCard>

                <AdminBentoCard
                    title="How Tracking Works"
                    icon={<ShareIcon className="w-4 h-4" />}
                    className="min-h-[250px]"
                >
                    <div className="space-y-4">
                        <ul className="space-y-3">
                            <li className="flex gap-3">
                                <span className="text-[10px] uppercase tracking-[0.2em] font-black text-white/30 shrink-0 pt-px">01</span>
                                <div>
                                    <span className="text-[10px] uppercase tracking-[0.2em] font-black text-white block mb-0.5">30-Day Cookie</span>
                                    <span className="text-white/40 text-xs">If a customer clicks your link and buys within 30 days, you get paid.</span>
                                </div>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-[10px] uppercase tracking-[0.2em] font-black text-white/30 shrink-0 pt-px">02</span>
                                <div>
                                    <span className="text-[10px] uppercase tracking-[0.2em] font-black text-white block mb-0.5">Lifetime Binding</span>
                                    <span className="text-white/40 text-xs">Once a customer buys via your link, they are permanently tied to you. Future purchases earn you commission automatically.</span>
                                </div>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-[10px] uppercase tracking-[0.2em] font-black text-white/30 shrink-0 pt-px">03</span>
                                <div>
                                    <span className="text-[10px] uppercase tracking-[0.2em] font-black text-white block mb-0.5">Cross-Device</span>
                                    <span className="text-white/40 text-xs">If they click on mobile and buy on desktop while logged in, we track it.</span>
                                </div>
                            </li>
                        </ul>
                    </div>
                </AdminBentoCard>
            </div>

            <AdminBentoCard
                title="KING MIDAS"
                icon={<TrophyIcon className="w-4 h-4" />}
                colSpan={12}
            >
                <div className="flex flex-col md:flex-row gap-6 items-center">
                    <div className="flex-1 space-y-4">
                        <p className="text-white/50 text-xs leading-relaxed tracking-wide">
                            We gamify sales with <strong className="text-white font-black uppercase tracking-widest">KING MIDAS</strong>.
                            Every day, 8% of the profit from that day's affiliate sales is split between that day's ranked affiliates.
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-px">
                            <div className="p-4 bg-white/10 text-center">
                                <div className="text-2xl font-black text-white mb-1">50%</div>
                                <div className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-black">1st Place</div>
                            </div>
                            <div className="p-4 bg-white/5 text-center">
                                <div className="text-2xl font-black text-white/60 mb-1">30%</div>
                                <div className="text-[9px] uppercase tracking-[0.3em] text-white/30 font-black">2nd Place</div>
                            </div>
                            <div className="p-4 bg-white/[0.03] text-center">
                                <div className="text-2xl font-black text-white/30 mb-1">10%</div>
                                <div className="text-[9px] uppercase tracking-[0.3em] text-white/20 font-black">3rd Place</div>
                            </div>
                            <div className="p-4 bg-white/[0.02] text-center">
                                <div className="text-2xl font-black text-white/30 mb-1">10%</div>
                                <div className="text-[9px] uppercase tracking-[0.3em] text-white/20 font-black">Split by 4th+</div>
                            </div>
                        </div>
                        <p className="text-[10px] text-white/25 uppercase tracking-[0.2em]">
                            Days run midnight to midnight Central. Winnings are added to your balance shortly after midnight.
                        </p>
                    </div>
                </div>
            </AdminBentoCard>

            <AdminBentoCard
                title="Pro Tips for Promotion"
                icon={<BookOpenIcon className="w-4 h-4" />}
                colSpan={12}
            >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <h4 className="text-[10px] uppercase tracking-[0.25em] font-black text-white">Instagram &amp; TikTok</h4>
                        <p className="text-white/40 text-xs leading-relaxed">
                            Put your link in bio. Create content showing the art prints in real settings. Use the "Deep Link Generator" to link directly to the specific print you are showing.
                        </p>
                    </div>
                    <div className="space-y-2">
                        <h4 className="text-[10px] uppercase tracking-[0.25em] font-black text-white">Blogs &amp; Newsletters</h4>
                        <p className="text-white/40 text-xs leading-relaxed">
                            Write about your favorite pieces. Use the Deep Link Generator to link each one straight to its page with your code.
                        </p>
                    </div>
                    <div className="space-y-2">
                        <h4 className="text-[10px] uppercase tracking-[0.25em] font-black text-white">Recruiting</h4>
                        <p className="text-white/40 text-xs leading-relaxed">
                            Share your "Affiliate Link" found in the overview tab with other content creators. You earn 2% of the profit on their referred sales, and 1% on sales by the affiliates they recruit.
                        </p>
                    </div>
                </div>
            </AdminBentoCard>
        </div>
    );
}
