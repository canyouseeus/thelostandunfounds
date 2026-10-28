import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { XMarkIcon, ArrowDownTrayIcon, ArrowUpTrayIcon, PhotoIcon, ShareIcon } from '@heroicons/react/24/outline'
import { useCanvasGestures } from '@/hooks/useCanvasGestures'
import GalleryPhotoPicker from './GalleryPhotoPicker'
import { loadSiteFont, loadOutlineFonts, type OutlineFonts } from './fonts'
import {
  PRINT_SIZES, DEFAULT_ANGLE, DEFAULT_MESH, TEXT_FAMILY,
  pageInches, recommendedLpi, orientationFor, photoAspect, frameRect, fitFrame, printArea, buildToneMap, toneResolution,
  makeClone, measureLevels, buildScreenJob, drawFilm, layoutText, tracePath, renderFilmPdf, renderFilmPng,
  type OutlineFont,
  type DotShape, type DotMode, type PhotoFrame, type PhotoSource, type PrintSize, type ScreenJob,
  type TextStyle, type ToneSettings,
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
/** Loupe: canvas size, and how many canvas pixels it gives each screen cell. */
const LOUPE_SIZE = 320
const LOUPE_PX_PER_CELL = 14

const DEFAULT_TONE: ToneSettings = { brightness: 0, contrast: 0, invert: false }
const DEFAULT_STYLE: TextStyle = { weight: 900, size: { above: 1, below: 1 }, tracking: 0.1, uppercase: true }

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

/** "3:2" for a Fujifilm X frame, else the reduced ratio. */
function ratioLabel(w: number, h: number): string {
  const r = Math.max(w, h) / Math.min(w, h)
  for (const [a, b] of [[3, 2], [4, 3], [16, 9], [5, 4], [1, 1]]) {
    if (Math.abs(r - a / b) < 0.01) return w >= h ? `${a}:${b}` : `${b}:${a}`
  }
  return `${r.toFixed(2)}:1`
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
  const [photo, setPhoto] = useState<(PhotoSource & { label: string }) | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)
  const pickingRef = useRef(false)
  pickingRef.current = picking
  const [tone, setTone] = useState<ToneSettings>(DEFAULT_TONE)
  const [textAbove, setTextAbove] = useState('')
  const [textBelow, setTextBelow] = useState('')
  const [style, setStyle] = useState<TextStyle>(DEFAULT_STYLE)
  // The one screen we print: 250 mesh, round dots on a 45° grid, size following tone.
  const mesh = DEFAULT_MESH
  const lpi = recommendedLpi(DEFAULT_MESH)
  const angle = DEFAULT_ANGLE
  const shape: DotShape = 'circle'
  const dotSize = 1.3
  const mode: DotMode = 'scale'
  const cutoff = 0.04
  const [autoLevels, setAutoLevels] = useState(true)
  // The film is right-reading; the transfer is flipped when it is pressed.
  const mirror = false
  const [loupe, setLoupe] = useState({ x: 0.5, y: 0.5 })
  const [fontError, setFontError] = useState<string | null>(null)
  const [outlines, setOutlines] = useState<OutlineFonts | null>(null)
  const [job, setJob] = useState<ScreenJob | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)

  // Auto levels stretch the photo's own darkest and lightest points to solid and paper.
  const levels = useMemo(() => (photo ? measureLevels(photo) : null), [photo])
  const screenTone: ToneSettings = useMemo(
    () => ({ ...tone, levels: autoLevels && levels ? levels : undefined }),
    [tone, autoLevels, levels],
  )

  // The page turns with the photo: horizontal photo, landscape page.
  const orientation = orientationFor(photo)
  const page = useMemo(() => pageInches(size, orientation), [size, orientation])
  const aspect = photoAspect(photo, orientation)
  const previewCanvas = useRef<HTMLCanvasElement>(null)
  const loupeCanvas = useRef<HTMLCanvasElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const previewPpi = PREVIEW_LONG / Math.max(page.w, page.h)
  const previewW = Math.round(page.w * previewPpi)
  const previewH = Math.round(page.h * previewPpi)

  useEffect(() => {
    // The page font (for the text boxes) and the outlines (for the film).
    loadSiteFont()
      .catch(() => setFontError('The typeface did not load. Check the connection and reopen this window.'))
    loadOutlineFonts()
      .then(setOutlines)
      .catch(() => setFontError('The typeface did not load. Check the connection and reopen this window.'))
  }, [])

  // Scroll-lock and Escape, taken once on open (see QrWallpaperModal).
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    // While the photo browser is open, Escape is its to handle.
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !pickingRef.current) closeRef.current() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [])

  // The photo fills the canvas: the largest proportional fit, leaving just
  // the room the text above and below needs. First measure that text against
  // a full-size frame, then fit the photo into what is left.
  const fonts = outlines ? (outlines[style.weight] as unknown as OutlineFont[]) : null
  const frame: PhotoFrame = useMemo(() => {
    if (!fonts) return fitFrame(page, aspect, 0, 0)
    // Measure the text against a zero-height frame at the middle of the
    // printable area: how far each block reaches from that line is the room
    // it needs above or below the photo, gap included.
    // The text may be as wide as the largest photo that fits, centred.
    const area = printArea(page)
    const mid = area.y + area.h / 2
    const maxW = Math.min(area.w, area.h * aspect)
    let top = 0
    let bottom = 0
    for (const b of layoutText(fonts, page, { x: area.x + (area.w - maxW) / 2, y: mid, w: maxW, h: 0 }, textAbove, textBelow, style)) {
      if (b.y1 <= mid + 1e-6) top = mid - b.y0
      else bottom = b.y1 - mid
    }
    return fitFrame(page, aspect, top, bottom)
  }, [fonts, page, aspect, textAbove, textBelow, style])
  const rect = useMemo(() => frameRect(page, aspect, frame), [page, aspect, frame])

  // Text above and below the photo, converted to outlines, in page inches.
  const blocks = useMemo(
    () => (fonts ? layoutText(fonts, page, rect, textAbove, textBelow, style) : []),
    [fonts, page, rect, textAbove, textBelow, style],
  )
  const offPage = blocks.some(b => b.offPage)

  // The one shape every dot is a clone of: a circle.
  const clone = useMemo(() => makeClone(shape, dotSize), [shape, dotSize])

  // Preview: the adjusted greyscale the dots are cut from, plus the text.
  useEffect(() => {
    const c = previewCanvas.current
    if (!c) return
    const ctx = c.getContext('2d')!
    const tm = buildToneMap(page, previewPpi, photo, frame, screenTone)
    const img = ctx.createImageData(tm.w, tm.h)
    for (let i = 0, p = 0; i < tm.dark.length; i++, p += 4) {
      const v = Math.round(255 * (1 - tm.dark[i]))
      img.data[p] = img.data[p + 1] = img.data[p + 2] = v
      img.data[p + 3] = 255
    }
    ctx.putImageData(img, 0, 0)
    if (!photo) {
      // Show where the photo will go before there is one.
      ctx.fillStyle = '#e5e5e5'
      ctx.fillRect(rect.x * tm.pxPerIn, rect.y * tm.pxPerIn, rect.w * tm.pxPerIn, rect.h * tm.pxPerIn)
    }
    // The printable area: the safe margin is kept clear of ink.
    const area = printArea(page)
    ctx.save()
    ctx.setLineDash([8, 6])
    ctx.strokeStyle = '#888'
    ctx.lineWidth = 2
    ctx.strokeRect(area.x * tm.pxPerIn, area.y * tm.pxPerIn, area.w * tm.pxPerIn, area.h * tm.pxPerIn)
    ctx.restore()
    if (blocks.length) {
      ctx.fillStyle = '#000'
      ctx.beginPath()
      for (const b of blocks) tracePath(ctx, b.cmds, tm.pxPerIn)
      ctx.fill('nonzero')
    }
    if (step === 'screen') {
      const span = (LOUPE_SIZE / (lpi * LOUPE_PX_PER_CELL)) * tm.pxPerIn
      ctx.save()
      ctx.globalCompositeOperation = 'difference'
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 3
      ctx.strokeRect(loupe.x * tm.w - span / 2, loupe.y * tm.h - span / 2, span, span)
      ctx.restore()
    }
  }, [page, previewPpi, photo, frame, rect, screenTone, blocks, step, loupe, lpi])

  // The screen: where every clone goes. Rebuilt (debounced) as settings change on the SCREEN step.
  useEffect(() => {
    if (step !== 'screen' || !clone) return
    const t = setTimeout(() => {
      const tm = buildToneMap(page, toneResolution(page, lpi), photo, frame, screenTone)
      setJob(buildScreenJob(page, { lpi, angle, shape, dotSize, mode, cutoff, mirror }, clone, tm))
    }, 150)
    return () => clearTimeout(t)
  }, [step, clone, page, photo, frame, screenTone, lpi, angle, shape, dotSize, mode, cutoff, mirror])

  // Loupe: the real clones, drawn by the same code as the film, enlarged.
  useEffect(() => {
    const c = loupeCanvas.current
    if (step !== 'screen' || !c || !job || job.page !== page) return
    const ldpi = lpi * LOUPE_PX_PER_CELL
    const Wpx = page.w * ldpi
    const cxRight = loupe.x * Wpx
    const x0 = Math.round(cxRight - LOUPE_SIZE / 2)
    const y0 = Math.round(loupe.y * page.h * ldpi - LOUPE_SIZE / 2)
    drawFilm(c.getContext('2d')!, job, blocks, ldpi, x0, y0)
  }, [step, job, page, lpi, loupe, blocks])

  useCanvasGestures(previewCanvas, true, {
    onDrag: (dx, dy) => {
      // The photo always fills the canvas, so dragging only moves the DOT DETAIL box.
      if (step === 'screen') setLoupe(l => ({ x: Math.min(1, Math.max(0, l.x + dx)), y: Math.min(1, Math.max(0, l.y + dy)) }))
    },
    onZoom: () => {},
  })

  // From an upload (a File) or a gallery photo (a Blob from /api/gallery/stream).
  const loadPhoto = useCallback(async (file: Blob, label: string) => {
    setPhotoError(null)
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
      setPhoto({ source: bitmap, width: bitmap.width, height: bitmap.height, label })
    } catch {
      setPhotoError('That file could not be read as a photo. Try a JPG or PNG.')
    }
  }, [])

  const changeSize = (next: PrintSize) => {
    // Keep the text the same size relative to the page.
    const ratio = PRINT_SIZES[next].w / PRINT_SIZES[size].w
    const scaled = (s: number) => Math.round(s * ratio * 100) / 100
    setStyle(t => ({ ...t, size: { above: scaled(t.size.above), below: scaled(t.size.below) } }))
    setSize(next)
  }

  const baseName = (photo?.label.replace(/\.[^.]+$/, '') || 'screen').replace(/[^a-z0-9_-]+/gi, '-').toLowerCase()
  const filename = `${baseName}-${orientation === 'landscape' ? PRINT_SIZES[size].h + 'x' + PRINT_SIZES[size].w : size}-${mesh}mesh-${lpi}lpi-${angle}deg`

  /**
   * The film as a PDF, handed to the system share sheet where there is one
   * (phones: Mail, Save to Files, AirDrop…), otherwise downloaded.
   */
  const shareFilm = async () => {
    if (!job) return
    setExportError(null)
    setProgress(0)
    try {
      await new Promise(r => setTimeout(r, 30))
      const blob = await renderFilmPdf(job, blocks, setProgress)
      const name = `${filename}.pdf`
      const file = new File([blob], name, { type: 'application/pdf' })
      if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: name })
      } else {
        saveBlob(blob, name)
      }
    } catch (e) {
      // Cancelling the share sheet is not an error.
      if (e instanceof DOMException && e.name === 'AbortError') return
      setExportError(e instanceof Error ? `Export failed: ${e.message}` : 'Export failed.')
    } finally {
      setProgress(null)
    }
  }

  const exportFilm = async () => {
    if (!job) return
    setExportError(null)
    setProgress(0)
    try {
      // Let the button repaint before the work starts.
      await new Promise(r => setTimeout(r, 30))
      const blob = await renderFilmPdf(job, blocks, setProgress)
      saveBlob(blob, `${filename}.pdf`)
    } catch (e) {
      setExportError(e instanceof Error ? `Export failed: ${e.message}` : 'Export failed.')
    } finally {
      setProgress(null)
    }
  }


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
          {orientation === 'landscape' ? `${PRINT_SIZES[size].h} × ${PRINT_SIZES[size].w} IN` : PRINT_SIZES[size].label} · {mesh} MESH · {lpi} LPI · {angle}° · CIRCLES
        </p>
        <div className="flex gap-1 mb-4" role="tablist">
          {STEPS.map((s, i) => (
            <button data-tour={`halftone-step-${s.id}`}
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
            <p className={label}>CANVAS · TURNS WITH THE PHOTO</p>
            <div data-tour="halftone-canvas-size" className="flex gap-1 mb-4">
              {(Object.keys(PRINT_SIZES) as PrintSize[]).map(s => (
                <button key={s} className={seg(size === s)} onClick={() => changeSize(s)}>{PRINT_SIZES[s].label}</button>
              ))}
            </div>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              data-testid="halftone-file"
              onChange={e => { const f = e.target.files?.[0]; if (f) void loadPhoto(f, f.name); e.target.value = '' }}
            />
            <p className={label}>{photo ? 'CHANGE THE PHOTO' : 'CHOOSE A PHOTO'}</p>
            <div className="flex gap-1 mb-3">
              <button
                onClick={() => setPicking(true)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-3 bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider"
                data-tour="halftone-from-gallery"
                data-testid="halftone-from-gallery"
              >
                <PhotoIcon className="w-4 h-4" /> FROM A GALLERY
              </button>
              <button
                onClick={() => fileInput.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-3 bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider"
              >
                <ArrowUpTrayIcon className="w-4 h-4" /> UPLOAD
              </button>
            </div>
            <GalleryPhotoPicker
              isOpen={picking}
              onOpenChange={setPicking}
              onPick={({ blob, label: name }) => { void loadPhoto(blob, name) }}
            />
            {photoError && <p className="text-red-400 text-xs mb-3">{photoError}</p>}
            {photo && (
              <p className="text-white/40 text-xs font-mono mb-3">
                {photo.width} × {photo.height} · {ratioLabel(photo.width, photo.height)} · FILLS THE {page.w} × {page.h} IN CANVAS · PRINTS {rect.w.toFixed(2)} × {rect.h.toFixed(2)} IN
              </p>
            )}
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
            <div data-tour="halftone-ink" className="flex gap-1 mb-2">
              <button className={seg(!tone.invert)} onClick={() => setTone(t => ({ ...t, invert: false }))}>BLACK INK</button>
              <button className={seg(tone.invert)} onClick={() => setTone(t => ({ ...t, invert: true }))}>WHITE INK (INVERT)</button>
            </div>
            <div data-tour="halftone-levels" className="flex gap-1 mb-2">
              <button className={seg(autoLevels)} onClick={() => setAutoLevels(true)} data-testid="halftone-auto-levels">AUTO LEVELS</button>
              <button className={seg(!autoLevels)} onClick={() => setAutoLevels(false)}>AS SHOT</button>
            </div>
            <p className="text-white/40 text-xs mb-4">
              {photo
                ? 'The photo is centred inside the dashed line, the 1 in safe margin, and is never cropped or stretched. Nothing prints outside the line.'
                : 'Pick one from your galleries or upload one. A horizontal photo gets a landscape page, a vertical one a portrait page.'}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setStep('text')} disabled={!photo} className={primary}>ADD TEXT →</button>
            </div>
          </div>
        )}

        {step === 'text' && (
          <div>
            <label className={label} htmlFor="halftone-text-above">TEXT ABOVE THE PHOTO</label>
            <textarea data-tour="halftone-text-above"
              id="halftone-text-above"
              rows={2}
              value={textAbove}
              onChange={e => setTextAbove(e.target.value)}
              placeholder="Optional"
              className="w-full bg-white/5 text-white text-sm p-3 mb-3 focus:outline-none focus:bg-white/10"
              style={{ borderRadius: 0, fontFamily: TEXT_FAMILY, fontWeight: style.weight }}
              data-testid="halftone-text-above"
            />
            <label className={label} htmlFor="halftone-text-below">TEXT BELOW THE PHOTO</label>
            <textarea
              id="halftone-text-below"
              rows={2}
              value={textBelow}
              onChange={e => setTextBelow(e.target.value)}
              placeholder="Optional"
              className="w-full bg-white/5 text-white text-sm p-3 mb-3 focus:outline-none focus:bg-white/10"
              style={{ borderRadius: 0, fontFamily: TEXT_FAMILY, fontWeight: style.weight }}
              data-testid="halftone-text-below"
            />
            <p className={label}>WEIGHT · INTER</p>
            <div className="flex gap-1 mb-3">
              {([400, 700, 900] as const).map(w => (
                <button key={w} className={seg(style.weight === w)} onClick={() => setStyle(t => ({ ...t, weight: w }))}>
                  {w === 400 ? 'REGULAR' : w === 700 ? 'BOLD' : 'BLACK'}
                </button>
              ))}
            </div>
            <Slider
              name="ABOVE · TEXT SIZE" min={0.1} max={4} step={0.05} value={style.size.above}
              display={`${style.size.above.toFixed(2)} IN`}
              onChange={v => setStyle(t => ({ ...t, size: { ...t.size, above: v } }))}
            />
            <Slider
              name="BELOW · TEXT SIZE" min={0.1} max={4} step={0.05} value={style.size.below}
              display={`${style.size.below.toFixed(2)} IN`}
              onChange={v => setStyle(t => ({ ...t, size: { ...t.size, below: v } }))}
            />
            <Slider
              name="LETTER SPACING" min={0} max={0.5} step={0.01} value={style.tracking}
              display={`${style.tracking.toFixed(2)} EM`}
              onChange={v => setStyle(t => ({ ...t, tracking: v }))}
            />
            <div className="flex gap-1 mb-3">
              <button className={seg(style.uppercase)} onClick={() => setStyle(t => ({ ...t, uppercase: true }))}>UPPERCASE</button>
              <button className={seg(!style.uppercase)} onClick={() => setStyle(t => ({ ...t, uppercase: false }))}>AS TYPED</button>
            </div>
            {offPage && (
              <p className="text-amber-400 text-xs mb-3" data-testid="halftone-text-offpage">
                The text is too tall to fit with the photo. Make the text smaller or shorten it.
              </p>
            )}
            <p className="text-white/40 text-xs mb-4">
              Text prints in solid ink, centred above and below the photo. The photo shrinks just enough to make room. Text is never wider than the photo: a line that would be shrinks to fit it.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setStep('photo')} className={ghost}>← BACK</button>
              <button onClick={() => setStep('screen')} className={primary} data-testid="halftone-to-screen">MAKE THE SCREEN →</button>
            </div>
          </div>
        )}

        {step === 'screen' && (
          <div>
            <p className={label}>THE SCREEN · 250 MESH · 55 LPI · 45°</p>
            <p className="text-white/60 text-xs mb-3">
              Round dots, each the same size, bigger in the shadows and smaller in the highlights.
            </p>

            <p className={label}>DOT DETAIL · DRAG THE PREVIEW TO MOVE THE BOX</p>
            <div className="bg-white/5 p-3 mb-3 flex justify-center">
              <canvas
                ref={loupeCanvas}
                width={LOUPE_SIZE}
                height={LOUPE_SIZE}
                className="w-full max-w-[320px] bg-white"
                style={{ aspectRatio: '1 / 1' }}
                data-testid="halftone-loupe"
              />
            </div>
            <p className="text-white/40 text-xs mb-4">
              {job ? `The box covers ${(LOUPE_SIZE / (lpi * LOUPE_PX_PER_CELL)).toFixed(2)} in of the print. Highlights under ${Math.round(cutoff * 100)}% print as bare paper.` : 'Building the screen…'}
            </p>

            <div className="bg-white/5 p-3 mb-4" data-testid="halftone-print-notes">
              <p className={label}>PRINTING NOTES</p>
              <ul className="text-white/60 text-xs space-y-1 list-disc pl-4">
                <li>Test exposure on a scrap screen first. Halftone dots usually need less exposure than solid lines.</li>
                <li>Use one coat of emulsion per side, so it stays thin and the dots stay sharp.</li>
                <li>Wash out with a fine mist, not a pressure washer, so the dots survive.</li>
                <li>Pull the squeegee for two passes rather than pushing, so the dots don't smear.</li>
              </ul>
            </div>
            {exportError && <p className="text-red-400 text-xs mb-3">{exportError}</p>}
            <div className="flex gap-2 mb-2">
              <button onClick={() => setStep('text')} disabled={progress !== null} className={ghost}>← BACK</button>
              <button
                onClick={() => exportFilm()}
                disabled={!job || progress !== null || !photo}
                className={primary}
                data-tour="halftone-download"
                data-testid="halftone-download"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                {progress !== null ? `RENDERING ${Math.round(progress * 100)}%` : 'DOWNLOAD FILM (VECTOR PDF)'}
              </button>
            </div>
            <button
              onClick={shareFilm}
              disabled={!job || progress !== null || !photo}
              className="w-full flex items-center justify-center gap-2 px-3 py-3 bg-white text-black text-xs font-bold uppercase tracking-wider disabled:opacity-40 mb-2"
              data-testid="halftone-share"
            >
              <ShareIcon className="w-4 h-4" /> SHARE OR EMAIL THE PDF
            </button>
            <p className="text-white/40 text-xs font-mono">
              PDF: TRUE SIZE, SHARP AT ANY PRINTER RESOLUTION, TEXT AS OUTLINES · BLACK = INK
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
