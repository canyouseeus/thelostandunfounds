/**
 * FAQ Documentation
 *
 * Answers describe the platform as it exists. The old copy sold Premium and Pro
 * subscription tiers with download caps that were never built.
 */

import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: 'How do I create an account?',
    answer: 'Use the sign-in button in the header and continue with Google. An account is free, and it is what holds your gallery access, downloads and order history.',
  },
  {
    question: 'Is there a subscription?',
    answer: 'No. There are no paid membership tiers. Accounts, the archives, the newsletter and the free tools cost nothing; you pay only for what you order — a photo download or bundle, a print, a shop item, or a booked service.',
  },
  {
    question: 'How does photo pricing work?',
    answer: 'Pricing is set per gallery. Some collections are free to download, others are priced per photo or as a bundle, and the price you see in the gallery is the price at checkout. Prints, where offered, are priced separately because they are produced and shipped by a fulfilment partner.',
  },
  {
    question: 'What can I do with a photo I download?',
    answer: 'A download carries a personal, non-commercial license: display it, print it, share it with credit. Commercial use, resale, or using the image to train a machine-learning model needs a separate written license. Watermarks and credits must stay intact. Full detail is in the Terms of Service.',
  },
  {
    question: 'I was sent a private gallery link. How do I open it?',
    answer: 'Open the link from the email we sent and sign in with that same email address. Access is tied to the invited address, so forwarding the link to someone else will not let them in. If it will not open, reply to the email and we will re-issue access.',
  },
  {
    question: 'How do I book a shoot, and what happens to my deposit?',
    answer: 'Pick a service and date on the booking form. Fixed-price services are quoted and invoiced automatically; anything custom comes back as a written quote. Your date is held once the deposit is paid, the deposit is credited against the total, and it is non-refundable unless your quote says otherwise. You can reschedule once at no charge with 48 hours notice.',
  },
  {
    question: 'How does the affiliate program pay out?',
    answer: 'You share tracked links and earn commission on qualifying, completed sales. Payouts run through Stripe Connect once you have finished onboarding, and commission on a refunded order is reversed. Disclose the affiliate relationship wherever you post a link.',
  },
  {
    question: 'Do you store my data?',
    answer: 'We store what is needed to run the service — your account, orders, gallery entitlements and email preferences — and we do not sell it. See the Privacy Policy for the full picture.',
  },
  {
    question: 'How do I stop receiving email?',
    answer: 'Every newsletter has an unsubscribe link at the bottom and it takes effect promptly. Transactional email — receipts, invoices, booking confirmations, gallery access — keeps sending while you have an account or an open order, because it is part of the service.',
  },
  {
    question: 'What changed recently?',
    answer: 'Every update shipped to the platform is listed day by day on the changelog page at /changelog.',
  },
  {
    question: 'How do I contact support?',
    answer: 'Use the Support page, or email support@thelostandunfounds.com. For bookings and client work, email media@thelostandunfounds.com.',
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-4">Frequently Asked Questions</h1>
      <p className="text-white/70 mb-8">
        Find answers to common questions about THE LOST+UNFOUNDS platform.
      </p>

      <div className="space-y-px">
        {faqs.map((faq, index) => (
          <div key={index} className="bg-white/5 overflow-hidden" style={{ borderRadius: 0 }}>
            <button
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/10 transition"
            >
              <span className="text-white font-semibold">{faq.question}</span>
              <ChevronDownIcon
                className={`w-5 h-5 text-white/60 shrink-0 ml-4 transition-transform ${
                  openIndex === index ? 'transform rotate-180' : ''
                }`}
              />
            </button>
            {openIndex === index && (
              <div className="px-6 py-4 bg-white/5">
                <p className="text-white/80">{faq.answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 p-6 bg-white/5" style={{ borderRadius: 0 }}>
        <h3 className="text-xl font-bold text-white mb-2">Still have questions?</h3>
        <p className="text-white/70 mb-4">
          If you can't find the answer you're looking for, please contact our support team.
        </p>
        <a
          href="/support"
          style={{ borderRadius: 0 }}
          className="inline-block px-4 py-2 bg-white text-black font-semibold hover:bg-white/90 transition"
        >
          Contact Support
        </a>
      </div>
    </div>
  );
}
