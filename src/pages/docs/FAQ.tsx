/**
 * FAQ Documentation
 */

import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

import { DOCS_FAQ as faqs } from '../../data/faqs';

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
            className="bg-black/50 border border-white rounded-none overflow-hidden"
          >
            <button
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/5 transition"
            >
              <span className="text-white font-semibold">{faq.question}</span>
              <ChevronDownIcon
                className={`w-5 h-5 text-white/60 transition-transform ${openIndex === index ? 'transform rotate-180' : ''
                  }`}
              />
            </button>
            {openIndex === index && (
              <div className="px-6 py-4 border-t border-white">
                <p className="text-white/80">{faq.answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 p-6 bg-black/50 border border-white rounded-none">
        <h3 className="text-xl font-bold text-white mb-2">Still have questions?</h3>
        <p className="text-white/70 mb-4">
          If you can't find the answer you're looking for, please contact our support team.
        </p>
        <a
          href="/support"
          className="inline-block px-4 py-2 bg-white text-black font-semibold rounded-none hover:bg-white/90 transition"
        >
          Contact Support
        </a>
      </div>
    </div>
  );
}


