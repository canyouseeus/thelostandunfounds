import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { XMarkIcon, ArrowDownTrayIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline'
import { useCanvasGestures } from '@/hooks/useCanvasGestures'
import { loadSiteFont } from './fonts'
import {
  PRINT_SIZES, DEFAULT_ANGLE, DEFAULT_MESH, DEFAULT_PHOTO_VIEW, PHOTO_SCALE_MIN, PHOTO_SCALE_MAX, TEXT_FAMILY,
  pageInches, recommendedLpi, clampPhotoView, zoomPhotoAbout, buildToneMap,
  triangleMask, glyphMask, buildDotTable, buildScreenJob, renderRegion, drawText, textBounds, textRegion,
  renderFilmPng, applyTone,
  type DotShape, type Orientation, type PhotoSource, type PhotoView, type PrintSize, type ScreenJob,
  type TextLayer, type ToneSettings,
} from './halftone-render'

type Step = 'photo' | 'text' | 'screen'
const STEPS: { id: Step; label: string }[] = [
  { id: 'photo', label: 'PHOTO' },
  { id: 'text', label: 'TEXT' },
  { id: 'screen', label: 'SCREEN' },
]

/** Preview canvas: long side in canvas pixels. */
const PREVIEW_LONG = 720
/** Film resolution, set by the owner: 360 DPI. */
const DPI = 360
/** Loupe: a square of real film pixels at DPI, enlarged on screen (pixelated) so it never looks finer than the film. */
const LOUPE_SIZE = 160

const DEFAULT_TONE: ToneSettings = { brightness: 0, contrast: 0, invert: false }
const DEFAULT_TEXT: TextLayer = {
  text: '', weight: 900, size: 1.25, tracking: 0.1, uppercase: true, ink: 'ink', cx: 0.5, cy: 0.88,
}

interface Props {
  onClose: () => void
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30000)
}

const seg = (on: boolean) =>
  `flex-1 px-3 py-2.5 text-xs font-bold uppercase tracking-wider ${on ? 'bg-white text-black' : 'bg-white/10 text-white/60 hover:text-white'}`
const label = 'block text-white/60 text-xs uppercase tracking-wider mb-1'
const ghost = 'px-4 py-3 bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider disabled:opacity-40'
const primary = 'flex-1 flex items-center justify-center gap-2 px-3 py-3 bg-white text-black text-xs font-bold uppercase tracking-wider disabled:opacity-40'

function Slider(props: {
  name: string; value: number; min: number; max: number; step: number; display: string
  onChange: (v: number) => void; disabled?: boolean
}) {
  return (
    <div className="mb-3">
      <div className="flex justify-between">
        <span className={label}>{props.name}</span>
        <span className="text-white/60 text-xs font-mono">{props.display}</span>
      </div>
      <input
        type="range" min={props.min} max={props.max} step={props.step} value={props.value}
        disabled={props.disabled} aria-label={props.name}
        className="w-full accent-white"
        onChange={e => props.onChange(Number(e.target.value))}
      />
    </div>
  )
}

export default function HalftoneModal({ onClose }: Props) {
  const [step, setStep] = useState<Step>('photo')
  const [size, setSize] = useState<PrintSize>('18x24')
  const [orientation, setOrientation] = useState<Orientation>('portrait')
  const [photo, setPhoto] = useState<(PhotoSource & { label: string }) | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [view, setView] = useState<PhotoView>(DEFAULT_PHOTO_VIEW)
  const [tone, setTone] = useState<ToneSettings>(DEFAULT_TONE)
  const [text, setText] = useState<TextLayer>(DEFAULT_TEXT)
  const [shape, setShape] = useState<DotShape>('triangle')
  const [mesh, setMesh] = useState(DEFAULT_MESH)
  const [lpi, setLpi] = useState(recommendedLpi(DEFAULT_MESH))
  const [angle, setAngle] = useState(DEFAULT_ANGLE)
  const [minDot, setMinDot] = useState(0.05)
  const [maxDot, setMaxDot] = useState(0.95)
  const [mirror, setMirror] = useState(false)
  const [loupe, setLoupe] = useState({ x: 0.5, y: 0.5 })
  const [fontReady, setFontReady] = useState(false)
  const [fontError, setFontError] = useState<string | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)

  const page = useMemo(() => pageInches(size, orientation), [size, orientation])
  const previewCanvas = useRef<HTMLCanvasElement>(null)
  const loupeCanvas = useRef<HTMLCanvasElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const previewPpi = PREVIEW_LONG / Math.max(page.w, page.h)
  const previewW = Math.round(page.w * previewPpi)
  const previewH = Math.round(page.h * previewPpi)

  useEffect(() => {
    loadSiteFont()
      .then(() => setFontReady(true))
      .catch(() => setFontError('The typeface did not load. Check the connection and reopen this window.'))
  }, [])

  // Scroll-lock and Escape, taken once on open (see QrWallpaperModal).
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

  const textLayer = text.text.trim() ? text : null

  // The dot shape and its exact-coverage table. The 3 is cut from the site's typeface.
  const dotTable = useMemo(() => {
    if (shape === 'three' && !fontReady) return null
    const mask = shape === 'triangle' ? triangleMask() : glyphMask('3', 900, TEXT_FAMILY)
    return buildDotTable(shape, mask)
  }, [shape, fontReady])

  // Preview: the adjusted greyscale the dots are cut from, plus the text.
  useEffect(() => {
    const c = previewCanvas.current
    if (!c) return
    const ctx = c.getContext('2d')!
    const tm = buildToneMap(page, previewPpi, photo, view, tone)
    const img = ctx.createImageData(tm.w, tm.h)
    for (let i = 0, p = 0; i < tm.dark.length; i++, p += 4) {
      const v = Math.round(255 * (1 - tm.dark[i]))
      img.data[p] = img.data[p + 1] = img.data[p + 2] = v
      img.data[p + 3] = 255
    }
    ctx.putImageData(img, 0, 0)
    if (textLayer && fontReady) drawText(ctx, textLayer, page, tm.pxPerIn, 0, 0, false, textLayer.ink === 'ink' ? '#000' : '#fff')
    if (step === 'screen') {
      const span = (LOUPE_SIZE / DPI) * tm.pxPerIn
      ctx.save()
      ctx.globalCompositeOperation = 'difference'
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 3
      ctx.strokeRect(loupe.x * tm.w - span / 2, loupe.y * tm.h - span / 2, span, span)
      ctx.restore()
    }
  }, [page, previewPpi, photo, view, tone, textLayer, fontReady, step, loupe])

  // The screen settings. Cheap: the photo is resampled per region as it is screened.
  const job: ScreenJob | null = useMemo(
    () => (dotTable ? buildScreenJob(page, { lpi, angle, shape, minDot, maxDot, mirror }, dotTable, photo, view, tone) : null),
    [dotTable, page, lpi, angle, shape, minDot, maxDot, mirror, photo, view, tone],
  )

  // Loupe: real film pixels, through the same renderer as the download.
  useEffect(() => {
    const c = loupeCanvas.current
    if (step !== 'screen' || !c || !job) return
    const ldpi = DPI
    const Wpx = page.w * ldpi
    const cxRight = loupe.x * Wpx
    // The loupe point is picked on the right-reading preview; on mirrored film it sits opposite.
    const cx = mirror ? Wpx - cxRight : cxRight
    const x0 = Math.round(cx - LOUPE_SIZE / 2)
    const y0 = Math.round(loupe.y * page.h * ldpi - LOUPE_SIZE / 2)
    const scratch = document.createElement('canvas')
    const measure = scratch.getContext('2d')!
    const bounds = textLayer && fontReady ? textBounds(measure, textLayer, page, ldpi) : null
    const rgba = textRegion(scratch, fontReady ? textLayer : null, bounds, page, ldpi, mirror, x0, y0, LOUPE_SIZE, LOUPE_SIZE)
    const ink = new Uint8Array(LOUPE_SIZE * LOUPE_SIZE)
    const photoCanvas = document.createElement('canvas')
    renderRegion(job, x0, y0, LOUPE_SIZE, LOUPE_SIZE, ldpi, ink, rgba && textLayer ? { rgba, ink: textLayer.ink } : null, photoCanvas)
    photoCanvas.width = photoCanvas.height = 0
    const ctx = c.getContext('2d')!
    const img = ctx.createImageData(LOUPE_SIZE, LOUPE_SIZE)
    const Hpx = page.h * ldpi
    for (let i = 0; i < ink.length; i++) {
      const x = x0 + (i % LOUPE_SIZE)
      const y = y0 + Math.floor(i / LOUPE_SIZE)
      const off = x < 0 || y < 0 || x >= Wpx || y >= Hpx
      const v = off ? 40 : ink[i] ? 0 : 255
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v
      img.data[i * 4 + 3] = 255
    }
    ctx.putImageData(img, 0, 0)
    scratch.width = scratch.height = 0
  }, [step, job, page, loupe, mirror, textLayer, fontReady])

  useCanvasGestures(previewCanvas, true, {
    onDrag: (dx, dy) => {
      if (step === 'photo') {
        setView(v => clampPhotoView({ ...v, ox: v.ox + dx, oy: v.oy + (dy * page.h) / page.w }))
      } else if (step === 'text') {
        setText(t => ({ ...t, cx: Math.min(1, Math.max(0, t.cx + dx)), cy: Math.min(1, Math.max(0, t.cy + dy)) }))
      } else {
        setLoupe(l => ({ x: Math.min(1, Math.max(0, l.x + dx)), y: Math.min(1, Math.max(0, l.y + dy)) }))
      }
    },
    onZoom: (factor, fx, fy) => {
      if (step === 'photo') setView(v => zoomPhotoAbout(v, factor, fx, fy))
      else if (step === 'text') setText(t => ({ ...t, size: Math.min(8, Math.max(0.1, t.size * factor)) }))
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

  const changeSize = (next: PrintSize) => {
    // Keep the text the same size relative to the page.
    const ratio = PRINT_SIZES[next].w / PRINT_SIZES[size].w
    setText(t => ({ ...t, size: Math.round(t.size * ratio * 100) / 100 }))
    setSize(next)
  }

  const changeMesh = (m: number) => {
    setMesh(m)
    if (m >= 60 && m <= 400) setLpi(recommendedLpi(m))
  }

  const outW = Math.round(page.w * DPI)
  const outH = Math.round(page.h * DPI)
  const baseName = (photo?.label.replace(/\.[^.]+$/, '') || 'screen').replace(/[^a-z0-9_-]+/gi, '-').toLowerCase()
  const filename = `${baseName}-${size}-${shape === 'three' ? '3s' : 'triangles'}-${lpi}lpi-${angle}deg-${DPI}dpi${mirror ? '-mirror' : ''}.png`

  const exportFilm = async () => {
    if (!job) return
    setExportError(null)
    setProgress(0)
    try {
      const blob = await renderFilmPng(job, DPI, fontReady ? textLayer : null, setProgress)
      saveBlob(blob, filename)
    } catch (e) {
      setExportError(e instanceof Error ? `Export failed: ${e.message}` : 'Export failed.')
    } finally {
      setProgress(null)
    }
  }

  const midGrey = Math.round(applyTone(0.5, tone) * 100)

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 pb-24"
      onMouseDown={e => { if (e.target === e.currentTarget && progress === null) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Screen generator"
      data-testid="halftone-modal"
    >
      <div className="bg-[#0A0A0A] w-full max-w-lg max-h-[calc(100vh-7rem)] overflow-y-auto p-5 relative text-left">
        <button onClick={onClose} disabled={progress !== null} className="absolute top-4 right-4 text-white/40 hover:text-white" aria-label="Close">
          <XMarkIcon className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-bold text-white uppercase tracking-widest pr-8">SCREEN GENERATOR</h2>
        <p className="text-white/40 text-xs font-mono mt-1 mb-4">
          {PRINT_SIZES[size].label} · {mesh} MESH · {lpi} LPI · {angle}° · {shape === 'three' ? '3s' : 'TRIANGLES'}
        </p>
        <div className="flex gap-1 mb-4" role="tablist">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={step === s.id}
              onClick={() => setStep(s.id)}
              disabled={progress !== null}
              className={seg(step === s.id)}
              data-testid={`halftone-step-${s.id}`}
            >
              {i + 1} · {s.label}
            </button>
          ))}
        </div>

        <div className="flex justify-center mb-3 bg-white/5 p-3">
          <canvas
            ref={previewCanvas}
            width={previewW}
            height={previewH}
            data-testid="halftone-preview"
            data-tour="halftone-preview"
            className="bg-white select-none cursor-grab active:cursor-grabbing"
            style={
              orientation === 'portrait'
                ? { height: 'min(48vh, 480px)', aspectRatio: `${page.w} / ${page.h}`, touchAction: 'none' }
                : { width: '100%', aspectRatio: `${page.w} / ${page.h}`, touchAction: 'none' }
            }
          />
        </div>

        {fontError && <p className="text-red-400 text-xs mb-3">{fontError}</p>}

        {step === 'photo' && (
          <div>
            <p className={label}>CANVAS</p>
            <div className="flex gap-1 mb-2">
              {(Object.keys(PRINT_SIZES) as PrintSize[]).map(s => (
                <button key={s} className={seg(size === s)} onClick={() => changeSize(s)}>{PRINT_SIZES[s].label}</button>
              ))}
            </div>
            <div className="flex gap-1 mb-4">
              <button className={seg(orientation === 'portrait')} onClick={() => setOrientation('portrait')}>PORTRAIT</button>
              <button className={seg(orientation === 'landscape')} onClick={() => setOrientation('landscape')}>LANDSCAPE</button>
            </div>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              data-testid="halftone-file"
              onChange={e => { const f = e.target.files?.[0]; if (f) void loadPhoto(f); e.target.value = '' }}
            />
            <button
              onClick={() => fileInput.current?.click()}
              className="w-full flex items-center justify-center gap-2 px-3 py-3 bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider mb-3"
            >
              <ArrowUpTrayIcon className="w-4 h-4" /> {photo ? 'CHOOSE A DIFFERENT PHOTO' : 'CHOOSE A PHOTO'}
            </button>
            {photoError && <p className="text-red-400 text-xs mb-3">{photoError}</p>}
            <Slider
              name="ZOOM PHOTO" min={0} max={100} step={0.5} disabled={!photo}
              value={(Math.log(view.scale / PHOTO_SCALE_MIN) / Math.log(PHOTO_SCALE_MAX / PHOTO_SCALE_MIN)) * 100}
              display={`${Math.round(view.scale * 100)}%`}
              onChange={v => {
                const s = PHOTO_SCALE_MIN * Math.pow(PHOTO_SCALE_MAX / PHOTO_SCALE_MIN, v / 100)
                setView(cur => zoomPhotoAbout(cur, s / cur.scale, 0, 0))
              }}
            />
            <Slider
              name="BRIGHTNESS" min={-100} max={100} step={1} value={Math.round(tone.brightness * 100)}
              display={`${Math.round(tone.brightness * 100)}`} disabled={!photo}
              onChange={v => setTone(t => ({ ...t, brightness: v / 100 }))}
            />
            <Slider
              name="CONTRAST" min={-100} max={100} step={1} value={Math.round(tone.contrast * 100)}
              display={`${Math.round(tone.contrast * 100)}`} disabled={!photo}
              onChange={v => setTone(t => ({ ...t, contrast: v / 100 }))}
            />
            <div className="flex gap-1 mb-2">
              <button className={seg(!tone.invert)} onClick={() => setTone(t => ({ ...t, invert: false }))}>BLACK INK</button>
              <button className={seg(tone.invert)} onClick={() => setTone(t => ({ ...t, invert: true }))}>WHITE INK (INVERT)</button>
            </div>
            <p className="text-white/40 text-xs mb-4">
              {photo
                ? `Drag to move. Pinch or scroll to zoom. Mid-grey prints at ${midGrey}% ink. Use WHITE INK when printing light ink on a dark shirt.`
                : 'Pick the photo to turn into a screen. It is converted to black and white.'}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setStep('text')} disabled={!photo} className={primary}>ADD TEXT →</button>
            </div>
          </div>
        )}

        {step === 'text' && (
          <div>
            <label className={label} htmlFor="halftone-text">TEXT (OPTIONAL)</label>
            <textarea
              id="halftone-text"
              rows={2}
              value={text.text}
              onChange={e => setText(t => ({ ...t, text: e.target.value }))}
              placeholder="A name, a date, a place…"
              className="w-full bg-white/5 text-white text-sm p-3 mb-3 focus:outline-none focus:bg-white/10"
              style={{ borderRadius: 0, fontFamily: TEXT_FAMILY, fontWeight: text.weight }}
              data-testid="halftone-text"
            />
            <p className={label}>WEIGHT · INTER</p>
            <div className="flex gap-1 mb-3">
              {([400, 700, 900] as const).map(w => (
                <button key={w} className={seg(text.weight === w)} onClick={() => setText(t => ({ ...t, weight: w }))}>
                  {w === 400 ? 'REGULAR' : w === 700 ? 'BOLD' : 'BLACK'}
                </button>
              ))}
            </div>
            <Slider
              name="SIZE" min={0.1} max={8} step={0.05} value={text.size}
              display={`${text.size.toFixed(2)} IN`}
              onChange={v => setText(t => ({ ...t, size: v }))}
            />
            <Slider
              name="LETTER SPACING" min={0} max={0.5} step={0.01} value={text.tracking}
              display={`${text.tracking.toFixed(2)} EM`}
              onChange={v => setText(t => ({ ...t, tracking: v }))}
            />
            <div className="flex gap-1 mb-2">
              <button className={seg(text.uppercase)} onClick={() => setText(t => ({ ...t, uppercase: true }))}>UPPERCASE</button>
              <button className={seg(!text.uppercase)} onClick={() => setText(t => ({ ...t, uppercase: false }))}>AS TYPED</button>
            </div>
            <div className="flex gap-1 mb-2">
              <button className={seg(text.ink === 'ink')} onClick={() => setText(t => ({ ...t, ink: 'ink' }))}>SOLID INK</button>
              <button className={seg(text.ink === 'knockout')} onClick={() => setText(t => ({ ...t, ink: 'knockout' }))}>KNOCKOUT</button>
            </div>
            <p className="text-white/40 text-xs mb-4">
              Drag the preview to move the text. Pinch or scroll to resize it. SOLID INK prints the letters solid; KNOCKOUT cuts them out of the photo.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setStep('photo')} className={ghost}>← BACK</button>
              <button onClick={() => setStep('screen')} className={primary} data-testid="halftone-to-screen">MAKE THE SCREEN →</button>
            </div>
          </div>
        )}

        {step === 'screen' && (
          <div>
            <p className={label}>DOT</p>
            <div className="flex gap-1 mb-3" data-tour="halftone-dot-shape">
              <button className={seg(shape === 'triangle')} onClick={() => setShape('triangle')}>▲ TRIANGLES</button>
              <button className={seg(shape === 'three')} onClick={() => setShape('three')} disabled={!fontReady}>3 · THREES</button>
            </div>

            <p className={label}>DOT DETAIL · DRAG THE PREVIEW TO MOVE THE BOX</p>
            <div className="bg-white/5 p-3 mb-3 flex justify-center">
              <canvas
                ref={loupeCanvas}
                width={LOUPE_SIZE}
                height={LOUPE_SIZE}
                className="w-full max-w-[320px] bg-white"
                style={{ imageRendering: 'pixelated', aspectRatio: '1 / 1' }}
                data-testid="halftone-loupe"
              />
            </div>
            <p className="text-white/40 text-xs mb-4">
              {job ? `Actual film pixels at ${DPI} DPI, enlarged. The box covers ${(LOUPE_SIZE / DPI).toFixed(2)} in of the print, about ${(DPI / lpi).toFixed(1)} px per dot.` : 'Building the screen…'}
            </p>

            <div className="flex items-end gap-3 mb-3">
              <div className="flex-1">
                <label className={label} htmlFor="halftone-mesh">MESH COUNT</label>
                <input
                  id="halftone-mesh" type="number" min={60} max={400} step={10} value={mesh}
                  onChange={e => changeMesh(Number(e.target.value))}
                  className="w-full bg-white/5 text-white text-sm p-2 font-mono focus:outline-none focus:bg-white/10"
                  style={{ borderRadius: 0 }}
                />
              </div>
              <button
                onClick={() => setLpi(recommendedLpi(mesh))}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider"
              >
                USE {recommendedLpi(mesh)} LPI
              </button>
            </div>
            <Slider
              name="LINES PER INCH" min={20} max={85} step={1} value={lpi} display={`${lpi} LPI`}
              onChange={setLpi}
            />
            <p className="text-white/40 text-xs -mt-2 mb-3">
              {mesh} mesh holds about {recommendedLpi(mesh)} LPI (mesh ÷ 4.5). Finer than that and the smallest dots fall through the mesh.
            </p>
            <Slider
              name="ANGLE" min={0} max={90} step={0.5} value={angle} display={`${angle}°`}
              onChange={setAngle}
            />
            <Slider
              name="SMALLEST DOT" min={0} max={20} step={1} value={Math.round(minDot * 100)} display={`${Math.round(minDot * 100)}%`}
              onChange={v => setMinDot(v / 100)}
            />
            <Slider
              name="SOLID ABOVE" min={80} max={100} step={1} value={Math.round(maxDot * 100)} display={`${Math.round(maxDot * 100)}%`}
              onChange={v => setMaxDot(v / 100)}
            />
            <p className="text-white/40 text-xs -mt-2 mb-3">
              Tones lighter than the smallest dot print as paper; darker than SOLID ABOVE print solid. Dots outside that range do not hold on press.
            </p>
            <p className={label}>FILM</p>
            <div className="flex gap-1 mb-2">
              <button className={seg(!mirror)} onClick={() => setMirror(false)}>RIGHT READING</button>
              <button className={seg(mirror)} onClick={() => setMirror(true)}>MIRRORED</button>
            </div>
            <p className="text-white/40 text-xs mb-4 font-mono">
              {outW} × {outH} PX · {DPI} DPI · 1-BIT PNG · BLACK = INK
            </p>
            {exportError && <p className="text-red-400 text-xs mb-3">{exportError}</p>}
            <div className="flex gap-2">
              <button onClick={() => setStep('text')} disabled={progress !== null} className={ghost}>← BACK</button>
              <button
                onClick={exportFilm}
                disabled={!job || progress !== null || !photo}
                className={primary}
                data-tour="halftone-download"
                data-testid="halftone-download"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                {progress !== null ? `RENDERING ${Math.round(progress * 100)}%` : 'DOWNLOAD FILM'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
