import { useState, useRef, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { QRCodeSVG } from 'qrcode.react'
import { Download, Link as LinkIcon, Upload, X } from 'lucide-react'

const LANDING_PAGE_URL = 'https://www.thelostandunfounds.com/'
// Portrait dimensions for phone wallpaper (9:16 aspect ratio)
const PORTRAIT_WIDTH = 1080
const PORTRAIT_HEIGHT = 1920

export default function QR() {
  const [customUrl, setCustomUrl] = useState('')
  const [error, setError] = useState('')
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null)
  const [qrPosition, setQrPosition] = useState({ x: 0.5, y: 0.5 }) // Center position (0-1)
  const landingQRRef = useRef<HTMLDivElement>(null)
  const customQRRef = useRef<HTMLDivElement>(null)
  const compositedCanvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const removeBackgroundImage = () => {
    setBackgroundImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
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

  const compositeQROnImage = async (
    qrRef: React.RefObject<HTMLDivElement>,
    backgroundImgUrl: string | null
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

      // Calculate QR code size (20% of canvas width)
      const qrSize = PORTRAIT_WIDTH * 0.2
      const qrX = (PORTRAIT_WIDTH - qrSize) * qrPosition.x
      const qrY = (PORTRAIT_HEIGHT - qrSize) * qrPosition.y

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
      ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize)

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
    if (withBackground && backgroundImage) {
      const canvas = await compositeQROnImage(ref, backgroundImage)
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

    // Original download without background
    if (!ref.current) return

    const svg = ref.current.querySelector('svg')
    if (!svg) return

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

    // Create canvas to convert SVG to PNG
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      
      if (ctx) {
        // Fill white background
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        
        // Draw the QR code
        ctx.drawImage(img, 0, 0)
        
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
      
      URL.revokeObjectURL(svgUrl)
    }
    img.onerror = () => {
      URL.revokeObjectURL(svgUrl)
      setError('Failed to download QR code')
    }
    img.src = svgUrl
  }

  // Update composited preview when QR or background changes
  const updatePreview = async (qrRef: React.RefObject<HTMLDivElement>) => {
    if (!compositedCanvasRef.current || !qrRef.current) return
    
    const canvas = compositedCanvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const composited = await compositeQROnImage(qrRef, backgroundImage)
    if (composited) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(composited, 0, 0, canvas.width, canvas.height)
    }
  }

  const displayUrl = customUrl.trim() ? normalizeUrl(customUrl) : ''

  // Update preview when background image or QR changes
  useEffect(() => {
    if (displayUrl && validateUrl(customUrl) && backgroundImage) {
      updatePreview(customQRRef)
    }
  }, [backgroundImage, qrPosition, displayUrl])

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

          {/* Landing Page QR Code */}
          <div className="mb-16">
            <div className="bg-white/5 border border-white/10 rounded-lg p-8">
              <h2 className="text-2xl font-semibold mb-4 text-left">Landing Page QR Code</h2>
              <p className="text-white/60 mb-6 text-left text-sm">
                Scan this QR code to visit our landing page
              </p>
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
                <div 
                  ref={landingQRRef}
                  className="bg-white p-4 rounded-lg flex-shrink-0"
                >
                  <QRCodeSVG
                    value={LANDING_PAGE_URL}
                    size={256}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-white/80 mb-2 break-all">
                    <LinkIcon className="inline-block w-4 h-4 mr-2" />
                    {LANDING_PAGE_URL}
                  </p>
                  <button
                    onClick={() => downloadQRCode(landingQRRef, 'thelostandunfounds-landing-qr.png')}
                    className="mt-4 px-6 py-2 bg-white text-black hover:bg-white/90 transition-colors rounded-none flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download QR Code
                  </button>
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
                {/* Image Upload Section */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2 text-left">
                    Add Background Image (Optional)
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      ref={fileInputRef}
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
                      <Upload className="w-4 h-4" />
                      Upload Image
                    </label>
                    {backgroundImage && (
                      <button
                        onClick={removeBackgroundImage}
                        className="px-4 py-2 bg-red-600/20 border border-red-600/40 hover:bg-red-600/30 transition-colors rounded-none flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Remove Image
                      </button>
                    )}
                  </div>
                  <p className="text-white/50 text-xs mt-2 text-left">
                    Image will be resized to portrait dimensions (1080x1920) for phone wallpaper
                  </p>
                </div>

                {/* QR Code Position Controls */}
                {backgroundImage && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium mb-2 text-left">
                      QR Code Position
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
                            setTimeout(() => updatePreview(customQRRef), 100)
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
                            setTimeout(() => updatePreview(customQRRef), 100)
                          }}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Preview and QR Code */}
                <div className="flex flex-col lg:flex-row items-start gap-8">
                  {/* QR Code Only */}
                  <div className="flex-shrink-0">
                    <div 
                      ref={customQRRef}
                      className="bg-white p-4 rounded-lg"
                    >
                      <QRCodeSVG
                        value={displayUrl}
                        size={256}
                        level="H"
                        includeMargin={true}
                      />
                    </div>
                  </div>

                  {/* Composited Preview */}
                  {backgroundImage && (
                    <div className="flex-shrink-0">
                      <p className="text-sm text-white/60 mb-2 text-left">Preview (Portrait)</p>
                      <div className="border border-white/20 rounded-lg overflow-hidden" style={{ width: '270px', height: '480px' }}>
                        <canvas
                          ref={compositedCanvasRef}
                          width={270}
                          height={480}
                          className="w-full h-full object-cover"
                          style={{ imageRendering: 'high-quality' }}
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
                        <Download className="w-4 h-4" />
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
                          <Download className="w-4 h-4" />
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
