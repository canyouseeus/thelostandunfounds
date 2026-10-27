import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { logApiCall, logError } from '@/lib/adminErrorLog'

/**
 * Pick a photo that is already in a gallery. Lists the same `photos` /
 * `photo_libraries` rows as Gallery Management → ALL PHOTOS, and hands back
 * the photo's large original from /api/gallery/stream (same origin, so the
 * generator's canvas can read it).
 */

interface Library {
  id: string
  name: string
}

interface GalleryPhoto {
  id: string
  title: string | null
  google_drive_file_id: string
  library_id: string
  mime_type: string | null
}

const PAGE = 30
/** Long edge requested for the screen: ~170 px/in on an 18 × 24 print, well past the ~110 a 55 LPI screen needs. */
const ORIGINAL_SIZE = 4096

interface Props {
  onPick: (photo: { blob: Blob; label: string }) => void
  onCancel: () => void
}

export default function GalleryPhotoPicker({ onPick, onCancel }: Props) {
  const [libraries, setLibraries] = useState<Library[]>([])
  const [libraryId, setLibraryId] = useState('')
  const [search, setSearch] = useState('')
  const [photos, setPhotos] = useState<GalleryPhoto[]>([])
  const [hasMore, setHasMore] = useState(false)
  /** Rows fetched so far (clips included), so LOAD MORE pages on the table, not on what is shown. */
  const [nextFrom, setNextFrom] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [opening, setOpening] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('photo_libraries')
      .select('id, name')
      .order('name')
      .then(({ data, error: err }) => {
        if (err) logError(`photo_libraries: ${err.message}`)
        setLibraries(data || [])
      })
  }, [])

  const load = useCallback(async (from: number) => {
    setLoading(true)
    setError(null)
    let query = supabase
      .from('photos')
      .select('id, title, google_drive_file_id, library_id, mime_type')
      .not('google_drive_file_id', 'is', null)
      .order('created_at', { ascending: false })
      .range(from, from + PAGE - 1)
    if (libraryId) query = query.eq('library_id', libraryId)
    if (search.trim()) query = query.ilike('title', `%${search.trim()}%`)
    const { data, error: err } = await query
    setLoading(false)
    if (err) {
      logError(`photos: ${err.message}`)
      setError('Could not load the gallery photos.')
      return
    }
    // Clips live in the same table; only stills can be screened.
    const stills = ((data || []) as GalleryPhoto[]).filter(p => !p.mime_type?.startsWith('video/'))
    setPhotos(prev => (from === 0 ? stills : [...prev, ...stills]))
    setHasMore((data || []).length === PAGE)
    setNextFrom(from + (data || []).length)
  }, [libraryId, search])

  // Reload from the top when the gallery or search changes (search debounced).
  useEffect(() => {
    const t = setTimeout(() => { void load(0) }, search ? 300 : 0)
    return () => clearTimeout(t)
  }, [load, search])

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
    } catch (e) {
      logError(`gallery photo ${p.id}: ${e instanceof Error ? e.message : String(e)}`)
      setError('That photo could not be opened. Try another, or upload it instead.')
    } finally {
      setOpening(null)
    }
  }

  return (
    <div className="bg-white/5 p-3 mb-3" data-testid="halftone-gallery-picker">
      <div className="flex gap-2 mb-2">
        <select
          value={libraryId}
          onChange={e => setLibraryId(e.target.value)}
          aria-label="Gallery"
          className="flex-1 min-w-0 bg-white/10 text-white text-xs uppercase tracking-wider p-2 focus:outline-none"
          style={{ borderRadius: 0 }}
          data-testid="halftone-gallery-select"
        >
          <option value="">ALL GALLERIES</option>
          {libraries.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <button
          onClick={onCancel}
          className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider"
        >
          CLOSE
        </button>
      </div>
      <input
        type="search"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by title"
        aria-label="Search photos"
        className="w-full bg-white/10 text-white text-xs p-2 mb-2 focus:outline-none"
        style={{ borderRadius: 0 }}
      />
      {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
      <div className="grid grid-cols-3 gap-1 max-h-72 overflow-y-auto">
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
              className="w-full h-full object-cover"
            />
            {opening === p.id && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/70 text-white text-[10px] font-bold uppercase tracking-wider">
                OPENING…
              </span>
            )}
          </button>
        ))}
      </div>
      {!loading && photos.length === 0 && !error && (
        <p className="text-white/40 text-xs mt-2">No photos{search ? ' match that search' : ' in this gallery'}.</p>
      )}
      {loading && <p className="text-white/40 text-xs mt-2">Loading…</p>}
      {hasMore && !loading && (
        <button
          onClick={() => load(nextFrom)}
          className="w-full mt-2 px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider"
        >
          LOAD MORE
        </button>
      )}
    </div>
  )
}
