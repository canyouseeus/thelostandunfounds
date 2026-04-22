import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  ArrowPathIcon,
  PhotoIcon,
  TagIcon,
  CheckIcon,
  CursorArrowRaysIcon,
} from '@heroicons/react/24/outline';
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
}

interface Tag {
  id: string;
  name: string;
  type: string;
}

interface DragState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

const PAGE_SIZE = 60;

export default function AdminPhotosBrowse() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedLibraryId, setSelectedLibraryId] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Batch selection
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [showTagPanel, setShowTagPanel] = useState(false);
  const [selectedTagsToApply, setSelectedTagsToApply] = useState<Set<string>>(new Set());
  const [applyingTags, setApplyingTags] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);

  const gridRef = useRef<HTMLDivElement>(null);
  const photoRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Load libraries
  useEffect(() => {
    supabase
      .from('photo_libraries')
      .select('id, name, slug')
      .order('name')
      .then(({ data }) => setLibraries(data || []));
  }, []);

  // Load tags
  useEffect(() => {
    supabase
      .from('tags')
      .select('id, name, type')
      .order('type')
      .order('name')
      .then(({ data }) => setTags(data || []));
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

  // --- Selection helpers ---
  const togglePhoto = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setShowTagPanel(false);
    setSelectedTagsToApply(new Set());
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    clearSelection();
  };

  // --- Rubber-band drag select ---
  const handleGridMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectionMode) return;
    // Only start drag on the grid background, not on a photo cell
    if ((e.target as HTMLElement).closest('[data-photo-id]')) return;
    e.preventDefault();
    setDragState({
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
    });
  };

  const handleGridMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragState) return;
    setDragState(prev => prev ? { ...prev, currentX: e.clientX, currentY: e.clientY } : null);
  };

  const handleGridMouseUp = () => {
    if (!dragState) { setDragState(null); return; }

    const selRect = {
      left: Math.min(dragState.startX, dragState.currentX),
      right: Math.max(dragState.startX, dragState.currentX),
      top: Math.min(dragState.startY, dragState.currentY),
      bottom: Math.max(dragState.startY, dragState.currentY),
    };

    const minDrag = 6;
    if (selRect.right - selRect.left > minDrag || selRect.bottom - selRect.top > minDrag) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        photoRefs.current.forEach((el, photoId) => {
          const r = el.getBoundingClientRect();
          const overlaps = !(
            r.right < selRect.left ||
            r.left > selRect.right ||
            r.bottom < selRect.top ||
            r.top > selRect.bottom
          );
          if (overlaps) next.add(photoId);
        });
        return next;
      });
    }

    setDragState(null);
  };

  // Drag rect visual (in viewport coords — use fixed positioning)
  const dragRectStyle = dragState ? {
    position: 'fixed' as const,
    left: Math.min(dragState.startX, dragState.currentX),
    top: Math.min(dragState.startY, dragState.currentY),
    width: Math.abs(dragState.currentX - dragState.startX),
    height: Math.abs(dragState.currentY - dragState.startY),
    border: '1px solid rgba(255,255,255,0.5)',
    background: 'rgba(255,255,255,0.04)',
    pointerEvents: 'none' as const,
    zIndex: 19999,
  } : null;

  // --- Bulk tag application ---
  const applyTagsToSelection = async () => {
    if (selectedIds.size === 0 || selectedTagsToApply.size === 0) return;
    setApplyingTags(true);

    const rows: { photo_id: string; tag_id: string }[] = [];
    selectedIds.forEach(photoId => {
      selectedTagsToApply.forEach(tagId => {
        rows.push({ photo_id: photoId, tag_id: tagId });
      });
    });

    const { error } = await supabase
      .from('photo_tags')
      .upsert(rows, { onConflict: 'photo_id,tag_id', ignoreDuplicates: true });

    setApplyingTags(false);

    if (!error) {
      setApplySuccess(true);
      setSelectedTagsToApply(new Set());
      setShowTagPanel(false);
      setTimeout(() => setApplySuccess(false), 2000);
    }
  };

  // Group tags by type for the panel
  const tagsByType = tags.reduce((acc, tag) => {
    if (!acc[tag.type]) acc[tag.type] = [];
    acc[tag.type].push(tag);
    return acc;
  }, {} as Record<string, Tag[]>);

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
        <div className="flex items-center gap-2">
          {/* Selection mode toggle */}
          <button
            onClick={() => selectionMode ? exitSelectionMode() : setSelectionMode(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider transition-colors ${
              selectionMode
                ? 'bg-white text-black'
                : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'
            }`}
            title={selectionMode ? 'Exit selection mode' : 'Enter selection mode'}
          >
            <CursorArrowRaysIcon className="w-3.5 h-3.5" />
            {selectionMode ? (selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Selecting…') : 'Select'}
          </button>

          <button
            onClick={() => loadPhotos(true)}
            className="text-white/40 hover:text-white transition-colors"
            title="Refresh"
          >
            <ArrowPathIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Selection hint */}
      {selectionMode && (
        <p className="text-[10px] text-white/30">
          Click photos to select · Drag on the background to rubber-band select · Click <strong className="text-white/50">Select</strong> again to exit
        </p>
      )}

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
          {/* Photo grid — matches actual gallery: grid-cols-3 gap-1 md:gap-2 */}
          <div
            ref={gridRef}
            className={`grid grid-cols-3 gap-1 md:gap-2 ${selectionMode ? 'select-none cursor-crosshair' : ''}`}
            onMouseDown={handleGridMouseDown}
            onMouseMove={handleGridMouseMove}
            onMouseUp={handleGridMouseUp}
            onMouseLeave={() => setDragState(null)}
          >
            {photos.map(photo => {
              const isSelected = selectedIds.has(photo.id);
              return (
                <div
                  key={photo.id}
                  data-photo-id={photo.id}
                  ref={el => {
                    if (el) photoRefs.current.set(photo.id, el);
                    else photoRefs.current.delete(photo.id);
                  }}
                  className={`group relative aspect-square bg-white/5 overflow-hidden transition-all ${
                    selectionMode
                      ? isSelected
                        ? 'ring-2 ring-white cursor-pointer'
                        : 'hover:ring-1 hover:ring-white/30 cursor-pointer'
                      : 'hover:ring-1 hover:ring-white/40 cursor-pointer'
                  }`}
                  title={photo.title}
                  onClick={() => {
                    if (selectionMode) {
                      togglePhoto(photo.id);
                    } else {
                      setLightboxPhoto(photo);
                    }
                  }}
                >
                  <img
                    src={getPhotoUrl(photo)}
                    alt={photo.title}
                    className={`w-full h-full object-cover transition-opacity ${
                      isSelected ? 'opacity-70' : 'opacity-80 group-hover:opacity-100'
                    }`}
                    loading="lazy"
                    onError={e => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                    draggable={false}
                  />

                  {/* Selection checkbox (always visible in selection mode) */}
                  {selectionMode && (
                    <div className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-white border-white scale-110'
                        : 'bg-black/30 border-white/50 group-hover:border-white/80'
                    }`}>
                      {isSelected && <CheckIcon className="w-3 h-3 text-black stroke-[3]" />}
                    </div>
                  )}

                  {/* Selected overlay tint */}
                  {isSelected && (
                    <div className="absolute inset-0 bg-white/10 pointer-events-none" />
                  )}

                  {/* Library badge on hover */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <p className="text-[8px] text-white/70 truncate uppercase font-bold">
                      {libraryName(photo.library_id)}
                    </p>
                  </div>
                </div>
              );
            })}
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

      {/* Rubber-band drag rect */}
      {dragRectStyle && <div style={dragRectStyle} />}

      {/* Floating batch action bar */}
      {selectionMode && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[15000] shadow-2xl">
          {/* Tag panel (above the bar) */}
          {showTagPanel && (
            <div className="mb-2 bg-black border border-white/20 p-4 w-[360px] max-h-[50vh] flex flex-col">
              <p className="text-[10px] uppercase font-bold text-white/40 tracking-wider mb-3 flex-shrink-0">
                Apply Tags to {selectedIds.size} photo{selectedIds.size !== 1 ? 's' : ''}
              </p>

              <div className="overflow-y-auto flex-1 space-y-3 mb-3 pr-1">
                {Object.entries(tagsByType).map(([type, typeTags]) => (
                  <div key={type}>
                    <p className="text-[9px] uppercase font-bold text-white/20 tracking-widest mb-1.5">{type}</p>
                    <div className="flex flex-wrap gap-1">
                      {typeTags.map(tag => (
                        <button
                          key={tag.id}
                          onClick={() => setSelectedTagsToApply(prev => {
                            const next = new Set(prev);
                            if (next.has(tag.id)) next.delete(tag.id);
                            else next.add(tag.id);
                            return next;
                          })}
                          className={`px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider transition-colors ${
                            selectedTagsToApply.has(tag.id)
                              ? 'bg-white text-black'
                              : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          {tag.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {tags.length === 0 && (
                  <p className="text-[10px] text-white/20">No tags defined yet.</p>
                )}
              </div>

              <button
                onClick={applyTagsToSelection}
                disabled={applyingTags || selectedTagsToApply.size === 0}
                className="w-full py-2 bg-white text-black text-[10px] uppercase font-bold tracking-wider hover:bg-white/90 transition-colors disabled:opacity-40 flex-shrink-0"
              >
                {applyingTags
                  ? 'Applying…'
                  : selectedTagsToApply.size === 0
                    ? 'Pick tags above'
                    : `Apply ${selectedTagsToApply.size} tag${selectedTagsToApply.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          )}

          {/* The action bar itself */}
          <div className="flex items-center gap-3 bg-black border border-white/20 px-4 py-3">
            <span className="text-xs font-mono text-white/60">
              {applySuccess ? '✓ Tags applied' : `${selectedIds.size} selected`}
            </span>

            <div className="w-px h-4 bg-white/20" />

            <button
              onClick={() => setShowTagPanel(v => !v)}
              className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                showTagPanel ? 'text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              <TagIcon className="w-3.5 h-3.5" />
              Tag
              {selectedTagsToApply.size > 0 && (
                <span className="ml-0.5 bg-white text-black text-[8px] font-black px-1 py-0.5 rounded-sm">
                  {selectedTagsToApply.size}
                </span>
              )}
            </button>

            <div className="w-px h-4 bg-white/20" />

            <button
              onClick={clearSelection}
              className="text-white/30 hover:text-white transition-colors"
              title="Clear selection"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Lightbox (only when not in selection mode) */}
      {!selectionMode && lightboxPhoto && (
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
