import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { MagnifyingGlassIcon, XMarkIcon, ArrowPathIcon, PhotoIcon, TagIcon } from '@heroicons/react/24/outline';
import { LoadingSpinner } from '@/components/Loading';

interface Library {
  id: string;
  name: string;
  slug: string;
}

interface Photo {
  id: string;
  title: string;
  thumbnail_url: string | null;
  google_drive_file_id: string | null;
  library_id: string;
  created_at: string;
  status: string;
  tags?: { id: string; name: string; type: string }[];
}

const PAGE_SIZE = 60;

export default function AdminPhotosBrowse() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedLibraryId, setSelectedLibraryId] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load libraries for filter
  useEffect(() => {
    supabase
      .from('photo_libraries')
      .select('id, name, slug')
      .order('name')
      .then(({ data }) => setLibraries(data || []));
  }, []);

  const loadPhotos = useCallback(async (reset = true) => {
    if (reset) {
      setLoading(true);
      setOffset(0);
    } else {
      setLoadingMore(true);
    }

    const currentOffset = reset ? 0 : offset;

    try {
      let query = supabase
        .from('photos')
        .select('id, title, thumbnail_url, google_drive_file_id, library_id, created_at, status', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(currentOffset, currentOffset + PAGE_SIZE - 1);

      if (selectedLibraryId) {
        query = query.eq('library_id', selectedLibraryId);
      }

      if (search.trim()) {
        query = query.ilike('title', `%${search.trim()}%`);
      }

      const { data, count, error } = await query;
      if (error) throw error;

      const fetched = data || [];
      setTotalCount(count || 0);
      setHasMore(fetched.length === PAGE_SIZE);

      if (reset) {
        setPhotos(fetched);
        setOffset(PAGE_SIZE);
      } else {
        setPhotos(prev => [...prev, ...fetched]);
        setOffset(prev => prev + PAGE_SIZE);
      }
    } catch (err) {
      console.error('Error loading photos:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [selectedLibraryId, search, offset]);

  // Initial load + when filters change
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => loadPhotos(true), search ? 300 : 0);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLibraryId, search]);

  const getPhotoUrl = (photo: Photo) => {
    if (photo.google_drive_file_id) {
      return `/api/gallery/stream?fileId=${photo.google_drive_file_id}&size=400`;
    }
    return photo.thumbnail_url || '';
  };

  const getFullPhotoUrl = (photo: Photo) => {
    if (photo.google_drive_file_id) {
      return `/api/gallery/stream?fileId=${photo.google_drive_file_id}&size=1600`;
    }
    return photo.thumbnail_url || '';
  };

  const libraryName = (libraryId: string) =>
    libraries.find(l => l.id === libraryId)?.name || 'Unknown';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wide flex items-center gap-2">
            <PhotoIcon className="w-4 h-4" />
            All Photos
            <span className="text-white/40 font-mono text-xs">({totalCount.toLocaleString()})</span>
          </h3>
          <p className="text-[10px] text-white/30 mt-0.5">Browse all synced photos across every library</p>
        </div>
        <button
          onClick={() => loadPhotos(true)}
          className="text-white/40 hover:text-white transition-colors"
          title="Refresh"
        >
          <ArrowPathIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Search */}
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by filename..."
            className="w-full bg-white/5 pl-8 pr-8 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:bg-white/10 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
            >
              <XMarkIcon className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Library filter */}
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setSelectedLibraryId(null)}
            className={`px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider transition-colors ${
              selectedLibraryId === null
                ? 'bg-white text-black'
                : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'
            }`}
          >
            All
          </button>
          {libraries.map(lib => (
            <button
              key={lib.id}
              onClick={() => setSelectedLibraryId(lib.id === selectedLibraryId ? null : lib.id)}
              className={`px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider transition-colors ${
                selectedLibraryId === lib.id
                  ? 'bg-white text-black'
                  : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'
              }`}
            >
              {lib.name}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-16 text-white/30">
          <PhotoIcon className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-bold uppercase tracking-wider">
            {search || selectedLibraryId ? 'No matching photos' : 'No photos synced yet'}
          </p>
          {!search && !selectedLibraryId && (
            <p className="text-xs mt-2 text-white/20">
              Go to Gallery Management → Test Connection to sync from Google Drive
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-1">
            {photos.map(photo => (
              <button
                key={photo.id}
                onClick={() => setLightboxPhoto(photo)}
                className="group relative aspect-square bg-white/5 overflow-hidden hover:ring-1 hover:ring-white/40 transition-all"
                title={photo.title}
              >
                <img
                  src={getPhotoUrl(photo)}
                  alt={photo.title}
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                  loading="lazy"
                  onError={e => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                {/* Library badge on hover */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-[8px] text-white/70 truncate uppercase font-bold">
                    {libraryName(photo.library_id)}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <button
                onClick={() => loadPhotos(false)}
                disabled={loadingMore}
                className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white/60 text-xs uppercase font-bold tracking-wider transition-colors flex items-center gap-2"
              >
                {loadingMore ? (
                  <><LoadingSpinner size="sm" /> Loading...</>
                ) : (
                  `Load More (${totalCount - photos.length} remaining)`
                )}
              </button>
            </div>
          )}
        </>
      )}

      {/* Lightbox */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/95 p-4"
          onClick={() => setLightboxPhoto(null)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setLightboxPhoto(null)}
              className="absolute -top-8 right-0 text-white/60 hover:text-white z-10"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>

            {/* Image */}
            <div className="flex-1 min-h-0 bg-black overflow-hidden">
              <img
                src={getFullPhotoUrl(lightboxPhoto)}
                alt={lightboxPhoto.title}
                className="w-full h-full object-contain max-h-[75vh]"
              />
            </div>

            {/* Meta */}
            <div className="bg-black/80 p-3 flex items-start justify-between gap-4 mt-1">
              <div>
                <p className="text-sm font-bold text-white">{lightboxPhoto.title || 'Untitled'}</p>
                <div className="flex items-center gap-2 text-[10px] text-white/40 mt-1 font-mono">
                  <span className="uppercase font-bold text-white/30">
                    {libraryName(lightboxPhoto.library_id)}
                  </span>
                  <span>•</span>
                  <span>{new Date(lightboxPhoto.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              {lightboxPhoto.google_drive_file_id && (
                <a
                  href={`https://drive.google.com/file/d/${lightboxPhoto.google_drive_file_id}/view`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] uppercase font-bold text-white/40 hover:text-white transition-colors whitespace-nowrap"
                  onClick={e => e.stopPropagation()}
                >
                  Open in Drive →
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
