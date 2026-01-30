/**
 * Getting Started Documentation
 */

import { Link } from 'react-router-dom';
import { ArrowRightIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export default function GettingStarted() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-4">Getting Started</h1>
      <p className="text-white/70 mb-8">
        Welcome to <strong className="font-bold text-white">THE LOST+UNFOUNDS</strong>! This guide will help you get started with our platform.
      </p>

      <div className="space-y-8">
        {/* Step 1 */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white font-bold">
              1
            </div>
            <h2 className="text-2xl font-bold text-white">Create Your Account</h2>
          </div>
          <div className="ml-11 space-y-3">
            <p className="text-white/80">
              Sign up for a free account to get started. You can use your email or sign in with Google.
            </p>
            <ul className="space-y-2 text-white/70">
              <li className="flex items-start gap-2">
                <CheckCircleIcon className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span>Free accounts get 5 downloads per day</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircleIcon className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span>Access to all basic tools</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircleIcon className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span>No credit card required</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Step 2 */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white font-bold">
              2
            </div>
            <h2 className="text-2xl font-bold text-white">Explore Tools</h2>
          </div>
          <div className="ml-11 space-y-3">
            <p className="text-white/80">
              Browse our collection of powerful tools designed to make your life easier.
            </p>
            <Link
              to="/tools"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-black font-semibold rounded-none hover:bg-white/90 transition"
            >
              Explore Tools <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* Step 3 */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white font-bold">
              3
            </div>
            <h2 className="text-2xl font-bold text-white">Start Using Tools</h2>
          </div>
          <div className="ml-11 space-y-3">
            <p className="text-white/80">
              Most tools are available immediately. Simply navigate to a tool and start using it!
            </p>
            <p className="text-white/60 text-sm">
              <strong>Note:</strong> Some tools may have usage limits based on your subscription tier.
              Upgrade to Premium or Pro for unlimited access.
            </p>
          </div>
        </section>

        {/* Step 4 */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white font-bold">
              4
            </div>
            <h2 className="text-2xl font-bold text-white">Upgrade (Optional)</h2>
          </div>
          <div className="ml-11 space-y-3">
            <p className="text-white/80">
              Unlock unlimited access and advanced features by upgrading to Premium or Pro.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="bg-black/50 border border-white rounded-none p-4">
                <h3 className="text-white font-semibold mb-2">Premium</h3>
                <p className="text-white/70 text-sm mb-3">Unlimited access to all tools</p>
                <div className="text-xl font-bold text-white">$9.99<span className="text-sm text-white/60">/month</span></div>
              </div>
              <div className="bg-black/50 border border-white rounded-none p-4">
                <h3 className="text-white font-semibold mb-2">Pro</h3>
                <p className="text-white/70 text-sm mb-3">Everything + API access</p>
                <div className="text-xl font-bold text-white">$19.99<span className="text-sm text-white/60">/month</span></div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-12 p-6 bg-black/50 border border-white rounded-none">
        <h3 className="text-xl font-bold text-white mb-3">Need Help?</h3>
        <p className="text-white/70 mb-4">
          If you have questions or need assistance, check out our <Link to="/docs/faq" className="text-white underline">FAQ</Link> or
          contact our support team.
        </p>
        <Link
          to="/support"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white text-black font-semibold rounded-none hover:bg-white/90 transition"
        >
          Get Support <ArrowRightIcon className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}


