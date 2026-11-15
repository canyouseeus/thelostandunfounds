import { useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { GlobeAltIcon, LinkIcon, PhotoIcon } from '@heroicons/react/24/outline'
import QrMaker from '@/components/qr/QrMaker'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { isAdminUser } from '@/utils/admin'

const SITE = 'https://www.thelostandunfounds.com'

type Source = 'site' | 'gallery' | 'custom'
type Library = { id: string; name: string; slug: string }

const surface = { borderRadius: 0 }
const seg = (on: boolean) =>
  `flex items-center justify-start gap-2 px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider ${on ? 'bg-white text-black' : 'bg-white/10 text-white/60 hover:text-white'}`

/** "example.com/x" → "https://example.com/x"; null when it is not a web link. */
function normalizeUrl(raw: string): string | null {
  const t = raw.trim()
  if (!t) return null
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(t) ? t : `https://${t}`)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    if (!u.hostname.includes('.')) return null
    return u.toString()
  } catch {
    return null
  }
}

function fileBaseFor(url: string): string {
  try {
    const u = new URL(url)
    const slug = `${u.hostname.replace(/^www\./, '')}${u.pathname}`.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')
    return slug.slice(0, 60) || 'qr'
  } catch {
    return 'qr'
  }
}

export default function QR() {
  const { user } = useAuth()
  const [source, setSource] = useState<Source>('site')
  const [libraries, setLibraries] = useState<Library[]>([])
  const [librarySlug, setLibrarySlug] = useState('')
  const [customUrl, setCustomUrl] = useState('')

  // Your galleries: every gallery for an admin, the ones you own for anyone else
  // (the same rule as the dashboards' Gallery view).
  useEffect(() => {
    if (!user) { setLibraries([]); return }
    let cancelled = false
    let q = supabase.from('photo_libraries').select('id, name, slug').order('created_at', { ascending: false })
    if (!isAdminUser(user)) q = q.eq('owner_id', user.id)
    q.then(({ data }) => {
      if (cancelled) return
      const libs = (data as Library[]) || []
      setLibraries(libs)
      setLibrarySlug(s => s || libs[0]?.slug || '')
    })
    return () => { cancelled = true }
  }, [user])

  const customNormalized = normalizeUrl(customUrl)
  const wanted = source === 'site'
    ? `${SITE}/`
    : source === 'gallery'
      ? (librarySlug ? `${SITE}/gallery/${librarySlug}` : null)
      : customNormalized

  // The maker keeps the last good link while a custom one is half typed, so the
  // photo and placement are not thrown away on every keystroke.
  const [activeUrl, setActiveUrl] = useState(`${SITE}/`)
  useEffect(() => { if (wanted) setActiveUrl(wanted) }, [wanted])

  const fileBase = useMemo(
    () => (source === 'gallery' && librarySlug ? librarySlug : fileBaseFor(activeUrl)),
    [source, librarySlug, activeUrl],
  )

  return (
    <>
      <Helmet>
        <title>THE LOST+UNFOUNDS | QR Code Generator</title>
        <meta name="description" content="Make a QR code for any link or gallery, then turn it into a phone wallpaper with your own photo behind it." />
        <link rel="canonical" href="https://www.thelostandunfounds.com/qr" />
      </Helmet>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-left">
        <div className="mb-8 sm:mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">QR CODE GENERATOR</h1>
          <p className="text-lg sm:text-xl text-white/70">
            A QR code for any link or gallery. Download it, or put it on a phone wallpaper.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2 bg-white/5 p-6 h-fit" style={surface}>
            <h2 className="text-sm font-bold uppercase tracking-widest text-white mb-4">LINK</h2>
            <div className="grid grid-cols-1 gap-1 mb-4" data-testid="qr-source">
              <button className={seg(source === 'site')} style={surface} onClick={() => setSource('site')}>
                <GlobeAltIcon className="w-4 h-4 shrink-0" /><span className="whitespace-nowrap">THE SITE</span>
              </button>
              {user && (
                <button className={seg(source === 'gallery')} style={surface} onClick={() => setSource('gallery')} data-testid="qr-source-gallery">
                  <PhotoIcon className="w-4 h-4 shrink-0" /><span className="whitespace-nowrap">MY GALLERY</span>
                </button>
              )}
              <button className={seg(source === 'custom')} style={surface} onClick={() => setSource('custom')} data-testid="qr-source-custom">
                <LinkIcon className="w-4 h-4 shrink-0" /><span className="whitespace-nowrap">ANY LINK</span>
              </button>
            </div>

            {source === 'gallery' && (
              libraries.length ? (
                <select
                  value={librarySlug}
                  onChange={e => setLibrarySlug(e.target.value)}
                  className="w-full bg-white/10 text-white text-sm px-3 py-3 mb-3 focus:outline-none"
                  style={surface}
                  aria-label="Gallery"
                  data-testid="qr-gallery-select"
                >
                  {libraries.map(l => <option key={l.id} value={l.slug} className="bg-black">{l.name}</option>)}
                </select>
              ) : (
                <p className="text-white/40 text-xs mb-3">No galleries yet.</p>
              )
            )}

            {source === 'custom' && (
              <>
                <input
                  type="url"
                  inputMode="url"
                  autoCapitalize="none"
                  autoCorrect="off"
                  value={customUrl}
                  onChange={e => setCustomUrl(e.target.value)}
                  placeholder="example.com/page"
                  className="w-full bg-white/10 text-white text-sm px-3 py-3 mb-2 placeholder-white/30 focus:outline-none"
                  style={surface}
                  aria-label="Link"
                  data-testid="qr-custom-url"
                />
                {customUrl.trim() && !customNormalized && (
                  <p className="text-red-400 text-xs mb-2">That isn't a web link yet.</p>
                )}
              </>
            )}

            <p className="text-white/40 text-xs font-mono break-all" data-testid="qr-active-url">{activeUrl}</p>
            {!user && (
              <p className="text-white/40 text-xs mt-4">Sign in to make codes for your galleries and use your gallery photos as the wallpaper.</p>
            )}
          </div>

          <div className="lg:col-span-3 bg-white/5 p-6" style={surface}>
            <h2 className="text-sm font-bold uppercase tracking-widest text-white mb-4">MAKE IT</h2>
            <QrMaker url={activeUrl} fileBase={fileBase} />
          </div>
        </div>
      </div>
    </>
  )
}
