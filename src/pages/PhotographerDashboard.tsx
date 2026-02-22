import AdminGalleryView from '../components/admin/AdminGalleryView';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
    CurrencyDollarIcon,
    InformationCircleIcon,
    ClockIcon,
    UsersIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    WalletIcon,
    CreditCardIcon,
    ShareIcon
} from '@heroicons/react/24/outline';
import { LoadingOverlay } from '../components/Loading';

export default function PhotographerDashboard() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const [showRevenueInfo, setShowRevenueInfo] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            navigate('/');
        }
    }, [user, loading, navigate]);

    if (loading) return <LoadingOverlay />;

    return (
        <div className="container mx-auto py-8 text-white px-4">
            <div className="mb-6">
                <h1 className="text-3xl font-bold uppercase tracking-tighter">My Galleries</h1>
                <p className="text-zinc-400">Manage your photo galleries and settings</p>
            </div>

            {/* Revenue & Payment Info Banner */}
            <div className="mb-6 bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-500/30 rounded-xl p-6">
                <button
                    onClick={() => setShowRevenueInfo(!showRevenueInfo)}
                    className="w-full flex items-center justify-between text-left"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/20 rounded-lg">
                            <CurrencyDollarIcon className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-white">Your Revenue & Payments</h3>
                            <p className="text-sm text-green-300/80">You keep 100% of your sales (minus PayPal fees)</p>
                        </div>
                    </div>
                    {showRevenueInfo ? (
                        <ChevronUpIcon className="w-5 h-5 text-green-400" />
                    ) : (
                        <ChevronDownIcon className="w-5 h-5 text-green-400" />
                    )}
                </button>

                {showRevenueInfo && (
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Revenue Split */}
                        <div className="bg-black/40 rounded-lg p-4 border border-white/10">
                            <div className="flex items-center gap-2 mb-3">
                                <WalletIcon className="w-4 h-4 text-green-400" />
                                <h4 className="font-medium text-white">Revenue Split</h4>
                            </div>
                            <ul className="space-y-2 text-sm text-zinc-300">
                                <li className="flex justify-between">
                                    <span>Your Share:</span>
                                    <span className="text-green-400 font-semibold">100%</span>
                                </li>
                                <li className="flex justify-between">
                                    <span>Platform Fee:</span>
                                    <span className="text-zinc-400">$0.00</span>
                                </li>
                                <li className="flex justify-between border-t border-white/10 pt-2 mt-2">
                                    <span>PayPal Fee:</span>
                                    <span className="text-yellow-400">~2.9% + $0.30</span>
                                </li>
                            </ul>
                            <p className="text-xs text-zinc-500 mt-3">
                                Example: $10 sale → $0.59 fee → <span className="text-green-400">$9.41 net</span>
                            </p>
                        </div>

                        {/* Fund Availability */}
                        <div className="bg-black/40 rounded-lg p-4 border border-white/10">
                            <div className="flex items-center gap-2 mb-3">
                                <ClockIcon className="w-4 h-4 text-blue-400" />
                                <h4 className="font-medium text-white">Fund Availability</h4>
                            </div>
                            <ul className="space-y-2 text-sm text-zinc-300">
                                <li className="flex items-start gap-2">
                                    <CreditCardIcon className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <span className="text-white">Digital Products:</span>
                                        <p className="text-zinc-400">Funds available <span className="text-green-400">instantly</span> in PayPal</p>
                                    </div>
                                </li>
                                <li className="flex items-start gap-2 mt-3">
                                    <WalletIcon className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <span className="text-white">Bank Transfer:</span>
                                        <p className="text-zinc-400">1-3 business days from PayPal</p>
                                    </div>
                                </li>
                            </ul>
                        </div>

                        {/* Affiliate Referrals */}
                        <div className="bg-black/40 rounded-lg p-4 border border-white/10">
                            <div className="flex items-center gap-2 mb-3">
                                <ShareIcon className="w-4 h-4 text-purple-400" />
                                <h4 className="font-medium text-white">Affiliate Referrals</h4>
                            </div>
                            <p className="text-sm text-zinc-300 mb-3">
                                When affiliates refer customers to your gallery:
                            </p>
                            <ul className="space-y-2 text-sm">
                                <li className="flex items-center gap-2 text-green-400">
                                    <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                                    You still receive 100%
                                </li>
                                <li className="flex items-center gap-2 text-purple-400">
                                    <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                                    Affiliate commission paid by platform
                                </li>
                                <li className="flex items-center gap-2 text-blue-400">
                                    <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                                    Affiliates tracked automatically
                                </li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Stats Reminder */}
            <div className="mb-6 flex items-center gap-2 p-3 bg-blue-900/20 border border-blue-500/20 rounded-lg">
                <InformationCircleIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <p className="text-sm text-blue-200">
                    <span className="font-medium">Tip:</span> Payments are sent directly to your PayPal account.
                    Make sure your PayPal email matches your account settings.
                </p>
            </div>

            <div className="bg-black/40 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
                <AdminGalleryView
                    onBack={() => { }}
                    isPhotographerView={true}
                />
            </div>
        </div>
    );
}
