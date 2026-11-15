import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { ArrowDownTrayIcon, ArrowUpTrayIcon, PhotoIcon, ArrowLeftIcon, ArrowRightIcon, ShareIcon } from '@heroicons/react/24/outline'
import {
  WALLPAPER_W, WALLPAPER_H, QR_PNG_SIZE,
  QR_SIZE_MIN, QR_SIZE_MAX, PHOTO_SCALE_MIN, PHOTO_SCALE_MAX,
  DEFAULT_PHOTO_VIEW, DEFAULT_QR_PLACEMENT,
  clampPhotoView, clampQrPlacement, drawQrCard, drawWallpaper, matrixFromSvgMarkup, zoomPhotoAbout,
  type PhotoSource, type PhotoView, type QrMatrix, type QrPlacement, type QrScheme, type QrShape,
} from './qr-render'
import { useCanvasGestures } from '@/hooks/useCanvasGestures'
import GalleryPhotoPicker from '@/components/halftone/GalleryPhotoPicker'
import { useAuth } from '@/contexts/AuthContext'
import { isAdminUser } from '@/utils/admin'

type Step = 'qr' | 'photo' | 'place'
const STEPS: { id: Step; label: string }[] = [
  { id: 'qr', label: 'QR STYLE' },
  { id: 'photo', label: 'PHOTO' },
  { id: 'place', label: 'PLACE QR' },
]

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

const seg = (on: boolean) =>
  `flex-1 px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap ${on ? 'bg-white text-black' : 'bg-white/10 text-white/60 hover:text-white'}`
const secondary = 'flex items-center justify-start gap-2 px-4 py-3 bg-white/10 hover:bg-white hover:text-black text-white text-xs font-bold uppercase tracking-wider disabled:opacity-40'
const primary = 'flex items-center justify-start gap-2 px-4 py-3 bg-white text-black hover:bg-white/10 hover:text-white text-xs font-bold uppercase tracking-wider disabled:opacity-40'

interface Props {
  /** What the QR code opens. */
  url: string
  /** Start of the downloaded file names, e.g. a gallery slug. */
  fileBase: string
}

/**
 * QR style → photo → place QR → download/share. One maker for the /qr page and
 * every dashboard's gallery QR button, so both look and behave the same.
 * Signed-in people can pull the background straight from their galleries.
 */
export default function QrMaker({ url, fileBase }: Props) {
  const [step, setStep] = useState<Step>('qr')
  const [shape, setShape] = useState<QrShape>('rounded')
  const [scheme, setScheme] = useState<QrScheme>('light')
  const [matrix, setMatrix] = useState<QrMatrix | null>(null)
  const [matrixError, setMatrixError] = useState<string | null>(null)
  const [photo, setPhoto] = useState<(PhotoSource & { label: string }) | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)
  const [view, setView] = useState<PhotoView>(DEFAULT_PHOTO_VIEW)
  const [placement, setPlacement] = useState<QrPlacement>(DEFAULT_QR_PLACEMENT)
  const [busy, setBusy] = useState(false)

  // Admin browses every gallery and Drive folder; anyone else only the galleries they own.
  const { user } = useAuth()
  const pickerOwnerId = user && !isAdminUser(user) ? user.id : undefined

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
      setMatrixError(null)
    } catch (e) {
      setMatrix(null)
      setMatrixError(e instanceof Error ? e.message : 'QR failed')
    }
  }, [url])

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

  useCanvasGestures(wallCanvas, step !== 'qr', {
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

  const applyBlob = useCallback(async (blob: Blob, label: string) => {
    const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' })
    setPhoto({ source: bitmap, width: bitmap.width, height: bitmap.height, label })
    setView(DEFAULT_PHOTO_VIEW)
  }, [])

  const loadPhoto = useCallback(async (file: File) => {
    setPhotoError(null)
    try { await applyBlob(file, file.name) } catch {
      setPhotoError('That file could not be read as a photo. Try a JPG or PNG.')
    }
  }, [applyBlob])

  const downloadQr = async () => {
    if (!matrix) return
    const c = document.createElement('canvas')
    c.width = c.height = QR_PNG_SIZE
    drawQrCard(c.getContext('2d')!, matrix, 0, 0, QR_PNG_SIZE, { shape, scheme })
    await saveCanvas(c, `${fileBase}-qr.png`)
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
    try { await saveCanvas(renderWallpaper(), `${fileBase}-wallpaper.png`) } finally { setBusy(false) }
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
      if (blob) await navigator.share({ files: [new File([blob], `${fileBase}-wallpaper.png`, { type: 'image/png' })] })
    } catch { /* cancelled */ } finally { setBusy(false) }
  }

  const stepIndex = STEPS.findIndex(s => s.id === step)

  return (
    <div className="text-left" data-testid="qr-maker">
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
          <div className="bg-white/5 p-4 mb-4">
            <canvas ref={qrCanvas} width={512} height={512} className="w-56 h-56" data-testid="qr-preview" />
          </div>
          <p className="text-white/60 text-xs uppercase tracking-wider mb-2">SHAPE</p>
          <div data-tour="qr-shape" className="flex gap-1 mb-4">
            <button className={seg(shape === 'square')} onClick={() => setShape('square')}>SQUARE</button>
            <button className={seg(shape === 'rounded')} onClick={() => setShape('rounded')}>ROUNDED</button>
          </div>
          <p className="text-white/60 text-xs uppercase tracking-wider mb-2">COLOR</p>
          <div data-tour="qr-scheme" className="grid grid-cols-1 sm:grid-cols-2 gap-1 mb-5">
            <button className={seg(scheme === 'light')} onClick={() => setScheme('light')}>BLACK ON WHITE</button>
            <button className={seg(scheme === 'dark')} onClick={() => setScheme('dark')}>WHITE ON BLACK</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button data-tour="qr-download" onClick={downloadQr} disabled={!matrix} className={secondary}>
              <ArrowDownTrayIcon className="w-4 h-4 shrink-0" /> <span className="whitespace-nowrap">DOWNLOAD QR</span>
            </button>
            <button data-tour="qr-make-wallpaper" onClick={() => setStep('photo')} disabled={!matrix} className={primary}>
              <span className="whitespace-nowrap">MAKE WALLPAPER</span> <ArrowRightIcon className="w-4 h-4 shrink-0" />
            </button>
          </div>
        </div>
      )}

      {step !== 'qr' && (
        <div>
          <div className="mb-3">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                <button data-tour="qr-choose-photo" onClick={() => fileInput.current?.click()} className={secondary}>
                  <ArrowUpTrayIcon className="w-4 h-4 shrink-0" />
                  <span className="whitespace-nowrap">{photo ? 'UPLOAD ANOTHER' : 'UPLOAD A PHOTO'}</span>
                </button>
                {user && (
                  <button data-tour="qr-my-galleries" data-testid="qr-my-galleries" onClick={() => setPicking(true)} className={secondary}>
                    <PhotoIcon className="w-4 h-4 shrink-0" />
                    <span className="whitespace-nowrap">FROM MY GALLERIES</span>
                  </button>
                )}
              </div>
              {user && (
                <GalleryPhotoPicker
                  isOpen={picking}
                  onOpenChange={setPicking}
                  ownerId={pickerOwnerId}
                  hint="Pick the photo that goes behind the QR code."
                  onPick={({ blob, label }) => {
                    setPhotoError(null)
                    applyBlob(blob, label).catch(() => setPhotoError('That gallery photo could not be read. Try another one.'))
                  }}
                />
              )}
              {photoError && <p className="text-red-400 text-xs mb-3">{photoError}</p>}
              <label className="block text-white/60 text-xs uppercase tracking-wider mb-1">ZOOM PHOTO</label>
              <input data-tour="qr-zoom"
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
                <button onClick={() => setStep('qr')} className={secondary}>
                  <ArrowLeftIcon className="w-4 h-4 shrink-0" /> <span className="whitespace-nowrap">BACK</span>
                </button>
                <button data-tour="qr-to-place" onClick={() => setStep('place')} disabled={!photo} className={`flex-1 ${primary}`}>
                  <span className="whitespace-nowrap">PLACE QR</span> <ArrowRightIcon className="w-4 h-4 shrink-0" />
                </button>
              </div>
            </div>
          )}

          {step === 'place' && (
            <div>
              <label className="block text-white/60 text-xs uppercase tracking-wider mb-1">QR SIZE</label>
              <input data-tour="qr-size"
                type="range" min={QR_SIZE_MIN * 100} max={QR_SIZE_MAX * 100} step={0.5}
                aria-label="QR size"
                className="w-full mb-1 accent-white"
                value={placement.size * 100}
                onChange={e => setPlacement(p => clampQrPlacement({ ...p, size: Number(e.target.value) / 100 }))}
              />
              <p className="text-white/40 text-xs mb-4">Drag the preview to move the QR code. Pinch or scroll to resize it.</p>
              <div className="flex gap-2 mb-2">
                <button onClick={() => setStep('photo')} className={secondary}>
                  <ArrowLeftIcon className="w-4 h-4 shrink-0" /> <span className="whitespace-nowrap">BACK</span>
                </button>
                <button data-tour="qr-download-wallpaper" onClick={downloadWallpaper} disabled={busy || !matrix} className={`flex-1 ${primary}`}>
                  <ArrowDownTrayIcon className="w-4 h-4 shrink-0" /> <span className="whitespace-nowrap">DOWNLOAD</span>
                </button>
              </div>
              {canShareFiles && (
                <button data-tour="qr-share" onClick={shareWallpaper} disabled={busy} className={`w-full ${secondary}`}>
                  <ShareIcon className="w-4 h-4 shrink-0" /> <span className="whitespace-nowrap">SAVE TO PHOTOS / SHARE</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
