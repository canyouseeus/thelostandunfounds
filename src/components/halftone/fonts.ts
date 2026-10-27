/**
 * The site's typeface (Inter) for canvas text.
 *
 * The stylesheet names Inter but never ships it, so on most devices the site
 * falls back to the system font. A film positive cannot depend on what the
 * owner's phone happens to have installed, so the generator bundles Inter
 * itself and registers it as "TLU Inter" — a private name, so loading it here
 * changes nothing else on the page.
 */
import latin400 from '@fontsource/inter/files/inter-latin-400-normal.woff2?url'
import latin700 from '@fontsource/inter/files/inter-latin-700-normal.woff2?url'
import latin900 from '@fontsource/inter/files/inter-latin-900-normal.woff2?url'
import ext400 from '@fontsource/inter/files/inter-latin-ext-400-normal.woff2?url'
import ext700 from '@fontsource/inter/files/inter-latin-ext-700-normal.woff2?url'
import ext900 from '@fontsource/inter/files/inter-latin-ext-900-normal.woff2?url'

import type { Font } from 'opentype.js'
import { parse } from 'opentype.js'
import woffLatin400 from '@fontsource/inter/files/inter-latin-400-normal.woff?url'
import woffLatin700 from '@fontsource/inter/files/inter-latin-700-normal.woff?url'
import woffLatin900 from '@fontsource/inter/files/inter-latin-900-normal.woff?url'
import woffExt400 from '@fontsource/inter/files/inter-latin-ext-400-normal.woff?url'
import woffExt700 from '@fontsource/inter/files/inter-latin-ext-700-normal.woff?url'
import woffExt900 from '@fontsource/inter/files/inter-latin-ext-900-normal.woff?url'


const LATIN = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'
const LATIN_EXT = 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF'

const FACES: [string, string, string][] = [
  ['400', latin400, LATIN], ['700', latin700, LATIN], ['900', latin900, LATIN],
  ['400', ext400, LATIN_EXT], ['700', ext700, LATIN_EXT], ['900', ext900, LATIN_EXT],
]

let loading: Promise<void> | null = null

/** Resolves once every weight is ready to draw. Throws if a face fails to load. */
export function loadSiteFont(): Promise<void> {
  if (!loading) {
    loading = Promise.all(
      FACES.map(async ([weight, url, unicodeRange]) => {
        const face = new FontFace('TLU Inter', `url(${url}) format('woff2')`, { weight, unicodeRange })
        await face.load()
        document.fonts.add(face)
      }),
    ).then(() => undefined)
    loading.catch(() => { loading = null })
  }
  return loading
}

// --- Outlines ---------------------------------------------------------------------
//
// The film is a vector PDF, so its letters (and the 3 dot) are the typeface's
// own outlines, converted to shapes — the printed file never depends on a font.
// opentype.js reads WOFF (not WOFF2), so these load the .woff build.
export type Weight = 400 | 700 | 900
/** Per weight: the Latin font first, then Latin Extended for anything it lacks. */
export type OutlineFonts = Record<Weight, Font[]>

const WOFF: Record<Weight, string[]> = {
  400: [woffLatin400, woffExt400],
  700: [woffLatin700, woffExt700],
  900: [woffLatin900, woffExt900],
}

let outlines: Promise<OutlineFonts> | null = null

export function loadOutlineFonts(): Promise<OutlineFonts> {
  if (!outlines) {
    const load = async (url: string) => {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Font file ${res.status}`)
      return parse(await res.arrayBuffer())
    }
    outlines = (async () => {
      const entries = await Promise.all(
        (Object.keys(WOFF) as unknown as Weight[]).map(async w => [w, await Promise.all(WOFF[w].map(load))] as const),
      )
      return Object.fromEntries(entries) as unknown as OutlineFonts
    })()
    outlines.catch(() => { outlines = null })
  }
  return outlines
}
