/**
 * Everything the screen generator draws, as pure functions.
 *
 * The screen is ONE shape at ONE size — a perfect equilateral triangle or a
 * Bold "3" from Inter, outlined into a vector object — cloned onto a grid of
 * cells `1 / lpi` inches apart, turned by `angle`. Tone comes from how many
 * cells get a clone (an ordered dither), never from resizing, clipping or
 * flipping the shape: every dot on the film is identical.
 *
 * The film downloads as a vector PDF: the clone is defined once and stamped
 * at every position, and the text is converted to outlines, so the film
 * printer draws every edge sharp at its own resolution. A 1-bit PNG of the
 * same drawing is available for printers that want a raster file.
 */

export type DotShape = 'circle' | 'triangle' | 'three'
export type DotMode = 'scale' | 'count'
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

/** The classic halftone angle: a 45° grid for single-colour work. */
export const DEFAULT_ANGLE = 45
export const DEFAULT_MESH = 250

export interface ScreenSettings {
  lpi: number
  angle: number // degrees
  shape: DotShape
  /** The clone's size as a fraction of the cell spacing (triangle side, or the 3's height) — its largest size when scaling. */
  dotSize: number
  /**
   * 'scale': every dot is the same shape, scaled by the tone (area ∝ darkness).
   * 'count': every dot is the same shape at the same size; tone is how many spots get one.
   */
  mode: DotMode
  /** Tones lighter than this print as bare paper. */
  cutoff: number
  /** Wrong-reading film, for printing emulsion-side down. */
  mirror: boolean
}

export interface ToneSettings {
  brightness: number // -1..1
  contrast: number // -1..1
  /** Photo negative — for white ink on a dark garment. */
  invert: boolean
  /** Black and white points (0..1) the photo is stretched between before anything else; see measureLevels. */
  levels?: { lo: number; hi: number }
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
  /** Font size in inches, for the text above and the text below. A line too wide for the photo shrinks to fit it. */
  size: { above: number; below: number }
  /** Letter spacing, in ems. */
  tracking: number
  uppercase: boolean
}

/** One drawing command, in the shape opentype.js produces (y grows downward). */
export type Cmd =
  | { type: 'M' | 'L'; x: number; y: number }
  | { type: 'C'; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
  | { type: 'Q'; x1: number; y1: number; x: number; y: number }
  | { type: 'Z' }

/** A laid-out block of text, converted to outlines, in page inches. Text always prints as solid ink. */
export interface TextBlock {
  cmds: Cmd[]
  x0: number
  y0: number
  x1: number
  y1: number
  /** True when the block runs off the page — the frame needs to be smaller or moved. */
  offPage: boolean
}

/** The site's typeface, registered for the page under its own name (see fonts.ts). */
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

/**
 * The safe margin kept clear on every edge of the film, in inches. Nothing
 * prints inside it, so a screen's edge and the squeegee never reach the image.
 */
export const PRINT_MARGIN_IN = 1

/** The fixed printable area: the page inset by the safe margin on every side. */
export function printArea(page: { w: number; h: number }): { x: number; y: number; w: number; h: number } {
  const m = PRINT_MARGIN_IN
  return { x: m, y: m, w: page.w - 2 * m, h: page.h - 2 * m }
}

/**
 * The photo sized to the printable area: the largest proportional fit (never
 * cropped or stretched) in the height left after the text above (`top`) and
 * below (`bottom`), with the whole stack — text, photo, text — centred in the
 * area. Centred horizontally and vertically, so the layout is the same every
 * time for the same canvas and text.
 */
export function fitFrame(page: { w: number; h: number }, aspect: number, top: number, bottom: number): PhotoFrame {
  const area = printArea(page)
  const fitW = Math.min(page.w, page.h * aspect)
  const availH = Math.max(area.h * 0.2, area.h - top - bottom)
  const w = Math.min(area.w, availH * aspect)
  const h = w / aspect
  const stackH = top + h + bottom
  const y = area.y + (area.h - stackH) / 2 + top
  return { scale: w / fitW, cx: 0.5, cy: (y + h / 2) / page.h }
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
  if (t.levels && t.levels.hi - t.levels.lo > 0.02) lum = (lum - t.levels.lo) / (t.levels.hi - t.levels.lo)
  const c = Math.max(-0.99, Math.min(0.99, t.contrast))
  const k = c >= 0 ? 1 / (1 - c) : 1 + c
  let l = (lum - 0.5) * k + 0.5 + t.brightness * 0.5
  l = l < 0 ? 0 : l > 1 ? 1 : l
  return t.invert ? l : 1 - l
}

/**
 * Auto levels: the photo's 0.5% and 99.5% luminance points, so a dark night
 * shot (or a flat grey one) is stretched to use the full range from paper to
 * solid before it is screened — what a Levels adjustment does in Photoshop.
 */
export function measureLevels(photo: PhotoSource): { lo: number; hi: number } {
  const n = 256
  const k = Math.min(1, n / Math.max(photo.width, photo.height))
  const w = Math.max(1, Math.round(photo.width * k))
  const h = Math.max(1, Math.round(photo.height * k))
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(photo.source, 0, 0, w, h)
  const px = ctx.getImageData(0, 0, w, h).data
  const hist = new Uint32Array(256)
  for (let p = 0; p < px.length; p += 4) hist[Math.round(0.2126 * px[p] + 0.7152 * px[p + 1] + 0.0722 * px[p + 2])]++
  c.width = c.height = 0
  const total = w * h
  const at = (q: number) => {
    let acc = 0
    for (let g = 0; g < 256; g++) {
      acc += hist[g]
      if (acc >= q * total) return g / 255
    }
    return 1
  }
  return { lo: at(0.005), hi: at(0.995) }
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

// --- The clone ------------------------------------------------------------------

/** The one shape every dot is a copy of, in cell units, centred on (0, 0), y down. */
export interface Clone {
  shape: DotShape
  cmds: Cmd[]
  /** Ink area of one clone as a fraction of one cell. */
  coverage: number
}

function mapCmds(cmds: Cmd[], f: (x: number, y: number) => [number, number]): Cmd[] {
  return cmds.map(c => {
    if (c.type === 'Z') return c
    if (c.type === 'C') {
      const [x1, y1] = f(c.x1, c.y1)
      const [x2, y2] = f(c.x2, c.y2)
      const [x, y] = f(c.x, c.y)
      return { type: 'C', x1, y1, x2, y2, x, y }
    }
    if (c.type === 'Q') {
      const [x1, y1] = f(c.x1, c.y1)
      const [x, y] = f(c.x, c.y)
      return { type: 'Q', x1, y1, x, y }
    }
    const [x, y] = f(c.x, c.y)
    return { type: c.type, x, y }
  })
}

/** Append commands to the context's current path, scaled by `s` and offset. */
export function tracePath(ctx: CanvasRenderingContext2D | Path2D, cmds: Cmd[], s = 1, ox = 0, oy = 0) {
  for (const c of cmds) {
    if (c.type === 'M') ctx.moveTo(c.x * s + ox, c.y * s + oy)
    else if (c.type === 'L') ctx.lineTo(c.x * s + ox, c.y * s + oy)
    else if (c.type === 'C') ctx.bezierCurveTo(c.x1 * s + ox, c.y1 * s + oy, c.x2 * s + ox, c.y2 * s + oy, c.x * s + ox, c.y * s + oy)
    else if (c.type === 'Q') ctx.quadraticCurveTo(c.x1 * s + ox, c.y1 * s + oy, c.x * s + ox, c.y * s + oy)
    else ctx.closePath()
  }
}

/** Area of a shape as a fraction of one cell, by rasterising it large. */
function measureCoverage(cmds: Cmd[]): number {
  const n = 512 // canvas px; the cell is n/2 px so a clone up to 2 cells wide fits
  const c = document.createElement('canvas')
  c.width = c.height = n
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.beginPath()
  tracePath(ctx, cmds, n / 2, n / 2, n / 2)
  ctx.fill('nonzero')
  const a = ctx.getImageData(0, 0, n, n).data
  let ink = 0
  for (let i = 3; i < a.length; i += 4) ink += a[i] / 255
  c.width = c.height = 0
  return ink / ((n / 2) * (n / 2))
}

/**
 * The clone. `size` is in cells: the circle's diameter, the triangle's side, or the 3's height.
 * `three` is the Bold "3" glyph from Inter (an opentype.js glyph), whose
 * outline becomes the shape.
 */
export function makeClone(
  shape: DotShape,
  size: number,
  three?: { getPath(x: number, y: number, fontSize: number): { commands: Cmd[] } },
): Clone {
  let cmds: Cmd[]
  if (shape === 'circle') {
    // A true circle: four cubic arcs (the standard 0.5523 handle length). `size` is the diameter.
    const r = size / 2
    const c = r * 0.5522847498
    cmds = [
      { type: 'M', x: r, y: 0 },
      { type: 'C', x1: r, y1: c, x2: c, y2: r, x: 0, y: r },
      { type: 'C', x1: -c, y1: r, x2: -r, y2: c, x: -r, y: 0 },
      { type: 'C', x1: -r, y1: -c, x2: -c, y2: -r, x: 0, y: -r },
      { type: 'C', x1: c, y1: -r, x2: r, y2: -c, x: r, y: 0 },
      { type: 'Z' },
    ]
    return { shape, cmds, coverage: Math.PI * r * r }
  }
  if (shape === 'triangle') {
    // A perfect equilateral triangle, point up, centred on its bounding box.
    const h = (size * Math.sqrt(3)) / 2
    cmds = [
      { type: 'M', x: 0, y: -h / 2 },
      { type: 'L', x: size / 2, y: h / 2 },
      { type: 'L', x: -size / 2, y: h / 2 },
      { type: 'Z' },
    ]
    return { shape, cmds, coverage: (Math.sqrt(3) / 4) * size * size }
  }
  if (!three) throw new Error('The 3 needs the Bold font loaded')
  const raw = three.getPath(0, 0, 1).commands
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const c of raw) {
    if (c.type === 'Z') continue
    const pts: [number, number][] = [[c.x, c.y]]
    if (c.type === 'C') pts.push([c.x1, c.y1], [c.x2, c.y2])
    if (c.type === 'Q') pts.push([c.x1, c.y1])
    for (const [x, y] of pts) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x)
      minY = Math.min(minY, y); maxY = Math.max(maxY, y)
    }
  }
  const k = size / (maxY - minY)
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  cmds = mapCmds(raw, (x, y) => [(x - cx) * k, (y - cy) * k])
  return { shape, cmds, coverage: measureCoverage(cmds) }
}

// --- Placing the clones -----------------------------------------------------------

/** 8×8 Bayer matrix: an even, ordered spread of 64 thresholds. */
const BAYER: number[][] = (() => {
  let m = [[0]]
  while (m.length < 8) {
    const n = m.length
    const next = Array.from({ length: n * 2 }, () => Array<number>(n * 2).fill(0))
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const v = m[y][x] * 4
        next[y][x] = v
        next[y][x + n] = v + 2
        next[y + n][x] = v + 3
        next[y + n][x + n] = v + 1
      }
    }
    m = next
  }
  return m
})()

export interface ScreenJob {
  page: { w: number; h: number }
  lpi: number
  cos: number
  sin: number
  mirror: boolean
  cutoff: number
  mode: DotMode
  tone: ToneMap
  clone: Clone
}

export function buildScreenJob(page: { w: number; h: number }, s: ScreenSettings, clone: Clone, tone: ToneMap): ScreenJob {
  const a = (s.angle * Math.PI) / 180
  return { page, lpi: s.lpi, cos: Math.cos(a), sin: Math.sin(a), mirror: s.mirror, cutoff: s.cutoff, mode: s.mode, tone, clone }
}

/** Tone-map resolution for screening: two samples per cell, capped at ~6 MP. */
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

/**
 * Call `dot(x, y, scale)` (page inches, right-reading; scale 0..1 of the
 * clone's full size) for every clone whose centre lies in the page rectangle
 * [x0, x1] × [y0, y1], row by row.
 *
 * 'scale' mode: one clone per cell, scaled so its area follows the darkness
 * (black = full size, white = none). The shape is always whole — never
 * clipped to its cell, never flipped.
 *
 * 'count' mode:
 * A cell gets a clone when its darkness beats the cell's Bayer threshold, so
 * the photo's darkness is the share of cells filled: black fills every cell,
 * 50% grey half of them, white none. The full tonal range of the photo maps
 * onto the range one clone size can print (bare paper up to every cell full).
 */
export function forEachDot(
  job: ScreenJob,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  dot: (x: number, y: number, scale: number) => void,
  onRow?: (fraction: number) => void,
) {
  const { cos, sin, lpi, page } = job
  const us: number[] = []
  const vs: number[] = []
  for (const [x, y] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) {
    us.push((x * cos + y * sin) * lpi)
    vs.push((-x * sin + y * cos) * lpi)
  }
  const iMin = Math.floor(Math.min(...us)) - 1
  const iMax = Math.ceil(Math.max(...us)) + 1
  const jMin = Math.floor(Math.min(...vs)) - 1
  const jMax = Math.ceil(Math.max(...vs)) + 1
  for (let j = jMin; j <= jMax; j++) {
    const v = j + 0.5
    const row = BAYER[((j % 8) + 8) % 8]
    for (let i = iMin; i <= iMax; i++) {
      const u = i + 0.5
      const x = (u * cos - v * sin) / lpi
      const y = (u * sin + v * cos) / lpi
      if (x < x0 || x > x1 || y < y0 || y > y1 || x < 0 || y < 0 || x > page.w || y > page.h) continue
      const d = sampleTone(job.tone, x, y)
      if (d < job.cutoff) continue
      if (job.mode === 'scale') dot(x, y, Math.sqrt(Math.min(1, d)))
      else if (d > (row[((i % 8) + 8) % 8] + 0.5) / 64) dot(x, y, 1)
    }
    if (onRow && (j - jMin) % 64 === 0) onRow((j - jMin) / (jMax - jMin + 1))
  }
}

/** How far a clone reaches from its centre, in inches — for padding regions. */
function cloneReach(job: ScreenJob): number {
  return 1.5 / job.lpi
}

/**
 * Draw the film (clones + text) into a canvas: white paper, black ink,
 * antialiased. The canvas's pixel (0,0) is output pixel (originX, originY) at
 * `dpi`; the output is mirrored when the film is.
 */
export function drawFilm(
  ctx: CanvasRenderingContext2D,
  job: ScreenJob,
  text: TextBlock[],
  dpi: number,
  originX: number,
  originY: number,
) {
  const w = ctx.canvas.width
  const h = ctx.canvas.height
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#000'
  const Wpx = job.page.w * dpi
  // The region, back in right-reading page inches.
  const xa = (job.mirror ? Wpx - originX - w : originX) / dpi
  const ya = originY / dpi
  const pad = cloneReach(job)
  const sx = job.mirror ? -1 : 1
  const k = dpi / job.lpi // canvas px per cell
  const clone = new Path2D()
  tracePath(clone, job.clone.cmds)
  forEachDot(job, xa - pad, ya - pad, xa + w / dpi + pad, ya + h / dpi + pad, (x, y, scale) => {
    const X = (job.mirror ? job.page.w - x : x) * dpi - originX
    ctx.setTransform(sx * k * scale, 0, 0, k * scale, X, y * dpi - originY)
    ctx.fill(clone, 'nonzero')
  })
  if (text.length) {
    ctx.setTransform(sx * dpi, 0, 0, dpi, job.mirror ? Wpx - originX : -originX, -originY)
    ctx.beginPath()
    for (const b of text) tracePath(ctx, b.cmds)
    ctx.fill('nonzero')
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0)
}

// --- Text -----------------------------------------------------------------------

const LINE_HEIGHT = 1.05

/** The parts of an opentype.js font the layout uses. */
export interface OutlineFont {
  unitsPerEm: number
  tables: { os2?: { sCapHeight?: number } }
  charToGlyph(ch: string): OutlineGlyph
  getKerningValue(left: OutlineGlyph, right: OutlineGlyph): number
}
export interface OutlineGlyph {
  index: number
  advanceWidth?: number
  getPath(x: number, y: number, fontSize: number): { commands: Cmd[] }
}

/** One line as outlines with its baseline at y = 0, starting at x = 0; size in inches. */
function lineOutline(fonts: OutlineFont[], line: string, size: number, track: number) {
  const cmds: Cmd[] = []
  let x = 0
  let prev: { font: OutlineFont; glyph: OutlineGlyph } | null = null
  const chars = Array.from(line)
  chars.forEach((ch, idx) => {
    // Latin first; fall back to Latin Extended for anything it lacks.
    let font = fonts[0]
    let glyph = font.charToGlyph(ch)
    for (const f of fonts.slice(1)) {
      if (glyph.index !== 0) break
      const g = f.charToGlyph(ch)
      if (g.index !== 0) { font = f; glyph = g }
    }
    const scale = size / font.unitsPerEm
    if (prev && prev.font === font && !track) x += font.getKerningValue(prev.glyph, glyph) * scale
    cmds.push(...glyph.getPath(x, 0, size).commands)
    x += (glyph.advanceWidth ?? 0) * scale
    if (idx < chars.length - 1) x += track
    prev = { font, glyph }
  })
  return { cmds, width: x }
}

/**
 * Lay out the text above and below the photo frame, as outlines. Each block
 * sits a small gap off the frame, centred on it, and is never wider than the
 * frame (the photo), so the text can't run past the picture.
 */
export function layoutText(
  fonts: OutlineFont[],
  page: { w: number; h: number },
  frame: { x: number; y: number; w: number; h: number },
  above: string,
  below: string,
  style: TextStyle,
): TextBlock[] {
  const area = printArea(page)
  const capHeight = (fonts[0].tables.os2?.sCapHeight ?? 0.727 * fonts[0].unitsPerEm) / fonts[0].unitsPerEm
  const blocks: TextBlock[] = []
  for (const [raw, side] of [[above, 'above'], [below, 'below']] as const) {
    const text = style.uppercase ? raw.toUpperCase() : raw
    const lines = text.split('\n')
    if (!lines.some(l => l.trim())) continue
    const asked = style.size[side]
    const natural = Math.max(...lines.map(l => lineOutline(fonts, l, asked, style.tracking * asked).width))
    const size = natural > frame.w ? (asked * frame.w) / natural : asked
    const lh = size * LINE_HEIGHT
    const height = lines.length * lh
    const gap = Math.max(0.15, size * 0.35)
    const cy = side === 'above' ? frame.y - gap - height / 2 : frame.y + frame.h + gap + height / 2
    const cx = frame.x + frame.w / 2
    const cmds: Cmd[] = []
    let width = 0
    lines.forEach((line, idx) => {
      const l = lineOutline(fonts, line, size, style.tracking * size)
      width = Math.max(width, l.width)
      // Centre each line's cap height on its slot.
      const baseline = cy + (idx - (lines.length - 1) / 2) * lh + (capHeight * size) / 2
      const left = cx - l.width / 2
      cmds.push(...mapCmds(l.cmds, (x, y) => [x + left, y + baseline]))
    })
    const y0 = cy - height / 2
    const y1 = cy + height / 2
    blocks.push({ cmds, x0: cx - width / 2, y0, x1: cx + width / 2, y1, offPage: y0 < area.y || y1 > area.y + area.h })
  }
  return blocks
}

// --- PDF (vector) ---------------------------------------------------------------------

const n4 = (v: number) => (Math.round(v * 10000) / 10000).toString()

/** Path operators for commands; quadratic curves become cubics (PDF has no quads). */
function pdfPath(cmds: Cmd[]): string {
  const out: string[] = []
  let cx = 0
  let cy = 0
  for (const c of cmds) {
    if (c.type === 'M') { out.push(`${n4(c.x)} ${n4(c.y)} m`); cx = c.x; cy = c.y }
    else if (c.type === 'L') { out.push(`${n4(c.x)} ${n4(c.y)} l`); cx = c.x; cy = c.y }
    else if (c.type === 'C') { out.push(`${n4(c.x1)} ${n4(c.y1)} ${n4(c.x2)} ${n4(c.y2)} ${n4(c.x)} ${n4(c.y)} c`); cx = c.x; cy = c.y }
    else if (c.type === 'Q') {
      const x1 = cx + (2 / 3) * (c.x1 - cx)
      const y1 = cy + (2 / 3) * (c.y1 - cy)
      const x2 = c.x + (2 / 3) * (c.x1 - c.x)
      const y2 = c.y + (2 / 3) * (c.y1 - c.y)
      out.push(`${n4(x1)} ${n4(y1)} ${n4(x2)} ${n4(y2)} ${n4(c.x)} ${n4(c.y)} c`)
      cx = c.x; cy = c.y
    } else out.push('h')
  }
  return out.join('\n')
}

async function deflate(parts: AsyncIterable<string> | Iterable<string>): Promise<Uint8Array> {
  const cs = new CompressionStream('deflate')
  const done = new Response(cs.readable).arrayBuffer()
  const writer = cs.writable.getWriter()
  const enc = new TextEncoder()
  for await (const p of parts) await writer.write(enc.encode(p))
  await writer.close()
  return new Uint8Array(await done)
}

/**
 * The film as a one-page vector PDF at true size. The clone is a Form XObject
 * drawn once and placed at every dot; the text is outlines. Black = ink.
 */
export async function renderFilmPdf(
  job: ScreenJob,
  text: TextBlock[],
  onProgress: (fraction: number) => void,
): Promise<Blob> {
  const Wpt = job.page.w * 72
  const Hpt = job.page.h * 72

  // Page content, in inches with y down: mirror, flip, then scale to points
  // (PDF applies the last `cm` to a point first).
  async function* content() {
    let head = 'q\n'
    if (job.mirror) head += `-1 0 0 1 ${n4(Wpt)} 0 cm\n`
    head += `1 0 0 -1 0 ${n4(Hpt)} cm\n72 0 0 72 0 0 cm\n0 g\n`
    yield head
    // Placing dots is synchronous; collect them, then stream them out in chunks.
    const dots: string[] = []
    forEachDot(
      job, 0, 0, job.page.w, job.page.h,
      (x, y, scale) => {
        const s = n4(scale)
        dots.push(`q ${s} 0 0 ${s} ${n4(x)} ${n4(y)} cm /D Do Q`)
      },
      f => onProgress(f * 0.9),
    )
    for (let i = 0; i < dots.length; i += 20000) yield dots.slice(i, i + 20000).join('\n') + '\n'
    if (text.length) yield pdfPath(text.flatMap(b => b.cmds)) + '\nf\n'
    yield 'Q\n'
  }
  const page = await deflate(content())
  const r = 2 // the clone never reaches past 2 cells
  const form = new TextEncoder().encode(`0 g\n${pdfPath(job.clone.cmds)}\nf\n`)

  const enc = new TextEncoder()
  const parts: Uint8Array[] = []
  const offsets: number[] = []
  let length = 0
  const push = (b: Uint8Array | string) => {
    const bytes = typeof b === 'string' ? enc.encode(b) : b
    parts.push(bytes)
    length += bytes.length
  }
  const obj = (n: number, body: string, stream?: Uint8Array) => {
    offsets[n] = length
    push(`${n} 0 obj\n${body}\n`)
    if (stream) { push('stream\n'); push(stream); push('\nendstream\n') }
    push('endobj\n')
  }
  push('%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n')
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>')
  obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>')
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n4(Wpt)} ${n4(Hpt)}] /Resources << /XObject << /D 5 0 R >> >> /Contents 4 0 R >>`)
  obj(4, `<< /Length ${page.length} /Filter /FlateDecode >>`, page)
  obj(5, `<< /Type /XObject /Subtype /Form /BBox [${-r} ${-r} ${r} ${r}] /Matrix [${n4(1 / job.lpi)} 0 0 ${n4(1 / job.lpi)} 0 0] /Length ${form.length} >>`, form)
  const xref = length
  let table = `xref\n0 6\n0000000000 65535 f \n`
  for (let i = 1; i <= 5; i++) table += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  push(table)
  push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`)
  onProgress(1)
  return new Blob(parts as BlobPart[], { type: 'application/pdf' })
}

// --- PNG (raster) -----------------------------------------------------------------

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
 * The same film as a 1-bit PNG at `dpi`, DPI recorded (pHYs), drawn in
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
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = strip
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!

  const cs = new CompressionStream('deflate') // zlib framing, which is what IDAT wants
  const compressed = new Response(cs.readable).arrayBuffer()
  const writer = cs.writable.getWriter()
  const ink = new Uint8Array(W * strip)
  try {
    for (let y = 0; y < H; y += strip) {
      const h = Math.min(strip, H - y)
      drawFilm(ctx, job, text, dpi, 0, y)
      const px = ctx.getImageData(0, 0, W, h).data
      for (let i = 0; i < W * h; i++) ink[i] = px[i * 4] < 128 ? 1 : 0
      const packed = new Uint8Array(rowBytes * h)
      for (let r = 0; r < h; r++) packRow(ink, r * W, W, packed, r * rowBytes)
      await writer.write(packed)
      onProgress(Math.min(1, (y + h) / H))
      await new Promise(r => setTimeout(r, 0))
    }
    await writer.close()
  } finally {
    canvas.width = canvas.height = 0
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
