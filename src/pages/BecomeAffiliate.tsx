import { Link } from 'react-router-dom';
import KingMidasTicker from '../components/KingMidasTicker';
import SEOHead from '../components/SEOHead';
import BrandName from '../components/ui/BrandName';

export default function BecomeAffiliate() {
    return (
        <>
        <SEOHead
            title="Become an Affiliate - Earn 42% of Profits"
            description="Join THE LOST+UNFOUNDS affiliate network. Earn 42% of the profit on every sale, compete for the King Midas 8% profit pool, and build your earning network."
            canonicalPath="/become-affiliate"
        />
        <div className="min-h-screen bg-black text-white">
            <KingMidasTicker />

            {/* Hero Section */}
            <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('/affiliate/hero.jpg')] opacity-30 grayscale bg-cover bg-center" />
                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />

                <div className="container mx-auto px-4 pt-12 pb-10 md:pt-20 md:pb-16 relative z-10">
                    <div className="max-w-4xl mx-auto text-left">
                        <div className="text-white text-[10px] font-black uppercase tracking-[0.4em] mb-6">
                            Join the #1 Creator Affiliate Program
                        </div>

                        <h1 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tighter uppercase leading-none">
                            Earn 42% of Profits<br />
                            On Every Sale
                        </h1>

                        <p className="text-lg md:text-xl text-white mb-8 max-w-2xl leading-relaxed">
                            Join the <BrandName /> affiliate network. Get lifetime commissions on referred customers, compete for the King Midas 8% profit pool, and build your own earning network.
                        </p>

                        <div className="flex flex-row items-stretch gap-3 sm:gap-4">
                            <Link
                                to="/dashboard"
                                className="flex-1 sm:flex-none min-w-0 px-3 sm:px-8 py-4 bg-white text-black font-black text-xs sm:text-lg uppercase tracking-wider sm:tracking-widest hover:bg-white/90 transition-all flex items-center justify-center text-center whitespace-nowrap"
                            >
                                Join Program Now
                            </Link>
                            <Link
                                to="/king-midas-leaderboard"
                                className="flex-1 sm:flex-none min-w-0 px-3 sm:px-8 py-4 bg-black text-white font-bold text-xs sm:text-lg uppercase tracking-wider sm:tracking-widest outline outline-1 outline-white hover:bg-white hover:text-black transition-colors flex items-center justify-center text-center whitespace-nowrap"
                            >
                                View Prize Pool
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Benefits Grid */}
            <div className="py-10 md:py-14">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12 max-w-6xl mx-auto">
                        <div>
                            <h3 className="text-xl font-bold text-white uppercase tracking-widest mb-3 text-left">High Commissions</h3>
                            <p className="text-white leading-relaxed text-left">
                                Earn an industry-leading 42% of the profit on every sale you refer. Your referrals are locked to you for life.
                            </p>
                        </div>

                        <div>
                            <h3 className="text-xl font-bold text-white uppercase tracking-widest mb-3 text-left">King Midas Pool</h3>
                            <p className="text-white leading-relaxed text-left">
                                Top affiliates compete daily for a share of 8% of the entire site's daily profits. Rankings reset every 24 hours.
                            </p>
                        </div>

                        <div>
                            <h3 className="text-xl font-bold text-white uppercase tracking-widest mb-3 text-left">2-Tier MLM</h3>
                            <p className="text-white leading-relaxed text-left">
                                Recruit other affiliates and earn 2% of profits on their sales (Level 1) and 1% of profits on their recruits' sales (Level 2).
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Features List */}
            <div className="py-10 md:py-14">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-12 items-start">
                            <div>
                                <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-4 text-left">
                                    Everything You Need<br />To Succeed
                                </h2>
                                <p className="text-white mb-6 text-lg text-left">
                                    We provide all the tools, tracking, and assets you need to maximize your earnings from day one.
                                </p>
                                <Link
                                    to="/dashboard"
                                    className="inline-block text-white font-bold uppercase tracking-widest underline underline-offset-4 hover:no-underline"
                                >
                                    Start Earning Today
                                </Link>
                            </div>

                            <ul className="space-y-3">
                                {[
                                    'Real-time link tracking & analytics',
                                    'Instant payouts via Stripe Connect',
                                    'Custom referral codes',
                                    'Automated tax handling',
                                    'Marketing assets & banners',
                                    'Dedicated affiliate support'
                                ].map((feature, i) => (
                                    <li key={i} className="text-white font-medium">{feature}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* CTA */}
            <div className="py-10 md:py-14">
                <div className="container mx-auto px-4 text-left max-w-4xl">
                    <h2 className="text-4xl md:text-6xl font-black text-white mb-6 uppercase tracking-tighter">
                        Ready to Rule?
                    </h2>
                    <p className="text-xl text-white mb-8 max-w-2xl">
                        Join the ranks of top earners and start building your empire today.
                    </p>
                    <Link
                        to="/dashboard"
                        className="inline-block px-6 sm:px-12 py-4 sm:py-5 bg-white text-black font-black text-base sm:text-xl uppercase tracking-widest hover:bg-white/90 transition-colors whitespace-nowrap"
                    >
                        Become an Affiliate
                    </Link>
                </div>
            </div>
        </div>
        </>
    );
}
