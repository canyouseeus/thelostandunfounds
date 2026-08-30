/**
 * Trust and legal pages.
 *
 * Ported from the pattern in Rank Expand Academy's One-Click Builder, which
 * ships a set of these with every site. The idea is sound and was a real gap
 * here: an About page, a real FAQ, a privacy policy and an accessibility
 * statement are ordinary trust signals, and a site that collects personal
 * data through a form needs a privacy policy whether or not it helps rankings.
 *
 * Two deliberate departures from the source pattern:
 *
 *   1. Not all twelve. "Meet the Team" and "Careers" would mean inventing
 *      staff and vacancies for a solo operator, and a "Complaints Policy"
 *      duplicates Contact. Fabricated trust pages are worse than absent ones,
 *      so those are dropped. "Referral Marketing Disclosure" is dropped
 *      because this microsite runs no affiliate program — the parent platform
 *      does, and that disclosure belongs there.
 *
 *   2. The privacy policy is generated from `site.quoteForm.fields`, not
 *      written as prose. Every field tagged `personalData` appears in the
 *      policy automatically, so adding a field to the form updates the policy
 *      in the same commit. The usual failure of a boilerplate privacy policy
 *      is describing data collection that does not match the actual form;
 *      here that cannot happen.
 *
 * None of this is legal advice, and none of it is a substitute for review.
 * The `legal` gate in build.mjs blocks a production build until a human
 * confirms they have read these pages.
 */

const YEAR = new Date().getFullYear();

/** Pages that exist to be trusted, not to rank. */
export function legalPages(site) {
  const { business, geo, legal, quoteForm } = site;
  const collected = quoteForm.fields.filter((f) => f.personalData).map((f) => f.personalData);

  return [
    {
      slug: 'about',
      type: 'legal',
      title: `About ${site.brand}`,
      description: `${site.brand} is the Austin short-term rental photography service of ${business.legalName}. Who we are, what we shoot, and how we work.`,
      h1: `About ${site.brand}`,
      blocks: [
        {
          type: 'prose',
          body: [
            `${site.brand} is the ${geo.city} short-term rental photography arm of ${business.legalName}, a creative studio working across photography, video and web.`,
            `We shoot Airbnb, VRBO and direct-booking listings across the ${geo.city} metro — everything inside a ${geo.serviceRadiusMiles}-mile radius of downtown, which reaches Round Rock, Cedar Park, Lakeway, Dripping Springs, Buda and Kyle.`,
          ],
        },
        {
          type: 'prose',
          heading: 'How we work',
          body: [
            'Flat rates by bedroom count, published on the pricing page rather than quoted on a call. One to two hours on site. Edited sets back in 24 to 72 hours, ordered for upload. Full commercial rights to every frame, with no watermark and no per-platform licensing.',
            'Most of the owners we shoot for are not in the room when we shoot, and several are not in Texas. A lockbox code is a normal way for us to start a job.',
          ],
        },
        {
          type: 'prose',
          heading: 'The parent studio',
          body: [
            `${business.legalName} handles the wider creative and operational work — brand, editorial, web and systems. Short-term rental photography is a specific service with its own pricing, which is why it has its own site. Reach the studio at ${business.parentUrl}.`,
          ],
        },
        {
          type: 'cta',
          heading: 'Work with us',
          body: 'Send the address and bedroom count for a fixed price the same day.',
          button: { label: 'Request a quote', href: '/contact/' },
        },
      ],
    },

    {
      slug: 'faq',
      type: 'legal',
      title: 'Airbnb Photography FAQ | Austin',
      description: 'Answers on cost, turnaround, access, image rights, prep and add-ons for Airbnb and short-term rental photography in Austin, TX.',
      h1: 'Frequently Asked Questions',
      blocks: [
        {
          type: 'faq',
          heading: 'Booking and pricing',
          items: [
            { q: 'How much does a shoot cost?', a: 'A studio or 1BR is $195 flat, 2BR is $265, 3BR is $335, and 4BR or luxury properties start at $425. Add-ons are $125 for twilight exteriors, $150 for drone and $200 for a 3D virtual tour. There is no travel fee within 40 miles of downtown Austin.' },
            { q: 'Do you charge by the hour?', a: 'No. The price is fixed by bedroom count before the shoot. If a property takes longer than expected, that is our problem rather than a line on your invoice.' },
            { q: 'How do I book?', a: 'Send the property address and bedroom count through the quote form. You get a fixed price back the same day, then we schedule around your turnover window.' },
            { q: 'Do you work with property managers?', a: 'Yes. Portfolio rates are quoted per portfolio rather than per unit. Over three properties, get in touch instead of booking them individually.' },
          ],
        },
        {
          type: 'faq',
          heading: 'The shoot',
          items: [
            { q: 'How long does it take?', a: 'One to two hours for most properties. A studio is usually under an hour; a 4BR with a pool and outdoor space can run past two.' },
            { q: 'Do I need to be there?', a: 'No. A lockbox code, smart-lock code, or your cleaner letting us in all work.' },
            { q: 'When is the best time to shoot?', a: 'The gap between a checkout and the next check-in, right after the cleaner finishes. The unit is already staged and empty.' },
            { q: 'What should I do to prepare?', a: 'Work through the prep checklist on this site. Preparation affects the final set more than any add-on you can buy — the camera does not fix a wrinkled duvet or a cluttered counter.' },
          ],
        },
        {
          type: 'faq',
          heading: 'Delivery and rights',
          items: [
            { q: 'When do I get the photos?', a: '24 to 72 hours. If a listing is going live on a deadline, say so when booking and we will schedule to hit it.' },
            { q: 'Do I own the images?', a: 'Yes — full commercial rights, no watermark, no expiry, no per-platform licensing. Use them on Airbnb, VRBO, Booking.com, your own site and in paid ads.' },
            { q: 'What if I do not like a shot?', a: 'Any frame you are not happy with gets reshot free within 14 days.' },
            { q: 'What format are they delivered in?', a: 'High-resolution files plus web-sized copies, numbered in booking order so the folder can be uploaded as-is.' },
          ],
        },
        {
          type: 'cta',
          heading: 'Still have a question',
          body: `Email ${business.email} and you will get a real answer, not a booking funnel.`,
          button: { label: 'Ask us', href: '/contact/' },
        },
      ],
    },

    {
      slug: 'privacy-policy',
      type: 'legal',
      title: 'Privacy Policy | Austin STR Photography',
      description: `How ${site.brand} collects, uses and stores the personal information you send through this site, and how to have it deleted.`,
      h1: 'Privacy Policy',
      blocks: [
        {
          type: 'prose',
          body: [
            `This policy covers ${site.domain}, operated by ${business.legalName}. Last updated ${YEAR}.`,
            'The short version: the only personal information this site collects is what you type into the quote form, we use it to answer your enquiry, and we do not sell it.',
          ],
        },
        {
          type: 'checklist',
          heading: 'What we collect',
          intro: 'The quote form on this site asks for:',
          items: collected.map((c) => c.charAt(0).toUpperCase() + c.slice(1)),
        },
        {
          type: 'prose',
          heading: 'Why we collect it',
          body: [
            'To price your shoot, to schedule it, and to contact you about it. The property address is needed because pricing depends on location and travel radius. Nothing here is used for automated decision-making or profiling.',
          ],
        },
        {
          type: 'prose',
          heading: 'Who else sees it',
          body: [
            `Your enquiry passes through ${legal.dataProcessors.length} service${legal.dataProcessors.length === 1 ? '' : 's'}: ${legal.dataProcessors.join('; and ')}. We do not sell your information, and we do not share it with advertisers or data brokers.`,
          ],
        },
        {
          type: 'prose',
          heading: 'Cookies and tracking',
          body: [
            legal.cookies === 'none'
              ? 'This site sets no cookies of its own and runs no advertising trackers. If analytics are in use they are configured to count visits without identifying individuals.'
              : legal.cookies,
          ],
        },
        {
          type: 'prose',
          heading: 'How long we keep it',
          body: [legal.retention],
        },
        {
          type: 'prose',
          heading: 'Your choices',
          body: [
            `Email ${business.email} to ask what we hold about you, to correct it, or to have it deleted. We will action a deletion request unless we are required to keep a record of a completed transaction. Texas residents have rights under the Texas Data Privacy and Security Act; if you are covered by the GDPR or the CCPA, the same address is the one to write to.`,
          ],
        },
        {
          type: 'prose',
          heading: 'Contact',
          body: [`${business.legalName}, ${geo.city}, ${geo.region}. ${business.email}.`],
        },
      ],
    },

    {
      slug: 'terms',
      type: 'legal',
      title: 'Terms of Service | Austin STR Photography',
      description: `The terms covering photography services booked through ${site.domain} — scope, payment, rescheduling, and image rights.`,
      h1: 'Terms of Service',
      blocks: [
        {
          type: 'prose',
          body: [
            `These terms cover photography services booked through ${site.domain} from ${business.legalName}. Last updated ${YEAR}. A specific written quote or contract for your shoot takes precedence over anything here.`,
          ],
        },
        {
          type: 'prose',
          heading: 'Quotes and scope',
          body: [
            'Prices shown on this site are for the property types described and are confirmed in writing before a shoot. A quote covers the bedroom count quoted; a materially larger property is re-quoted before we shoot rather than billed as an overage.',
          ],
        },
        {
          type: 'prose',
          heading: 'Access and scheduling',
          body: [
            'You are responsible for arranging access and for the property being clean and staged at the scheduled time. If we cannot get in, or the property is not ready to shoot, we will reschedule — the first reschedule is free.',
          ],
        },
        {
          type: 'prose',
          heading: 'Delivery and revisions',
          body: [
            'Edited sets are delivered within the turnaround stated for your tier. Any frame you are not satisfied with will be reshot at no charge within 14 days of delivery.',
          ],
        },
        {
          type: 'prose',
          heading: 'Image rights',
          body: [
            'On payment you receive full commercial rights to the delivered images, with no watermark, no expiry and no per-platform restriction. We retain the right to show the work in our own portfolio and marketing; tell us before the shoot if you would rather we did not, and we will not.',
          ],
        },
        {
          type: 'prose',
          heading: 'Liability',
          body: [
            'Our liability for any claim arising from a shoot is limited to the amount paid for that shoot. We carry our own equipment insurance and are not responsible for pre-existing conditions at a property.',
          ],
        },
        {
          type: 'prose',
          heading: 'Governing law',
          body: [`These terms are governed by the laws of ${legal.governingLaw}.`],
        },
      ],
    },

    {
      slug: 'accessibility',
      type: 'legal',
      title: 'Accessibility Statement | Austin STR Photography',
      description: `How ${site.domain} approaches accessibility, the standard we build to, and how to report a barrier.`,
      h1: 'Accessibility',
      blocks: [
        {
          type: 'prose',
          body: [
            `We build this site to ${legal.accessibilityTarget}. That means semantic headings in order, text that reflows without horizontal scrolling down to a 320-pixel viewport, form fields with real labels, a visible keyboard focus indicator on every interactive element, and colour contrast that meets the standard.`,
            'The site is tested at 320, 360, 375, 414, 768 and 1280 pixels wide, and every page is usable with a keyboard alone.',
          ],
        },
        {
          type: 'prose',
          heading: 'Known limitations',
          body: [
            'We are honest about the gaps rather than claiming full conformance. This statement describes what we build to and test for, not a certified audit. We have not had the site independently audited, and we have not tested it with every combination of screen reader and browser.',
          ],
        },
        {
          type: 'prose',
          heading: 'Report a barrier',
          body: [
            `If something on this site is not usable for you, email ${business.email} and tell us what happened and what you were using. We will fix it and reply. Accessibility problems are treated as bugs, not feature requests.`,
          ],
        },
      ],
    },

    {
      slug: 'thank-you',
      type: 'legal',
      noindex: true, // A form redirect target has no search value and should
      // never appear in results without its form having been submitted.
      title: 'Thank you | Austin STR Photography',
      description: 'Your enquiry has been received. We reply with a fixed price the same day.',
      h1: 'Thank You',
      blocks: [
        {
          type: 'prose',
          body: [
            'Your enquiry is in. You will get a fixed price back the same day — not a range, and not a discovery call first.',
            `If you do not hear from us within a business day, check your spam folder and then email ${business.email} directly. That address is monitored by a person.`,
          ],
        },
        {
          type: 'prose',
          heading: 'While you wait',
          body: [
            'The prep checklist is the highest-value thing you can do before a shoot. Working through it affects the final photo set more than any add-on on the price list.',
          ],
        },
        {
          type: 'cta',
          heading: 'Read the prep checklist',
          body: 'Room by room, what to do the night before and the morning of.',
          button: { label: 'Open the checklist', href: '/how-to-prep-your-airbnb-for-photos/' },
        },
      ],
    },
  ];
}
