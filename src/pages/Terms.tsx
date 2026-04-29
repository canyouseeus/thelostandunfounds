/**
 * Terms of Service Page
 */

import TermsContent from './docs/Terms';

import { Helmet } from 'react-helmet-async';

export default function Terms() {
  return (
    <>
      <Helmet>
        <title>THE LOST+UNFOUNDS | Terms of Service</title>
        <meta name="description" content="Review the Terms of Service for THE LOST+UNFOUNDS. Read our rules and regulations to understand your rights and responsibilities when using our platform." />
        <link rel="canonical" href="https://www.thelostandunfounds.com/terms" />
      </Helmet>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <TermsContent />
      </div>
    </>
  );
}
