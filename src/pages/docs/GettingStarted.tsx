/**
 * Getting Started Documentation
 *
 * Describes what the platform actually offers. It previously advertised
 * Premium ($9.99/mo) and Pro ($19.99/mo) subscription tiers that have never
 * existed — those are gone.
 */

import { Link } from 'react-router-dom';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

const STEPS = [
  {
    title: 'Create an account',
    body: 'Sign in with Google, or ask for an email sign-in link. An account is free, and it is what carries your gallery access, downloads and order history.',
    link: null,
  },
  {
    title: 'Browse the gallery',
    body: 'The gallery holds photography from the field. Some collections are free to download, some are priced per photo or per bundle, and prints can be ordered on selected images. Private client galleries are invite-only and open with the link we send you.',
    link: { to: '/gallery', label: 'Open the gallery' },
  },
  {
    title: 'Book a session',
    body: 'Pick a service and a date, and the booking form quotes it. Fixed-price services are quoted and invoiced automatically; anything custom comes back as a written quote. A date is held once the deposit is paid.',
    link: { to: '/?view=booking', label: 'Book a session' },
  },
  {
    title: 'Read and write',
    body: 'The Lost Archives is the editorial side of the platform — reporting, essays and field notes. Anyone can submit an article; submissions go through editorial review before publication.',
    link: { to: '/thelostarchives', label: 'Read The Lost Archives' },
  },
  {
    title: 'Earn with the affiliate program',
    body: 'Share tracked links, earn commission on qualifying sales, and get paid out through Stripe. Onboarding takes a few minutes and payouts run through your own connected account.',
    link: { to: '/become-affiliate', label: 'Join the affiliate program' },
  },
];

export default function GettingStarted() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-4">Getting Started</h1>
      <p className="text-white/70 mb-8">
        <strong className="font-bold text-white">THE LOST+UNFOUNDS</strong> is a content platform
        and a working photo and media studio. Here is what you can do with it.
      </p>

      <div className="space-y-px">
        {STEPS.map((step, i) => (
          <section key={step.title} className="bg-white/5 p-6" style={{ borderRadius: 0 }}>
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-8 h-8 bg-white text-black flex items-center justify-center font-bold shrink-0"
                style={{ borderRadius: 0 }}
              >
                {i + 1}
              </div>
              <h2 className="text-2xl font-bold text-white">{step.title}</h2>
            </div>
            <p className="text-white/80 sm:ml-11">{step.body}</p>
            {step.link && (
              <Link
                to={step.link.to}
                style={{ borderRadius: 0 }}
                className="inline-flex items-center gap-2 px-4 py-2 mt-4 sm:ml-11 bg-white text-black font-semibold hover:bg-white/90 transition"
              >
                {step.link.label} <ArrowRightIcon className="w-4 h-4" />
              </Link>
            )}
          </section>
        ))}
      </div>

      <div className="mt-12 p-6 bg-white/5" style={{ borderRadius: 0 }}>
        <h3 className="text-xl font-bold text-white mb-3">What does it cost?</h3>
        <p className="text-white/70">
          Accounts, the archives, the newsletter and the free tools cost nothing, and there is no
          subscription tier to buy. You pay only for what you order: a photo download or bundle at
          the price shown on the gallery, a print, a shop item, or a booked service quoted before
          you commit.
        </p>
      </div>

      <div className="mt-px p-6 bg-white/5" style={{ borderRadius: 0 }}>
        <h3 className="text-xl font-bold text-white mb-3">Need help?</h3>
        <p className="text-white/70 mb-4">
          Check the <Link to="/docs#faq" className="text-white underline">FAQ</Link>, see what
          shipped recently in the{' '}
          <Link to="/changelog" className="text-white underline">changelog</Link>, or get in touch.
        </p>
        <Link
          to="/support"
          style={{ borderRadius: 0 }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white text-black font-semibold hover:bg-white/90 transition"
        >
          Get Support <ArrowRightIcon className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
