import { useState, useRef, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { QRCodeSVG } from 'qrcode.react'
import { ArrowDownTrayIcon, LinkIcon, ArrowUpTrayIcon, XMarkIcon } from '@heroicons/react/24/outline';

const LANDING_PAGE_URL = 'https://www.thelostandunfounds.com/'
// Portrait dimensions for phone wallpaper (9:16 aspect ratio)
const PORTRAIT_WIDTH = 1080
const PORTRAIT_HEIGHT = 1920

export default function QR() {
  const [customUrl, setCustomUrl] = useState('')
  const [error, setError] = useState('')
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null)
  const [logoImage, setLogoImage] = useState<string | null>(null) // User's custom logo
  const [useDefaultLogo, setUseDefaultLogo] = useState(true) // Use our logo by default
  const [qrPosition, setQrPosition] = useState({ x: 0.5, y: 0.5 }) // Center position (0-1)
  const [qrSize, setQrSize] = useState(256) // QR code size in pixels (default 256)
  const [qrSizePercent, setQrSizePercent] = useState(0.2) // QR code size as percentage of wallpaper (default 20%)
  const landingQRRef = useRef<HTMLDivElement>(null)
  const customQRRef = useRef<HTMLDivElement>(null)
  const landingCompositedCanvasRef = useRef<HTMLCanvasElement>(null)
  const customCompositedCanvasRef = useRef<HTMLCanvasElement>(null)
  const backgroundFileInputRef = useRef<HTMLInputElement>(null)
  const logoFileInputRef = useRef<HTMLInputElement>(null)

  // Load default logo
  useEffect(() => {
    const loadDefaultLogo = async () => {
      try {
        const response = await fetch('/logo.png')
        if (response.ok) {
          const blob = await response.blob()
          const url = URL.createObjectURL(blob)
          // Don't set it here, we'll use it when rendering
        }
      } catch (err) {
        console.warn('Could not load default logo')
      }
    }
    loadDefaultLogo()
  }, [])

  const validateUrl = (url: string): boolean => {
    if (!url.trim()) return false
    try {
      // Add protocol if missing
      const urlWithProtocol = url.startsWith('http://') || url.startsWith('https://')
        ? url
        : `https://${url}`
      new URL(urlWithProtocol)
      return true
    } catch {
      return false
    }
  }

  const normalizeUrl = (url: string): string => {
    if (!url.trim()) return ''
    return url.startsWith('http://') || url.startsWith('https://')
      ? url
      : `https://${url}`
  }

  const handleGenerate = () => {
    setError('')
    if (!customUrl.trim()) {
      setError('Please enter a URL')
      return
    }
    if (!validateUrl(customUrl)) {
      setError('Please enter a valid URL')
      return
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string
      setBackgroundImage(imageUrl)
      setError('')
    }
    reader.onerror = () => {
      setError('Failed to load image')
    }
    reader.readAsDataURL(file)
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (.png recommended)')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string
      setLogoImage(imageUrl)
      setUseDefaultLogo(false)
      setError('')
    }
    reader.onerror = () => {
      setError('Failed to load logo')
    }
    reader.readAsDataURL(file)
  }

  const removeBackgroundImage = () => {
    setBackgroundImage(null)
    if (backgroundFileInputRef.current) {
      backgroundFileInputRef.current.value = ''
    }
  }

  const removeLogo = () => {
    setLogoImage(null)
    setUseDefaultLogo(true)
    if (logoFileInputRef.current) {
      logoFileInputRef.current.value = ''
    }
  }

  const getQRCodeAsImage = (ref: React.RefObject<HTMLDivElement>): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      if (!ref.current) {
        reject(new Error('QR code ref not found'))
        return
      }

      const svg = ref.current.querySelector('svg')
      if (!svg) {
        reject(new Error('SVG not found'))
        return
      }

      // Clone the SVG to avoid modifying the original
      const clonedSvg = svg.cloneNode(true) as SVGElement

      // Set background color to white
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      rect.setAttribute('width', '100%')
      rect.setAttribute('height', '100%')
      rect.setAttribute('fill', 'white')
      clonedSvg.insertBefore(rect, clonedSvg.firstChild)

      // Convert SVG to data URL
      const svgData = new XMLSerializer().serializeToString(clonedSvg)
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
      const svgUrl = URL.createObjectURL(svgBlob)

      const img = new Image()
      img.onload = () => {
        URL.revokeObjectURL(svgUrl)
        resolve(img)
      }
      img.onerror = () => {
        URL.revokeObjectURL(svgUrl)
        reject(new Error('Failed to load QR code image'))
      }
      img.src = svgUrl
    })
  }

  const getLogoImage = async (): Promise<HTMLImageElement | null> => {
    try {
      let logoUrl: string

      if (useDefaultLogo) {
        // Use our default logo
        logoUrl = '/logo.png'
      } else if (logoImage) {
        // Use user's uploaded logo
        logoUrl = logoImage
      } else {
        return null
      }

      return new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => resolve(img)
        img.onerror = () => {
          console.warn('Failed to load logo image')
          resolve(null)
        }
        img.src = logoUrl
      })
    } catch (err) {
      console.warn('Error loading logo:', err)
      return null
    }
  }

  const compositeQROnImage = async (
    qrRef: React.RefObject<HTMLDivElement>,
    backgroundImgUrl: string | null,
    includeLogo: boolean = true
  ) => {
    try {
      const qrImage = await getQRCodeAsImage(qrRef)

      const canvas = document.createElement('canvas')
      canvas.width = PORTRAIT_WIDTH
      canvas.height = PORTRAIT_HEIGHT
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        setError('Failed to create canvas context')
        return
      }

      // Draw background image if provided
      if (backgroundImgUrl) {
        const bgImg = new Image()
        await new Promise((resolve, reject) => {
          bgImg.onload = resolve
          bgImg.onerror = reject
          bgImg.src = backgroundImgUrl
        })

        // Calculate dimensions to fill portrait canvas while maintaining aspect ratio
        const bgAspect = bgImg.width / bgImg.height
        const canvasAspect = PORTRAIT_WIDTH / PORTRAIT_HEIGHT

        let drawWidth = PORTRAIT_WIDTH
        let drawHeight = PORTRAIT_HEIGHT
        let offsetX = 0
        let offsetY = 0

        if (bgAspect > canvasAspect) {
          // Background is wider - fit to height
          drawWidth = PORTRAIT_HEIGHT * bgAspect
          offsetX = (PORTRAIT_WIDTH - drawWidth) / 2
        } else {
          // Background is taller - fit to width
          drawHeight = PORTRAIT_WIDTH / bgAspect
          offsetY = (PORTRAIT_HEIGHT - drawHeight) / 2
        }

        ctx.drawImage(bgImg, offsetX, offsetY, drawWidth, drawHeight)
      } else {
        // Fill with black background if no image
        ctx.fillStyle = '#000000'
        ctx.fillRect(0, 0, PORTRAIT_WIDTH, PORTRAIT_HEIGHT)
      }

      // Calculate QR code size based on user setting (percentage of canvas width)
      const qrSizeOnCanvas = PORTRAIT_WIDTH * qrSizePercent
      const qrX = (PORTRAIT_WIDTH - qrSizeOnCanvas) * qrPosition.x
      const qrY = (PORTRAIT_HEIGHT - qrSizeOnCanvas) * qrPosition.y

      // Draw white background for QR code
      const padding = qrSize * 0.1
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
      ctx.fillRect(
        qrX - padding,
        qrY - padding,
        qrSize + padding * 2,
        qrSize + padding * 2
      )

      // Draw QR code
      ctx.drawImage(qrImage, qrX, qrY, qrSizeOnCanvas, qrSizeOnCanvas)

      // Draw logo in center of QR code if enabled
      if (includeLogo) {
        const logo = await getLogoImage()
        if (logo) {
          const logoSize = qrSizeOnCanvas * 0.3 // Logo is 30% of QR code size
          const logoX = qrX + (qrSizeOnCanvas - logoSize) / 2
          const logoY = qrY + (qrSizeOnCanvas - logoSize) / 2

          // Draw white background circle/square for logo
          ctx.fillStyle = 'white'
          ctx.fillRect(logoX - 2, logoY - 2, logoSize + 4, logoSize + 4)

          // Draw logo
          ctx.drawImage(logo, logoX, logoY, logoSize, logoSize)
        }
      }

      return canvas
    } catch (err: any) {
      setError(err.message || 'Failed to composite image')
      return null
    }
  }

  const downloadQRCode = async (
    ref: React.RefObject<HTMLDivElement>,
    filename: string,
    withBackground: boolean = false
  ) => {
    if (withBackground) {
      const canvas = await compositeQROnImage(ref, backgroundImage, true)
      if (canvas) {
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = filename
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)
          }
        }, 'image/png')
      }
      return
    }

    // Download QR code with logo overlay
    if (!ref.current) return

    const svg = ref.current.querySelector('svg')
    if (!svg) return

    // Get QR code as image
    const qrImage = await getQRCodeAsImage(ref)

    // Get logo
    const logo = await getLogoImage()

    // Create canvas
    const canvas = document.createElement('canvas')
    canvas.width = qrImage.width
    canvas.height = qrImage.height
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      setError('Failed to create canvas context')
      return
    }

    // Fill white background
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw the QR code
    ctx.drawImage(qrImage, 0, 0)

    // Draw logo in center if available
    if (logo) {
      const logoSize = canvas.width * 0.2 // Logo is 20% of QR code size
      const logoX = (canvas.width - logoSize) / 2
      const logoY = (canvas.height - logoSize) / 2

      // Draw white background for logo
      ctx.fillStyle = 'white'
      ctx.fillRect(logoX - 4, logoY - 4, logoSize + 8, logoSize + 8)

      // Draw logo
      ctx.drawImage(logo, logoX, logoY, logoSize, logoSize)
    }

    // Convert to blob and download
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }
    }, 'image/png')
  }

  const displayUrl = customUrl.trim() ? normalizeUrl(customUrl) : ''

  // Update composited preview when QR or background changes
  const updatePreview = async (
    qrRef: React.RefObject<HTMLDivElement>,
    canvasRef?: React.RefObject<HTMLCanvasElement>
  ) => {
    const targetCanvas = canvasRef?.current || customCompositedCanvasRef.current
    if (!targetCanvas || !qrRef.current) return

    const ctx = targetCanvas.getContext('2d')
    if (!ctx) return

    const composited = await compositeQROnImage(qrRef, backgroundImage, true)
    if (composited) {
      ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height)
      ctx.drawImage(composited, 0, 0, targetCanvas.width, targetCanvas.height)
    }
  }

  // Update preview when background image, logo, or QR changes
  useEffect(() => {
    if (displayUrl && validateUrl(customUrl) && backgroundImage) {
      updatePreview(customQRRef)
    }
  }, [backgroundImage, logoImage, useDefaultLogo, qrPosition, displayUrl])

  // Update landing page preview
  useEffect(() => {
    if (backgroundImage && landingQRRef.current) {
      updatePreview(landingQRRef, landingCompositedCanvasRef)
    }
  }, [backgroundImage, logoImage, useDefaultLogo, qrPosition])

  return (
    <>
      <Helmet>
        <title>QR Code Generator - THE LOST+UNFOUNDS</title>
        <meta name="description" content="Generate QR codes for links. Download QR codes for easy sharing." />
      </Helmet>
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">QR Code Generator</h1>
            <p className="text-white/70 text-lg">Generate and download QR codes for any link</p>
          </div>

          {/* Image and Logo Upload Section - Always Visible */}
          <div className="mb-8 bg-white/5 border border-white/10 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-left">Customize Your QR Codes</h2>

            {/* Background Image Upload */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-left">
                Background Image (Optional)
              </label>
              <div className="flex items-center gap-4">
                <input
                  ref={backgroundFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="background-image-upload"
                />
                <label
                  htmlFor="background-image-upload"
                  className="px-4 py-2 bg-white/10 border border-white/20 hover:bg-white/20 transition-colors rounded-none cursor-pointer flex items-center gap-2"
                >
                  <ArrowUpTrayIcon className="w-4 h-4" />
                  Upload Background
                </label>
                {backgroundImage && (
                  <button
                    onClick={removeBackgroundImage}
                    className="px-4 py-2 bg-red-600/20 border border-red-600/40 hover:bg-red-600/30 transition-colors rounded-none flex items-center gap-2"
                  >
                    <XMarkIcon className="w-4 h-4" />
                    Remove
                  </button>
                )}
              </div>
              <p className="text-white/50 text-xs mt-2 text-left">
                Images will be resized to portrait dimensions (1080x1920) for phone wallpaper
              </p>
            </div>

            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium mb-2 text-left">
                Logo (Optional)
              </label>
              <div className="flex items-center gap-4">
                <input
                  ref={logoFileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleLogoUpload}
                  className="hidden"
                  id="logo-upload"
                />
                <label
                  htmlFor="logo-upload"
                  className="px-4 py-2 bg-white/10 border border-white/20 hover:bg-white/20 transition-colors rounded-none cursor-pointer flex items-center gap-2"
                >
                  <ArrowUpTrayIcon className="w-4 h-4" />
                  Upload Custom Logo
                </label>
                {(logoImage || useDefaultLogo) && (
                  <>
                    {logoImage && (
                      <button
                        onClick={removeLogo}
                        className="px-4 py-2 bg-red-600/20 border border-red-600/40 hover:bg-red-600/30 transition-colors rounded-none flex items-center gap-2"
                      >
                        <XMarkIcon className="w-4 h-4" />
                        Remove Custom Logo
                      </button>
                    )}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useDefaultLogo && !logoImage}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setUseDefaultLogo(true)
                            setLogoImage(null)
                            if (logoFileInputRef.current) {
                              logoFileInputRef.current.value = ''
                            }
                          } else {
                            setUseDefaultLogo(false)
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-white/70">Use our logo (default)</span>
                    </label>
                  </>
                )}
              </div>
              <p className="text-white/50 text-xs mt-2 text-left">
                Logo will be centered in the QR code. PNG format recommended.
              </p>
            </div>

            {/* QR Code Size Control */}
            <div className="mt-4 pt-4 border-t border-white/10">
              <label className="block text-sm font-medium mb-2 text-left">
                QR Code Size
              </label>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-white/60 mb-1">
                    Display Size: {qrSize}px
                  </label>
                  <input
                    type="range"
                    min="128"
                    max="512"
                    step="16"
                    value={qrSize}
                    onChange={(e) => {
                      const newSize = parseInt(e.target.value)
                      setQrSize(newSize)
                    }}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-white/40 mt-1">
                    <span>128px</span>
                    <span>256px</span>
                    <span>512px</span>
                  </div>
                </div>
                {backgroundImage && (
                  <div>
                    <label className="block text-xs text-white/60 mb-1">
                      Size on Wallpaper: {Math.round(qrSizePercent * 100)}% of width
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="0.5"
                      step="0.05"
                      value={qrSizePercent}
                      onChange={(e) => {
                        setQrSizePercent(parseFloat(e.target.value))
                      }}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-white/40 mt-1">
                      <span>10%</span>
                      <span>20%</span>
                      <span>50%</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* QR Position Controls - Only show if background image is uploaded */}
            {backgroundImage && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <label className="block text-sm font-medium mb-2 text-left">
                  QR Code Position on Background
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-white/60 mb-1">Horizontal (0-1)</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={qrPosition.x}
                      onChange={(e) => {
                        setQrPosition({ ...qrPosition, x: parseFloat(e.target.value) })
                      }}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/60 mb-1">Vertical (0-1)</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={qrPosition.y}
                      onChange={(e) => {
                        setQrPosition({ ...qrPosition, y: parseFloat(e.target.value) })
                      }}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Landing Page QR Code */}
          <div className="mb-16">
            <div className="bg-white/5 border border-white/10 rounded-lg p-8">
              <h2 className="text-2xl font-semibold mb-4 text-left">Landing Page QR Code</h2>
              <p className="text-white/60 mb-6 text-left text-sm">
                Scan this QR code to visit our landing page
              </p>
              <div className="flex flex-col lg:flex-row items-start gap-8">
                {/* QR Code Only */}
                <div className="flex-shrink-0">
                  <div
                    ref={landingQRRef}
                    className="bg-white p-4 rounded-lg relative"
                    style={{ width: `${qrSize + 32}px`, height: `${qrSize + 32}px` }}
                  >
                    <QRCodeSVG
                      value={LANDING_PAGE_URL}
                      size={qrSize}
                      level="H"
                      includeMargin={true}
                    />
                    {/* Logo overlay preview */}
                    {(useDefaultLogo || logoImage) && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="bg-white p-2 rounded" style={{ width: `${qrSize * 0.2}px`, height: `${qrSize * 0.2}px` }}>
                          {useDefaultLogo && !logoImage ? (
                            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                          ) : logoImage ? (
                            <img src={logoImage} alt="Custom Logo" className="w-full h-full object-contain" />
                          ) : null}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Composited Preview */}
                {backgroundImage && (
                  <div className="flex-shrink-0">
                    <p className="text-sm text-white/60 mb-2 text-left">Preview (Portrait)</p>
                    <div className="border border-white/20 rounded-lg overflow-hidden" style={{ width: '270px', height: '480px' }}>
                      <canvas
                        ref={landingCompositedCanvasRef}
                        width={270}
                        height={480}
                        className="w-full h-full object-cover"
                        style={{ imageRendering: 'auto' }}
                      />
                    </div>
                  </div>
                )}

                {/* Info and Download */}
                <div className="flex-1 text-left">
                  <p className="text-white/80 mb-2 break-all">
                    <LinkIcon className="inline-block w-4 h-4 mr-2" />
                    {LANDING_PAGE_URL}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 mt-4">
                    <button
                      onClick={() => downloadQRCode(landingQRRef, 'thelostandunfounds-landing-qr.png', false)}
                      className="px-6 py-2 bg-white text-black hover:bg-white/90 transition-colors rounded-none flex items-center justify-center gap-2"
                    >
                      <ArrowDownTrayIcon className="w-4 h-4" />
                      Download QR Only
                    </button>
                    {backgroundImage && (
                      <button
                        onClick={() => downloadQRCode(landingQRRef, 'thelostandunfounds-wallpaper.png', true)}
                        className="px-6 py-2 bg-white text-black hover:bg-white/90 transition-colors rounded-none flex items-center justify-center gap-2"
                      >
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        Download Wallpaper
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Custom URL Generator */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-8">
            <h2 className="text-2xl font-semibold mb-4 text-left">Generate Custom QR Code</h2>
            <p className="text-white/60 mb-6 text-left text-sm">
              Enter any URL to generate a QR code
            </p>

            <div className="mb-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="text"
                  value={customUrl}
                  onChange={(e) => {
                    setCustomUrl(e.target.value)
                    setError('')
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleGenerate()
                    }
                  }}
                  placeholder="https://example.com or example.com"
                  className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-none text-white placeholder-white/40 focus:outline-none focus:border-white/40"
                />
                <button
                  onClick={handleGenerate}
                  className="px-6 py-3 bg-white text-black hover:bg-white/90 transition-colors rounded-none whitespace-nowrap"
                >
                  Generate
                </button>
              </div>
              {error && (
                <p className="mt-2 text-red-400 text-sm text-left">{error}</p>
              )}
            </div>

            {displayUrl && validateUrl(customUrl) && (
              <div className="mt-8 pt-8 border-t border-white/10">
                {/* Preview and QR Code */}
                <div className="flex flex-col lg:flex-row items-start gap-8">
                  {/* QR Code Only */}
                  <div className="flex-shrink-0">
                    <div
                      ref={customQRRef}
                      className="bg-white p-4 rounded-lg relative"
                      style={{ width: `${qrSize + 32}px`, height: `${qrSize + 32}px` }}
                    >
                      <QRCodeSVG
                        value={displayUrl}
                        size={qrSize}
                        level="H"
                        includeMargin={true}
                      />
                      {/* Logo overlay preview */}
                      {(useDefaultLogo || logoImage) && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="bg-white p-2 rounded" style={{ width: `${qrSize * 0.2}px`, height: `${qrSize * 0.2}px` }}>
                            {useDefaultLogo && !logoImage ? (
                              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                            ) : logoImage ? (
                              <img src={logoImage} alt="Custom Logo" className="w-full h-full object-contain" />
                            ) : null}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Composited Preview */}
                  {backgroundImage && (
                    <div className="flex-shrink-0">
                      <p className="text-sm text-white/60 mb-2 text-left">Preview (Portrait)</p>
                      <div className="border border-white/20 rounded-lg overflow-hidden" style={{ width: '270px', height: '480px' }}>
                        <canvas
                          ref={customCompositedCanvasRef}
                          width={270}
                          height={480}
                          className="w-full h-full object-cover"
                          style={{ imageRendering: 'auto' }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Info and Download */}
                  <div className="flex-1 text-left">
                    <p className="text-white/80 mb-2 break-all">
                      <LinkIcon className="inline-block w-4 h-4 mr-2" />
                      {displayUrl}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 mt-4">
                      <button
                        onClick={() => {
                          const filename = displayUrl
                            .replace(/^https?:\/\//, '')
                            .replace(/[^a-z0-9]/gi, '-')
                            .toLowerCase()
                          downloadQRCode(customQRRef, `${filename}-qr.png`, false)
                        }}
                        className="px-6 py-2 bg-white text-black hover:bg-white/90 transition-colors rounded-none flex items-center justify-center gap-2"
                      >
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        Download QR Only
                      </button>
                      {backgroundImage && (
                        <button
                          onClick={async () => {
                            const filename = displayUrl
                              .replace(/^https?:\/\//, '')
                              .replace(/[^a-z0-9]/gi, '-')
                              .toLowerCase()
                            await downloadQRCode(customQRRef, `${filename}-wallpaper.png`, true)
                          }}
                          className="px-6 py-2 bg-white text-black hover:bg-white/90 transition-colors rounded-none flex items-center justify-center gap-2"
                        >
                          <ArrowDownTrayIcon className="w-4 h-4" />
                          Download Wallpaper
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
