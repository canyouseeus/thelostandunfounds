/**
 * Everything the screen (halftone) generator draws, as pure functions.
 * The on-screen loupe and the downloaded film positive run through the same
 * `renderRegion`, so the dots you inspect are the dots that print.
 *
 * Units: the page is measured in inches. The screen is a grid of cells
 * `1 / lpi` inches square, turned by `angle`. Each cell holds a dot — a
 * triangle or a "3" — and, as in Photoshop's Halftone Screen, every output
 * pixel is decided by the photo's tone at that pixel, so the dot is sized by
 * the tone and cut by any edge running through the cell. Coverage is exact: it comes from a measured lookup table,
 * not from the shape's nominal area, so a 40% grey prints as 40% ink.
 *
 * Output is a 1-bit PNG (black = ink) tagged with its DPI, the format a
 * film-positive printer or RIP expects.
 */

export type DotShape = 'triangle' | 'three'
export type PrintSize = '18x24' | '8.5x11'
export type Orientation = 'portrait' | 'landscape'

export const PRINT_SIZES: Record<PrintSize, { w: number; h: number; label: string }> = {
  '18x24': { w: 18, h: 24, label: '18 × 24 IN' },
  '8.5x11': { w: 8.5, h: 11, label: '8.5 × 11 IN' },
}

export function pageInches(size: PrintSize, orientation: Orientation): { w: number; h: number } {
  const s = PRINT_SIZES[size]
  return orientation === 'portrait' ? { w: s.w, h: s.h } : { w: s.h, h: s.w }
}

/**
 * Lines per inch for a mesh count. The usual screen-printing rule is
 * mesh ÷ 4.5 (anything from ÷4 to ÷5 holds); rounded to a 5 so 250 mesh
 * gives the standard 55 LPI.
 */
export function recommendedLpi(mesh: number): number {
  return Math.max(5, Math.round(mesh / 4.5 / 5) * 5)
}

/** Single-colour work runs at 22.5° to keep the dots off the mesh threads (moiré). */
export const DEFAULT_ANGLE = 22.5
export const DEFAULT_MESH = 250

export interface ScreenSettings {
  lpi: number
  angle: number // degrees
  shape: DotShape
  /** Darkness below this prints nothing — a smaller dot would not hold in the mesh. */
  minDot: number
  /** Darkness above this prints solid — a bigger gap would plug. */
  maxDot: number
  /** Wrong-reading film, for printing emulsion-side down. */
  mirror: boolean
}

export interface ToneSettings {
  brightness: number // -1..1
  contrast: number // -1..1
  /** Photo negative — for white ink on a dark garment. */
  invert: boolean
}

/**
 * Where the photo sits on the page. The photo is never cropped: it keeps the
 * camera's own shape (3:2 for a Fujifilm X body) and only resizes
 * proportionally. `scale` is a fraction of the largest size that fits the
 * page; `cx`/`cy` are the frame's centre as fractions of page width / height.
 */
export interface PhotoFrame {
  scale: number
  cx: number
  cy: number
}
export const DEFAULT_FRAME: PhotoFrame = { scale: 0.8, cx: 0.5, cy: 0.5 }
export const FRAME_SCALE_MIN = 0.2
export const FRAME_SCALE_MAX = 1

/** Fujifilm X-series sensors are 3:2; used for the empty frame before a photo is chosen. */
export const FUJI_ASPECT = 3 / 2

export interface PhotoSource {
  source: CanvasImageSource
  width: number
  height: number
}

export interface TextStyle {
  weight: 400 | 700 | 900
  /** Font size in inches (shrunk automatically if a line would not fit the page width). */
  size: number
  /** Letter spacing, in ems. */
  tracking: number
  uppercase: boolean
}

/** A laid-out block of text, in page inches. Text always prints as solid ink. */
export interface TextBlock {
  lines: string[]
  weight: number
  size: number
  tracking: number
  cx: number
  cy: number
  width: number
  height: number
  /** True when the block runs off the page — the frame needs to be smaller or moved. */
  offPage: boolean
}

/** The site's typeface, registered for canvas under its own name (see fonts.ts). */
export const TEXT_FAMILY = '"TLU Inter", Inter, system-ui, sans-serif'

/** Page orientation follows the photo: horizontal photo, landscape page. */
export function orientationFor(photo: { width: number; height: number } | null): Orientation {
  return photo && photo.width > photo.height ? 'landscape' : 'portrait'
}

export function photoAspect(photo: { width: number; height: number } | null, orientation: Orientation): number {
  if (photo) return photo.width / photo.height
  return orientation === 'landscape' ? FUJI_ASPECT : 1 / FUJI_ASPECT
}

/** The photo's rectangle on the page, in inches. */
export function frameRect(page: { w: number; h: number }, aspect: number, f: PhotoFrame) {
  const fitW = Math.min(page.w, page.h * aspect)
  const w = fitW * f.scale
  const h = w / aspect
  return { x: f.cx * page.w - w / 2, y: f.cy * page.h - h / 2, w, h }
}

/** Keep the frame's size in range and the whole frame on the page. */
export function clampFrame(f: PhotoFrame, page: { w: number; h: number }, aspect: number): PhotoFrame {
  const scale = Math.min(FRAME_SCALE_MAX, Math.max(FRAME_SCALE_MIN, f.scale))
  const r = frameRect(page, aspect, { ...f, scale })
  const hx = r.w / 2 / page.w
  const hy = r.h / 2 / page.h
  return {
    scale,
    cx: Math.min(1 - hx, Math.max(hx, f.cx)),
    cy: Math.min(1 - hy, Math.max(hy, f.cy)),
  }
}

// --- Tone ---------------------------------------------------------------------

/** Ink darkness (0 = paper, 1 = solid) per pixel of the page at `pxPerIn`. */
export interface ToneMap {
  w: number
  h: number
  pxPerIn: number
  dark: Float32Array
}

export function applyTone(lum: number, t: ToneSettings): number {
  const c = Math.max(-0.99, Math.min(0.99, t.contrast))
  const k = c >= 0 ? 1 / (1 - c) : 1 + c
  let l = (lum - 0.5) * k + 0.5 + t.brightness * 0.5
  l = l < 0 ? 0 : l > 1 ? 1 : l
  return t.invert ? l : 1 - l
}

/**
 * Draw the photo, uncropped, into its frame on a white page `w` × `h` px. The
 * canvas's pixel (0,0) is page pixel (originX, originY), so a strip or a
 * loupe can be painted at full output resolution; `mirror` flips it with the
 * film. The preview, the loupe and the film all go through here.
 */
export function drawPhoto(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  photo: PhotoSource | null,
  frame: PhotoFrame,
  originX = 0,
  originY = 0,
  mirror = false,
) {
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  if (photo) {
    ctx.setTransform(mirror ? -1 : 1, 0, 0, 1, mirror ? w - originX : -originX, -originY)
    // Work in page pixels: frameRect's inches scale by the same factor on both axes.
    const r = frameRect({ w, h }, photo.width / photo.height, frame)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(photo.source, r.x, r.y, r.w, r.h)
  }
  ctx.restore()
}

export function buildToneMap(
  page: { w: number; h: number },
  pxPerIn: number,
  photo: PhotoSource | null,
  frame: PhotoFrame,
  tone: ToneSettings,
): ToneMap {
  const w = Math.max(1, Math.round(page.w * pxPerIn))
  const h = Math.max(1, Math.round(page.h * pxPerIn))
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  drawPhoto(ctx, w, h, photo, frame)
  const px = ctx.getImageData(0, 0, w, h).data
  const dark = new Float32Array(w * h)
  for (let i = 0, p = 0; i < dark.length; i++, p += 4) {
    const lum = (0.2126 * px[p] + 0.7152 * px[p + 1] + 0.0722 * px[p + 2]) / 255
    dark[i] = applyTone(lum, tone)
  }
  // Release the canvas backing store now; iOS counts it against a small budget.
  c.width = c.height = 0
  return { w, h, pxPerIn: w / page.w, dark }
}

// --- Dot shapes ---------------------------------------------------------------

/**
 * A dot shape as a bitmap over the unit box [-0.5, 0.5]², upright.
 * At scale k the shape spans k cells; anything past the cell edge is clipped,
 * so each pixel only ever asks its own cell.
 */
export interface ShapeMask {
  n: number
  data: Uint8Array
}

const MASK_N = 512

/** Equilateral triangle, point up, side = 1, centred on its bounding box. */
export function triangleMask(): ShapeMask {
  const n = MASK_N
  const data = new Uint8Array(n * n)
  const h = Math.sqrt(3) / 2
  for (let r = 0; r < n; r++) {
    const y = (r + 0.5) / n - 0.5
    for (let c = 0; c < n; c++) {
      const x = (c + 0.5) / n - 0.5
      if (y <= h / 2 && Math.sqrt(3) * Math.abs(x) <= y + h / 2) data[r * n + c] = 1
    }
  }
  return { n, data }
}

/** The numeral 3 in the site's typeface, its glyph box fitted to the unit box. */
export function glyphMask(glyph: string, weight: number, family: string): ShapeMask {
  const n = MASK_N
  const c = document.createElement('canvas')
  c.width = c.height = n
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  const probe = 100
  ctx.font = `${weight} ${probe}px ${family}`
  const m = ctx.measureText(glyph)
  const gw = m.actualBoundingBoxLeft + m.actualBoundingBoxRight
  const gh = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent
  const fit = (n * 0.98) / Math.max(gw, gh)
  ctx.font = `${weight} ${probe * fit}px ${family}`
  ctx.fillStyle = '#000'
  ctx.textBaseline = 'alphabetic'
  const left = (n - gw * fit) / 2 + m.actualBoundingBoxLeft * fit
  const base = (n - gh * fit) / 2 + m.actualBoundingBoxAscent * fit
  ctx.fillText(glyph, left, base)
  const px = ctx.getImageData(0, 0, n, n).data
  const data = new Uint8Array(n * n)
  for (let i = 0; i < data.length; i++) data[i] = px[i * 4 + 3] >= 128 ? 1 : 0
  c.width = c.height = 0
  return { n, data }
}

/** Ink coverage of one cell holding the shape at scale k (clipped to the cell). */
function coverageAt(mask: ShapeMask, k: number, grid = 64): number {
  if (k <= 0) return 0
  let hit = 0
  const { n, data } = mask
  for (let r = 0; r < grid; r++) {
    const my = Math.floor((((r + 0.5) / grid - 0.5) / k + 0.5) * n)
    if (my < 0 || my >= n) continue
    for (let c = 0; c < grid; c++) {
      const mx = Math.floor((((c + 0.5) / grid - 0.5) / k + 0.5) * n)
      if (mx >= 0 && mx < n && data[my * n + mx]) hit++
    }
  }
  return hit / (grid * grid)
}

/**
 * Darkness → cell code. Codes: 0 = paper; +k = ink shape at scale k;
 * -k = paper shape at scale k on a solid cell; SOLID = solid ink.
 *
 * Triangles grow past the cell edge (clipped) until the cell is solid — the
 * gaps left in the shadows are themselves little triangles. A "3" can never
 * fill its cell, so past 50% it flips to a paper-white 3 on solid ink: the
 * shape stays legible from highlight to shadow and the tone stays exact.
 */
export const SOLID = 1e6
const LUT_N = 1024

export interface DotTable {
  shape: DotShape
  mask: ShapeMask
  codes: Float32Array // LUT_N + 1 entries, indexed by round(darkness * LUT_N)
}

export function buildDotTable(shape: DotShape, mask: ShapeMask): DotTable {
  const kMax = shape === 'triangle' ? 3.3 : 2.2
  const steps = 600
  const ks = new Float32Array(steps + 1)
  const cov = new Float32Array(steps + 1)
  let best = 0
  for (let s = 0; s <= steps; s++) {
    const k = (kMax * s) / steps
    best = Math.max(best, coverageAt(mask, k))
    ks[s] = k
    cov[s] = best // running max: never pick a bigger dot for less ink
  }
  const smallestK = (target: number): number => {
    let lo = 0
    let hi = steps
    if (cov[hi] < target) return -1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (cov[mid] >= target) hi = mid
      else lo = mid + 1
    }
    return ks[lo]
  }
  const flip = shape === 'three' ? Math.min(0.5, cov[steps]) : Infinity
  const codes = new Float32Array(LUT_N + 1)
  for (let q = 0; q <= LUT_N; q++) {
    const d = q / LUT_N
    if (d <= 0) codes[q] = 0
    else if (d >= 1) codes[q] = SOLID
    else if (d <= flip) {
      const k = smallestK(d)
      codes[q] = k < 0 ? SOLID : k
    } else {
      // Paper shape on ink: the white 3 covers (1 - d).
      const k = smallestK(Math.min(1 - d, flip))
      codes[q] = k <= 0 ? SOLID : -k
    }
  }
  return { shape, mask, codes }
}

// --- The screen -----------------------------------------------------------------

/**
 * Everything needed to screen any region of the film at any DPI.
 *
 * Screening works the way Photoshop's Bitmap → Halftone Screen does: the
 * photo is first resampled to the output resolution, then every output pixel
 * is decided by the photo's own tone *at that pixel* against the dot shape of
 * the cell it falls in. A dot that straddles an edge is cut by the edge, so
 * detail finer than a cell survives instead of being averaged away.
 */
export interface ScreenJob {
  page: { w: number; h: number }
  lpi: number
  cos: number
  sin: number
  mirror: boolean
  minDot: number
  maxDot: number
  photo: PhotoSource | null
  frame: PhotoFrame
  tone: ToneSettings
  table: DotTable
}

export function buildScreenJob(
  page: { w: number; h: number },
  s: ScreenSettings,
  table: DotTable,
  photo: PhotoSource | null,
  frame: PhotoFrame,
  tone: ToneSettings,
): ScreenJob {
  const a = (s.angle * Math.PI) / 180
  const minDot = Math.max(0, Math.min(1, s.minDot))
  return {
    page, lpi: s.lpi, cos: Math.cos(a), sin: Math.sin(a), mirror: s.mirror,
    minDot, maxDot: Math.max(minDot, Math.min(1, s.maxDot)),
    photo, frame, tone, table,
  }
}

/**
 * Screen a region of the film. (x0, y0, w, h) are output pixels at `dpi`.
 * `out[i]` = 1 where ink prints. `photoCanvas` is scratch space for the
 * resampled photo; `text` is the RGBA of the text over the same region
 * (see textRegion), or null. Text prints solid.
 */
export function renderRegion(
  job: ScreenJob,
  x0: number,
  y0: number,
  w: number,
  h: number,
  dpi: number,
  out: Uint8Array,
  text: Uint8ClampedArray | null,
  photoCanvas: HTMLCanvasElement,
) {
  if (photoCanvas.width !== w || photoCanvas.height !== h) {
    photoCanvas.width = w
    photoCanvas.height = h
  }
  const pctx = photoCanvas.getContext('2d', { willReadFrequently: true })!
  const Wpx = job.page.w * dpi
  const Hpx = job.page.h * dpi
  drawPhoto(pctx, Wpx, Hpx, job.photo, job.frame, x0, y0, job.mirror)
  const px = pctx.getImageData(0, 0, w, h).data

  // Tone → cell code, once per grey level rather than once per pixel.
  const codeFor = new Float32Array(256)
  for (let g = 0; g < 256; g++) {
    let d = applyTone(g / 255, job.tone)
    if (d < job.minDot) d = 0
    else if (d > job.maxDot) d = 1
    codeFor[g] = job.table.codes[Math.round(d * LUT_N)]
  }

  const { cos, sin, lpi } = job
  const { n, data } = job.table.mask
  // Moving one output pixel right moves `sx` page inches (negative when mirrored).
  const sx = (job.mirror ? -1 : 1) / dpi
  const du = sx * cos * lpi
  const dv = -sx * sin * lpi
  for (let r = 0; r < h; r++) {
    const yIn = (y0 + r + 0.5) / dpi
    const pxStart = x0 + 0.5
    const xIn = job.mirror ? (Wpx - pxStart) / dpi : pxStart / dpi
    let u = (xIn * cos + yIn * sin) * lpi
    let v = (-xIn * sin + yIn * cos) * lpi
    const row = r * w
    const offPageRow = y0 + r < 0 || y0 + r >= Hpx
    for (let c = 0; c < w; c++, u += du, v += dv) {
      const i = row + c
      const p = i * 4
      const xPage = x0 + c
      if (offPageRow || xPage < 0 || xPage >= Wpx) {
        out[i] = 0
        continue
      }
      const grey = Math.round(0.2126 * px[p] + 0.7152 * px[p + 1] + 0.0722 * px[p + 2])
      const code = codeFor[grey]
      let ink = 0
      if (code >= SOLID) ink = 1
      else if (code !== 0) {
        const fi = Math.floor(u)
        const fj = Math.floor(v)
        const k = code > 0 ? code : -code
        const mx = Math.floor(((u - fi - 0.5) / k + 0.5) * n)
        const my = Math.floor(((v - fj - 0.5) / k + 0.5) * n)
        const inShape = mx >= 0 && my >= 0 && mx < n && my < n && data[my * n + mx] === 1
        ink = code > 0 ? (inShape ? 1 : 0) : inShape ? 0 : 1
      }
      out[i] = ink
    }
  }
  if (text) {
    for (let i = 0, p = 3; i < w * h; i++, p += 4) if (text[p] >= 128) out[i] = 1
  }
}

// --- Text -----------------------------------------------------------------------

const LINE_HEIGHT = 1.05

function blockFont(weight: number, px: number): string {
  return `${weight} ${px}px ${TEXT_FAMILY}`
}

function lineWidth(ctx: CanvasRenderingContext2D, line: string, track: number): number {
  if (!track) return ctx.measureText(line).width
  const chars = Array.from(line)
  return chars.reduce((s, ch) => s + ctx.measureText(ch).width, 0) + track * Math.max(0, chars.length - 1)
}

/**
 * Lay out the text above and below the photo frame. Each block sits a small
 * gap off the frame, centred on it, and shrinks to fit the page width.
 */
export function layoutText(
  ctx: CanvasRenderingContext2D,
  page: { w: number; h: number },
  frame: { x: number; y: number; w: number; h: number },
  above: string,
  below: string,
  style: TextStyle,
): TextBlock[] {
  const margin = page.w * 0.04
  const blocks: TextBlock[] = []
  for (const [raw, side] of [[above, 'above'], [below, 'below']] as const) {
    const text = style.uppercase ? raw.toUpperCase() : raw
    const lines = text.split('\n')
    if (!lines.some(l => l.trim())) continue
    // Measure at 100 px per inch, then scale.
    ctx.font = blockFont(style.weight, style.size * 100)
    const natural = Math.max(...lines.map(l => lineWidth(ctx, l, style.tracking * style.size * 100))) / 100
    const size = natural > page.w - 2 * margin ? (style.size * (page.w - 2 * margin)) / natural : style.size
    const width = (natural * size) / style.size
    const height = lines.length * size * LINE_HEIGHT
    const gap = Math.max(0.15, size * 0.35)
    const cy = side === 'above' ? frame.y - gap - height / 2 : frame.y + frame.h + gap + height / 2
    blocks.push({
      lines, weight: style.weight, size, tracking: style.tracking,
      cx: frame.x + frame.w / 2, cy, width, height,
      offPage: cy - height / 2 < 0 || cy + height / 2 > page.h,
    })
  }
  return blocks
}

/**
 * Draw text blocks. The canvas's pixel (0,0) is page pixel (originX, originY)
 * at `pxPerIn`; `mirror` flips it with the film.
 */
export function drawText(
  ctx: CanvasRenderingContext2D,
  blocks: TextBlock[],
  page: { w: number; h: number },
  pxPerIn: number,
  originX: number,
  originY: number,
  mirror: boolean,
  fill: string,
) {
  ctx.save()
  ctx.setTransform(mirror ? -1 : 1, 0, 0, 1, mirror ? page.w * pxPerIn - originX : -originX, -originY)
  ctx.fillStyle = fill
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  for (const b of blocks) {
    const size = b.size * pxPerIn
    const track = b.tracking * size
    ctx.font = blockFont(b.weight, size)
    const lh = size * LINE_HEIGHT
    b.lines.forEach((line, idx) => {
      const y = b.cy * pxPerIn + (idx - (b.lines.length - 1) / 2) * lh
      let x = b.cx * pxPerIn - lineWidth(ctx, line, track) / 2
      if (!track) {
        ctx.fillText(line, x, y)
        return
      }
      for (const ch of Array.from(line)) {
        ctx.fillText(ch, x, y)
        x += ctx.measureText(ch).width + track
      }
    })
  }
  ctx.restore()
}

/** The text's pixels over one output region at `dpi`, or null when no text touches it. */
export function textRegion(
  scratch: HTMLCanvasElement,
  blocks: TextBlock[],
  page: { w: number; h: number },
  dpi: number,
  mirror: boolean,
  x0: number,
  y0: number,
  w: number,
  h: number,
): Uint8ClampedArray | null {
  const hits = blocks.filter(b => {
    const pad = b.size // generous: covers overhangs and tracking
    const left = (b.cx - b.width / 2 - pad) * dpi
    const right = (b.cx + b.width / 2 + pad) * dpi
    const bx0 = mirror ? page.w * dpi - right : left
    const bx1 = mirror ? page.w * dpi - left : right
    const by0 = (b.cy - b.height / 2 - pad) * dpi
    const by1 = (b.cy + b.height / 2 + pad) * dpi
    return bx1 >= x0 && bx0 <= x0 + w && by1 >= y0 && by0 <= y0 + h
  })
  if (!hits.length) return null
  if (scratch.width !== w || scratch.height !== h) {
    scratch.width = w
    scratch.height = h
  }
  const ctx = scratch.getContext('2d', { willReadFrequently: true })!
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, w, h)
  drawText(ctx, hits, page, dpi, x0, y0, mirror, '#000')
  return ctx.getImageData(0, 0, w, h).data
}

// --- PNG ------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(parts: Uint8Array[]): number {
  let c = 0xffffffff
  for (const p of parts) for (let i = 0; i < p.length; i++) c = CRC_TABLE[(c ^ p[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type: string, body: Uint8Array): Uint8Array[] {
  const head = new Uint8Array(8)
  const dv = new DataView(head.buffer)
  dv.setUint32(0, body.length)
  for (let i = 0; i < 4; i++) head[4 + i] = type.charCodeAt(i)
  const tail = new Uint8Array(4)
  new DataView(tail.buffer).setUint32(0, crc32([head.subarray(4), body]))
  return [head, body, tail]
}

/** Pack one row of ink flags into a PNG scanline: filter byte 0, then 1 bit per pixel, 0 = black. */
export function packRow(ink: Uint8Array, offset: number, w: number, dst: Uint8Array, dstOffset: number) {
  dst[dstOffset] = 0
  const bytes = (w + 7) >> 3
  for (let b = 0; b < bytes; b++) {
    let v = 0
    for (let bit = 0; bit < 8; bit++) {
      const x = b * 8 + bit
      // Paper (and padding past the edge) is white = 1.
      const white = x >= w || ink[offset + x] === 0
      v = (v << 1) | (white ? 1 : 0)
    }
    dst[dstOffset + 1 + b] = v
  }
}

/**
 * Render the whole film as a 1-bit PNG with its DPI recorded (pHYs), in
 * horizontal strips so neither memory nor the main thread is held for long.
 */
export async function renderFilmPng(
  job: ScreenJob,
  dpi: number,
  text: TextBlock[],
  onProgress: (fraction: number) => void,
): Promise<Blob> {
  const W = Math.round(job.page.w * dpi)
  const H = Math.round(job.page.h * dpi)
  const strip = 256
  const rowBytes = 1 + ((W + 7) >> 3)
  const scratch = document.createElement('canvas')
  const photoCanvas = document.createElement('canvas')

  const cs = new CompressionStream('deflate') // zlib framing, which is what IDAT wants
  const compressed = new Response(cs.readable).arrayBuffer()
  const writer = cs.writable.getWriter()
  const ink = new Uint8Array(W * strip)
  try {
    for (let y = 0; y < H; y += strip) {
      const h = Math.min(strip, H - y)
      const rgba = textRegion(scratch, text, job.page, dpi, job.mirror, 0, y, W, h)
      renderRegion(job, 0, y, W, h, dpi, ink, rgba, photoCanvas)
      const packed = new Uint8Array(rowBytes * h)
      for (let r = 0; r < h; r++) packRow(ink, r * W, W, packed, r * rowBytes)
      await writer.write(packed)
      onProgress(Math.min(1, (y + h) / H))
      await new Promise(r => setTimeout(r, 0))
    }
    await writer.close()
  } finally {
    scratch.width = scratch.height = 0
    photoCanvas.width = photoCanvas.height = 0
  }
  const idat = new Uint8Array(await compressed)

  const ihdr = new Uint8Array(13)
  const ih = new DataView(ihdr.buffer)
  ih.setUint32(0, W)
  ih.setUint32(4, H)
  ihdr[8] = 1 // bit depth
  ihdr[9] = 0 // greyscale
  const phys = new Uint8Array(9)
  const ppm = Math.round(dpi / 0.0254)
  const ph = new DataView(phys.buffer)
  ph.setUint32(0, ppm)
  ph.setUint32(4, ppm)
  phys[8] = 1 // metres
  const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
  const parts = [sig, ...chunk('IHDR', ihdr), ...chunk('pHYs', phys), ...chunk('IDAT', idat), ...chunk('IEND', new Uint8Array(0))]
  return new Blob(parts as BlobPart[], { type: 'image/png' })
}
