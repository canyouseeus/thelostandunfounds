/**
 * Photographer Terms Page
 */

import PhotographerTermsContent from './docs/PhotographerTerms';

import { Helmet } from 'react-helmet-async';

export default function PhotographerTerms() {
  return (
    <>
      <Helmet>
        <title>THE LOST+UNFOUNDS | Photographer Terms</title>
        <meta name="description" content="Terms for photographers and contributors who upload to, sell through, or shoot for THE LOST+UNFOUNDS: content licensing, removal rights, payouts and conduct." />
        <link rel="canonical" href="https://www.thelostandunfounds.com/terms/photographers" />
      </Helmet>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <PhotographerTermsContent />
      </div>
    </>
  );
}
