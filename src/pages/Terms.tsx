/**
 * Terms of Service Page
 */

import TermsContent from './docs/Terms';

import { Helmet } from 'react-helmet-async';

export default function Terms() {
  return (
    <>
      <Helmet>
        <link rel="canonical" href="https://www.thelostandunfounds.com/terms" />
      </Helmet>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <TermsContent />
      </div>
    </>
  );
}
