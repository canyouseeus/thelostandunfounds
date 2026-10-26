import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { XMarkIcon, ArrowDownTrayIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline'
import {
  WALLPAPER_W, WALLPAPER_H, QR_PNG_SIZE,
  QR_SIZE_MIN, QR_SIZE_MAX, PHOTO_SCALE_MIN, PHOTO_SCALE_MAX,
  DEFAULT_PHOTO_VIEW, DEFAULT_QR_PLACEMENT,
  clampPhotoView, clampQrPlacement, drawQrCard, drawWallpaper, matrixFromSvgMarkup, zoomPhotoAbout,
  type PhotoSource, type PhotoView, type QrMatrix, type QrPlacement, type QrScheme, type QrShape,
} from './qr-render'

const SITE = 'https://www.thelostandunfounds.com'

type Step = 'qr' | 'photo' | 'place'
const STEPS: { id: Step; label: string }[] = [
  { id: 'qr', label: 'QR STYLE' },
  { id: 'photo', label: 'PHOTO' },
  { id: 'place', label: 'PLACE QR' },
]

interface Props {
  slug: string
  name: string
  onClose: () => void
}

const PREVIEW_W = 360
const PREVIEW_H = Math.round((PREVIEW_W * WALLPAPER_H) / WALLPAPER_W)

function saveCanvas(canvas: HTMLCanvasElement, filename: string): Promise<Blob | null> {
  return new Promise(resolve => {
    canvas.toBlob(blob => {
      if (blob) {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        a.remove()
        setTimeout(() => URL.revokeObjectURL(url), 10000)
      }
      resolve(blob)
    }, 'image/png')
  })
}

/**
 * Pan + pinch on a canvas. Reports drags in fractions of the canvas box and
 * pinch/wheel zoom as a factor about the fingers' midpoint, so callers never
 * touch pixels. Two pointers = pinch; one = drag.
 */
function useGestures(
  ref: React.RefObject<HTMLCanvasElement>,
  active: boolean,
  h: {
    onDrag: (dx: number, dy: number) => void // fractions of canvas width / height
    onZoom: (factor: number, fx: number, fy: number) => void // fx, fy: fractions of width from the centre
  },
) {
  const handlers = useRef(h)
  handlers.current = h

  useEffect(() => {
    const el = ref.current
    if (!active || !el) return
    const pts = new Map<number, { x: number; y: number }>()
    let lastDist = 0

    const mid = () => {
      const p = Array.from(pts.values())
      return { x: p.reduce((s, q) => s + q.x, 0) / p.length, y: p.reduce((s, q) => s + q.y, 0) / p.length }
    }
    const dist = () => {
      const [a, b] = Array.from(pts.values())
      return Math.hypot(a.x - b.x, a.y - b.y)
    }
    const focal = (x: number, y: number) => {
      const r = el.getBoundingClientRect()
      return { fx: (x - r.left) / r.width - 0.5, fy: (y - r.top) / r.width - r.height / r.width / 2 }
    }

    const down = (e: PointerEvent) => {
      try { el.setPointerCapture(e.pointerId) } catch { /* pointer already gone */ }
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pts.size === 2) lastDist = dist()
    }
    const move = (e: PointerEvent) => {
      const prev = pts.get(e.pointerId)
      if (!prev) return
      const r = el.getBoundingClientRect()
      if (pts.size === 1) {
        handlers.current.onDrag((e.clientX - prev.x) / r.width, (e.clientY - prev.y) / r.height)
        pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
      } else if (pts.size === 2) {
        const before = mid()
        pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
        const after = mid()
        const d = dist()
        if (lastDist > 0 && d > 0) {
          const f = focal(after.x, after.y)
          handlers.current.onZoom(d / lastDist, f.fx, f.fy)
        }
        lastDist = d
        // Two fingers also carry the content along as they travel.
        handlers.current.onDrag((after.x - before.x) / r.width, (after.y - before.y) / r.height)
      }
    }
    const up = (e: PointerEvent) => {
      pts.delete(e.pointerId)
      lastDist = pts.size === 2 ? dist() : 0
    }
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      const f = focal(e.clientX, e.clientY)
      handlers.current.onZoom(Math.exp(-e.deltaY * 0.0015), f.fx, f.fy)
    }

    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    el.addEventListener('wheel', wheel, { passive: false })
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
      el.removeEventListener('wheel', wheel)
    }
  }, [ref, active])
}

const seg = (on: boolean) =>
  `flex-1 px-3 py-2.5 text-xs font-bold uppercase tracking-wider ${on ? 'bg-white text-black' : 'bg-white/10 text-white/60 hover:text-white'}`

export default function QrWallpaperModal({ slug, name, onClose }: Props) {
  const url = `${SITE}/gallery/${slug}`
  const [step, setStep] = useState<Step>('qr')
  const [shape, setShape] = useState<QrShape>('rounded')
  const [scheme, setScheme] = useState<QrScheme>('light')
  const [matrix, setMatrix] = useState<QrMatrix | null>(null)
  const [matrixError, setMatrixError] = useState<string | null>(null)
  const [photo, setPhoto] = useState<(PhotoSource & { label: string }) | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [view, setView] = useState<PhotoView>(DEFAULT_PHOTO_VIEW)
  const [placement, setPlacement] = useState<QrPlacement>(DEFAULT_QR_PLACEMENT)
  const [busy, setBusy] = useState(false)

  const svgHost = useRef<HTMLDivElement>(null)
  const qrCanvas = useRef<HTMLCanvasElement>(null)
  const wallCanvas = useRef<HTMLCanvasElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  // Module grid, read from the library's own SVG output. Level H so the code
  // still scans with rounded dots and a photo behind it.
  useEffect(() => {
    try {
      const svg = svgHost.current?.innerHTML
      if (!svg) throw new Error('QR did not render')
      setMatrix(matrixFromSvgMarkup(svg))
    } catch (e) {
      setMatrixError(e instanceof Error ? e.message : 'QR failed')
    }
  }, [url])

  // The parent passes a fresh onClose every render; keep it out of the effect's
  // deps so scroll-lock is taken once on open and released once on close.
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeRef.current() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [])

  // Step 1 preview.
  useEffect(() => {
    const c = qrCanvas.current
    if (step !== 'qr' || !c || !matrix) return
    const ctx = c.getContext('2d')!
    ctx.clearRect(0, 0, c.width, c.height)
    drawQrCard(ctx, matrix, 0, 0, c.width, { shape, scheme })
  }, [step, matrix, shape, scheme])

  // Steps 2 and 3 preview — the same drawing the download uses.
  useEffect(() => {
    const c = wallCanvas.current
    if (step === 'qr' || !c) return
    const ctx = c.getContext('2d')!
    drawWallpaper(ctx, c.width, c.height, {
      photo,
      view,
      qr: step === 'place' && matrix ? { matrix, style: { shape, scheme }, placement } : undefined,
    })
  }, [step, photo, view, matrix, shape, scheme, placement])

  useGestures(wallCanvas, step !== 'qr', {
    onDrag: (dx, dy) => {
      if (step === 'photo') {
        // Drag distances are fractions of width/height; photo offsets are in screen-widths.
        setView(v => clampPhotoView({ ...v, ox: v.ox + dx, oy: v.oy + (dy * WALLPAPER_H) / WALLPAPER_W }))
      } else if (step === 'place') {
        setPlacement(p => clampQrPlacement({ ...p, cx: p.cx + dx, cy: p.cy + dy }))
      }
    },
    onZoom: (factor, fx, fy) => {
      if (step === 'photo') setView(v => zoomPhotoAbout(v, factor, fx, fy))
      else if (step === 'place') setPlacement(p => clampQrPlacement({ ...p, size: p.size * factor }))
    },
  })

  const loadPhoto = useCallback(async (file: File) => {
    setPhotoError(null)
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
      setPhoto({ source: bitmap, width: bitmap.width, height: bitmap.height, label: file.name })
      setView(DEFAULT_PHOTO_VIEW)
    } catch {
      setPhotoError('That file could not be read as a photo. Try a JPG or PNG.')
    }
  }, [])

  const downloadQr = async () => {
    if (!matrix) return
    const c = document.createElement('canvas')
    c.width = c.height = QR_PNG_SIZE
    drawQrCard(c.getContext('2d')!, matrix, 0, 0, QR_PNG_SIZE, { shape, scheme })
    await saveCanvas(c, `${slug}-qr.png`)
  }

  const renderWallpaper = () => {
    const c = document.createElement('canvas')
    c.width = WALLPAPER_W
    c.height = WALLPAPER_H
    drawWallpaper(c.getContext('2d')!, WALLPAPER_W, WALLPAPER_H, {
      photo, view, qr: matrix ? { matrix, style: { shape, scheme }, placement } : undefined,
    })
    return c
  }

  const downloadWallpaper = async () => {
    setBusy(true)
    try { await saveCanvas(renderWallpaper(), `${slug}-wallpaper.png`) } finally { setBusy(false) }
  }

  // On a phone the useful move is Save to Photos, which only the share sheet offers.
  const canShareFiles = useMemo(() => {
    try {
      return typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [new File([''], 'x.png', { type: 'image/png' })] })
    } catch { return false }
  }, [])
  const shareWallpaper = async () => {
    setBusy(true)
    try {
      const blob = await new Promise<Blob | null>(r => renderWallpaper().toBlob(r, 'image/png'))
      if (blob) await navigator.share({ files: [new File([blob], `${slug}-wallpaper.png`, { type: 'image/png' })] })
    } catch { /* cancelled */ } finally { setBusy(false) }
  }

  const stepIndex = STEPS.findIndex(s => s.id === step)

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 pb-24"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label={`QR code for ${name}`}
      data-testid="qr-modal"
    >
      <div className="bg-[#0A0A0A] w-full max-w-md max-h-[calc(100vh-7rem)] overflow-y-auto p-5 relative text-left">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white" aria-label="Close">
          <XMarkIcon className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-bold text-white uppercase tracking-widest pr-8">QR CODE</h2>
        <p className="text-white/40 text-xs font-mono mt-1 mb-4 break-all">{url}</p>
        <p className="text-white/60 text-xs uppercase tracking-wider mb-4" data-testid="qr-step-label">
          STEP {stepIndex + 1} / {STEPS.length} · {STEPS[stepIndex].label}
        </p>

        {/* Library output we read the module grid from; never shown. */}
        <div ref={svgHost} className="hidden" aria-hidden="true">
          <QRCodeSVG value={url} size={256} level="H" marginSize={0} />
        </div>

        {matrixError && <p className="text-red-400 text-sm mb-4">{matrixError}</p>}

        {step === 'qr' && (
          <div>
            <div className="bg-white/5 p-4 flex justify-center mb-4">
              <canvas ref={qrCanvas} width={512} height={512} className="w-56 h-56" data-testid="qr-preview" />
            </div>
            <p className="text-white/60 text-xs uppercase tracking-wider mb-2">SHAPE</p>
            <div className="flex gap-1 mb-4">
              <button className={seg(shape === 'square')} onClick={() => setShape('square')}>SQUARE</button>
              <button className={seg(shape === 'rounded')} onClick={() => setShape('rounded')}>ROUNDED</button>
            </div>
            <p className="text-white/60 text-xs uppercase tracking-wider mb-2">COLOR</p>
            <div className="flex gap-1 mb-5">
              <button className={seg(scheme === 'light')} onClick={() => setScheme('light')}>BLACK ON WHITE</button>
              <button className={seg(scheme === 'dark')} onClick={() => setScheme('dark')}>WHITE ON BLACK</button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={downloadQr}
                disabled={!matrix}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-3 bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider disabled:opacity-40"
              >
                <ArrowDownTrayIcon className="w-4 h-4" /> DOWNLOAD QR
              </button>
              <button
                onClick={() => setStep('photo')}
                disabled={!matrix}
                className="flex-1 px-3 py-3 bg-white text-black text-xs font-bold uppercase tracking-wider disabled:opacity-40"
              >
                MAKE WALLPAPER →
              </button>
            </div>
          </div>
        )}

        {step !== 'qr' && (
          <div>
            <div className="flex justify-center mb-3">
              <canvas
                ref={wallCanvas}
                width={PREVIEW_W}
                height={PREVIEW_H}
                data-testid="wallpaper-preview"
                className="bg-black select-none cursor-grab active:cursor-grabbing"
                style={{ height: 'min(52vh, 520px)', aspectRatio: `${WALLPAPER_W} / ${WALLPAPER_H}`, touchAction: 'none' }}
              />
            </div>

            {step === 'photo' && (
              <div>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  data-testid="wallpaper-file"
                  onChange={e => { const f = e.target.files?.[0]; if (f) void loadPhoto(f); e.target.value = '' }}
                />
                <button
                  onClick={() => fileInput.current?.click()}
                  className="w-full flex items-center justify-center gap-2 px-3 py-3 bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider mb-3"
                >
                  <ArrowUpTrayIcon className="w-4 h-4" /> {photo ? 'CHOOSE A DIFFERENT PHOTO' : 'CHOOSE A PHOTO'}
                </button>
                {photoError && <p className="text-red-400 text-xs mb-3">{photoError}</p>}
                <label className="block text-white/60 text-xs uppercase tracking-wider mb-1">ZOOM PHOTO</label>
                <input
                  type="range" min={0} max={100} step={0.5} disabled={!photo}
                  aria-label="Zoom photo"
                  className="w-full mb-1 accent-white"
                  value={(Math.log(view.scale / PHOTO_SCALE_MIN) / Math.log(PHOTO_SCALE_MAX / PHOTO_SCALE_MIN)) * 100}
                  onChange={e => {
                    const s = PHOTO_SCALE_MIN * Math.pow(PHOTO_SCALE_MAX / PHOTO_SCALE_MIN, Number(e.target.value) / 100)
                    setView(v => zoomPhotoAbout(v, s / v.scale, 0, 0))
                  }}
                />
                <p className="text-white/40 text-xs mb-4">
                  {photo ? 'Drag to move. Pinch or scroll to zoom.' : 'Pick the photo that goes behind the QR code.'}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setStep('qr')} className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider">← BACK</button>
                  <button
                    onClick={() => setStep('place')}
                    disabled={!photo}
                    className="flex-1 px-3 py-3 bg-white text-black text-xs font-bold uppercase tracking-wider disabled:opacity-40"
                  >
                    PLACE THE QR CODE →
                  </button>
                </div>
              </div>
            )}

            {step === 'place' && (
              <div>
                <label className="block text-white/60 text-xs uppercase tracking-wider mb-1">QR SIZE</label>
                <input
                  type="range" min={QR_SIZE_MIN * 100} max={QR_SIZE_MAX * 100} step={0.5}
                  aria-label="QR size"
                  className="w-full mb-1 accent-white"
                  value={placement.size * 100}
                  onChange={e => setPlacement(p => clampQrPlacement({ ...p, size: Number(e.target.value) / 100 }))}
                />
                <p className="text-white/40 text-xs mb-4">Drag the preview to move the QR code. Pinch or scroll to resize it.</p>
                <div className="flex gap-2 mb-2">
                  <button onClick={() => setStep('photo')} className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider">← BACK</button>
                  <button
                    onClick={downloadWallpaper}
                    disabled={busy || !matrix}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-3 bg-white text-black text-xs font-bold uppercase tracking-wider disabled:opacity-40"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4" /> DOWNLOAD WALLPAPER
                  </button>
                </div>
                {canShareFiles && (
                  <button
                    onClick={shareWallpaper}
                    disabled={busy}
                    className="w-full px-3 py-3 bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider disabled:opacity-40"
                  >
                    SAVE TO PHOTOS / SHARE
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
