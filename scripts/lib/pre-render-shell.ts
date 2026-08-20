/**
 * Shared helper for swapping the SPA shell's pre-render block.
 *
 * Why this exists:
 * All three pre-render scripts used to do the swap with
 *
 *   html.replace(/<div id="pre-render"[^>]*>[\s\S]*?<\/div>/i, ...)
 *
 * which is non-greedy and therefore stops at the FIRST `</div>` — but the block
 * in index.html nests several divs. The tail of the original block survived the
 * replacement and shipped on every pre-rendered page: an opacity:0 nav with
 * pointer-events:auto, linking to /about, /shop, /events and friends. Crawlers
 * read those hidden links on every URL on the site, and the leftover text ("Enter
 * Site About Shop Events...") led the body copy of every pre-rendered page.
 *
 * The block is always immediately followed by `<div id="root">`, so anchoring the
 * end of the match to that marker replaces the element whole, nesting and all.
 */

const ROOT_MARKER = '<div id="root">';

/** Matches the pre-render block from its opening tag up to (not including) #root. */
const PRE_RENDER_BLOCK = /<div id="pre-render"[\s\S]*?(?=<div id="root">)/i;

/**
 * Replace the shell's pre-render block with `replacement`, or insert it before
 * #root when the shell has no block yet. Returns the updated HTML.
 */
export function replacePreRenderBlock(html: string, replacement: string): string {
  if (PRE_RENDER_BLOCK.test(html)) {
    return html.replace(PRE_RENDER_BLOCK, `${replacement}\n  `);
  }
  return html.replace(ROOT_MARKER, `${replacement}\n  ${ROOT_MARKER}`);
}
