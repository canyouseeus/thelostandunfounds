/**
 * GET /api/geo
 *
 * Tells the browser whether this visitor is in a jurisdiction where we ask for
 * consent before writing non-essential storage (analytics + affiliate
 * attribution).
 *
 * The country comes from Vercel's `x-vercel-ip-country` edge header — the same
 * signal `_analytics-handler.ts` already records — so no new data source and no
 * third-party geo-IP lookup is involved. We never see or store the raw IP here.
 *
 * The response varies per visitor, so it must never land in a shared cache:
 * one Swedish visitor's `consentRequired: true` served to everyone behind it
 * would silently gate the whole site, and the inverse would silently ungate it
 * for the EU. Hence `no-store` plus an explicit `Vary`.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * EU 27 + EEA (Iceland, Liechtenstein, Norway) + the UK.
 *
 * Switzerland (CH) is included deliberately. It is not covered by the EU
 * ePrivacy Directive, but its revised FADP runs close enough that the cost of
 * being wrong in the other direction — showing a banner to a visitor who did
 * not strictly need one — is a moment of friction, not a violation. When the
 * two error directions are that lopsided, over-include.
 */
const CONSENT_REQUIRED_COUNTRIES = new Set([
  // EU 27
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  // EEA non-EU
  'IS', 'LI', 'NO',
  // United Kingdom (UK GDPR + PECR)
  'GB',
  // Switzerland (revFADP) — see note above
  'CH',
])

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  res.setHeader('Cache-Control', 'no-store, max-age=0')
  res.setHeader('Vary', 'x-vercel-ip-country')

  const country = (req.headers['x-vercel-ip-country'] as string | undefined)?.toUpperCase() || null

  // Unknown country -> require consent. Local dev and any edge case where the
  // header is missing both land here, which is the direction that fails safe:
  // the worst outcome is a banner shown to someone who did not need it.
  const consentRequired = country === null || CONSENT_REQUIRED_COUNTRIES.has(country)

  return res.status(200).json({ country, consentRequired })
}
