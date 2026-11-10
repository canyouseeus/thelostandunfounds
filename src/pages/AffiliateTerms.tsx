/**
 * Affiliate Terms Page
 */

import AffiliateTermsContent from './docs/AffiliateTerms';

import { Helmet } from 'react-helmet-async';

export default function AffiliateTerms() {
  return (
    <>
      <Helmet>
        <title>THE LOST+UNFOUNDS | Affiliate Terms</title>
        <meta name="description" content="Terms for THE LOST+UNFOUNDS affiliate program: how you earn 42% of profit, how referrals are tracked, how payouts work through Stripe Connect, and the promotion rules." />
        <link rel="canonical" href="https://www.thelostandunfounds.com/terms/affiliates" />
      </Helmet>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <AffiliateTermsContent />
      </div>
    </>
  );
}
