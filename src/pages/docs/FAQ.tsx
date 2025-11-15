/**
 * FAQ Documentation
 */

import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: 'How do I create an account?',
    answer: 'Click the "LOG IN" button in the top right corner, then select "Sign Up". You can use your email address or sign in with Google.',
  },
  {
    question: 'What are the subscription tiers?',
    answer: 'We offer three tiers: Free (5 downloads/day), Premium ($9.99/month, unlimited downloads), and Pro ($19.99/month, unlimited downloads + API access).',
  },
  {
    question: 'How do I download TikTok videos?',
    answer: 'Navigate to the TikTok Downloader tool, paste the TikTok video URL, and click Download. The video will be processed and available for download.',
  },
  {
    question: 'Are there download limits?',
    answer: 'Free accounts have a limit of 5 downloads per day. Premium and Pro accounts have unlimited downloads.',
  },
  {
    question: 'How do I upgrade my account?',
    answer: 'Go to your Profile page and click "Upgrade" or visit the Pricing page. You can upgrade using PayPal.',
  },
  {
    question: 'Can I cancel my subscription?',
    answer: 'Yes, you can cancel your subscription at any time from your Settings page. Your access will continue until the end of your billing period.',
  },
  {
    question: 'Do you store my data?',
    answer: 'We only store the data necessary to provide our services. We do not store downloaded videos on our servers. See our Privacy Policy for more details.',
  },
  {
    question: 'How do I contact support?',
    answer: 'You can contact us through the Support page or email us directly at support@thelostandunfounds.com.',
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

      <div className="space-y-4">
        {faqs.map((faq, index) => (
          <div
            key={index}
            className="bg-black border border-white/10 rounded-lg overflow-hidden"
          >
            <button
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/5 transition"
            >
              <span className="text-white font-semibold">{faq.question}</span>
              <ChevronDown
                className={`w-5 h-5 text-white/60 transition-transform ${
                  openIndex === index ? 'transform rotate-180' : ''
                }`}
              />
            </button>
            {openIndex === index && (
              <div className="px-6 py-4 border-t border-white/10">
                <p className="text-white/80">{faq.answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 p-6 bg-white/5 border border-white/10 rounded-lg">
        <h3 className="text-xl font-bold text-white mb-2">Still have questions?</h3>
        <p className="text-white/70 mb-4">
          If you can't find the answer you're looking for, please contact our support team.
        </p>
        <a
          href="/support"
          className="inline-block px-4 py-2 bg-white text-black font-semibold rounded-lg hover:bg-white/90 transition"
        >
          Contact Support
        </a>
      </div>
    </div>
  );
}


