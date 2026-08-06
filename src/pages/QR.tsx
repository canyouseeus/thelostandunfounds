import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { LinkIcon, QrCodeIcon } from '@heroicons/react/24/outline'
import QRStudio from '../components/qr/QRStudio'

const LANDING_PAGE_URL = 'https://www.thelostandunfounds.com/'

function validateUrl(url: string): boolean {
  if (!url.trim()) return false
  try {
    new URL(normalizeUrl(url))
    return true
  } catch {
    return false
  }
}

function normalizeUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return ''
  return /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`
}

/**
 * Public QR generator. All rendering lives in `QRStudio` / `lib/qr-render`, which
 * the affiliate dashboard uses too — one renderer, so a code generated here and a
 * code generated from a referral link look and export identically.
 */
export default function QR() {
  const [customUrl, setCustomUrl] = useState('')
  const [error, setError] = useState('')
  const [studioTarget, setStudioTarget] = useState<{ value: string; title: string; headline: string } | null>(null)

  const openCustom = () => {
    if (!customUrl.trim()) {
      setError('Please enter a URL')
      return
    }
    if (!validateUrl(customUrl)) {
      setError('Please enter a valid URL')
      return
    }
    setError('')
    setStudioTarget({ value: normalizeUrl(customUrl), title: normalizeUrl(customUrl), headline: '' })
  }

  return (
    <>
      <Helmet>
        <title>THE LOST+UNFOUNDS | QR Code Generator</title>
        <meta name="description" content="Generate custom high-resolution QR codes — square or styled, with a centre logo, and portrait phone-wallpaper exports." />
        <link rel="canonical" href="https://www.thelostandunfounds.com/qr" />
      </Helmet>

      <div className="min-h-screen bg-black text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-12 text-left">
            <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter mb-4">QR Code Generator</h1>
            <p className="text-white/60 text-sm text-left">
              Square or styled codes, an optional centre logo, and 1080×1920 portrait wallpapers.
              What you see in the preview is exactly what downloads.
            </p>
          </div>

          {/* Landing page code */}
          <div className="bg-white/5 p-8 mb-8" style={{ borderRadius: 0 }}>
            <h2 className="text-2xl font-bold uppercase tracking-widest mb-4 text-left">Landing Page</h2>
            <p className="text-white/80 mb-6 break-all text-left text-sm">
              <LinkIcon className="inline-block w-4 h-4 mr-2" />
              {LANDING_PAGE_URL}
            </p>
            <button
              onClick={() => setStudioTarget({
                value: LANDING_PAGE_URL,
                title: 'thelostandunfounds-landing',
                headline: 'The Lost+Unfounds',
              })}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold uppercase tracking-widest bg-white text-black hover:bg-white/10 hover:text-white transition-colors"
            >
              <QrCodeIcon className="w-4 h-4" /> Open QR Studio
            </button>
          </div>

          {/* Custom URL */}
          <div className="bg-white/5 p-8" style={{ borderRadius: 0 }}>
            <h2 className="text-2xl font-bold uppercase tracking-widest mb-4 text-left">Any URL</h2>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={customUrl}
                onChange={(e) => { setCustomUrl(e.target.value); setError('') }}
                onKeyDown={(e) => { if (e.key === 'Enter') openCustom() }}
                placeholder="https://example.com"
                className="flex-1 px-4 py-3 bg-white/5 text-white placeholder-white/20 font-mono text-sm focus:outline-none focus:bg-white/10 transition-colors"
              />
              <button
                onClick={openCustom}
                className="flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold uppercase tracking-widest bg-white text-black hover:bg-white/10 hover:text-white transition-colors whitespace-nowrap"
              >
                <QrCodeIcon className="w-4 h-4" /> Generate
              </button>
            </div>
            {error && <p className="mt-2 text-red-400 text-xs font-bold uppercase tracking-wider text-left">{error}</p>}
          </div>
        </div>
      </div>

      {studioTarget && (
        <QRStudio
          value={studioTarget.value}
          title={studioTarget.title}
          defaultHeadline={studioTarget.headline}
          onClose={() => setStudioTarget(null)}
        />
      )}
    </>
  )
}
