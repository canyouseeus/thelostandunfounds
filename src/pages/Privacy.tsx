/**
 * Privacy Policy Page
 */

import PrivacyContent from './docs/Privacy';

import { Helmet } from 'react-helmet-async';

export default function Privacy() {
  return (
    <>
      <Helmet>
        <link rel="canonical" href="https://www.thelostandunfounds.com/privacy" />
      </Helmet>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <PrivacyContent />
      </div>
    </>
  );
}
