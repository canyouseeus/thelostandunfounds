import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ClipboardIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import {
  DEFAULT_PORTRAIT,
  DEFAULT_QR_STYLE,
  PORTRAIT_HEIGHT,
  PORTRAIT_WIDTH,
  downloadCanvas,
  drawQRCode,
  loadImage,
  readFileAsDataUrl,
  renderPortrait,
  slugForFilename,
  type QREyeStyle,
  type QRModuleStyle,
} from '../../lib/qr-render'
import { cn } from '../ui/utils'

const DEFAULT_LOGO_SRC = '/logo.png'
const CODE_EXPORT_SIZE = 1024

type Format = 'code' | 'portrait'

/** Presets are the "regular vs fancy" switch — square is the safe default. */
const STYLE_PRESETS: Array<{
  key: string
  label: string
  hint: string
  moduleStyle: QRModuleStyle
  eyeStyle: QREyeStyle
}> = [
  { key: 'classic', label: 'Square',  hint: 'Standard — scans everywhere', moduleStyle: 'square',  eyeStyle: 'square' },
  { key: 'soft',    label: 'Rounded', hint: 'Softened modules',            moduleStyle: 'rounded', eyeStyle: 'rounded' },
  // Eyes stay rounded rather than fully circular: circular finder patterns break
  // the 1:1:3:1:1 run-length ratio decoders use to lock on, and stop scanning.
  { key: 'dots',    label: 'Dots',    hint: 'Fancy dot matrix',            moduleStyle: 'dots',    eyeStyle: 'rounded' },
]

const COLOR_PRESETS: Array<{ key: string; label: string; fg: string; bg: string }> = [
  { key: 'mono',    label: 'Black on White', fg: '#000000', bg: '#ffffff' },
  { key: 'inverse', label: 'White on Black', fg: '#ffffff', bg: '#000000' },
]

export interface QRStudioProps {
  /** The URL the code encodes. */
  value: string
  /** Shown in the header and used for the download filename. */
  title?: string
  /** Prefilled headline on the portrait wallpaper. */
  defaultHeadline?: string
  onClose: () => void
}

const LABEL = 'text-[10px] font-bold text-white/40 uppercase tracking-widest'

/**
 * A single QR generator used by every surface that needs one: affiliate referral
 * links, affiliate product deep links, and the public /qr page. Preview and export
 * share one renderer, so the download always matches the preview.
 */
export default function QRStudio({ value, title, defaultHeadline, onClose }: QRStudioProps) {
  const [format, setFormat] = useState<Format>('code')
  const [presetKey, setPresetKey] = useState('classic')
  const [colorKey, setColorKey] = useState('mono')
  const [showLogo, setShowLogo] = useState(true)
  const [customLogo, setCustomLogo] = useState<string | null>(null)
  const [logoImg, setLogoImg] = useState<HTMLImageElement | null>(null)

  const [backgroundSrc, setBackgroundSrc] = useState<string | null>(null)
  const [backgroundImg, setBackgroundImg] = useState<HTMLImageElement | null>(null)
  const [overlayOpacity, setOverlayOpacity] = useState(DEFAULT_PORTRAIT.overlayOpacity)
  const [posX, setPosX] = useState(0.5)
  const [posY, setPosY] = useState(0.5)
  const [sizePercent, setSizePercent] = useState(0.45)
  const [headline, setHeadline] = useState(defaultHeadline ?? '')
  const [caption, setCaption] = useState('')

  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  const codeCanvasRef = useRef<HTMLCanvasElement>(null)
  const portraitCanvasRef = useRef<HTMLCanvasElement>(null)
  const bgInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const preset = STYLE_PRESETS.find(p => p.key === presetKey) ?? STYLE_PRESETS[0]
  const colors = COLOR_PRESETS.find(c => c.key === colorKey) ?? COLOR_PRESETS[0]

  const style = useMemo(() => ({
    ...DEFAULT_QR_STYLE,
    moduleStyle: preset.moduleStyle,
    eyeStyle: preset.eyeStyle,
    fgColor: colors.fg,
    bgColor: colors.bg,
    logo: showLogo ? logoImg : null,
  }), [preset, colors, showLogo, logoImg])

  // Load the logo (ours by default, or the affiliate's upload).
  useEffect(() => {
    let cancelled = false
    loadImage(customLogo ?? DEFAULT_LOGO_SRC).then(img => {
      if (!cancelled) setLogoImg(img)
    })
    return () => { cancelled = true }
  }, [customLogo])

  useEffect(() => {
    let cancelled = false
    if (!backgroundSrc) { setBackgroundImg(null); return }
    loadImage(backgroundSrc).then(img => {
      if (cancelled) return
      if (!img) setError('Could not load that background image')
      setBackgroundImg(img)
    })
    return () => { cancelled = true }
  }, [backgroundSrc])

  // Escape closes, matching every other modal on the platform. Capture phase +
  // stopPropagation so it doesn't also collapse the dashboard card underneath —
  // one Escape should dismiss one layer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      e.stopPropagation()
      onClose()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  /** Paint the standalone code at export resolution; CSS scales it for preview. */
  const paintCode = useCallback(() => {
    const canvas = codeCanvasRef.current
    if (!canvas || !value) return
    canvas.width = CODE_EXPORT_SIZE
    canvas.height = CODE_EXPORT_SIZE
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, CODE_EXPORT_SIZE, CODE_EXPORT_SIZE)
    drawQRCode(ctx, value, 0, 0, CODE_EXPORT_SIZE, style)
  }, [value, style])

  const paintPortrait = useCallback(() => {
    const canvas = portraitCanvasRef.current
    if (!canvas || !value) return
    renderPortrait(canvas, value, style, {
      background: backgroundImg,
      overlayOpacity: backgroundImg ? overlayOpacity : 0,
      position: { x: posX, y: posY },
      sizePercent,
      headline,
      caption,
    })
  }, [value, style, backgroundImg, overlayOpacity, posX, posY, sizePercent, headline, caption])

  useEffect(() => {
    if (format === 'code') paintCode()
    else paintPortrait()
  }, [format, paintCode, paintPortrait])

  const handleUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    apply: (dataUrl: string) => void,
  ) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file')
      return
    }
    try {
      apply(await readFileAsDataUrl(file))
      setError(null)
    } catch {
      setError('Could not read that file')
    }
  }

  const download = async () => {
    setDownloading(true)
    setError(null)
    try {
      const stem = slugForFilename(title || value)
      if (format === 'code') {
        paintCode()
        if (codeCanvasRef.current) await downloadCanvas(codeCanvasRef.current, `${stem}-qr.png`)
      } else {
        paintPortrait()
        if (portraitCanvasRef.current) await downloadCanvas(portraitCanvasRef.current, `${stem}-wallpaper.png`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed')
    } finally {
      setDownloading(false)
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Could not copy to clipboard')
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start md:items-center justify-center bg-black/90 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-[#0a0a0a] w-full max-w-4xl my-8 max-h-[calc(100vh-4rem)] overflow-y-auto custom-scrollbar"
        style={{ borderRadius: 0 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="QR code generator"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-5 bg-white/5">
          <div className="min-w-0">
            <h2 className="text-white text-lg font-black uppercase tracking-widest">QR Code</h2>
            <p className="text-white/40 text-xs font-mono break-all mt-1 text-left">{value}</p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-2 text-white/50 hover:bg-white hover:text-black transition-colors"
            aria-label="Close"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Format switch */}
        <div className="flex gap-px p-5 pb-0">
          {(['code', 'portrait'] as Format[]).map(f => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={cn(
                'px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-colors',
                format === f ? 'bg-white text-black' : 'bg-white/5 text-white/40 hover:text-white',
              )}
            >
              {f === 'code' ? 'QR Only' : 'Portrait Wallpaper'}
            </button>
          ))}
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── Preview ── */}
          <div className="flex flex-col items-center gap-3">
            {format === 'code' ? (
              <div className="bg-white/5 p-4 w-full flex justify-center">
                <canvas
                  ref={codeCanvasRef}
                  className="w-[240px] h-[240px]"
                  aria-label="QR code preview"
                />
              </div>
            ) : (
              <div className="bg-white/5 p-4 flex justify-center">
                <canvas
                  ref={portraitCanvasRef}
                  width={PORTRAIT_WIDTH}
                  height={PORTRAIT_HEIGHT}
                  className="w-[220px] h-[391px] object-contain"
                  aria-label="Portrait wallpaper preview"
                />
              </div>
            )}
            <p className={LABEL}>
              {format === 'code'
                ? `${CODE_EXPORT_SIZE}×${CODE_EXPORT_SIZE} PNG`
                : `${PORTRAIT_WIDTH}×${PORTRAIT_HEIGHT} PNG`}
            </p>
          </div>

          {/* ── Controls ── */}
          <div className="space-y-5">
            {/* Style */}
            <div>
              <div className={cn(LABEL, 'mb-2')}>Style</div>
              <div className="flex gap-px flex-wrap">
                {STYLE_PRESETS.map(p => (
                  <button
                    key={p.key}
                    onClick={() => setPresetKey(p.key)}
                    title={p.hint}
                    className={cn(
                      'px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-colors',
                      presetKey === p.key ? 'bg-white text-black' : 'bg-white/5 text-white/40 hover:text-white',
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <p className="text-white/30 text-[10px] mt-2 text-left">{preset.hint}</p>
            </div>

            {/* Colours */}
            <div>
              <div className={cn(LABEL, 'mb-2')}>Colours</div>
              <div className="flex gap-px flex-wrap">
                {COLOR_PRESETS.map(c => (
                  <button
                    key={c.key}
                    onClick={() => setColorKey(c.key)}
                    className={cn(
                      'px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-colors',
                      colorKey === c.key ? 'bg-white text-black' : 'bg-white/5 text-white/40 hover:text-white',
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Logo */}
            <div>
              <div className={cn(LABEL, 'mb-2')}>Centre Logo</div>
              <div className="flex gap-2 flex-wrap items-center">
                <button
                  onClick={() => setShowLogo(v => !v)}
                  className={cn(
                    'px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-colors',
                    showLogo ? 'bg-white text-black' : 'bg-white/5 text-white/40 hover:text-white',
                  )}
                >
                  {showLogo ? 'Logo On' : 'Logo Off'}
                </button>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleUpload(e, (url) => { setCustomLogo(url); setShowLogo(true) })}
                />
                <button
                  onClick={() => logoInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase tracking-widest bg-white/10 text-white hover:bg-white hover:text-black transition-colors"
                >
                  <ArrowUpTrayIcon className="w-3.5 h-3.5" /> Upload
                </button>
                {customLogo && (
                  <button
                    onClick={() => {
                      setCustomLogo(null)
                      if (logoInputRef.current) logoInputRef.current.value = ''
                    }}
                    className="px-3 py-2 text-[10px] font-black uppercase tracking-widest bg-white/5 text-white/40 hover:text-white transition-colors"
                  >
                    Use Our Logo
                  </button>
                )}
              </div>
            </div>

            {/* Portrait-only controls */}
            {format === 'portrait' && (
              <div className="space-y-4 bg-white/[0.03] p-4">
                <div>
                  <div className={cn(LABEL, 'mb-2')}>Background Image</div>
                  <div className="flex gap-2 flex-wrap">
                    <input
                      ref={bgInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleUpload(e, setBackgroundSrc)}
                    />
                    <button
                      onClick={() => bgInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase tracking-widest bg-white/10 text-white hover:bg-white hover:text-black transition-colors"
                    >
                      <ArrowUpTrayIcon className="w-3.5 h-3.5" /> Upload
                    </button>
                    {backgroundSrc && (
                      <button
                        onClick={() => {
                          setBackgroundSrc(null)
                          if (bgInputRef.current) bgInputRef.current.value = ''
                        }}
                        className="px-3 py-2 text-[10px] font-black uppercase tracking-widest bg-white/5 text-white/40 hover:text-white transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                {backgroundSrc && (
                  <div>
                    <label className={cn(LABEL, 'block mb-1')}>
                      Darken Overlay: {Math.round(overlayOpacity * 100)}%
                    </label>
                    <input
                      type="range" min="0" max="0.85" step="0.05"
                      value={overlayOpacity}
                      onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                      className="w-full accent-white"
                    />
                  </div>
                )}

                <div>
                  <label className={cn(LABEL, 'block mb-1')}>
                    Code Size: {Math.round(sizePercent * 100)}% of width
                  </label>
                  <input
                    type="range" min="0.2" max="0.8" step="0.05"
                    value={sizePercent}
                    onChange={(e) => setSizePercent(parseFloat(e.target.value))}
                    className="w-full accent-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={cn(LABEL, 'block mb-1')}>Horizontal</label>
                    <input
                      type="range" min="0" max="1" step="0.02"
                      value={posX}
                      onChange={(e) => setPosX(parseFloat(e.target.value))}
                      className="w-full accent-white"
                    />
                  </div>
                  <div>
                    <label className={cn(LABEL, 'block mb-1')}>Vertical</label>
                    <input
                      type="range" min="0" max="1" step="0.02"
                      value={posY}
                      onChange={(e) => setPosY(parseFloat(e.target.value))}
                      className="w-full accent-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <input
                    type="text"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    maxLength={40}
                    placeholder="Headline (optional)"
                    className="w-full bg-white/5 px-3 py-2 text-white text-xs font-mono focus:outline-none focus:bg-white/10 placeholder:text-white/20"
                  />
                  <input
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    maxLength={60}
                    placeholder="Caption under the code (optional)"
                    className="w-full bg-white/5 px-3 py-2 text-white text-xs font-mono focus:outline-none focus:bg-white/10 placeholder:text-white/20"
                  />
                </div>
              </div>
            )}

            {error && (
              <p className="text-red-400 text-xs font-bold uppercase tracking-wider text-left">{error}</p>
            )}

            {/* Actions */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={download}
                disabled={downloading || !value}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-widest bg-white text-black hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                {downloading ? 'Saving…' : 'Download PNG'}
              </button>
              <button
                onClick={copyLink}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-widest bg-white/10 text-white hover:bg-white hover:text-black transition-colors"
              >
                {copied ? <CheckIcon className="w-4 h-4" /> : <ClipboardIcon className="w-4 h-4" />}
                {copied ? 'Copied' : 'Copy Link'}
              </button>
            </div>

            <p className="text-white/30 text-[10px] leading-relaxed text-left">
              Dots and rounded styles are decorative — always test-scan one before printing a run.
              Square is the safest for signage, stickers and packaging.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
