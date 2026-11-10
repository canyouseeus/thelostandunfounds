/**
 * Pulls what an SEO audit needs out of a page's raw HTML.
 *
 * Reads the HTML as a crawler without JavaScript sees it, the way Ahrefs Site
 * Audit does by default. That is what matters here: every public page is
 * pre-rendered (scripts/pre-render-*.ts), and the pre-rendered markup is what
 * search engines index first.
 *
 * Regex-based on purpose. The audit runs in a Vercel function, and the pages
 * are our own generated HTML, so a full DOM parser would add bundle size for
 * no gain. It handles quoted and unquoted attributes, comments, and skips
 * <script>/<style>/<template> bodies when looking for tags. <noscript> is kept:
 * a crawler that does not run JS (Ahrefs, this one) reads what is inside it as
 * markup, and the pre-rendered pages put their footer links there.
 */

export interface ParsedLink {
    href: string;
    rel: string;
    text: string;
}

export interface ParsedImage {
    src: string;
    /** null when the attribute is absent; '' when present but empty. */
    alt: string | null;
}

export interface ParsedPage {
    titles: string[];
    metaDescriptions: string[];
    h1: string[];
    canonicals: string[];
    /** Lower-cased content of <meta name="robots"> (and googlebot), joined. */
    metaRobots: string | null;
    lang: string | null;
    links: ParsedLink[];
    images: ParsedImage[];
    /** Raw text of each <script type="application/ld+json"> block. */
    jsonLd: string[];
    ogTitle: string | null;
    ogDescription: string | null;
    ogImage: string | null;
    wordCount: number;
}

const ENTITIES: Record<string, string> = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—',
    hellip: '…', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', copy: '©', reg: '®', trade: '™',
};

export function decodeEntities(s: string): string {
    return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
        if (code[0] === '#') {
            const n = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
            return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
        }
        return ENTITIES[code.toLowerCase()] ?? m;
    });
}

const squash = (s: string) => decodeEntities(s.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();

/** Attributes of one start tag, names lower-cased, values entity-decoded. */
export function parseAttrs(tag: string): Record<string, string> {
    const attrs: Record<string, string> = {};
    // Skip the tag name itself.
    const body = tag.replace(/^<\s*[a-z0-9:-]+/i, '').replace(/\/?>$/, '');
    const re = /([^\s"'=<>`/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(body))) {
        const name = m[1].toLowerCase();
        if (name in attrs) continue; // first one wins, as in browsers
        attrs[name] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? '');
    }
    return attrs;
}

function startTags(html: string, name: string): string[] {
    const re = new RegExp(`<${name}(?=[\\s/>])[^>]*>`, 'gi');
    return html.match(re) ?? [];
}

function elements(html: string, name: string): Array<{ tag: string; inner: string }> {
    const re = new RegExp(`(<${name}(?=[\\s/>])[^>]*>)([\\s\\S]*?)<\\/${name}\\s*>`, 'gi');
    const out: Array<{ tag: string; inner: string }> = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(html))) out.push({ tag: m[1], inner: m[2] });
    return out;
}

export function parseHtml(rawHtml: string): ParsedPage {
    const noComments = rawHtml.replace(/<!--[\s\S]*?-->/g, '');

    // JSON-LD is inside <script>, so read it before scripts are stripped.
    const jsonLd = elements(noComments, 'script')
        .filter(({ tag }) => /^application\/ld\+json$/i.test((parseAttrs(tag).type || '').trim()))
        .map(({ inner }) => inner.trim());

    const html = noComments.replace(/<(script|style|template)(?=[\s>])[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ');
    const head = html.match(/<head(?=[\s>])[^>]*>([\s\S]*?)<\/head\s*>/i)?.[1] ?? html;

    const titles = elements(head, 'title').map(({ inner }) => squash(inner));

    const metas = startTags(head, 'meta').map(parseAttrs);
    const metaNamed = (n: string) => metas.filter((a) => (a.name || '').toLowerCase() === n).map((a) => a.content ?? '');
    const metaProp = (p: string) => metas.find((a) => (a.property || '').toLowerCase() === p)?.content ?? null;

    const robots = [...metaNamed('robots'), ...metaNamed('googlebot')].map((s) => s.toLowerCase().trim()).filter(Boolean);

    const canonicals = startTags(head, 'link')
        .map(parseAttrs)
        .filter((a) => (a.rel || '').toLowerCase().split(/\s+/).includes('canonical'))
        .map((a) => (a.href || '').trim());

    const links = elements(html, 'a')
        .map(({ tag, inner }) => ({ attrs: parseAttrs(tag), inner }))
        .filter(({ attrs }) => attrs.href !== undefined)
        .map(({ attrs, inner }) => ({ href: attrs.href.trim(), rel: (attrs.rel || '').toLowerCase(), text: squash(inner) }));
    // An <a href> with no closing tag is rare in our output, but a crawler
    // should still see it.
    for (const tag of startTags(html, 'a')) {
        const a = parseAttrs(tag);
        if (a.href !== undefined && !links.some((l) => l.href === a.href.trim())) {
            links.push({ href: a.href.trim(), rel: (a.rel || '').toLowerCase(), text: '' });
        }
    }

    const images = startTags(html, 'img').map(parseAttrs).map((a) => ({
        src: (a.src || a['data-src'] || '').trim(),
        alt: 'alt' in a ? a.alt : null,
    }));

    const body = html.match(/<body(?=[\s>])[^>]*>([\s\S]*)<\/body\s*>/i)?.[1] ?? html;
    const text = squash(body);

    return {
        titles,
        metaDescriptions: metaNamed('description').map((s) => s.replace(/\s+/g, ' ').trim()),
        h1: elements(html, 'h1').map(({ inner }) => squash(inner)),
        canonicals,
        metaRobots: robots.length ? robots.join(', ') : null,
        lang: parseAttrs(startTags(rawHtml, 'html')[0] || '<html>').lang || null,
        links,
        images,
        jsonLd,
        ogTitle: metaProp('og:title'),
        ogDescription: metaProp('og:description'),
        ogImage: metaProp('og:image'),
        wordCount: text ? text.split(' ').length : 0,
    };
}

/** <loc> values of a sitemap, and whether it is a sitemap index. */
export function parseSitemap(xml: string): { isIndex: boolean; locs: string[] } {
    const isIndex = /<sitemapindex[\s>]/i.test(xml);
    const locs = [...xml.matchAll(/<loc>\s*(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?\s*<\/loc>/gi)]
        .map((m) => decodeEntities(m[1].trim()))
        .filter(Boolean);
    // <image:loc> entries never match <loc>, so an image sitemap yields its pages.
    return { isIndex, locs };
}

/** Sitemap: lines and Disallow rules for our user agent group from robots.txt. */
export function parseRobots(txt: string): { sitemaps: string[]; disallow: string[] } {
    const sitemaps: string[] = [];
    const disallow: string[] = [];
    let applies = false;
    let lastWasAgent = false;
    for (const rawLine of txt.split(/\r?\n/)) {
        const line = rawLine.replace(/#.*/, '').trim();
        if (!line) continue;
        const [k, ...rest] = line.split(':');
        const key = k.trim().toLowerCase();
        const value = rest.join(':').trim();
        if (key === 'sitemap') { sitemaps.push(value); continue; }
        if (key === 'user-agent') {
            const ua = value.toLowerCase();
            applies = lastWasAgent ? applies || ua === '*' : ua === '*';
            lastWasAgent = true;
            continue;
        }
        lastWasAgent = false;
        if (applies && key === 'disallow' && value) disallow.push(value);
    }
    return { sitemaps, disallow };
}
