/**
 * SEOHead - Reusable SEO component for consistent meta tags across all pages
 * 
 * Handles: title, description, canonical URL, Open Graph, Twitter cards,
 * robots directives, and structured data.
 */

import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  /** Page title - will be prefixed with "THE LOST+UNFOUNDS | " unless noSuffix/noPrefix is true */
  title: string;
  /** Meta description (aim for 120-155 characters) */
  description: string;
  /** Canonical URL path (e.g., "/about") - auto-prefixed with domain */
  canonicalPath: string;
  /** Override the OG title (defaults to title) */
  ogTitle?: string;
  /** Override the OG description (defaults to description) */
  ogDescription?: string;
  /** OG image URL */
  ogImage?: string;
  /** OG type (defaults to "website") */
  ogType?: string;
  /** Whether to add noindex,nofollow */
  noIndex?: boolean;
  /** Skip the brand prefix on the title (use bare title only) */
  noSuffix?: boolean;
  /** Additional structured data (JSON-LD) */
  structuredData?: Record<string, any>;
}

const SITE_NAME = 'THE LOST+UNFOUNDS';
const SITE_URL = 'https://www.thelostandunfounds.com';
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

export default function SEOHead({
  title,
  description,
  canonicalPath,
  ogTitle,
  ogDescription,
  ogImage,
  ogType = 'website',
  noIndex = false,
  noSuffix = false,
  structuredData,
}: SEOHeadProps) {
  // Brand-first format: "THE LOST+UNFOUNDS | Page Name", or just "THE LOST+UNFOUNDS" on homepage.
  // If the caller already passed the brand, don't double it up.
  const trimmedTitle = title.trim();
  const isBareBrand = trimmedTitle.toUpperCase() === SITE_NAME;
  let fullTitle: string;
  if (noSuffix) {
    fullTitle = trimmedTitle;
  } else if (isBareBrand || !trimmedTitle) {
    fullTitle = SITE_NAME;
  } else {
    fullTitle = `${SITE_NAME} | ${trimmedTitle}`;
  }
  const canonicalUrl = `${SITE_URL}${canonicalPath}`;
  const resolvedOgImage = ogImage || DEFAULT_OG_IMAGE;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Robots */}
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:title" content={ogTitle || fullTitle} />
      <meta property="og:description" content={ogDescription || description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={ogType} />
      <meta property="og:image" content={resolvedOgImage} />
      <meta property="og:site_name" content={SITE_NAME} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={ogTitle || fullTitle} />
      <meta name="twitter:description" content={ogDescription || description} />
      <meta name="twitter:image" content={resolvedOgImage} />

      {/* Structured Data */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
}
