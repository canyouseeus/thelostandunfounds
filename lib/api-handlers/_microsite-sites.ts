/**
 * The microsites the platform will accept a lead from, and where it is allowed
 * to send the visitor afterwards.
 *
 * This registry exists so `api/microsite/lead.ts` never has to trust the
 * request for anything that matters. The form posts a `site` id and a
 * `redirect` path; the endpoint resolves the id here and builds the redirect
 * from THIS origin plus a path it has validated. A request cannot name its own
 * origin, so the endpoint cannot be turned into an open redirect — which is
 * exactly the risk in a public, cross-origin, form-encoded POST that answers
 * with a 303.
 *
 * Adding a microsite means adding a row here. That is deliberate: a new site
 * should be a decision, not something a form field can assert.
 */

export interface MicrositeConfig {
    /** Matches `site.json` -> id, and is stored on the lead row. */
    id: string;
    /** Human-readable, used in the notification email subject. */
    label: string;
    /**
     * Every origin the site is served from, most canonical first. The first
     * entry is used when a request arrives with no usable Origin header.
     *
     * The preview origin is listed so the form is testable before the real
     * domain is registered. Remove it once the site is live if you would
     * rather the preview stopped producing real leads.
     */
    origins: string[];
}

export const MICROSITES: MicrositeConfig[] = [
    {
        id: 'austin-str-photography',
        label: 'Austin Short-Term Rental Photography',
        origins: [
            'https://austinairbnbphotography.com',
            'https://www.austinairbnbphotography.com',
            'https://austin-str-photography-preview.vercel.app',
        ],
    },
];

export function getMicrosite(id: unknown): MicrositeConfig | null {
    if (typeof id !== 'string') return null;
    return MICROSITES.find((s) => s.id === id) ?? null;
}

/**
 * Pick the origin to send the visitor back to.
 *
 * Prefers the Origin/Referer the browser reported, but only when it is one this
 * site actually claims — otherwise the site's canonical origin. Either way the
 * value comes from the registry above, never from the request, so an attacker
 * supplying `Origin: https://evil.example` gets redirected to the real site
 * rather than anywhere of their choosing.
 */
export function resolveOrigin(site: MicrositeConfig, requestOrigin?: string | null): string {
    if (requestOrigin) {
        const normalised = requestOrigin.replace(/\/+$/, '');
        const match = site.origins.find((o) => o === normalised);
        if (match) return match;
    }
    return site.origins[0];
}

/**
 * Validate a caller-supplied redirect path.
 *
 * Must be a single absolute path on the site. Anything that could escape to
 * another host is rejected rather than sanitised: a leading `//` or `/\` is a
 * protocol-relative URL, and a backslash is treated as a slash by some
 * browsers, so both are refused outright. Callers fall back to '/'.
 */
export function safeRedirectPath(path: unknown): string | null {
    if (typeof path !== 'string' || path.length === 0 || path.length > 256) return null;
    if (!path.startsWith('/')) return null;
    if (path.startsWith('//') || path.startsWith('/\\')) return null;
    if (/[\r\n]/.test(path)) return null;
    // No scheme, no host, no credentials — a path and an optional query only.
    if (!/^\/[A-Za-z0-9\-._~!$&'()*+,;=:@/%]*(\?[A-Za-z0-9\-._~!$&'()*+,;=:@/%?]*)?$/.test(path)) return null;
    return path;
}
