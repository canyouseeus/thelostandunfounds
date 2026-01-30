import { Link } from 'react-router-dom';
import {
    ArrowTrendingUpIcon,
    CurrencyDollarIcon,
    UsersIcon,
    TrophyIcon,
    ArrowRightIcon,
    CheckIcon
} from '@heroicons/react/24/outline';
import KingMidasTicker from '../components/KingMidasTicker';

export default function BecomeAffiliate() {
    return (
        <div className="min-h-screen bg-black text-white">
            <KingMidasTicker />

            {/* Hero Section */}
            <div className="relative overflow-hidden border-b border-white/10">
                <div className="absolute inset-0 bg-yellow-400/5" />
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1621600411688-4be93cd68504?q=80&w=2670&auto=format&fit=crop')] opacity-10 bg-cover bg-center" />

                <div className="container mx-auto px-4 py-24 relative z-10">
                    <div className="max-w-4xl mx-auto text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-400/10 border border-yellow-400/20 rounded-full text-yellow-400 text-sm font-bold uppercase tracking-widest mb-8">
                            <TrophyIcon className="w-4 h-4" />
                            Join the #1 Creator Affiliate Program
                        </div>

                        <h1 className="text-5xl md:text-7xl font-black text-white mb-8 tracking-tighter uppercase leading-none">
                            Earn <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-600">42% Commission</span><br />
                            On Every Sale
                        </h1>

                        <p className="text-xl text-white/60 mb-12 max-w-2xl mx-auto leading-relaxed">
                            Join "The Lost+Unfounds" affiliate network. Get lifetime commissions on referred customers, compete for the generic King Midas 8% profit pool, and build your own earning network.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link
                                to="/affiliate/dashboard"
                                className="px-8 py-4 bg-white text-black font-black text-lg uppercase tracking-widest hover:bg-white/90 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                            >
                                Join Program Now <ArrowRightIcon className="w-5 h-5" />
                            </Link>
                            <Link
                                to="/king-midas-leaderboard"
                                className="px-8 py-4 bg-transparent border border-white/20 text-white font-bold text-lg uppercase tracking-widest hover:bg-white/10 transition-all"
                            >
                                View Prize Pool
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Benefits Grid */}
            <div className="py-24 border-b border-white/10">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        <div className="bg-white/5 border border-white/10 p-8 rounded-none group hover:bg-white/10 transition-colors">
                            <div className="w-12 h-12 bg-green-500/20 flex items-center justify-center mb-6">
                                <CurrencyDollarIcon className="w-6 h-6 text-green-500" />
                            </div>
                            <h3 className="text-xl font-bold text-white uppercase tracking-wider mb-4">High Commissions</h3>
                            <p className="text-white/60 leading-relaxed">
                                Earn an industry-leading 42% commission on every sale you refer. Plus, your referrals are locked to you for life.
                            </p>
                        </div>

                        <div className="bg-white/5 border border-white/10 p-8 rounded-none group hover:bg-white/10 transition-colors">
                            <div className="w-12 h-12 bg-yellow-400/20 flex items-center justify-center mb-6">
                                <TrophyIcon className="w-6 h-6 text-yellow-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white uppercase tracking-wider mb-4">King Midas Pool</h3>
                            <p className="text-white/60 leading-relaxed">
                                Top affiliates compete daily for a share of 8% of the entire site's daily profits. Rankings reset every 24 hours.
                            </p>
                        </div>

                        <div className="bg-white/5 border border-white/10 p-8 rounded-none group hover:bg-white/10 transition-colors">
                            <div className="w-12 h-12 bg-blue-500/20 flex items-center justify-center mb-6">
                                <UsersIcon className="w-6 h-6 text-blue-500" />
                            </div>
                            <h3 className="text-xl font-bold text-white uppercase tracking-wider mb-4">2-Tier MLM</h3>
                            <p className="text-white/60 leading-relaxed">
                                Recruit other affiliates and earn 2% on their sales (Level 1) and 1% on their recruits' sales (Level 2).
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Features List */}
            <div className="py-24 bg-white/5">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                            <div>
                                <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-6">
                                    Everything You Need<br />To Succeed
                                </h2>
                                <p className="text-white/60 mb-8 text-lg">
                                    We provide all the tools, tracking, and assets you need to maximize your earnings from day one.
                                </p>
                                <Link
                                    to="/affiliate/dashboard"
                                    className="text-white font-bold uppercase tracking-widest border-b border-white pb-1 hover:text-white/60 hover:border-white/60 transition-colors"
                                >
                                    Start Earning Today →
                                </Link>
                            </div>

                            <div className="space-y-4">
                                {[
                                    'Real-time link tracking & analytics',
                                    'Instant payouts via PayPal',
                                    'Custom referral codes',
                                    'Automated tax handling',
                                    'Marketing assets & banners',
                                    'Dedicated affiliate support'
                                ].map((feature, i) => (
                                    <div key={i} className="flex items-center gap-4 p-4 bg-black border border-white/10">
                                        <CheckIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
                                        <span className="text-white font-medium">{feature}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* CTA */}
            <div className="py-24">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-4xl md:text-6xl font-black text-white mb-8 uppercase tracking-tighter">
                        Ready to Rule?
                    </h2>
                    <p className="text-xl text-white/60 mb-12 max-w-2xl mx-auto">
                        Join the ranks of top earners and start building your empire today.
                    </p>
                    <Link
                        to="/affiliate/dashboard"
                        className="inline-block px-12 py-5 bg-yellow-400 text-black font-black text-xl uppercase tracking-widest hover:bg-yellow-300 transition-colors"
                    >
                        Become an Affiliate
                    </Link>
                </div>
            </div>
        </div>
    );
}
