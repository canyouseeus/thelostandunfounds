
import {
    BookOpenIcon,
    CurrencyDollarIcon,
    GlobeAmericasIcon,
    ShareIcon,
    TrophyIcon,
    UserGroupIcon
} from '@heroicons/react/24/outline';
import { AdminBentoCard } from '../ui/admin-bento-card';

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
                        <p className="text-white/80 text-sm leading-relaxed">
                            Welcome to The Lost+Unfounds Affiliate Program. You are now part of an exclusive network of agents earning high commissions by sharing art and stories.
                        </p>
                        <div className="space-y-2">
                            <div className="flex items-start gap-3 p-3 bg-white/5 border border-white/10 rounded-sm">
                                <CurrencyDollarIcon className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-white font-bold text-xs uppercase tracking-wider">42% Direct Commission</h4>
                                    <p className="text-white/60 text-xs">Earn 42% on every sale generated from your direct link.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-3 bg-white/5 border border-white/10 rounded-sm">
                                <UserGroupIcon className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-white font-bold text-xs uppercase tracking-wider">Multi-Level Earning</h4>
                                    <p className="text-white/60 text-xs">Earn 2% from affiliates you recruit (Level 1) and 1% from their recruits (Level 2).</p>
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
                        <ul className="space-y-3 text-sm text-white/80">
                            <li className="flex gap-2">
                                <span className="text-white font-bold">1. Cookies:</span>
                                <span className="text-white/60">We use a 30-day cookie. If a customer clicks your link and buys within 30 days, you get paid.</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-white font-bold">2. Lifetime Binding:</span>
                                <span className="text-white/60">Once a customer buys via your link, they are permanently tied to you. Future purchases earn you commission automatically.</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-white font-bold">3. Cross-Device:</span>
                                <span className="text-white/60">If they click on mobile and buy on desktop (while logged in), we track it.</span>
                            </li>
                        </ul>
                    </div>
                </AdminBentoCard>
            </div>

            <AdminBentoCard
                title="The King Midas Pot"
                icon={<TrophyIcon className="w-4 h-4 text-yellow-400" />}
                colSpan={12}
            >
                <div className="flex flex-col md:flex-row gap-6 items-center">
                    <div className="flex-1 space-y-4">
                        <p className="text-white/80 text-sm leading-relaxed">
                            We gamify sales with a daily profit pool called the <strong className="text-yellow-400">King Midas Pot</strong>.
                            A portion of every sale on the site goes into this pot.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="p-4 bg-yellow-400/10 border border-yellow-400/20 text-center">
                                <div className="text-xl font-black text-yellow-400 mb-1">1st Place</div>
                                <div className="text-[10px] uppercase text-yellow-400/60 font-bold tracking-widest">Wins 50% of Pot</div>
                            </div>
                            <div className="p-4 bg-white/5 border border-white/10 text-center">
                                <div className="text-xl font-black text-white/80 mb-1">2nd Place</div>
                                <div className="text-[10px] uppercase text-white/40 font-bold tracking-widest">Wins 30% of Pot</div>
                            </div>
                            <div className="p-4 bg-white/5 border border-white/10 text-center">
                                <div className="text-xl font-black text-amber-600 mb-1">3rd Place</div>
                                <div className="text-[10px] uppercase text-white/40 font-bold tracking-widest">Wins 20% of Pot</div>
                            </div>
                        </div>
                        <p className="text-xs text-white/40 italic">
                            *Rankings reset every 24 hours at midnight. Daily winners are paid out instantly to their pending balance.
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
                        <h4 className="text-white font-bold text-sm">Instagram & TikTok</h4>
                        <p className="text-white/60 text-xs leading-relaxed">
                            Put your link in bio. Create content showing the art prints in real settings. Use the "Deep Link Generator" to link directly to the specific print you are showing.
                        </p>
                    </div>
                    <div className="space-y-2">
                        <h4 className="text-white font-bold text-sm">Blogs & Newsletters</h4>
                        <p className="text-white/60 text-xs leading-relaxed">
                            Write a review of your favorite pieces. Embed the images (download from the Marketing Assets tab) and link them with your affiliate ID.
                        </p>
                    </div>
                    <div className="space-y-2">
                        <h4 className="text-white font-bold text-sm">Recruiting</h4>
                        <p className="text-white/60 text-xs leading-relaxed">
                            Share your "Affiliate Link" (found in overview) with other content creators. You'll earn passive income from their sales forever.
                        </p>
                    </div>
                </div>
            </AdminBentoCard>
        </div>
    );
}
