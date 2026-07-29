/*
 * Collapses the built dist/ into one self-contained HTML file.
 *
 * For hosts that serve a single page and cannot fetch sibling assets or rewrite
 * unknown paths — the Claude artifact host, or an emailed attachment. The CSS
 * and JS are inlined and every image becomes a data URI, so the file has no
 * external dependencies at all.
 *
 * Expects a hash-router build (VITE_HASH_ROUTER=1), since there is no server to
 * rewrite /proposal to the entry document.
 *
 * Output has no <!doctype>, <html>, <head> or <body> wrapper: the artifact host
 * supplies those, and duplicating them nests a second document inside the body.
 *
 *   npm run build:single-file
 */
import { readFile, writeFile, readdir } from 'node:fs/promises'
import { join, extname } from 'node:path'

const DIST = 'dist'
const OUT = join(DIST, 'fadebox-preview.single.html')

const MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
}

// Every image in dist/, keyed by the root-relative URL the bundle references.
async function collectImages(dir, prefix = '') {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name)
    const url = `${prefix}/${entry.name}`
    if (entry.isDirectory()) {
      out.push(...(await collectImages(abs, url)))
    } else if (MIME[extname(entry.name).toLowerCase()]) {
      const mime = MIME[extname(entry.name).toLowerCase()]
      const b64 = (await readFile(abs)).toString('base64')
      out.push({ url, dataUri: `data:${mime};base64,${b64}` })
    }
  }
  return out
}

const html = await readFile(join(DIST, 'index.html'), 'utf8')

const cssHref = html.match(/<link[^>]+href="([^"]+\.css)"[^>]*>/)?.[1]
const jsSrc = html.match(/<script[^>]+src="([^"]+\.js)"[^>]*>/)?.[1]
if (!cssHref || !jsSrc) {
  throw new Error('Could not find the built CSS and JS in dist/index.html')
}

let css = await readFile(join(DIST, cssHref), 'utf8')
let js = await readFile(join(DIST, jsSrc), 'utf8')

const images = await collectImages(DIST)
// Longest URL first, so /a/b.png is never partially matched by /b.png.
images.sort((a, b) => b.url.length - a.url.length)

const inlined = []
for (const { url, dataUri } of images) {
  for (const ref of [url, url.slice(1)]) {
    const before = js + css
    js = js.split(ref).join(dataUri)
    css = css.split(ref).join(dataUri)
    if (js + css !== before) inlined.push(url)
  }
}

const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? 'Fadebox — Redesign Preview'

// The title tag is kept because the artifact host reads it for the tab name.
const single = `<title>${title}</title>
<style>
${css}
</style>

<div id="root"></div>

<script type="module">
${js}
</script>
`

await writeFile(OUT, single)

const kb = (n) => `${Math.round(n / 1024)} KB`
console.log(`css   ${kb(css.length)}`)
console.log(`js    ${kb(js.length)}`)
console.log(`inlined: ${[...new Set(inlined)].join(', ') || 'no images referenced'}`)
console.log(`unused in bundle: ${images.map((i) => i.url).filter((u) => !inlined.includes(u)).join(', ') || 'none'}`)
console.log(`\n→ ${OUT}  ${kb(single.length)}`)

const leftover = [...new Set([...single.matchAll(/(?:src|href)="(\/[^"]+)"/g)].map((m) => m[1]))]
if (leftover.length) {
  throw new Error(`Output still references external paths: ${leftover.join(', ')}`)
}
