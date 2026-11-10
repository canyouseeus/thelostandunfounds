/**
 * Length rules for the <title> and meta description every pre-render script
 * writes, shared so the scripts cannot drift apart.
 *
 * The limits are Ahrefs Site Audit's. Its Nov 2026 crawl flagged six blog posts
 * for "Title too long" (all over 70 characters once " | THE LOST+UNFOUNDS" was
 * appended, while a 62-character core title passed), five pages for "Meta
 * description too short" (the three galleries and two column pages, all under
 * 110) and the homepage for "Meta description too long" (165).
 */

export const BRAND_SUFFIX = ' | THE LOST+UNFOUNDS';
export const TITLE_MAX = 70;
export const DESCRIPTION_MIN = 110;
export const DESCRIPTION_MAX = 160;

/** Cut at the last word boundary that fits `max`, adding an ellipsis. */
function cutAtWord(text: string, max: number): string {
  if (text.length <= max) return text;
  const slice = text.slice(0, max - 1);
  const lastSpace = slice.lastIndexOf(' ');
  const base = (lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice).replace(/[\s,;:.\-–—|]+$/, '');
  return `${base}…`;
}

/**
 * Page <title> of at most TITLE_MAX characters.
 *
 * Keeps the brand suffix when it fits. When it doesn't, the page's own title is
 * worth more than the brand, so the suffix goes first. A title that is too long
 * on its own is shortened to the part before its colon ("The Leaders Who Walked
 * With Me: How Four…" → "The Leaders Who Walked With Me") when that part is a
 * real headline, otherwise cut at a word boundary.
 */
export function fitTitle(rawTitle: string, suffix = BRAND_SUFFIX, max = TITLE_MAX): string {
  let title = rawTitle.replace(/\s+/g, ' ').trim();
  if (title.length + suffix.length <= max) return `${title}${suffix}`;
  if (title.length > max) {
    const beforeColon = title.split(':')[0].trim();
    if (beforeColon !== title && beforeColon.length >= 20) title = beforeColon;
  }
  if (title.length + suffix.length <= max) return `${title}${suffix}`;
  return cutAtWord(title, max);
}

/**
 * Meta description between DESCRIPTION_MIN and DESCRIPTION_MAX characters.
 *
 * `extra` sentences are appended, in order, while the text is still short;
 * they must be true of the page they describe. Anything over the maximum is cut
 * at a word boundary.
 */
export function fitDescription(raw: string, extra: string[] = []): string {
  let text = raw.replace(/\s+/g, ' ').trim();
  for (const sentence of extra) {
    if (text.length >= DESCRIPTION_MIN) break;
    const s = sentence.trim();
    if (!s) continue;
    const joiner = !text ? '' : /[.!?…]$/.test(text) ? ' ' : '. ';
    text = `${text}${joiner}${s}`;
  }
  return cutAtWord(text, DESCRIPTION_MAX);
}

/**
 * JSON for an inline <script type="application/ld+json"> block. `<` is escaped
 * so a "</script>" inside any string (a product description, a post title)
 * cannot end the block early.
 */
export function jsonLd(value: unknown, space?: number): string {
  return JSON.stringify(value, null, space).replace(/</g, '\\u003c');
}
