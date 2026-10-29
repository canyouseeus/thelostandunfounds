import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabase'
import { logApiCall, logError } from '@/lib/adminErrorLog'
import { ExpandableScreen, ExpandableScreenContent } from '@/components/ui/expandable-screen'

/**
 * Full-screen browser for picking a photo that is already on the site.
 *
 * Two kinds of source:
 *  - GALLERIES: rows in `photo_libraries` (published or not).
 *  - FOLDERS / DATES: the sub-folders of the Drive JPG folder. The gallery sync
 *    tags every photo with the name of the folder it sits in (a `collection`
 *    tag), so each folder is browsable here without being published. Folders
 *    named for a year, month or day are listed separately under DATES.
 *
 * Picking a photo hands back its large original from /api/gallery/stream
 * (same origin, so the generator's canvas can read it).
 */

type Source = { kind: 'library' | 'tag'; id: string; name: string; count: number }

interface GalleryPhoto {
  id: string
  title: string | null
  google_drive_file_id: string
  mime_type: string | null
}

const PAGE = 48
/** Long edge requested for the screen: ~170 px/in on an 18 × 24 print, well past the ~110 a 55 LPI screen needs. */
const ORIGINAL_SIZE = 4096

const MONTH = '(january|february|march|april|may|june|july|august|september|october|november|december)'
const DATE_NAME = new RegExp(`^(\\d{4}|\\d{4}-\\d{2}(-\\d{2})?|${MONTH}( \\d{4})?)$`, 'i')

interface Props {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onPick: (photo: { blob: Blob; label: string }) => void
  /** Set for a photographer: they see only the galleries they own, and no Drive folders. */
  ownerId?: string
}

const row = 'w-full flex items-center justify-between gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 text-left'

export default function GalleryPhotoPicker({ isOpen, onOpenChange, onPick, ownerId }: Props) {
  const [sources, setSources] = useState<Source[] | null>(null)
  const [sourceError, setSourceError] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const [open, setOpen] = useState<Source | null>(null)
  const [photos, setPhotos] = useState<GalleryPhoto[]>([])
  const [nextFrom, setNextFrom] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [opening, setOpening] = useState<string | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const sentinel = useRef<HTMLDivElement>(null)

  // Galleries and folders, with photo counts, once per open.
  useEffect(() => {
    if (!isOpen || sources) return
    void (async () => {
      const libsQuery = supabase.from('photo_libraries').select('id, name, photos(count)').order('name')
      const tagsQuery = supabase.from('tags').select('id, name, photo_tags(count)').eq('type', 'collection').order('name')
      // The Drive folders hold everyone's photos, so a photographer's list leaves them out.
      const [libs, tags] = await Promise.all([
        ownerId ? libsQuery.eq('owner_id', ownerId) : libsQuery,
        ownerId ? null : tagsQuery,
      ])
      if (libs.error || tags?.error) {
        logError(`picker sources: ${libs.error?.message || tags?.error?.message}`)
        setSourceError('Could not load your galleries and folders.')
        return
      }
      const count = (r: { photos?: { count: number }[]; photo_tags?: { count: number }[] }) =>
        (r.photos ?? r.photo_tags ?? [])[0]?.count ?? 0
      setSources([
        ...(libs.data || []).map(r => ({ kind: 'library' as const, id: r.id, name: r.name, count: count(r) })),
        ...(tags?.data || []).map(r => ({ kind: 'tag' as const, id: r.id, name: r.name, count: count(r) })),
      ].filter(s => s.count > 0))
    })()
  }, [isOpen, sources, ownerId])

  const sections = useMemo(() => {
    const f = filter.trim().toLowerCase()
    const match = (s: Source) => !f || s.name.toLowerCase().includes(f)
    const all = (sources || []).filter(match)
    return [
      { title: 'GALLERIES', items: all.filter(s => s.kind === 'library') },
      { title: 'FOLDERS', items: all.filter(s => s.kind === 'tag' && !DATE_NAME.test(s.name.trim())) },
      { title: 'DATES', items: all.filter(s => s.kind === 'tag' && DATE_NAME.test(s.name.trim())) },
    ].filter(s => s.items.length)
  }, [sources, filter])

  const load = useCallback(async (source: Source, from: number) => {
    setLoading(true)
    setError(null)
    // created_at then id: a stable order, so pages never repeat or skip a photo.
    let rows: GalleryPhoto[] = []
    let fetched = 0
    if (source.kind === 'library') {
      const { data, error: err } = await supabase
        .from('photos')
        .select('id, title, google_drive_file_id, mime_type')
        .eq('library_id', source.id)
        .not('google_drive_file_id', 'is', null)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, from + PAGE - 1)
      if (err) { logError(`picker photos: ${err.message}`); setError('Could not load these photos.'); setLoading(false); return }
      rows = (data || []) as GalleryPhoto[]
      fetched = rows.length
    } else {
      const { data, error: err } = await supabase
        .from('photo_tags')
        .select('id, photos!inner(id, title, google_drive_file_id, mime_type)')
        .eq('tag_id', source.id)
        .not('photos.google_drive_file_id', 'is', null)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, from + PAGE - 1)
      if (err) { logError(`picker folder: ${err.message}`); setError('Could not load these photos.'); setLoading(false); return }
      fetched = (data || []).length
      rows = (data || []).map(r => (r as unknown as { photos: GalleryPhoto }).photos)
    }
    // Clips live in the same tables; only stills can be screened.
    const stills = rows.filter(p => !p.mime_type?.startsWith('video/'))
    setPhotos(prev => {
      const seen = new Set(from === 0 ? [] : prev.map(p => p.id))
      return [...(from === 0 ? [] : prev), ...stills.filter(p => !seen.has(p.id))]
    })
    setNextFrom(from + fetched)
    setHasMore(fetched === PAGE)
    setLoading(false)
  }, [])

  const openSource = (s: Source) => {
    setOpen(s)
    setPhotos([])
    setHasMore(false)
    scroller.current?.scrollTo({ top: 0 })
    void load(s, 0)
  }

  // Load the next page as the end of the grid scrolls into view.
  useEffect(() => {
    const el = sentinel.current
    if (!el || !open || !hasMore || loading) return
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) void load(open, nextFrom)
    }, { root: scroller.current, rootMargin: '600px' })
    io.observe(el)
    return () => io.disconnect()
  }, [open, hasMore, loading, nextFrom, load])

  const pick = async (p: GalleryPhoto) => {
    setOpening(p.id)
    setError(null)
    const url = `/api/gallery/stream?fileId=${encodeURIComponent(p.google_drive_file_id)}&size=${ORIGINAL_SIZE}`
    try {
      const res = await fetch(url)
      logApiCall('GET', url, res.status, p.title || p.id)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      if (!blob.type.startsWith('image/')) throw new Error(`not an image (${blob.type || 'unknown'})`)
      onPick({ blob, label: p.title || 'gallery-photo' })
      onOpenChange(false)
    } catch (e) {
      logError(`gallery photo ${p.id}: ${e instanceof Error ? e.message : String(e)}`)
      setError('That photo could not be opened. Try another, or upload it instead.')
    } finally {
      setOpening(null)
    }
  }

  return (
    <ExpandableScreen isOpen={isOpen} onOpenChange={onOpenChange}>
      <ExpandableScreenContent>
        <div ref={scroller} className="flex-1 overflow-y-auto" data-testid="halftone-gallery-picker">
          <div className="w-full max-w-6xl mx-auto px-4 sm:px-8 pt-6 pb-24 text-left">
            {!open ? (
              <>
                <h2 className="text-lg font-black text-white uppercase tracking-widest pr-12 mb-1">CHOOSE A PHOTO</h2>
                <p className="text-white/40 text-xs mb-4">
                  {ownerId ? 'From your galleries. Nothing here gets published.' : 'From a gallery, or from a folder in your Drive JPG folder. Nothing here gets published.'}
                </p>
                <input
                  type="search"
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                  placeholder="Find a gallery or folder"
                  aria-label="Find a gallery or folder"
                  className="w-full bg-white/5 text-white text-sm p-3 mb-6 focus:outline-none focus:bg-white/10"
                  data-tour="halftone-picker-filter"
                  style={{ borderRadius: 0 }}
                />
                {sourceError && <p className="text-red-400 text-xs mb-4">{sourceError}</p>}
                {!sources && !sourceError && <p className="text-white/40 text-xs">Loading…</p>}
                {sections.map(section => (
                  <div key={section.title} className="mb-8" data-tour={`halftone-picker-${section.title.toLowerCase()}`}>
                    <p className="text-white/60 text-xs uppercase tracking-wider mb-2">{section.title} · {section.items.length}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
                      {section.items.map(s => (
                        <button key={`${s.kind}-${s.id}`} className={row} onClick={() => openSource(s)} data-testid="halftone-source">
                          <span className="text-white text-xs font-bold uppercase tracking-wider truncate">{s.name}</span>
                          <span className="text-white/40 text-xs font-mono shrink-0">{s.count.toLocaleString()}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {sources && sections.length === 0 && <p className="text-white/40 text-xs">Nothing matches “{filter}”.</p>}
              </>
            ) : (
              <>
                <button
                  onClick={() => setOpen(null)}
                  className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-white/40 hover:text-white mb-3"
                  data-testid="halftone-picker-back"
                >
                  <ArrowLeftIcon className="w-3 h-3" /> ALL GALLERIES & FOLDERS
                </button>
                <h2 className="text-lg font-black text-white uppercase tracking-widest pr-12 mb-1 truncate">{open.name}</h2>
                <p className="text-white/40 text-xs font-mono mb-4">{open.count.toLocaleString()} PHOTOS · TAP ONE TO USE IT</p>
                {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-1">
                  {photos.map(p => (
                    <button
                      key={p.id}
                      onClick={() => pick(p)}
                      disabled={opening !== null}
                      className="relative aspect-square bg-white/5 overflow-hidden disabled:opacity-60"
                      title={p.title || ''}
                      data-testid="halftone-gallery-photo"
                    >
                      <img
                        src={`/api/gallery/stream?fileId=${encodeURIComponent(p.google_drive_file_id)}&size=400`}
                        alt={p.title || ''}
                        loading="lazy"
                        decoding="async"
                        className="block w-full h-full object-cover"
                      />
                      {opening === p.id && (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/70 text-white text-[10px] font-bold uppercase tracking-wider">
                          OPENING…
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <div ref={sentinel} className="h-1" />
                {loading && <p className="text-white/40 text-xs mt-3">Loading…</p>}
                {!loading && photos.length === 0 && !error && <p className="text-white/40 text-xs">No photos here.</p>}
                {!loading && !hasMore && photos.length > 0 && (
                  <p className="text-white/30 text-[10px] uppercase tracking-wider mt-4">END OF {open.name}</p>
                )}
              </>
            )}
          </div>
        </div>
      </ExpandableScreenContent>
    </ExpandableScreen>
  )
}
