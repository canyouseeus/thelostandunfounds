/**
 * SEO layer — meta tags, structured data, sitemap, robots.
 *
 * The structured data here is the part that does real work on a microsite.
 * A LocalBusiness node with a matching NAP (name / address / phone) is what
 * ties the site to a Google Business Profile, and the GBP is the actual
 * local ranking lever — an unlinked microsite is largely invisible for
 * "near me" and map-pack intent no matter how good the copy is.
 *
 * FAQPage markup is emitted from the same FAQ content the page renders,
 * so the two can never drift apart. Google requires that; mismatched FAQ
 * markup is a manual-action risk, not just a lost rich result.
 */

import { esc } from './render.mjs';

const json = (obj) =>
  `<script type="application/ld+json">${JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')}</script>`;

const abs = (site, path) => `https://${site.domain}${path}`;

/** The shared LocalBusiness node every other node points back at. */
function businessNode(site) {
  const { geo, business } = site;
  const node = {
    '@type': 'ProfessionalService',
    '@id': abs(site, '/#business'),
    name: site.brand,
    description: `${site.niche} in ${geo.city}, ${geo.region}.`,
    url: abs(site, '/'),
    email: business.email,
    priceRange: business.priceRange,
    parentOrganization: { '@type': 'Organization', name: business.legalName, url: business.parentUrl },
    address: {
      '@type': 'PostalAddress',
      addressLocality: geo.city,
      addressRegion: geo.region,
      postalCode: geo.postalCode,
      addressCountry: geo.country,
    },
    areaServed: {
      '@type': 'GeoCircle',
      geoMidpoint: { '@type': 'GeoCoordinates', latitude: geo.lat, longitude: geo.lng },
      geoRadius: Math.round(geo.serviceRadiusMiles * 1609.34),
    },
    sameAs: business.sameAs,
  };
  // Only emit a phone when a real one is configured. A placeholder in
  // structured data is worse than an absent field — it publishes a NAP
  // that will never match the Google Business Profile.
  if (/^\+?[\d\s().-]{10,}$/.test(business.phone)) node.telephone = business.phone;
  return node;
}

function offerCatalog(site) {
  return {
    '@type': 'Service',
    '@id': abs(site, '/#service'),
    serviceType: site.niche,
    provider: { '@id': abs(site, '/#business') },
    areaServed: { '@type': 'City', name: `${site.geo.city}, ${site.geo.region}` },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: `${site.niche} pricing`,
      itemListElement: site.services.map((s) => ({
        '@type': 'Offer',
        name: s.name,
        price: s.price,
        priceCurrency: 'USD',
        description: `${s.photos}, ${s.turnaround} delivery.`,
      })),
    },
  };
}

function faqNode(site, page) {
  const faqs = page.blocks.filter((b) => b.type === 'faq').flatMap((b) => b.items);
  if (!faqs.length) return null;
  return {
    '@type': 'FAQPage',
    '@id': abs(site, pathOf(page)) + '#faq',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

function breadcrumbs(site, page) {
  if (!page.slug) return null;
  const parts = pathOf(page).split('/').filter(Boolean);
  const items = [{ '@type': 'ListItem', position: 1, name: 'Home', item: abs(site, '/') }];
  let acc = '';
  parts.forEach((p, i) => {
    acc += `/${p}`;
    items.push({
      '@type': 'ListItem',
      position: i + 2,
      name: i === parts.length - 1 ? page.h1 : p.replace(/-/g, ' '),
      item: abs(site, acc + '/'),
    });
  });
  return { '@type': 'BreadcrumbList', itemListElement: items };
}

export const pathOf = (page) => (page.slug ? `/${page.slug}/` : '/');

/**
 * Marker comments around the injected third-party head scripts.
 *
 * Two jobs. They make it obvious in view-source where our markup stops and a
 * vendor's begins, and they give the design gate a region to skip: a
 * call-tracking or analytics snippet may contain inline styles with shadows or
 * borders, and failing our own build over a vendor's CSS would be a false
 * positive on code we do not control.
 */
export const HEAD_SCRIPTS_OPEN = '<!-- head-scripts:start -->';
export const HEAD_SCRIPTS_CLOSE = '<!-- head-scripts:end -->';

/** Build the full <head> contents for one page. */
export function head(site, page, { draft }) {
  const url = abs(site, pathOf(page));
  const graph = [businessNode(site), offerCatalog(site), breadcrumbs(site, page), faqNode(site, page)].filter(
    Boolean
  );

  // Owner-configured analytics / call-tracking markup, injected verbatim —
  // escaping it would break every snippet. Never populate from user input.
  // Draft builds omit it so preview traffic is not counted as real leads.
  const injected =
    !draft && site.analytics?.headScripts
      ? `${HEAD_SCRIPTS_OPEN}\n${site.analytics.headScripts}\n${HEAD_SCRIPTS_CLOSE}`
      : '';

  return [
    `<title>${esc(page.title)}</title>`,
    `<meta name="description" content="${esc(page.description)}">`,
    `<link rel="canonical" href="${url}">`,
    // A draft build must never be indexable. This is the guard against
    // pushing a half-finished microsite live and having it crawled. Some
    // pages are noindex on their own merits too — a form's thank-you page
    // has no search value and should not be reachable without submitting.
    draft || page.noindex
      ? '<meta name="robots" content="noindex,nofollow">'
      : '<meta name="robots" content="index,follow,max-image-preview:large">',
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${esc(site.brand)}">`,
    `<meta property="og:title" content="${esc(page.title)}">`,
    `<meta property="og:description" content="${esc(page.description)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="geo.region" content="${esc(site.geo.country)}-${esc(site.geo.region)}">`,
    `<meta name="geo.placename" content="${esc(site.geo.city)}">`,
    `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`,
    json({ '@context': 'https://schema.org', '@graph': graph }),
    injected,
  ]
    .filter(Boolean)
    .join('\n');
}

export function sitemap(site, pages) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = pages
    // A noindex page in a sitemap is a contradictory signal: the sitemap asks
    // for crawling, the meta tag refuses indexing. Leave it out entirely.
    .filter((p) => !p.noindex)
    .map((p) => {
      // Home carries top priority; money pages above informational ones.
      // Trust pages are indexable but never compete with the money pages.
      const pr = !p.slug ? '1.0' : p.type === 'legal' ? '0.3' : p.type === 'guide' ? '0.6' : '0.8';
      return `  <url><loc>${abs(site, pathOf(p))}</loc><lastmod>${today}</lastmod><priority>${pr}</priority></url>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

export function robots(site, { draft }) {
  if (draft) return 'User-agent: *\nDisallow: /\n';
  return `User-agent: *
Allow: /

Sitemap: ${abs(site, '/sitemap.xml')}
`;
}
