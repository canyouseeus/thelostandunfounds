/**
 * The photographer's tools: tonight's live gallery, job pay, the availability
 * calendar, gallery sales and their galleries.
 *
 * Rendered as the PHOTOGRAPHER app on /dashboard for anyone on the crew
 * roster. It used to be its own page, /photographer-dashboard, which meant a
 * photographer who was also an affiliate had two dashboards and, landing on
 * /dashboard, no way to find the second. That URL now redirects here.
 */

import { useState } from 'react';
import {
    CurrencyDollarIcon,
    InformationCircleIcon,
    ClockIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    WalletIcon,
    CreditCardIcon,
    ShareIcon
} from '@heroicons/react/24/outline';
import AdminGalleryView from '../admin/AdminGalleryView';
import JobPayouts from '../JobPayouts';
import CrewAvailabilityCalendar from './CrewAvailabilityCalendar';
import CrewRequestBox from './CrewRequestBox';
import MyLiveGalleries from '../live/MyLiveGalleries';

export default function PhotographerPanel({ userId }: { userId: string }) {
    const [showRevenueInfo, setShowRevenueInfo] = useState(false);

    return (
        <div className="text-white">
            <a href="/terms/photographers" className="inline-block mb-6 text-xs text-white/40 underline underline-offset-2 hover:text-white">
                Photographer Terms
            </a>

            {/* Tonight's event first: create a live gallery and send from the camera roll. */}
            <MyLiveGalleries />

            {/* Job pay for shoots covered — separate from gallery sales below. */}
            <JobPayouts userId={userId} />

            {/* Availability first: it is the thing the studio needs from you,
                rather than the thing you came to look up. */}
            <div className="mb-6" id="crew-calendar">
                <CrewAvailabilityCalendar />
            </div>

            {/* Revenue & Payment Info Banner */}
            <div data-tour="pg-revenue" className="mb-6 bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-500/30 rounded-xl p-6">
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
                            <p className="text-sm text-green-300/80">You keep 97% of your sales (minus Stripe fees)</p>
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
                                    <span className="text-green-400 font-semibold">97%</span>
                                </li>
                                <li className="flex justify-between">
                                    <span>Platform Fee:</span>
                                    <span className="text-zinc-400">3%</span>
                                </li>
                                <li className="flex justify-between border-t border-white/10 pt-2 mt-2">
                                    <span>Stripe Fee:</span>
                                    <span className="text-yellow-400">~2.9% + $0.30</span>
                                </li>
                            </ul>
                            <p className="text-xs text-zinc-500 mt-3">
                                Example: $10 sale → $0.30 platform + $0.59 Stripe → <span className="text-green-400">$9.11 net</span>
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
                                        <p className="text-zinc-400">Funds settle to your connected Stripe account</p>
                                    </div>
                                </li>
                                <li className="flex items-start gap-2 mt-3">
                                    <WalletIcon className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <span className="text-white">Bank Transfer:</span>
                                        <p className="text-zinc-400">Standard Stripe payout schedule to your bank</p>
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
                                    You still receive 97%
                                </li>
                                <li className="flex items-center gap-2 text-purple-400">
                                    <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                                    Affiliate commission comes out of the platform's 3%
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
                    <span className="font-medium">Tip:</span> Payments are sent directly to your connected Stripe account.
                    Make sure your Stripe account details are up to date.
                </p>
            </div>

            <div data-tour="pg-galleries" className="mb-6">
                <h2 className="text-xl font-bold uppercase tracking-tighter mb-4">MY GALLERIES</h2>
                <div className="bg-white/5 p-6" style={{ borderRadius: 0 }}>
                    <AdminGalleryView
                        onBack={() => { }}
                        isPhotographerView={true}
                    />
                </div>
            </div>

            <CrewRequestBox />
        </div>
    );
}
