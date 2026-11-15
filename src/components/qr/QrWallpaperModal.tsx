import { useEffect, useRef } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import QrMaker from './QrMaker'

const SITE = 'https://www.thelostandunfounds.com'

interface Props {
  slug: string
  name: string
  onClose: () => void
}

/** The gallery QR button on every dashboard: the shared QR maker, pointed at one gallery. */
export default function QrWallpaperModal({ slug, name, onClose }: Props) {
  const url = `${SITE}/gallery/${slug}`

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
        <QrMaker url={url} fileBase={slug} />
      </div>
    </div>
  )
}
