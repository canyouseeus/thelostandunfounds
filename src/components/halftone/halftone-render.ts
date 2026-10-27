/**
 * Everything the screen (halftone) generator draws, as pure functions.
 * The on-screen loupe and the downloaded film positive run through the same
 * `renderRegion`, so the dots you inspect are the dots that print.
 *
 * Units: the page is measured in inches. The screen is a grid of cells
 * `1 / lpi` inches square, turned by `angle`. Each cell holds one dot — a
 * triangle or a "3" — sized so the cell's ink coverage matches the photo's
 * darkness there. Coverage is exact: it comes from a measured lookup table,
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

/** `scale` is a multiple of "cover" (1 = the photo just fills the page); `ox`/`oy` move its centre, in page-widths. */
export interface PhotoView {
  scale: number
  ox: number
  oy: number
}
export const DEFAULT_PHOTO_VIEW: PhotoView = { scale: 1, ox: 0, oy: 0 }
export const PHOTO_SCALE_MIN = 0.2
export const PHOTO_SCALE_MAX = 8

export interface PhotoSource {
  source: CanvasImageSource
  width: number
  height: number
}

export type TextInk = 'ink' | 'knockout'
export interface TextLayer {
  text: string
  weight: 400 | 700 | 900
  /** Font size in inches. */
  size: number
  /** Letter spacing, in ems. */
  tracking: number
  uppercase: boolean
  /** 'ink' prints solid; 'knockout' clears the dots under the letters. */
  ink: TextInk
  /** Centre of the text block, as fractions of page width / height. */
  cx: number
  cy: number
}

/** The site's typeface, registered for canvas under its own name (see fonts.ts). */
export const TEXT_FAMILY = '"TLU Inter", Inter, system-ui, sans-serif'

export function clampPhotoView(v: PhotoView): PhotoView {
  const scale = Math.min(PHOTO_SCALE_MAX, Math.max(PHOTO_SCALE_MIN, v.scale))
  return { scale, ox: Math.min(1.5, Math.max(-1.5, v.ox)), oy: Math.min(1.5, Math.max(-1.5, v.oy)) }
}

/** Zoom about a focal point given in page-widths from the page centre. */
export function zoomPhotoAbout(v: PhotoView, factor: number, fx: number, fy: number): PhotoView {
  const next = clampPhotoView({ ...v, scale: v.scale * factor })
  const f = next.scale / v.scale
  return clampPhotoView({ ...next, ox: fx + (v.ox - fx) * f, oy: fy + (v.oy - fy) * f })
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

/** Draw the photo onto a white page of `w` × `h` px. The preview and the tone map share this. */
export function drawPhoto(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  photo: PhotoSource | null,
  view: PhotoView,
) {
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, w, h)
  if (photo) {
    const cover = Math.max(w / photo.width, h / photo.height) * view.scale
    const dw = photo.width * cover
    const dh = photo.height * cover
    const cx = w / 2 + view.ox * w
    const cy = h / 2 + view.oy * w
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(photo.source, cx - dw / 2, cy - dh / 2, dw, dh)
  }
  ctx.restore()
}

export function buildToneMap(
  page: { w: number; h: number },
  pxPerIn: number,
  photo: PhotoSource | null,
  view: PhotoView,
  tone: ToneSettings,
): ToneMap {
  const w = Math.max(1, Math.round(page.w * pxPerIn))
  const h = Math.max(1, Math.round(page.h * pxPerIn))
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  drawPhoto(ctx, w, h, photo, view)
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

/** Tone-map resolution: two samples per screen line, capped at ~6 MP. */
export function toneResolution(page: { w: number; h: number }, lpi: number): number {
  return Math.min(lpi * 2, Math.sqrt(6e6 / (page.w * page.h)))
}

function sampleTone(t: ToneMap, xIn: number, yIn: number): number {
  const x = xIn * t.pxPerIn - 0.5
  const y = yIn * t.pxPerIn - 0.5
  if (x < -0.5 || y < -0.5 || x > t.w - 0.5 || y > t.h - 0.5) return 0
  const x0 = Math.max(0, Math.min(t.w - 1, Math.floor(x)))
  const y0 = Math.max(0, Math.min(t.h - 1, Math.floor(y)))
  const x1 = Math.min(t.w - 1, x0 + 1)
  const y1 = Math.min(t.h - 1, y0 + 1)
  const fx = Math.max(0, Math.min(1, x - x0))
  const fy = Math.max(0, Math.min(1, y - y0))
  const d = t.dark
  const a = d[y0 * t.w + x0] * (1 - fx) + d[y0 * t.w + x1] * fx
  const b = d[y1 * t.w + x0] * (1 - fx) + d[y1 * t.w + x1] * fx
  return a * (1 - fy) + b * fy
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

/** Everything needed to render any region of the film at any DPI. */
export interface ScreenJob {
  page: { w: number; h: number }
  lpi: number
  cos: number
  sin: number
  mirror: boolean
  iMin: number
  jMin: number
  cols: number
  rows: number
  cells: Float32Array
  mask: ShapeMask
}

export function buildScreenJob(tone: ToneMap, page: { w: number; h: number }, s: ScreenSettings, table: DotTable): ScreenJob {
  const a = (s.angle * Math.PI) / 180
  const cos = Math.cos(a)
  const sin = Math.sin(a)
  const us: number[] = []
  const vs: number[] = []
  for (const [x, y] of [[0, 0], [page.w, 0], [0, page.h], [page.w, page.h]]) {
    us.push((x * cos + y * sin) * s.lpi)
    vs.push((-x * sin + y * cos) * s.lpi)
  }
  const iMin = Math.floor(Math.min(...us)) - 1
  const jMin = Math.floor(Math.min(...vs)) - 1
  const cols = Math.ceil(Math.max(...us)) + 1 - iMin
  const rows = Math.ceil(Math.max(...vs)) + 1 - jMin
  const cells = new Float32Array(cols * rows)
  const lo = Math.max(0, Math.min(1, s.minDot))
  const hi = Math.max(lo, Math.min(1, s.maxDot))
  for (let j = 0; j < rows; j++) {
    const v = j + jMin + 0.5
    for (let i = 0; i < cols; i++) {
      const u = i + iMin + 0.5
      const x = (u * cos - v * sin) / s.lpi
      const y = (u * sin + v * cos) / s.lpi
      let d = sampleTone(tone, x, y)
      if (d < lo) d = 0
      else if (d > hi) d = 1
      cells[j * cols + i] = table.codes[Math.round(d * LUT_N)]
    }
  }
  return { page, lpi: s.lpi, cos, sin, mirror: s.mirror, iMin, jMin, cols, rows, cells, mask: table.mask }
}

/**
 * Rasterise a region of the film. (x0, y0, w, h) are output pixels at `dpi`.
 * `out[i]` = 1 where ink prints. `text` is the RGBA of the text layer drawn
 * over the same region (see drawText), or null.
 */
export function renderRegion(
  job: ScreenJob,
  x0: number,
  y0: number,
  w: number,
  h: number,
  dpi: number,
  out: Uint8Array,
  text: { rgba: Uint8ClampedArray; ink: TextInk } | null,
) {
  const { cos, sin, lpi, iMin, jMin, cols, rows, cells } = job
  const { n, data } = job.mask
  const pageWpx = job.page.w * dpi
  // Moving one output pixel right moves `sx` page inches (negative when mirrored).
  const sx = (job.mirror ? -1 : 1) / dpi
  const du = sx * cos * lpi
  const dv = -sx * sin * lpi
  for (let r = 0; r < h; r++) {
    const yIn = (y0 + r + 0.5) / dpi
    const pxStart = x0 + 0.5
    const xIn = job.mirror ? (pageWpx - pxStart) / dpi : pxStart / dpi
    let u = (xIn * cos + yIn * sin) * lpi
    let v = (-xIn * sin + yIn * cos) * lpi
    const row = r * w
    for (let c = 0; c < w; c++, u += du, v += dv) {
      const fi = Math.floor(u)
      const fj = Math.floor(v)
      const ci = fi - iMin
      const cj = fj - jMin
      let ink = 0
      if (ci >= 0 && cj >= 0 && ci < cols && cj < rows) {
        const code = cells[cj * cols + ci]
        if (code >= SOLID) ink = 1
        else if (code !== 0) {
          const k = code > 0 ? code : -code
          const mx = Math.floor(((u - fi - 0.5) / k + 0.5) * n)
          const my = Math.floor(((v - fj - 0.5) / k + 0.5) * n)
          const inShape = mx >= 0 && my >= 0 && mx < n && my < n && data[my * n + mx] === 1
          ink = code > 0 ? (inShape ? 1 : 0) : inShape ? 0 : 1
        }
      }
      out[row + c] = ink
    }
  }
  if (text) {
    const set = text.ink === 'ink' ? 1 : 0
    const a = text.rgba
    for (let i = 0, p = 3; i < w * h; i++, p += 4) if (a[p] >= 128) out[i] = set
  }
}

// --- Text -----------------------------------------------------------------------

export function textFont(layer: TextLayer, px: number): string {
  return `${layer.weight} ${px}px ${TEXT_FAMILY}`
}

function textLines(layer: TextLayer): string[] {
  const t = layer.uppercase ? layer.text.toUpperCase() : layer.text
  return t.split('\n')
}

const LINE_HEIGHT = 1.05

/** Page-pixel bounds of the text block at `pxPerIn`, padded; null when empty. */
export function textBounds(
  ctx: CanvasRenderingContext2D,
  layer: TextLayer,
  page: { w: number; h: number },
  pxPerIn: number,
): { x: number; y: number; w: number; h: number } | null {
  const lines = textLines(layer)
  if (!lines.some(l => l.trim())) return null
  const size = layer.size * pxPerIn
  ctx.font = textFont(layer, size)
  const widest = Math.max(...lines.map(l => lineWidth(ctx, l, layer.tracking * size)))
  const tall = lines.length * size * LINE_HEIGHT
  const cx = layer.cx * page.w * pxPerIn
  const cy = layer.cy * page.h * pxPerIn
  const pad = size * 0.5
  return { x: cx - widest / 2 - pad, y: cy - tall / 2 - pad, w: widest + pad * 2, h: tall + pad * 2 }
}

function lineWidth(ctx: CanvasRenderingContext2D, line: string, track: number): number {
  if (!track) return ctx.measureText(line).width
  const chars = Array.from(line)
  return chars.reduce((s, ch) => s + ctx.measureText(ch).width, 0) + track * Math.max(0, chars.length - 1)
}

/**
 * Draw the text block. The canvas's pixel (0,0) is page pixel (originX, originY)
 * at `pxPerIn`; `mirror` flips it with the film.
 */
export function drawText(
  ctx: CanvasRenderingContext2D,
  layer: TextLayer,
  page: { w: number; h: number },
  pxPerIn: number,
  originX: number,
  originY: number,
  mirror: boolean,
  fill: string,
) {
  const lines = textLines(layer)
  if (!lines.some(l => l.trim())) return
  const size = layer.size * pxPerIn
  const track = layer.tracking * size
  ctx.save()
  ctx.setTransform(mirror ? -1 : 1, 0, 0, 1, mirror ? page.w * pxPerIn - originX : -originX, -originY)
  ctx.font = textFont(layer, size)
  ctx.fillStyle = fill
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  const cx = layer.cx * page.w * pxPerIn
  const cy = layer.cy * page.h * pxPerIn
  const lh = size * LINE_HEIGHT
  lines.forEach((line, idx) => {
    const y = cy + (idx - (lines.length - 1) / 2) * lh
    let x = cx - lineWidth(ctx, line, track) / 2
    if (!track) {
      ctx.fillText(line, x, y)
      return
    }
    for (const ch of Array.from(line)) {
      ctx.fillText(ch, x, y)
      x += ctx.measureText(ch).width + track
    }
  })
  ctx.restore()
}

/** The text layer's pixels over one region, or null when the text misses it. */
export function textRegion(
  scratch: HTMLCanvasElement,
  layer: TextLayer | null,
  bounds: { x: number; y: number; w: number; h: number } | null,
  page: { w: number; h: number },
  dpi: number,
  mirror: boolean,
  x0: number,
  y0: number,
  w: number,
  h: number,
): Uint8ClampedArray | null {
  if (!layer || !bounds) return null
  // Bounds are in unmirrored page pixels; mirror them into output space.
  const bx = mirror ? page.w * dpi - bounds.x - bounds.w : bounds.x
  if (bx > x0 + w || bx + bounds.w < x0 || bounds.y > y0 + h || bounds.y + bounds.h < y0) return null
  if (scratch.width !== w || scratch.height !== h) {
    scratch.width = w
    scratch.height = h
  }
  const ctx = scratch.getContext('2d', { willReadFrequently: true })!
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, w, h)
  drawText(ctx, layer, page, dpi, x0, y0, mirror, '#000')
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
  text: TextLayer | null,
  onProgress: (fraction: number) => void,
): Promise<Blob> {
  const W = Math.round(job.page.w * dpi)
  const H = Math.round(job.page.h * dpi)
  const strip = 256
  const rowBytes = 1 + ((W + 7) >> 3)
  const scratch = document.createElement('canvas')
  const measure = document.createElement('canvas').getContext('2d')!
  const bounds = text ? textBounds(measure, text, job.page, dpi) : null

  const cs = new CompressionStream('deflate') // zlib framing, which is what IDAT wants
  const compressed = new Response(cs.readable).arrayBuffer()
  const writer = cs.writable.getWriter()
  const ink = new Uint8Array(W * strip)
  try {
    for (let y = 0; y < H; y += strip) {
      const h = Math.min(strip, H - y)
      const rgba = textRegion(scratch, text, bounds, job.page, dpi, job.mirror, 0, y, W, h)
      renderRegion(job, 0, y, W, h, dpi, ink, rgba && text ? { rgba, ink: text.ink } : null)
      const packed = new Uint8Array(rowBytes * h)
      for (let r = 0; r < h; r++) packRow(ink, r * W, W, packed, r * rowBytes)
      await writer.write(packed)
      onProgress(Math.min(1, (y + h) / H))
      await new Promise(r => setTimeout(r, 0))
    }
    await writer.close()
  } finally {
    scratch.width = scratch.height = 0
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
