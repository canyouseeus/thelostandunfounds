/**
 * Photographer Getting Started Guide
 * Step-by-step breakdown of how the gallery system works
 */

import { Link } from 'react-router-dom';
import {
    EnvelopeIcon, UserPlusIcon, FolderOpenIcon, PhotoIcon, CurrencyDollarIcon,
    ArrowRightIcon, CheckCircleIcon, ArrowPathIcon, ShareIcon,
    QuestionMarkCircleIcon, ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';

const steps = [
    {
        number: 1,
        title: 'Get Invited',
        icon: EnvelopeIcon,
        color: 'from-blue-500 to-blue-600',
        description: 'You\'ll receive an email invitation from THE LOST+UNFOUNDS with a special setup link.',
        details: [
            'Check your inbox for the invitation',
            'Click the unique setup link in the email',
            'The link expires in 7 days'
        ]
    },
    {
        number: 2,
        title: 'Create Your Account',
        icon: UserPlusIcon,
        color: 'from-purple-500 to-purple-600',
        description: 'Sign up or log in to connect your gallery to your account.',
        details: [
            'Use the email from your invitation',
            'You can also sign in with Google',
            'Your account links all your galleries'
        ]
    },
    {
        number: 3,
        title: 'Connect Google Drive',
        icon: FolderOpenIcon,
        color: 'from-green-500 to-green-600',
        description: 'Share a Google Drive folder with our sync agent to upload your photos.',
        details: [
            'Create a folder in Google Drive',
            'Right-click → Share → Add viewer',
            'Paste the agent email we provide',
            'Share folder link in the setup wizard'
        ]
    },
    {
        number: 4,
        title: 'Gallery Goes Live',
        icon: PhotoIcon,
        color: 'from-orange-500 to-orange-600',
        description: 'Your photos sync automatically and your gallery is published instantly.',
        details: [
            'Photos sync within minutes',
            'EXIF data is extracted automatically',
            'Your unique gallery URL is ready to share'
        ]
    },
    {
        number: 5,
        title: 'Earn From Sales',
        icon: CurrencyDollarIcon,
        color: 'from-emerald-500 to-emerald-600',
        description: 'Get paid when visitors purchase your photos.',
        details: [
            'Set your own pricing',
            'Receive commission on every sale',
            'Track earnings in your dashboard'
        ]
    }
];

const faqs = [
    {
        question: 'How do I add new photos?',
        answer: 'Simply add photos to your shared Google Drive folder. Click "Sync" in your dashboard to update your gallery.'
    },
    {
        question: 'What file formats are supported?',
        answer: 'We support JPG, PNG, and HEIC images. RAW files are converted automatically.'
    },
    {
        question: 'How do I remove a photo?',
        answer: 'Delete or move the photo out of your shared folder, then sync your gallery.'
    },
    {
        question: 'When do I get paid?',
        answer: 'Payments are processed through PayPal. You\'ll receive your commission within 24-48 hours of a sale.'
    },
    {
        question: 'Can I have multiple galleries?',
        answer: 'Yes! Contact us to set up additional galleries for different events or clients.'
    }
];

export default function PhotographerGuide() {
    return (
        <div className="min-h-screen bg-black text-white">
            {/* Header */}
            <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent" />
                <div className="container mx-auto px-4 py-16 relative">
                    <div className="max-w-3xl mx-auto text-center">
                        <span className="inline-block px-4 py-1 bg-white/10 text-white/80 text-sm font-medium rounded-full mb-4">
                            📸 Photographer Guide
                        </span>
                        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-4">
                            Getting Started
                        </h1>
                        <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
                            Everything you need to know to set up your gallery and start selling your photos.
                        </p>
                    </div>
                </div>
            </div>

            {/* Steps Timeline */}
            <div className="container mx-auto px-4 py-12">
                <div className="max-w-4xl mx-auto">
                    <div className="relative">
                        {/* Vertical line */}
                        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 via-purple-500 to-emerald-500 hidden md:block" />

                        <div className="space-y-12">
                            {steps.map((step, index) => (
                                <div key={step.number} className="relative flex gap-6 md:gap-8">
                                    {/* Step number */}
                                    <div className={`relative z-10 w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg shadow-black/50 shrink-0`}>
                                        <step.icon className="w-7 h-7 text-white" />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 pb-8">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="text-xs font-bold text-white/40 uppercase tracking-widest">
                                                Step {step.number}
                                            </span>
                                        </div>
                                        <h2 className="text-2xl font-bold text-white mb-3">{step.title}</h2>
                                        <p className="text-zinc-400 mb-4">{step.description}</p>

                                        <ul className="space-y-2">
                                            {step.details.map((detail, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                                                    <CheckCircleIcon className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                                                    <span>{detail}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-zinc-900/50 border-y border-white/10">
                <div className="container mx-auto px-4 py-12">
                    <div className="max-w-4xl mx-auto">
                        <h2 className="text-2xl font-bold text-white mb-8 text-center">Managing Your Gallery</h2>

                        <div className="grid md:grid-cols-3 gap-6">
                            <div className="bg-black/50 border border-white/10 rounded-xl p-6 hover:border-white/20 transition-colors">
                                <ArrowPathIcon className="w-8 h-8 text-blue-400 mb-4" />
                                <h3 className="text-lg font-bold text-white mb-2">Sync Photos</h3>
                                <p className="text-sm text-zinc-400">
                                    Click "Sync" in your dashboard anytime you add new photos to Google Drive.
                                </p>
                            </div>

                            <div className="bg-black/50 border border-white/10 rounded-xl p-6 hover:border-white/20 transition-colors">
                                <ShareIcon className="w-8 h-8 text-purple-400 mb-4" />
                                <h3 className="text-lg font-bold text-white mb-2">Share Your Gallery</h3>
                                <p className="text-sm text-zinc-400">
                                    Copy your unique gallery URL and share it with clients or on social media.
                                </p>
                            </div>

                            <div className="bg-black/50 border border-white/10 rounded-xl p-6 hover:border-white/20 transition-colors">
                                <CurrencyDollarIcon className="w-8 h-8 text-emerald-400 mb-4" />
                                <h3 className="text-lg font-bold text-white mb-2">Track Earnings</h3>
                                <p className="text-sm text-zinc-400">
                                    View real-time sales and revenue analytics in your dashboard.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* FAQ Section */}
            <div className="container mx-auto px-4 py-16">
                <div className="max-w-3xl mx-auto">
                    <div className="flex items-center gap-3 mb-8">
                        <QuestionMarkCircleIcon className="w-6 h-6 text-white/60" />
                        <h2 className="text-2xl font-bold text-white">Frequently Asked Questions</h2>
                    </div>

                    <div className="space-y-4">
                        {faqs.map((faq, index) => (
                            <details
                                key={index}
                                className="group bg-zinc-900/50 border border-white/10 rounded-xl overflow-hidden"
                            >
                                <summary className="flex items-center justify-between p-5 cursor-pointer hover:bg-white/5 transition-colors">
                                    <span className="font-semibold text-white">{faq.question}</span>
                                    <ArrowRightIcon className="w-5 h-5 text-white/40 transition-transform group-open:rotate-90" />
                                </summary>
                                <div className="px-5 pb-5 text-zinc-400">
                                    {faq.answer}
                                </div>
                            </details>
                        ))}
                    </div>
                </div>
            </div>

            {/* CTA */}
            <div className="container mx-auto px-4 pb-16">
                <div className="max-w-3xl mx-auto text-center">
                    <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-emerald-500/10 border border-white/10 rounded-2xl p-8">
                        <h2 className="text-2xl font-bold text-white mb-4">Ready to Get Started?</h2>
                        <p className="text-zinc-400 mb-6">
                            If you have an invitation, click the link in your email to begin setup.
                            Need help? Our support team is here for you.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link
                                to="/dashboard"
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-colors"
                            >
                                Go to Dashboard <ArrowRightIcon className="w-5 h-5" />
                            </Link>
                            <Link
                                to="/support"
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-colors"
                            >
                                Get Support <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
