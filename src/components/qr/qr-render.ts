/**
 * Everything the QR + wallpaper maker draws, and the maths behind placing it.
 * Pure functions, no React: the modal's live preview and the downloaded PNG
 * run through the very same code, so what is on screen is what is saved.
 *
 * Positions are stored as fractions, never pixels, so the preview (a few
 * hundred px wide) and the export (1290px wide) agree exactly:
 *   - photo: `scale` is a multiple of "cover" (1 = fills the screen), and
 *     `ox`/`oy` are the photo centre's offset from the screen centre, in
 *     screen-widths.
 *   - QR: `cx`/`cy` are the card centre as a fraction of screen width/height,
 *     `size` the card's width as a fraction of screen width.
 */

/** iPhone Pro Max portrait; the 9:19.5 shape a modern lock screen is cut to. */
export const WALLPAPER_W = 1290
export const WALLPAPER_H = 2796
/** The standalone QR PNG, big enough to print. */
export const QR_PNG_SIZE = 2048

export type QrShape = 'square' | 'rounded'
/** 'light' = black code on a white card; 'dark' = white code on a black card. */
export type QrScheme = 'light' | 'dark'
export interface QrStyle {
  shape: QrShape
  scheme: QrScheme
}

export type QrMatrix = boolean[][]

// --- Reading the module grid -------------------------------------------------

/** A finder pattern: 7x7 dark ring, 5x5 light ring, 3x3 dark centre. */
function isFinderAt(m: QrMatrix, r0: number, c0: number): boolean {
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      const ring = r === 0 || r === 6 || c === 0 || c === 6
      const core = r >= 2 && r <= 4 && c >= 2 && c <= 4
      if (m[r0 + r]?.[c0 + c] !== (ring || core)) return false
    }
  }
  return true
}

/**
 * The module grid of a rendered `<QRCodeSVG marginSize={0}>`, read from its
 * foreground path (runs of `M{x} {y}h{n}v1H{x}z`).
 *
 * qrcode.react does not export its matrix, and this avoids adding a second QR
 * library. The cost is depending on that path format, so the grid is
 * validated before use — square, a legal QR size, and all three finder
 * patterns where they belong. If a library upgrade ever changes the markup
 * this throws; it never quietly draws a code that will not scan.
 */
export function matrixFromSvgMarkup(markup: string): QrMatrix {
  const box = markup.match(/viewBox="0 0 (\d+) (\d+)"/)
  if (!box || box[1] !== box[2]) throw new Error('QR markup has no square viewBox')
  const n = Number(box[1])
  if (n < 21 || (n - 17) % 4 !== 0) throw new Error(`QR grid size ${n} is not a valid QR version`)

  const paths = Array.from(markup.matchAll(/<path[^>]*\sd="([^"]*)"/g))
  const d = paths.length ? paths[paths.length - 1][1] : ''
  const grid: QrMatrix = Array.from({ length: n }, () => Array<boolean>(n).fill(false))
  let runs = 0
  for (const run of d.matchAll(/M(\d+)[ ,](\d+)\s*h(\d+)v1H\d+z/g)) {
    const x = Number(run[1])
    const y = Number(run[2])
    const w = Number(run[3])
    if (y >= n || x + w > n) throw new Error('QR module run is outside the grid')
    for (let i = 0; i < w; i++) grid[y][x + i] = true
    runs++
  }
  if (!runs) throw new Error('QR markup has no module path')
  if (!isFinderAt(grid, 0, 0) || !isFinderAt(grid, 0, n - 7) || !isFinderAt(grid, n - 7, 0)) {
    throw new Error('QR module grid failed validation (finder patterns missing)')
  }
  return grid
}

// --- Drawing the QR ----------------------------------------------------------

/** Quiet zone around the code, in modules. Scanners want 4; the card contrasts with what is behind it, so 3. */
export const QUIET_MODULES = 3

export function qrColors(scheme: QrScheme): { card: string; ink: string } {
  return scheme === 'light' ? { card: '#ffffff', ink: '#000000' } : { card: '#000000', ink: '#ffffff' }
}

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2))
  if (radius === 0) {
    ctx.rect(x, y, w, h)
    return
  }
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + w - radius, y)
  ctx.arcTo(x + w, y, x + w, y + radius, radius)
  ctx.lineTo(x + w, y + h - radius)
  ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius)
  ctx.lineTo(x + radius, y + h)
  ctx.arcTo(x, y + h, x, y + h - radius, radius)
  ctx.lineTo(x, y + radius)
  ctx.arcTo(x, y, x + radius, y, radius)
  ctx.closePath()
}

/** Draw the QR as a square card with its top-left at (x, y), `size` wide. */
export function drawQrCard(
  ctx: CanvasRenderingContext2D,
  matrix: QrMatrix,
  x: number,
  y: number,
  size: number,
  style: QrStyle,
) {
  const n = matrix.length
  const m = size / (n + 2 * QUIET_MODULES)
  const { card, ink } = qrColors(style.scheme)
  const rounded = style.shape === 'rounded'

  ctx.save()
  ctx.fillStyle = card
  ctx.beginPath()
  roundedRectPath(ctx, x, y, size, size, rounded ? size * 0.06 : 0)
  ctx.fill()

  const ox = x + QUIET_MODULES * m
  const oy = y + QUIET_MODULES * m
  ctx.fillStyle = ink

  if (!rounded) {
    ctx.beginPath()
    for (let r = 0; r < n; r++) {
      let start = -1
      for (let c = 0; c <= n; c++) {
        const dark = c < n && matrix[r][c]
        if (dark && start < 0) start = c
        if (!dark && start >= 0) {
          ctx.rect(ox + start * m, oy + r * m, (c - start) * m, m)
          start = -1
        }
      }
    }
    ctx.fill()
    ctx.restore()
    return
  }

  // Rounded: dots for the data, soft-cornered eyes for the three finders.
  const inFinder = (r: number, c: number) =>
    (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7)
  const dot = m * 0.47
  ctx.beginPath()
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!matrix[r][c] || inFinder(r, c)) continue
      const cx = ox + (c + 0.5) * m
      const cy = oy + (r + 0.5) * m
      ctx.moveTo(cx + dot, cy)
      ctx.arc(cx, cy, dot, 0, Math.PI * 2)
    }
  }
  ctx.fill()

  for (const [fr, fc] of [[0, 0], [0, n - 7], [n - 7, 0]]) {
    const fx = ox + fc * m
    const fy = oy + fr * m
    ctx.beginPath()
    roundedRectPath(ctx, fx, fy, 7 * m, 7 * m, 2.1 * m)
    roundedRectPath(ctx, fx + m, fy + m, 5 * m, 5 * m, 1.2 * m)
    ctx.fill('evenodd')
    ctx.beginPath()
    roundedRectPath(ctx, fx + 2 * m, fy + 2 * m, 3 * m, 3 * m, 0.95 * m)
    ctx.fill()
  }
  ctx.restore()
}

// --- Placing the photo -------------------------------------------------------

export interface PhotoView {
  scale: number
  ox: number
  oy: number
}
export interface PhotoSource {
  source: CanvasImageSource
  width: number
  height: number
}

export const PHOTO_SCALE_MIN = 0.35
export const PHOTO_SCALE_MAX = 8
export const DEFAULT_PHOTO_VIEW: PhotoView = { scale: 1, ox: 0, oy: 0 }

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** The scale at which a photo exactly covers the wallpaper. */
export function coverScale(iw: number, ih: number, W = WALLPAPER_W, H = WALLPAPER_H): number {
  return Math.max(W / iw, H / ih)
}

/** Keep the photo's centre on the screen and its zoom in range — it can never be lost off-screen. */
export function clampPhotoView(v: PhotoView, W = WALLPAPER_W, H = WALLPAPER_H): PhotoView {
  return {
    scale: clamp(v.scale, PHOTO_SCALE_MIN, PHOTO_SCALE_MAX),
    ox: clamp(v.ox, -0.5, 0.5),
    oy: clamp(v.oy, -H / W / 2, H / W / 2),
  }
}

/**
 * Zoom by `factor` about a focal point (the fingers' midpoint) given in
 * screen-widths from the screen centre, so the part of the photo under the
 * fingers stays under them.
 */
export function zoomPhotoAbout(v: PhotoView, factor: number, fx: number, fy: number, W = WALLPAPER_W, H = WALLPAPER_H): PhotoView {
  const scale = clamp(v.scale * factor, PHOTO_SCALE_MIN, PHOTO_SCALE_MAX)
  const k = scale / v.scale
  return clampPhotoView({ scale, ox: fx + (v.ox - fx) * k, oy: fy + (v.oy - fy) * k }, W, H)
}

export function photoRect(p: PhotoSource, v: PhotoView, W = WALLPAPER_W, H = WALLPAPER_H) {
  const s = coverScale(p.width, p.height, W, H) * v.scale
  const w = p.width * s
  const h = p.height * s
  return { x: W / 2 + v.ox * W - w / 2, y: H / 2 + v.oy * W - h / 2, w, h }
}

// --- Placing the QR ----------------------------------------------------------

export interface QrPlacement {
  cx: number
  cy: number
  size: number
}
export const QR_SIZE_MIN = 0.18
export const QR_SIZE_MAX = 0.92
export const DEFAULT_QR_PLACEMENT: QrPlacement = { cx: 0.5, cy: 0.78, size: 0.56 }

/** Keep the whole card on the wallpaper. */
export function clampQrPlacement(p: QrPlacement, W = WALLPAPER_W, H = WALLPAPER_H): QrPlacement {
  const size = clamp(p.size, QR_SIZE_MIN, QR_SIZE_MAX)
  const halfX = size / 2
  const halfY = (size * W) / H / 2
  return { size, cx: clamp(p.cx, halfX, 1 - halfX), cy: clamp(p.cy, halfY, 1 - halfY) }
}

/** Is the point (as fractions of the wallpaper's width/height) on the QR card? */
export function qrContains(p: QrPlacement, fx: number, fy: number, W = WALLPAPER_W, H = WALLPAPER_H): boolean {
  const halfX = p.size / 2
  const halfY = (p.size * W) / H / 2
  return Math.abs(fx - p.cx) <= halfX && Math.abs(fy - p.cy) <= halfY
}

// --- The wallpaper -----------------------------------------------------------

export interface WallpaperOptions {
  photo: PhotoSource | null
  view: PhotoView
  /** Omit to draw the photo alone (the photo step). */
  qr?: { matrix: QrMatrix; style: QrStyle; placement: QrPlacement }
}

/** Draw the whole wallpaper onto `ctx`, scaled so `W` is the canvas width. */
export function drawWallpaper(ctx: CanvasRenderingContext2D, W: number, H: number, opts: WallpaperOptions) {
  ctx.save()
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, W, H)

  if (opts.photo) {
    // Maths runs at the canonical size, then scales to this canvas.
    const r = photoRect(opts.photo, opts.view)
    const k = W / WALLPAPER_W
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(opts.photo.source, r.x * k, r.y * k, r.w * k, r.h * k)
  }

  if (opts.qr) {
    const p = clampQrPlacement(opts.qr.placement)
    const size = p.size * W
    const x = p.cx * W - size / 2
    const y = p.cy * H - size / 2
    drawQrCard(ctx, opts.qr.matrix, x, y, size, opts.qr.style)
  }
  ctx.restore()
}
