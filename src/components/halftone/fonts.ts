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
