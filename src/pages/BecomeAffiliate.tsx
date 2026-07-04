import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Expandable,
    ExpandableContent,
    ExpandableTrigger,
} from '../components/ui/expandable';
import KingMidasTicker from '../components/KingMidasTicker';
import SEOHead from '../components/SEOHead';
import BrandName from '../components/ui/BrandName';
import AuthModal from '../components/auth/AuthModal';
import { useAuth } from '../contexts/AuthContext';

interface ExpandableInfoCardProps {
    title: string;
    body: string;
}

function ExpandableInfoCard({ title, body }: ExpandableInfoCardProps) {
    return (
        <Expandable
            expandDirection="vertical"
            expandBehavior="replace"
            initialDelay={0}
            transition={{ duration: 0.2, ease: 'easeOut' }}
        >
            {({ isExpanded }) => (
                <ExpandableTrigger>
                    <div className="bg-black flex flex-col cursor-pointer transition-transform duration-300 hover:-translate-y-1">
                        <div className="flex items-start justify-between gap-3">
                            <h3 className="text-xl font-bold text-white uppercase tracking-widest text-left">
                                {title}
                            </h3>
                            <span className="text-white text-sm leading-none mt-1 flex-shrink-0">
                                {isExpanded ? '▼' : '▶'}
                            </span>
                        </div>
                        <ExpandableContent preset="fade" keepMounted={false}>
                            <p className="text-white leading-relaxed text-left mt-3">{body}</p>
                        </ExpandableContent>
                    </div>
                </ExpandableTrigger>
            )}
        </Expandable>
    );
}

interface ExpandableFeatureListProps {
    title: string;
    intro: string;
    features: string[];
}

function ExpandableFeatureList({ title, intro, features }: ExpandableFeatureListProps) {
    return (
        <Expandable
            expandDirection="vertical"
            expandBehavior="replace"
            initialDelay={0}
            transition={{ duration: 0.2, ease: 'easeOut' }}
        >
            {({ isExpanded }) => (
                <ExpandableTrigger>
                    <div className="bg-black flex flex-col cursor-pointer transition-transform duration-300 hover:-translate-y-1">
                        <div className="flex items-start justify-between gap-4">
                            <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter text-left">
                                {title}
                            </h2>
                            <span className="text-white text-lg leading-none mt-2 flex-shrink-0">
                                {isExpanded ? '▼' : '▶'}
                            </span>
                        </div>
                        <p className="text-white text-base md:text-lg text-left mt-3">{intro}</p>
                        <ExpandableContent preset="fade" stagger staggerChildren={0.05} keepMounted={false}>
                            <ul className="space-y-3 mt-4">
                                {features.map((feature, i) => (
                                    <li key={i} className="text-white font-medium text-left">
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                        </ExpandableContent>
                    </div>
                </ExpandableTrigger>
            )}
        </Expandable>
    );
}

export default function BecomeAffiliate() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [showAuthModal, setShowAuthModal] = useState(false);

    const handleJoin = () => {
        if (user) {
            navigate('/dashboard?join=affiliate');
        } else {
            setShowAuthModal(true);
        }
    };

    return (
        <>
        <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
            intent="affiliate"
            title="Join the Affiliate Program"
            initialMode="signup"
        />
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

                <div className="px-4 md:px-8 lg:px-12 pt-12 pb-10 md:pt-20 md:pb-16 relative z-10">
                    <div className="max-w-4xl text-left">
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

                        <div className="flex flex-row items-stretch justify-start gap-3 sm:gap-4">
                            <button
                                onClick={handleJoin}
                                className="flex-1 sm:flex-none min-w-0 px-3 sm:px-8 py-4 bg-white text-black font-black text-xs sm:text-lg uppercase tracking-wider sm:tracking-widest hover:bg-white/90 transition-all flex items-center justify-center text-center whitespace-nowrap"
                            >
                                Join Program Now
                            </button>
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

            {/* Benefits Grid (expandable cards) */}
            <div className="py-10 md:py-14 px-4 md:px-8 lg:px-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-6xl items-start">
                    <ExpandableInfoCard
                        title="High Commissions"
                        body="Earn an industry-leading 42% of the profit on every sale you refer. Your referrals are locked to you for life."
                    />
                    <ExpandableInfoCard
                        title="King Midas Pool"
                        body="Top affiliates compete daily for a share of 8% of the entire site's daily profits. Rankings reset every 24 hours."
                    />
                    <ExpandableInfoCard
                        title="2-Tier MLM"
                        body="Recruit other affiliates and earn 2% of profits on their sales (Level 1) and 1% of profits on their recruits' sales (Level 2)."
                    />
                </div>
            </div>

            {/* Features (single expandable card) */}
            <div className="py-10 md:py-14 px-4 md:px-8 lg:px-12">
                <div className="max-w-4xl">
                    <ExpandableFeatureList
                        title="Everything You Need To Succeed"
                        intro="We provide all the tools, tracking, and assets you need to maximize your earnings from day one."
                        features={[
                            'Real-time link tracking & analytics',
                            'Instant payouts via Stripe Connect',
                            'Custom referral codes',
                            'Automated tax handling',
                            'Marketing assets & banners',
                            'Dedicated affiliate support',
                        ]}
                    />
                    <div className="mt-6 text-left">
                        <button
                            onClick={handleJoin}
                            className="text-white font-bold uppercase tracking-widest underline underline-offset-4 hover:no-underline"
                        >
                            Start Earning Today
                        </button>
                    </div>
                </div>
            </div>

            {/* CTA */}
            <div className="py-10 md:py-14 px-4 md:px-8 lg:px-12">
                <div className="text-left max-w-4xl">
                    <h2 className="text-4xl md:text-6xl font-black text-white mb-6 uppercase tracking-tighter">
                        Ready to Rule?
                    </h2>
                    <p className="text-xl text-white mb-8 max-w-2xl">
                        Join the ranks of top earners and start building your empire today.
                    </p>
                    <button
                        onClick={handleJoin}
                        className="inline-block px-6 sm:px-12 py-4 sm:py-5 bg-white text-black font-black text-base sm:text-xl uppercase tracking-widest hover:bg-white/90 transition-colors whitespace-nowrap"
                    >
                        Become an Affiliate
                    </button>
                </div>
            </div>
        </div>
        </>
    );
}
