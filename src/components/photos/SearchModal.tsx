import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  MapPinIcon,
  CameraIcon,
  TagIcon,
  CalendarIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';

interface SearchPhoto {
  id: string;
  title: string;
  google_drive_file_id: string | null;
  thumbnail_url: string | null;
  library_id: string;
  library_name: string | null;
  library_slug: string | null;
  created_at: string;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  metadata?: {
    camera_model?: string;
    camera_make?: string;
    iso?: number;
    aperture?: number;
    shutter_speed?: string;
    focal_length?: number;
    date_taken?: string;
  };
  tags?: Array<{ id: string; name: string; type: string }>;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoSelect?: (photo: SearchPhoto) => void;
}

const TYPE_DOT: Record<string, string> = {
  location: 'bg-blue-400',
  venue: 'bg-purple-400',
  collection: 'bg-green-400',
  people: 'bg-yellow-400',
  event: 'bg-orange-400',
  custom: 'bg-white/40',
};

function getThumbUrl(photo: SearchPhoto) {
  if (photo.google_drive_file_id)
    return `/api/gallery/stream?fileId=${photo.google_drive_file_id}&size=400`;
  return photo.thumbnail_url || '';
}

export function SearchModal({ isOpen, onClose, onPhotoSelect }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchPhoto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const [hasSearched, setHasSearched] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 80);
      setQuery('');
      setResults([]);
      setTotal(0);
      setFocusedIdx(-1);
      setHasSearched(false);
    }
  }, [isOpen]);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setTotal(0);
      setHasSearched(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    setHasSearched(true);
    try {
      const params = new URLSearchParams({ q: q.trim(), limit: '40' });
      const res = await fetch(`/api/photos/search?${params}`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setResults(data.photos || []);
      setTotal(data.total || 0);
      setFocusedIdx(-1);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 280);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, doSearch]);

  const gridCols = () => {
    if (!gridRef.current) return 4;
    const w = gridRef.current.offsetWidth;
    if (w < 400) return 2;
    if (w < 640) return 3;
    return 4;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (results.length === 0) return;
    const cols = gridCols();
    if (e.key === 'ArrowRight') { e.preventDefault(); setFocusedIdx(p => Math.min(p + 1, results.length - 1)); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); setFocusedIdx(p => Math.max(p - 1, 0)); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedIdx(p => Math.min(p + cols, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setFocusedIdx(p => { const n = p - cols; return n < 0 ? p : n; }); }
    else if (e.key === 'Enter' && focusedIdx >= 0) { e.preventDefault(); const p = results[focusedIdx]; if (p) handleSelect(p); }
  };

  const handleSelect = (photo: SearchPhoto) => {
    onPhotoSelect?.(photo);
    if (!onPhotoSelect) onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[30000] bg-black flex flex-col"
          onKeyDown={handleKeyDown}
        >
          {/* Search header */}
          <div className="flex-shrink-0 border-b border-white/10">
            <div className="flex items-center gap-4 px-4 sm:px-8 py-4 sm:py-6">
              <MagnifyingGlassIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white/40 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search photos, tags, locations, cameras…"
                className="flex-1 bg-transparent text-white text-lg sm:text-2xl font-light placeholder-white/20 focus:outline-none tracking-wide"
                autoComplete="off"
                spellCheck={false}
              />
              <div className="flex items-center gap-3 flex-shrink-0">
                {query && (
                  <button
                    onClick={() => { setQuery(''); setResults([]); setHasSearched(false); inputRef.current?.focus(); }}
                    className="text-white/30 hover:text-white transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                )}
                <button onClick={onClose} className="text-white/40 hover:text-white transition-colors text-[10px] uppercase font-bold tracking-widest hidden sm:block">ESC</button>
                <button onClick={onClose} className="text-white/40 hover:text-white transition-colors sm:hidden"><XMarkIcon className="w-5 h-5" /></button>
              </div>
            </div>

            {hasSearched && !loading && (
              <div className="px-4 sm:px-8 pb-3">
                <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest">
                  {total === 0 ? 'No results' : `${total} result${total !== 1 ? 's' : ''}`}
                  {query && <span className="text-white/20"> for "{query}"</span>}
                </p>
              </div>
            )}
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-16">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    className="w-4 h-4 border border-white/20 border-t-white rounded-full"
                  />
                  <span className="text-[11px] uppercase font-bold tracking-widest text-white/30">Searching…</span>
                </div>
              </div>
            )}

            {!loading && !hasSearched && (
              <div className="flex flex-col items-center justify-center py-20 gap-6">
                <MagnifyingGlassIcon className="w-10 h-10 text-white/10" />
                <div className="text-center space-y-2">
                  <p className="text-white/30 text-sm font-bold uppercase tracking-widest">Search the entire archive</p>
                  <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-[10px] text-white/20 uppercase tracking-wider font-bold">
                    <span className="flex items-center gap-1"><TagIcon className="w-3 h-3" /> Tags</span>
                    <span className="flex items-center gap-1"><MapPinIcon className="w-3 h-3" /> Locations</span>
                    <span className="flex items-center gap-1"><CameraIcon className="w-3 h-3" /> Camera models</span>
                    <span className="flex items-center gap-1"><CalendarIcon className="w-3 h-3" /> Dates</span>
                  </div>
                </div>
              </div>
            )}

            {!loading && hasSearched && results.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20">
                <p className="text-white/20 text-sm font-bold uppercase tracking-widest">Nothing found</p>
                <p className="text-white/10 text-xs mt-2">Try a different search term</p>
              </div>
            )}

            {!loading && results.length > 0 && (
              <div ref={gridRef} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px p-px">
                {results.map((photo, idx) => (
                  <motion.button
                    key={photo.id}
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.015, duration: 0.15 }}
                    onClick={() => handleSelect(photo)}
                    className={`group relative aspect-square bg-white/5 overflow-hidden text-left focus:outline-none transition-all ${
                      focusedIdx === idx ? 'ring-2 ring-white' : 'hover:ring-1 hover:ring-white/30'
                    }`}
                  >
                    <img
                      src={getThumbUrl(photo)}
                      alt={photo.title}
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                      loading="lazy"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2.5 pointer-events-none">
                      <p className="text-white text-[10px] font-bold uppercase tracking-wide truncate">{photo.title || 'Untitled'}</p>
                      <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1">
                        {photo.library_name && <span className="text-white/50 text-[8px] uppercase font-bold">{photo.library_name}</span>}
                        {photo.location_name && (
                          <span className="flex items-center gap-0.5 text-white/40 text-[8px]">
                            <MapPinIcon className="w-2 h-2" />{photo.location_name}
                          </span>
                        )}
                        {photo.metadata?.camera_model && (
                          <span className="flex items-center gap-0.5 text-white/40 text-[8px]">
                            <CameraIcon className="w-2 h-2" />{photo.metadata.camera_model}
                          </span>
                        )}
                      </div>
                      {photo.tags && photo.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {photo.tags.slice(0, 3).map(tag => (
                            <span key={tag.id} className="flex items-center gap-0.5 text-[7px] uppercase font-bold tracking-wider text-white/60">
                              <span className={`w-1 h-1 rounded-full ${TYPE_DOT[tag.type] || 'bg-white/40'}`} />
                              {tag.name}
                            </span>
                          ))}
                          {photo.tags.length > 3 && <span className="text-[7px] text-white/30">+{photo.tags.length - 3}</span>}
                        </div>
                      )}
                    </div>
                    {focusedIdx === idx && (
                      <div className="absolute top-2 right-2">
                        <ArrowRightIcon className="w-4 h-4 text-white drop-shadow" />
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>
            )}

            {results.length > 0 && (
              <div className="flex justify-center gap-4 py-4">
                {[{ key: '↑↓←→', label: 'navigate' }, { key: '↵', label: 'select' }, { key: 'ESC', label: 'close' }].map(({ key, label }) => (
                  <span key={key} className="flex items-center gap-1.5 text-[9px] text-white/20 uppercase font-bold tracking-wider">
                    <span className="border border-white/15 px-1.5 py-0.5 font-mono">{key}</span>
                    {label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default SearchModal;
