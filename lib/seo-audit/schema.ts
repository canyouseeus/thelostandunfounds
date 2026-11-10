/**
 * Structured data (JSON-LD) checks.
 *
 * Two kinds of problem, matching what Ahrefs reported on this site:
 *   - the block is not valid JSON, or has no schema.org @context;
 *   - a type is missing a property Google needs for its rich result, or a
 *     property schema.org does not define for that type was used (the
 *     City.addressRegion error that failed all five service pages).
 *
 * This is a deliberate subset, not Google's Rich Results Test: it knows the
 * types this site emits. An unknown type is listed but not judged.
 */

export interface SchemaProblem {
    severity: 'error' | 'warning';
    message: string;
}

export interface SchemaResult {
    types: string[];
    problems: SchemaProblem[];
}

type Node = Record<string, unknown>;

/** Required properties: any one name in an inner array satisfies that slot. */
const REQUIRED: Record<string, Array<string | string[]>> = {
    Organization: ['name'],
    WebSite: ['name', 'url'],
    Person: ['name'],
    Article: ['headline'],
    BlogPosting: ['headline'],
    NewsArticle: ['headline'],
    TechArticle: ['headline'],
    Product: ['name', ['offers', 'review', 'aggregateRating']],
    ItemList: ['itemListElement'],
    BreadcrumbList: ['itemListElement'],
    ListItem: ['position'],
    FAQPage: ['mainEntity'],
    Question: ['name', 'acceptedAnswer'],
    Answer: ['text'],
    ImageObject: [['contentUrl', 'url']],
    Event: ['name', 'startDate', 'location'],
    LocalBusiness: ['name', 'address'],
    ProfessionalService: ['name', 'address'],
    Service: ['name'],
    OfferCatalog: ['itemListElement'],
};

/**
 * A Product's offers need a price for Google's product results. An Offer
 * elsewhere (an OfferCatalog of services, say) is valid without one, so this
 * is checked only under Product.offers.
 */
const PRODUCT_OFFER_REQUIRED: Record<string, Array<string | string[]>> = {
    Offer: [['price', 'priceSpecification'], 'priceCurrency'],
    AggregateOffer: ['lowPrice', 'priceCurrency'],
};

/** Properties schema.org does not define on these types (seen in real mistakes). */
const NOT_ON_TYPE: Record<string, string[]> = {
    City: ['addressRegion', 'addressCountry', 'postalCode', 'streetAddress'],
    State: ['addressRegion', 'addressCountry', 'postalCode', 'streetAddress'],
    Country: ['addressRegion', 'postalCode', 'streetAddress'],
    Organization: ['priceRange'],
    Person: ['priceRange', 'openingHours'],
};

const typesOf = (n: Node): string[] => {
    const t = n['@type'];
    return (Array.isArray(t) ? t : [t]).filter((x): x is string => typeof x === 'string');
};

const present = (v: unknown) =>
    v !== undefined && v !== null && !(typeof v === 'string' && v.trim() === '') && !(Array.isArray(v) && v.length === 0);

function walk(value: unknown, visit: (n: Node) => void): void {
    if (Array.isArray(value)) { value.forEach((v) => walk(v, visit)); return; }
    if (!value || typeof value !== 'object') return;
    const node = value as Node;
    if (node['@type']) visit(node);
    for (const [k, v] of Object.entries(node)) {
        if (k !== '@context') walk(v, visit);
    }
}

export function checkJsonLd(blocks: string[]): SchemaResult {
    const types = new Set<string>();
    const problems: SchemaProblem[] = [];
    const seen = new Set<string>();
    const add = (p: SchemaProblem) => {
        const key = `${p.severity}|${p.message}`;
        if (!seen.has(key)) { seen.add(key); problems.push(p); }
    };

    blocks.forEach((raw, i) => {
        let data: unknown;
        try {
            data = JSON.parse(raw);
        } catch (err: any) {
            add({ severity: 'error', message: `JSON-LD block ${i + 1} is not valid JSON (${String(err?.message || err).slice(0, 80)})` });
            return;
        }
        const roots = Array.isArray(data) ? data : [data];
        for (const root of roots) {
            if (!root || typeof root !== 'object') continue;
            const ctx = JSON.stringify((root as Node)['@context'] ?? '');
            if (!/schema\.org/i.test(ctx)) add({ severity: 'error', message: `JSON-LD block ${i + 1} has no schema.org @context` });
        }
        walk(data, (node) => {
            for (const t of typesOf(node)) {
                types.add(t);
                for (const slot of REQUIRED[t] ?? []) {
                    const names = Array.isArray(slot) ? slot : [slot];
                    if (!names.some((n) => present(node[n]))) {
                        add({ severity: 'error', message: `${t} is missing ${names.join(' or ')}` });
                    }
                }
                if (t === 'Product') {
                    const offers = node.offers;
                    for (const o of (Array.isArray(offers) ? offers : [offers])) {
                        if (!o || typeof o !== 'object') continue;
                        for (const ot of typesOf(o as Node)) {
                            for (const slot of PRODUCT_OFFER_REQUIRED[ot] ?? []) {
                                const names = Array.isArray(slot) ? slot : [slot];
                                if (!names.some((n) => present((o as Node)[n]))) {
                                    add({ severity: 'error', message: `Product ${ot} is missing ${names.join(' or ')}` });
                                }
                            }
                        }
                    }
                }
                for (const bad of NOT_ON_TYPE[t] ?? []) {
                    if (bad in node) add({ severity: 'error', message: `${t} does not take the property ${bad} (schema.org)` });
                }
            }
        });
    });

    return { types: [...types].sort(), problems };
}

/**
 * Which structured data each kind of page should carry, by path. A page type
 * not listed here only gets a notice when it has no JSON-LD at all.
 */
export interface PageTypeRule {
    pageType: string;
    test: (path: string) => boolean;
    expectAny: string[];
}

const ARTICLE_COLUMNS = ['thelostarchives', 'gearheads', 'borderlands', 'science', 'newtheory'];

export const PAGE_TYPE_RULES: PageTypeRule[] = [
    { pageType: 'home', test: (p) => p === '/', expectAny: ['Organization', 'WebSite'] },
    {
        pageType: 'article',
        test: (p) => {
            const [col, slug, extra] = p.split('/').filter(Boolean);
            if (col === 'blog') return Boolean(slug && extra);
            return ARTICLE_COLUMNS.includes(col) && Boolean(slug) && slug !== 'all' && !extra;
        },
        expectAny: ['BlogPosting', 'Article', 'TechArticle', 'NewsArticle'],
    },
    { pageType: 'service', test: (p) => /^\/services(\/|$)/.test(p), expectAny: ['ProfessionalService', 'LocalBusiness', 'Service'] },
    { pageType: 'gallery', test: (p) => /^\/gallery\/[^/]+\/?$/.test(p), expectAny: ['ImageObject', 'ImageGallery', 'CollectionPage', 'BreadcrumbList'] },
    { pageType: 'shop', test: (p) => p === '/shop', expectAny: ['ItemList', 'Product'] },
];

export function pageTypeOf(path: string): PageTypeRule | null {
    return PAGE_TYPE_RULES.find((r) => r.test(path)) ?? null;
}
