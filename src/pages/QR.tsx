import { useState, useRef } from 'react'
import { Helmet } from 'react-helmet-async'
import { QRCodeSVG } from 'qrcode.react'
import { Download, Link as LinkIcon } from 'lucide-react'

const LANDING_PAGE_URL = 'https://www.thelostandunfounds.com/'

export default function QR() {
  const [customUrl, setCustomUrl] = useState('')
  const [error, setError] = useState('')
  const landingQRRef = useRef<HTMLDivElement>(null)
  const customQRRef = useRef<HTMLDivElement>(null)

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

  const downloadQRCode = (ref: React.RefObject<HTMLDivElement>, filename: string) => {
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

  const displayUrl = customUrl.trim() ? normalizeUrl(customUrl) : ''

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
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
                  <div 
                    ref={customQRRef}
                    className="bg-white p-4 rounded-lg flex-shrink-0"
                  >
                    <QRCodeSVG
                      value={displayUrl}
                      size={256}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-white/80 mb-2 break-all">
                      <LinkIcon className="inline-block w-4 h-4 mr-2" />
                      {displayUrl}
                    </p>
                    <button
                      onClick={() => {
                        const filename = displayUrl
                          .replace(/^https?:\/\//, '')
                          .replace(/[^a-z0-9]/gi, '-')
                          .toLowerCase()
                        downloadQRCode(customQRRef, `${filename}-qr.png`)
                      }}
                      className="mt-4 px-6 py-2 bg-white text-black hover:bg-white/90 transition-colors rounded-none flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download QR Code
                    </button>
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
