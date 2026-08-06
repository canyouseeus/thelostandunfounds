/**
 * QR rendering core — shared by every QR surface on the platform.
 *
 * Everything (on-screen preview, PNG download, portrait wallpaper) goes through
 * `drawQRCode` / `renderPortrait` so the preview is literally the same pixels the
 * user downloads. The old /qr page drew the preview one way and the export another,
 * which is why exports never matched what was on screen.
 */
import qrcode from 'qrcode-generator'

export type QRModuleStyle = 'square' | 'dots' | 'rounded'
export type QREyeStyle = 'square' | 'rounded' | 'circle'

export interface QRStyleOptions {
  /** Module (pixel) shape. `square` is the plain, maximum-compatibility code. */
  moduleStyle: QRModuleStyle
  /** Finder-pattern (corner eye) shape. */
  eyeStyle: QREyeStyle
  /** Foreground colour of the modules. */
  fgColor: string
  /** Background colour behind the code. Use `transparent` for none. */
  bgColor: string
  /** Quiet-zone width, in modules. The spec minimum is 4. */
  margin: number
  /** Logo drawn in the centre, already loaded. */
  logo?: HTMLImageElement | null
  /** Logo width as a fraction of the code's width. Keep <= 0.25 at level H. */
  logoScale: number
  /** Draw an opaque plate behind the logo so it doesn't sit on top of modules. */
  logoPadding: boolean
}

/**
 * Average luminance (0–1) of an image's opaque pixels, or null if it can't be
 * sampled. Our own logo is pure white with a transparent field, so a white plate
 * behind it renders it invisible — callers use this to pick a contrasting plate.
 */
export function averageLuminance(img: HTMLImageElement): number | null {
  try {
    const sample = document.createElement('canvas')
    const w = (sample.width = Math.min(img.width || 64, 64))
    const h = (sample.height = Math.min(img.height || 64, 64))
    const ctx = sample.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null
    ctx.drawImage(img, 0, 0, w, h)
    const { data } = ctx.getImageData(0, 0, w, h)
    let total = 0
    let count = 0
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue
      total += (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255
      count++
    }
    return count ? total / count : null
  } catch {
    // Tainted canvas (cross-origin logo) — fall back to the caller's default.
    return null
  }
}

export const DEFAULT_QR_STYLE: QRStyleOptions = {
  moduleStyle: 'square',
  eyeStyle: 'square',
  fgColor: '#000000',
  bgColor: '#ffffff',
  margin: 4,
  logo: null,
  // 0.18 keeps the punched-out area well inside what level H can reconstruct,
  // even with a decorative module style eating extra contrast.
  logoScale: 0.18,
  logoPadding: true,
}

export interface QRMatrix {
  size: number
  isDark: (row: number, col: number) => boolean
}

/**
 * Encode `value` at error-correction level H. Level H tolerates ~30% damage,
 * which is what buys us the room to punch a logo through the middle.
 */
export function buildMatrix(value: string): QRMatrix {
  const qr = qrcode(0, 'H')
  qr.addData(value)
  qr.make()
  const size = qr.getModuleCount()
  return { size, isDark: (r, c) => qr.isDark(r, c) }
}

/** True when (row, col) falls inside one of the three finder patterns. */
function inFinder(row: number, col: number, count: number): boolean {
  const near = (r: number, c: number) => r < 7 && c < 7
  return (
    near(row, col) ||
    near(row, count - 1 - col) ||
    near(count - 1 - row, col)
  )
}

/**
 * Alignment-pattern centre coordinates per QR version (ISO/IEC 18004 Annex E).
 * Index is the version number; version 1 has none.
 */
const ALIGNMENT_CENTERS: number[][] = [
  [], [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34],
  [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50], [6, 30, 54], [6, 32, 58], [6, 34, 62],
  [6, 26, 46, 66], [6, 26, 48, 70], [6, 26, 50, 74], [6, 30, 54, 78], [6, 30, 56, 82], [6, 30, 58, 86], [6, 34, 62, 90],
  [6, 28, 50, 72, 94], [6, 26, 50, 74, 98], [6, 30, 54, 78, 102], [6, 28, 54, 80, 106], [6, 32, 58, 84, 110], [6, 30, 58, 86, 114], [6, 34, 62, 90, 118],
  [6, 26, 50, 74, 98, 122], [6, 30, 54, 78, 102, 126], [6, 26, 52, 78, 104, 130], [6, 30, 56, 82, 108, 134], [6, 34, 60, 86, 112, 138], [6, 30, 58, 86, 114, 142], [6, 34, 62, 90, 118, 146],
  [6, 30, 54, 78, 102, 126, 150], [6, 24, 50, 76, 102, 128, 154], [6, 28, 54, 80, 106, 132, 158], [6, 32, 58, 84, 110, 136, 162], [6, 26, 54, 82, 110, 138, 166], [6, 30, 58, 86, 114, 142, 170],
]

/**
 * True when (row, col) sits inside a 5×5 alignment pattern. Decoders find these by
 * looking for a solid concentric block, so a dotted style must not break them up.
 */
function inAlignment(row: number, col: number, count: number): boolean {
  const version = (count - 17) / 4
  const centers = ALIGNMENT_CENTERS[version]
  if (!centers || centers.length === 0) return false
  for (const r of centers) {
    for (const c of centers) {
      // The three finder corners have no alignment pattern.
      if ((r === 6 && c === 6) || (r === 6 && c === centers[centers.length - 1]) ||
          (r === centers[centers.length - 1] && c === 6)) continue
      if (Math.abs(row - r) <= 2 && Math.abs(col - c) <= 2) return true
    }
  }
  return false
}

/** True for the two timing-pattern lines, which decoders use to count modules. */
function inTiming(row: number, col: number): boolean {
  return row === 6 || col === 6
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function drawEye(
  ctx: CanvasRenderingContext2D,
  originX: number, originY: number, unit: number,
  style: QREyeStyle, fg: string, bg: string,
) {
  const outer = unit * 7
  const radiusFor = (size: number) =>
    style === 'circle' ? size / 2 : style === 'rounded' ? size * 0.28 : 0

  ctx.fillStyle = fg
  roundedRect(ctx, originX, originY, outer, outer, radiusFor(outer))
  ctx.fill()

  // Punch the ring out with the background colour, then redraw the pupil.
  const midSize = unit * 5
  ctx.fillStyle = bg === 'transparent' ? '#ffffff' : bg
  roundedRect(ctx, originX + unit, originY + unit, midSize, midSize, radiusFor(midSize))
  ctx.fill()

  const pupil = unit * 3
  ctx.fillStyle = fg
  roundedRect(ctx, originX + unit * 2, originY + unit * 2, pupil, pupil, radiusFor(pupil))
  ctx.fill()
}

/**
 * Draw a QR code into `ctx` occupying a `size`×`size` box at (x, y),
 * quiet zone included. Returns the box it painted so callers can lay out around it.
 */
export function drawQRCode(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  size: number,
  options: Partial<QRStyleOptions> = {},
): { x: number; y: number; size: number } {
  const opts: QRStyleOptions = { ...DEFAULT_QR_STYLE, ...options }
  const matrix = buildMatrix(value)
  const count = matrix.size
  const total = count + opts.margin * 2
  const unit = size / total
  const originX = x + opts.margin * unit
  const originY = y + opts.margin * unit

  if (opts.bgColor && opts.bgColor !== 'transparent') {
    ctx.fillStyle = opts.bgColor
    ctx.fillRect(x, y, size, size)
  }

  ctx.fillStyle = opts.fgColor
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (!matrix.isDark(row, col)) continue
      // Finder patterns are drawn as whole shapes below — skip their modules so a
      // dotted style doesn't shred the three markers scanners rely on to lock on.
      if (opts.eyeStyle !== 'square' && inFinder(row, col, count)) continue

      const mx = originX + col * unit
      const my = originY + row * unit

      // Function patterns stay solid whatever the decorative style. Dotting the
      // alignment blocks and timing lines is what stops a "fancy" code scanning.
      const functional = inFinder(row, col, count) || inAlignment(row, col, count) || inTiming(row, col)
      if (functional) {
        ctx.fillRect(mx, my, unit + 0.5, unit + 0.5)
      } else if (opts.moduleStyle === 'dots') {
        ctx.beginPath()
        // Tangent circles (r = half a module) — smaller dots lose enough ink that
        // decoders start failing on the denser codes.
        ctx.arc(mx + unit / 2, my + unit / 2, unit * 0.5, 0, Math.PI * 2)
        ctx.fill()
      } else if (opts.moduleStyle === 'rounded') {
        roundedRect(ctx, mx, my, unit, unit, unit * 0.3)
        ctx.fill()
      } else {
        // +0.5 closes the hairline seams sub-pixel rounding leaves between modules.
        ctx.fillRect(mx, my, unit + 0.5, unit + 0.5)
      }
    }
  }

  if (opts.eyeStyle !== 'square') {
    const eyes: Array<[number, number]> = [
      [originX, originY],
      [originX + (count - 7) * unit, originY],
      [originX, originY + (count - 7) * unit],
    ]
    for (const [ex, ey] of eyes) {
      drawEye(ctx, ex, ey, unit, opts.eyeStyle, opts.fgColor, opts.bgColor)
    }
  }

  if (opts.logo && opts.logoScale > 0) {
    const logoSize = size * Math.min(opts.logoScale, 0.24)
    const logoX = x + (size - logoSize) / 2
    const logoY = y + (size - logoSize) / 2
    if (opts.logoPadding) {
      const pad = logoSize * 0.12
      // Plate must contrast with the logo itself, not with the code. Our wordmark
      // is pure white, so a white plate would swallow it entirely.
      const luminance = averageLuminance(opts.logo)
      const plate =
        luminance == null
          ? (opts.bgColor === 'transparent' ? '#ffffff' : opts.bgColor)
          : luminance > 0.6
            ? '#000000'
            : '#ffffff'
      ctx.fillStyle = plate
      ctx.fillRect(logoX - pad, logoY - pad, logoSize + pad * 2, logoSize + pad * 2)
    }
    // Preserve the logo's aspect ratio — squashing a wordmark was the old bug.
    const ratio = opts.logo.width / opts.logo.height || 1
    const drawW = ratio >= 1 ? logoSize : logoSize * ratio
    const drawH = ratio >= 1 ? logoSize / ratio : logoSize
    ctx.drawImage(
      opts.logo,
      x + (size - drawW) / 2,
      y + (size - drawH) / 2,
      drawW,
      drawH,
    )
  }

  return { x, y, size }
}

// ─── Portrait wallpaper ───────────────────────────────────────────────────────

export const PORTRAIT_WIDTH = 1080
export const PORTRAIT_HEIGHT = 1920

export interface PortraitOptions {
  background: HTMLImageElement | null
  /** Solid fill used when there is no background image. */
  backgroundColor: string
  /** 0–1 black scrim over the background so the code stays scannable. */
  overlayOpacity: number
  /** QR centre position as a 0–1 fraction of the canvas. */
  position: { x: number; y: number }
  /** QR width as a fraction of canvas width. */
  sizePercent: number
  /** Optional headline drawn above the code. */
  headline?: string
  /** Optional caption drawn below the code — normally the URL or the code. */
  caption?: string
  textColor: string
}

export const DEFAULT_PORTRAIT: PortraitOptions = {
  background: null,
  backgroundColor: '#000000',
  overlayOpacity: 0.35,
  position: { x: 0.5, y: 0.5 },
  sizePercent: 0.45,
  headline: '',
  caption: '',
  textColor: '#ffffff',
}

/** Cover-fit an image into the canvas, the way a phone wallpaper crops. */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  width: number,
  height: number,
) {
  const imgAspect = img.width / img.height
  const boxAspect = width / height
  let drawWidth = width
  let drawHeight = height
  if (imgAspect > boxAspect) {
    drawWidth = height * imgAspect
  } else {
    drawHeight = width / imgAspect
  }
  ctx.drawImage(img, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight)
}

/**
 * Render a full 1080×1920 portrait wallpaper with the code composited on top.
 * Draws at full resolution regardless of the on-screen preview size — the preview
 * just scales this canvas down, so what you see is what downloads.
 */
export function renderPortrait(
  canvas: HTMLCanvasElement,
  value: string,
  style: Partial<QRStyleOptions>,
  portrait: Partial<PortraitOptions>,
): void {
  const p: PortraitOptions = { ...DEFAULT_PORTRAIT, ...portrait }
  canvas.width = PORTRAIT_WIDTH
  canvas.height = PORTRAIT_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, PORTRAIT_WIDTH, PORTRAIT_HEIGHT)

  if (p.background) {
    drawCover(ctx, p.background, PORTRAIT_WIDTH, PORTRAIT_HEIGHT)
  } else {
    ctx.fillStyle = p.backgroundColor
    ctx.fillRect(0, 0, PORTRAIT_WIDTH, PORTRAIT_HEIGHT)
  }

  if (p.overlayOpacity > 0) {
    ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(Math.max(p.overlayOpacity, 0), 1)})`
    ctx.fillRect(0, 0, PORTRAIT_WIDTH, PORTRAIT_HEIGHT)
  }

  const qrSize = PORTRAIT_WIDTH * p.sizePercent
  // position is the *centre* of the code, clamped so it can never run off-canvas.
  const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max)
  const halfX = qrSize / 2 / PORTRAIT_WIDTH
  const halfY = qrSize / 2 / PORTRAIT_HEIGHT
  const cx = clamp(p.position.x, halfX, 1 - halfX) * PORTRAIT_WIDTH
  const cy = clamp(p.position.y, halfY, 1 - halfY) * PORTRAIT_HEIGHT
  const qrX = cx - qrSize / 2
  const qrY = cy - qrSize / 2

  drawQRCode(ctx, value, qrX, qrY, qrSize, style)

  ctx.textAlign = 'center'
  ctx.fillStyle = p.textColor
  if (p.headline) {
    ctx.font = `900 ${Math.round(PORTRAIT_WIDTH * 0.055)}px Inter, system-ui, sans-serif`
    ctx.fillText(p.headline.toUpperCase(), PORTRAIT_WIDTH / 2, qrY - PORTRAIT_WIDTH * 0.05, PORTRAIT_WIDTH * 0.86)
  }
  if (p.caption) {
    ctx.font = `700 ${Math.round(PORTRAIT_WIDTH * 0.028)}px Inter, system-ui, sans-serif`
    ctx.fillText(p.caption, PORTRAIT_WIDTH / 2, qrY + qrSize + PORTRAIT_WIDTH * 0.075, PORTRAIT_WIDTH * 0.86)
  }
}

// ─── Asset + download helpers ────────────────────────────────────────────────

export function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    // Needed so a remote logo doesn't taint the canvas and break toBlob().
    if (!src.startsWith('data:')) img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read image'))
    reader.readAsDataURL(file)
  })
}

export function downloadCanvas(canvas: HTMLCanvasElement, filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Could not export image'))
        return
      }
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      resolve()
    }, 'image/png')
  })
}

/** Turn a URL into a safe, readable filename stem. */
export function slugForFilename(value: string): string {
  return (
    value
      .replace(/^https?:\/\//, '')
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase()
      .slice(0, 60) || 'qr-code'
  )
}
