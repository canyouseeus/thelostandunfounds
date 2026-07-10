import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  ArrowPathIcon,
  PhotoIcon,
  TagIcon,
  CheckIcon,
  CursorArrowRaysIcon,
  TrashIcon,
  MapPinIcon,
  CameraIcon,
  ArrowTopRightOnSquareIcon,
  ChevronRightIcon,
  FunnelIcon,
  ShareIcon,
  FolderArrowDownIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  MinusIcon,
  PlusIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';
import { LoadingSpinner } from '@/components/Loading';
import { useAuth } from '@/contexts/AuthContext';

interface Library {
  id: string;
  name: string;
  slug: string;
}

interface AdminPhotosBrowseProps {
  onRequestCreateGallery?: (photoIds: string[]) => void;
}

interface Photo {
  id: string;
  title: string;
  thumbnail_url: string | null;
  google_drive_file_id: string | null;
  library_id: string;
  created_at: string;
  status: string;
  metadata?: {
    camera_make?: string;
    camera_model?: string;
    iso?: number;
    focal_length?: number;
    aperture?: number;
    shutter_speed?: string;
    date_taken?: string;
    [key: string]: any;
  };
  latitude?: number | null;
  longitude?: number | null;
  location_name?: string | null;
}

interface Tag {
  id: string;
  name: string;
  type: string;
  slug?: string;
}

interface DragState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

const PAGE_SIZE = 60;

const TYPE_COLORS: Record<string, string> = {
  location: 'bg-blue-400/10 text-blue-400 border border-blue-400/20',
  venue: 'bg-purple-400/10 text-purple-400 border border-purple-400/20',
  collection: 'bg-green-400/10 text-green-400 border border-green-400/20',
  people: 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20',
  event: 'bg-orange-400/10 text-orange-400 border border-orange-400/20',
  custom: 'bg-white/5 text-white/60 border border-white/10',
};

export default function AdminPhotosBrowse({ onRequestCreateGallery }: AdminPhotosBrowseProps) {
  const { session } = useAuth();
  const authHeaders = useCallback(
    () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` }),
    [session]
  );
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedLibraryId, setSelectedLibraryId] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Filter state
  const [filterTagIds, setFilterTagIds] = useState<Set<string>>(new Set());
  const [filterCameraModel, setFilterCameraModel] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [cameraModels, setCameraModels] = useState<string[]>([]);

  // Batch selection
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [showTagPanel, setShowTagPanel] = useState(false);
  const [tagPanelMode, setTagPanelMode] = useState<'add' | 'remove'>('add');
  const [selectedTagsToApply, setSelectedTagsToApply] = useState<Set<string>>(new Set());
  const [applyingTags, setApplyingTags] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);

  // Batch location editing
  const [showLocationPanel, setShowLocationPanel] = useState(false);
  const [locationForm, setLocationForm] = useState({ latitude: '', longitude: '', location_name: '' });
  const [applyingLocation, setApplyingLocation] = useState(false);

  // Batch move-to-folder
  const [showMovePanel, setShowMovePanel] = useState(false);
  const [moveTargetLibraryId, setMoveTargetLibraryId] = useState('');
  const [movingPhotos, setMovingPhotos] = useState(false);

  // Batch delete (website + Google Drive)
  const [deletingBatch, setDeletingBatch] = useState(false);
  const [batchActionError, setBatchActionError] = useState<string | null>(null);

  // Save → offer to create a gallery from the photos just edited
  const [hasEdited, setHasEdited] = useState(false);
  const [editedPhotoIds, setEditedPhotoIds] = useState<Set<string>>(new Set());
  const [showCreateGalleryPrompt, setShowCreateGalleryPrompt] = useState(false);

  // Post to Social
  const [showSocialPanel, setShowSocialPanel] = useState(false);
  const [socialCaption, setSocialCaption] = useState('');
  const [posting, setPosting] = useState(false);
  const [postResult, setPostResult] = useState<{ success: boolean; message: string } | null>(null);

  // Detail drawer
  const [drawerPhoto, setDrawerPhoto] = useState<Photo | null>(null);
  const [drawerTags, setDrawerTags] = useState<Tag[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerAddingTagId, setDrawerAddingTagId] = useState<string | null>(null);
  const [drawerTagSearch, setDrawerTagSearch] = useState('');
  const [deletingPhoto, setDeletingPhoto] = useState(false);
  const [editingDrawerLocation, setEditingDrawerLocation] = useState(false);
  const [drawerLocationForm, setDrawerLocationForm] = useState({ latitude: '', longitude: '', location_name: '' });
  const [savingDrawerLocation, setSavingDrawerLocation] = useState(false);

  const gridRef = useRef<HTMLDivElement>(null);
  const photoRefs = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    supabase
      .from('photo_libraries')
      .select('id, name, slug')
      .order('name')
      .then(({ data }) => setLibraries(data || []));
  }, []);

  useEffect(() => {
    supabase
      .from('tags')
      .select('id, name, type, slug')
      .order('type')
      .order('name')
      .then(({ data }) => setAllTags(data || []));
  }, []);

  useEffect(() => {
    supabase
      .from('photos')
      .select('metadata')
      .not('metadata', 'is', null)
      .limit(500)
      .then(({ data }) => {
        const models = new Set<string>();
        (data || []).forEach((p: any) => {
          const m = p.metadata?.camera_model;
          if (m) models.add(m);
        });
        setCameraModels([...models].sort());
      });
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
      let tagFilteredIds: string[] | null = null;
      if (filterTagIds.size > 0) {
        const { data: tagData } = await supabase
          .from('photo_tags')
          .select('photo_id')
          .in('tag_id', [...filterTagIds]);
        if (tagData) {
          tagFilteredIds = [...new Set(tagData.map((r: any) => r.photo_id))];
          if (tagFilteredIds.length === 0) {
            setPhotos([]);
            setTotalCount(0);
            setHasMore(false);
            setLoading(false);
            setLoadingMore(false);
            return;
          }
        }
      }

      let query = supabase
        .from('photos')
        .select(
          'id, title, thumbnail_url, google_drive_file_id, library_id, created_at, status, metadata, latitude, longitude, location_name',
          { count: 'exact' }
        )
        .order('created_at', { ascending: false })
        .range(currentOffset, currentOffset + PAGE_SIZE - 1);

      if (selectedLibraryId) query = query.eq('library_id', selectedLibraryId);
      if (search.trim()) query = query.ilike('title', `%${search.trim()}%`);
      if (tagFilteredIds) query = query.in('id', tagFilteredIds);
      if (filterCameraModel) query = query.eq('metadata->>camera_model', filterCameraModel);
      if (filterDateFrom) query = query.gte('created_at', filterDateFrom);
      if (filterDateTo) query = query.lte('created_at', filterDateTo + 'T23:59:59');

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
  }, [selectedLibraryId, search, offset, filterTagIds, filterCameraModel, filterDateFrom, filterDateTo]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => loadPhotos(true), search ? 300 : 0);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLibraryId, search, filterTagIds, filterCameraModel, filterDateFrom, filterDateTo]);

  const getPhotoUrl = (photo: Photo) => {
    if (photo.google_drive_file_id)
      return `/api/gallery/stream?fileId=${photo.google_drive_file_id}&size=400`;
    return photo.thumbnail_url || '';
  };

  const getFullPhotoUrl = (photo: Photo) => {
    if (photo.google_drive_file_id)
      return `/api/gallery/stream?fileId=${photo.google_drive_file_id}&size=1600`;
    return photo.thumbnail_url || '';
  };

  const libraryName = (libraryId: string) =>
    libraries.find(l => l.id === libraryId)?.name || 'Unknown';

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
    setShowLocationPanel(false);
    setShowMovePanel(false);
    setBatchActionError(null);
    setShowSocialPanel(false);
    setSocialCaption('');
    setPostResult(null);
  };

  const markEdited = (photoIds: string[]) => {
    setHasEdited(true);
    setEditedPhotoIds(prev => {
      const next = new Set(prev);
      photoIds.forEach(id => next.add(id));
      return next;
    });
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    clearSelection();
  };

  const handleGridMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectionMode) return;
    if ((e.target as HTMLElement).closest('[data-photo-id]')) return;
    e.preventDefault();
    setDragState({ startX: e.clientX, startY: e.clientY, currentX: e.clientX, currentY: e.clientY });
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
          const overlaps = !(r.right < selRect.left || r.left > selRect.right || r.bottom < selRect.top || r.top > selRect.bottom);
          if (overlaps) next.add(photoId);
        });
        return next;
      });
    }
    setDragState(null);
  };

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

  const applyTagsToSelection = async () => {
    if (selectedIds.size === 0 || selectedTagsToApply.size === 0) return;
    setApplyingTags(true);
    setBatchActionError(null);
    try {
      const res = await fetch('/api/gallery/batch-tags', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ photoIds: [...selectedIds], tagIds: [...selectedTagsToApply], mode: tagPanelMode }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || 'Failed to update tags');
      markEdited([...selectedIds]);
      setApplySuccess(true);
      setSelectedTagsToApply(new Set());
      setShowTagPanel(false);
      setTimeout(() => setApplySuccess(false), 2000);
    } catch (err: any) {
      setBatchActionError(err.message || 'Failed to update tags');
    } finally {
      setApplyingTags(false);
    }
  };

  const applyLocationToSelection = async () => {
    if (selectedIds.size === 0) return;
    setApplyingLocation(true);
    setBatchActionError(null);
    try {
      const res = await fetch('/api/gallery/batch-location', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          photoIds: [...selectedIds],
          latitude: locationForm.latitude ? parseFloat(locationForm.latitude) : null,
          longitude: locationForm.longitude ? parseFloat(locationForm.longitude) : null,
          location_name: locationForm.location_name || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || 'Failed to update location');
      markEdited([...selectedIds]);
      setPhotos(prev => prev.map(p => selectedIds.has(p.id)
        ? { ...p, latitude: locationForm.latitude ? parseFloat(locationForm.latitude) : null, longitude: locationForm.longitude ? parseFloat(locationForm.longitude) : null, location_name: locationForm.location_name || null }
        : p));
      setApplySuccess(true);
      setShowLocationPanel(false);
      setLocationForm({ latitude: '', longitude: '', location_name: '' });
      setTimeout(() => setApplySuccess(false), 2000);
    } catch (err: any) {
      setBatchActionError(err.message || 'Failed to update location');
    } finally {
      setApplyingLocation(false);
    }
  };

  const moveSelectionToLibrary = async () => {
    if (selectedIds.size === 0 || !moveTargetLibraryId) return;
    setMovingPhotos(true);
    setBatchActionError(null);
    try {
      const res = await fetch('/api/gallery/batch-move', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ photoIds: [...selectedIds], targetLibraryId: moveTargetLibraryId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to move photos');
      markEdited([...selectedIds]);
      if (selectedLibraryId && selectedLibraryId !== moveTargetLibraryId) {
        setPhotos(prev => prev.filter(p => !selectedIds.has(p.id)));
        setTotalCount(prev => Math.max(0, prev - selectedIds.size));
      } else {
        setPhotos(prev => prev.map(p => selectedIds.has(p.id) ? { ...p, library_id: moveTargetLibraryId } : p));
      }
      if (data.driveErrors?.length) {
        setBatchActionError(`Moved in database, but ${data.driveErrors.length} file(s) could not be moved in Google Drive.`);
      }
      setApplySuccess(true);
      setShowMovePanel(false);
      setMoveTargetLibraryId('');
      setTimeout(() => setApplySuccess(false), 2000);
    } catch (err: any) {
      setBatchActionError(err.message || 'Failed to move photos');
    } finally {
      setMovingPhotos(false);
    }
  };

  const deleteSelection = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} photo${selectedIds.size !== 1 ? 's' : ''} from the website AND Google Drive? This cannot be undone.`)) return;
    setDeletingBatch(true);
    setBatchActionError(null);
    try {
      const idsToDelete = [...selectedIds];
      const res = await fetch('/api/gallery/batch-delete', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ photoIds: idsToDelete }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to delete photos');
      setPhotos(prev => prev.filter(p => !idsToDelete.includes(p.id)));
      setTotalCount(prev => Math.max(0, prev - idsToDelete.length));
      if (data.driveErrors?.length) {
        setBatchActionError(`Deleted from the website, but ${data.driveErrors.length} file(s) could not be removed from Google Drive.`);
      }
      clearSelection();
    } catch (err: any) {
      setBatchActionError(err.message || 'Failed to delete photos');
    } finally {
      setDeletingBatch(false);
    }
  };

  const handleSaveAndClose = () => {
    const idsForGallery = [...editedPhotoIds];
    if (hasEdited && idsForGallery.length > 0 && onRequestCreateGallery) {
      setShowCreateGalleryPrompt(true);
      return;
    }
    exitSelectionMode();
    setHasEdited(false);
    setEditedPhotoIds(new Set());
  };

  const confirmCreateGallery = () => {
    const idsForGallery = [...editedPhotoIds];
    setShowCreateGalleryPrompt(false);
    exitSelectionMode();
    setHasEdited(false);
    setEditedPhotoIds(new Set());
    onRequestCreateGallery?.(idsForGallery);
  };

  const dismissCreateGalleryPrompt = () => {
    setShowCreateGalleryPrompt(false);
    exitSelectionMode();
    setHasEdited(false);
    setEditedPhotoIds(new Set());
  };

  const openDrawer = async (photo: Photo) => {
    setDrawerPhoto(photo);
    setDrawerTags([]);
    setDrawerTagSearch('');
    setEditingDrawerLocation(false);
    setDrawerLocationForm({
      latitude: photo.latitude != null ? String(photo.latitude) : '',
      longitude: photo.longitude != null ? String(photo.longitude) : '',
      location_name: photo.location_name || '',
    });
    setDrawerLoading(true);
    const { data } = await supabase
      .from('photo_tags')
      .select('tags(id, name, type, slug)')
      .eq('photo_id', photo.id);
    setDrawerTags(((data || []) as any[]).map(r => r.tags).filter(Boolean));
    setDrawerLoading(false);
  };

  const addTagToDrawerPhoto = async (tagId: string) => {
    if (!drawerPhoto) return;
    setDrawerAddingTagId(tagId);
    await fetch('/api/gallery/batch-tags', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ photoIds: [drawerPhoto.id], tagIds: [tagId], mode: 'add' }),
    });
    const tag = allTags.find(t => t.id === tagId);
    if (tag && !drawerTags.find(t => t.id === tagId)) {
      setDrawerTags(prev => [...prev, tag]);
    }
    markEdited([drawerPhoto.id]);
    setDrawerAddingTagId(null);
    setDrawerTagSearch('');
  };

  const removeTagFromDrawerPhoto = async (tagId: string) => {
    if (!drawerPhoto) return;
    await fetch('/api/gallery/batch-tags', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ photoIds: [drawerPhoto.id], tagIds: [tagId], mode: 'remove' }),
    });
    markEdited([drawerPhoto.id]);
    setDrawerTags(prev => prev.filter(t => t.id !== tagId));
  };

  const saveDrawerLocation = async () => {
    if (!drawerPhoto) return;
    setSavingDrawerLocation(true);
    try {
      const latitude = drawerLocationForm.latitude ? parseFloat(drawerLocationForm.latitude) : null;
      const longitude = drawerLocationForm.longitude ? parseFloat(drawerLocationForm.longitude) : null;
      const location_name = drawerLocationForm.location_name || null;
      const res = await fetch('/api/gallery/batch-location', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ photoIds: [drawerPhoto.id], latitude, longitude, location_name }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || 'Failed to update location');
      markEdited([drawerPhoto.id]);
      setDrawerPhoto(prev => prev ? { ...prev, latitude, longitude, location_name } : prev);
      setPhotos(prev => prev.map(p => p.id === drawerPhoto.id ? { ...p, latitude, longitude, location_name } : p));
      setEditingDrawerLocation(false);
    } finally {
      setSavingDrawerLocation(false);
    }
  };

  const deleteDrawerPhoto = async () => {
    if (!drawerPhoto) return;
    if (!confirm(`Delete "${drawerPhoto.title}" from the website AND Google Drive? This cannot be undone.`)) return;
    setDeletingPhoto(true);
    try {
      const res = await fetch('/api/gallery/batch-delete', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ photoIds: [drawerPhoto.id] }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || 'Failed to delete photo');
      setPhotos(prev => prev.filter(p => p.id !== drawerPhoto.id));
      setTotalCount(prev => Math.max(0, prev - 1));
      setDrawerPhoto(null);
    } catch (err: any) {
      setBatchActionError(err.message || 'Failed to delete photo');
    } finally {
      setDeletingPhoto(false);
    }
  };

  const postToNostr = async () => {
    if (selectedIds.size === 0 || posting) return;
    setPosting(true);
    setPostResult(null);
    try {
      const res = await fetch('/api/admin/post-to-nostr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoIds: [...selectedIds], caption: socialCaption }),
      });
      const data = await res.json();
      if (data.success) {
        setPostResult({ success: true, message: `Published to ${data.publishedTo}/${data.totalRelays} relays` });
      } else {
        setPostResult({ success: false, message: data.error || `Failed (${data.publishedTo}/${data.totalRelays} relays)` });
      }
    } catch (err: any) {
      setPostResult({ success: false, message: err.message || 'Network error' });
    } finally {
      setPosting(false);
    }
  };

  const tagsByType = allTags.reduce((acc, tag) => {
    if (!acc[tag.type]) acc[tag.type] = [];
    acc[tag.type].push(tag);
    return acc;
  }, {} as Record<string, Tag[]>);

  const activeFilters = filterTagIds.size + (filterCameraModel ? 1 : 0) + (filterDateFrom || filterDateTo ? 1 : 0);

  const drawerTagSuggestions = allTags.filter(t =>
    !drawerTags.find(dt => dt.id === t.id) &&
    (drawerTagSearch ? t.name.toLowerCase().includes(drawerTagSearch.toLowerCase()) : true)
  );

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="min-w-0">
        <h3 className="text-sm font-bold text-white uppercase tracking-wide flex items-center gap-2 flex-wrap">
          <PhotoIcon className="w-4 h-4 flex-shrink-0" />
          <span>All Photos</span>
          <span className="text-white/40 font-mono text-xs">({totalCount.toLocaleString()})</span>
        </h3>
        <p className="text-[10px] text-white/30 mt-0.5 hidden sm:block">Browse all synced photos across every library</p>
      </div>

      {/* Sticky console tray — Select/Filter/search/library chips stay reachable while the grid scrolls */}
      <div className="sticky top-0 z-20 bg-black/95 backdrop-blur-sm py-2 space-y-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider transition-colors ${
              showFilters || activeFilters > 0 ? 'bg-white text-black' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'
            }`}
          >
            <FunnelIcon className="w-3.5 h-3.5" />
            Filter
            {activeFilters > 0 && <span className="ml-0.5 bg-black text-white text-[8px] font-black px-1 py-0.5">{activeFilters}</span>}
          </button>
          <button
            onClick={() => selectionMode ? exitSelectionMode() : setSelectionMode(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider transition-colors ${
              selectionMode ? 'bg-white text-black' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'
            }`}
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

        {selectionMode && (
          <p className="text-[10px] text-white/30">
            <span className="sm:hidden">Tap photos to select.</span>
            <span className="hidden sm:inline">Click photos to select · Drag on background to rubber-band · Click <strong className="text-white/50">Select</strong> again to exit</span>
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
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
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white">
                <XMarkIcon className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="flex gap-1 overflow-x-auto flex-nowrap scrollbar-hide sm:flex-wrap">
            <button
              onClick={() => setSelectedLibraryId(null)}
              className={`flex-shrink-0 px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider transition-colors ${selectedLibraryId === null ? 'bg-white text-black' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'}`}
            >All</button>
            {libraries.map(lib => (
              <button
                key={lib.id}
                onClick={() => setSelectedLibraryId(lib.id === selectedLibraryId ? null : lib.id)}
                className={`flex-shrink-0 px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider transition-colors ${selectedLibraryId === lib.id ? 'bg-white text-black' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'}`}
              >{lib.name}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Filter panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white/[0.03] p-4 space-y-4">
              <div>
                <p className="text-[9px] uppercase font-black tracking-widest text-white/30 mb-2">Filter by Tag</p>
                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                  {allTags.map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => setFilterTagIds(prev => {
                        const next = new Set(prev);
                        if (next.has(tag.id)) next.delete(tag.id);
                        else next.add(tag.id);
                        return next;
                      })}
                      className={`px-2 py-1 text-[9px] uppercase font-bold tracking-wider transition-colors ${
                        filterTagIds.has(tag.id) ? 'bg-white text-black' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <p className="text-[9px] uppercase font-black tracking-widest text-white/30 mb-1.5">Camera Model</p>
                  <select
                    value={filterCameraModel}
                    onChange={e => setFilterCameraModel(e.target.value)}
                    className="w-full bg-black text-white text-[10px] px-2 py-1.5 focus:outline-none"
                  >
                    <option value="">All cameras</option>
                    {cameraModels.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <p className="text-[9px] uppercase font-black tracking-widest text-white/30 mb-1.5">From Date</p>
                  <input
                    type="date"
                    value={filterDateFrom}
                    onChange={e => setFilterDateFrom(e.target.value)}
                    className="w-full bg-black text-white text-[10px] px-2 py-1.5 focus:outline-none"
                  />
                </div>
                <div>
                  <p className="text-[9px] uppercase font-black tracking-widest text-white/30 mb-1.5">To Date</p>
                  <input
                    type="date"
                    value={filterDateTo}
                    onChange={e => setFilterDateTo(e.target.value)}
                    className="w-full bg-black text-white text-[10px] px-2 py-1.5 focus:outline-none"
                  />
                </div>
              </div>

              {activeFilters > 0 && (
                <button
                  onClick={() => { setFilterTagIds(new Set()); setFilterCameraModel(''); setFilterDateFrom(''); setFilterDateTo(''); }}
                  className="text-[9px] uppercase font-bold tracking-widest text-white/30 hover:text-white transition-colors"
                >
                  Clear all filters
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : photos.length === 0 ? (
        <div className="text-center py-16 text-white/30">
          <PhotoIcon className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-bold uppercase tracking-wider">
            {search || selectedLibraryId || activeFilters > 0 ? 'No matching photos' : 'No photos synced yet'}
          </p>
        </div>
      ) : (
        <>
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
                      ? isSelected ? 'ring-2 ring-white cursor-pointer' : 'hover:ring-1 hover:ring-white/30 cursor-pointer'
                      : 'hover:ring-1 hover:ring-white/40 cursor-pointer'
                  }`}
                  title={photo.title}
                  onClick={() => selectionMode ? togglePhoto(photo.id) : openDrawer(photo)}
                >
                  <img
                    src={getPhotoUrl(photo)}
                    alt={photo.title}
                    className={`w-full h-full object-cover transition-opacity ${isSelected ? 'opacity-70' : 'opacity-80 group-hover:opacity-100'}`}
                    loading="lazy"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    draggable={false}
                  />

                  {selectionMode && (
                    <div className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSelected ? 'bg-white border-white scale-110' : 'bg-black/30 border-white/50 group-hover:border-white/80'
                    }`}>
                      {isSelected && <CheckIcon className="w-3 h-3 text-black stroke-[3]" />}
                    </div>
                  )}

                  {isSelected && <div className="absolute inset-0 bg-white/10 pointer-events-none" />}

                  {!selectionMode && (
                    <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRightIcon className="w-4 h-4 text-white drop-shadow" />
                    </div>
                  )}

                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <p className="text-[8px] text-white/70 truncate uppercase font-bold">{libraryName(photo.library_id)}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-4">
              <button
                onClick={() => loadPhotos(false)}
                disabled={loadingMore}
                className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white/60 text-xs uppercase font-bold tracking-wider transition-colors flex items-center gap-2"
              >
                {loadingMore ? <><LoadingSpinner size="sm" /> Loading...</> : `Load More (${totalCount - photos.length} remaining)`}
              </button>
            </div>
          )}
        </>
      )}

      {dragRectStyle && <div style={dragRectStyle} />}

      {/* Bulk batch bar */}
      {selectionMode && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[15000] shadow-2xl">
          {batchActionError && (
            <div className="mb-2 flex items-start gap-2 bg-black border border-red-500/30 text-red-400 text-[10px] px-3 py-2 w-[calc(100vw-2rem)] max-w-[360px]">
              <ExclamationCircleIcon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{batchActionError}</span>
            </div>
          )}

          {/* Tag panel */}
          {showTagPanel && (
            <div className="mb-2 bg-black border border-white/20 p-4 w-[calc(100vw-2rem)] max-w-[360px] max-h-[50vh] flex flex-col">
              <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <p className="text-[10px] uppercase font-bold text-white/40 tracking-wider">
                  {tagPanelMode === 'add' ? 'Add Tags to' : 'Remove Tags from'} {selectedIds.size} photo{selectedIds.size !== 1 ? 's' : ''}
                </p>
                <div className="flex bg-white/5">
                  <button
                    onClick={() => setTagPanelMode('add')}
                    className={`px-2 py-1 text-[9px] uppercase font-bold tracking-wider flex items-center gap-1 ${tagPanelMode === 'add' ? 'bg-white text-black' : 'text-white/50 hover:text-white'}`}
                  ><PlusIcon className="w-2.5 h-2.5" />Add</button>
                  <button
                    onClick={() => setTagPanelMode('remove')}
                    className={`px-2 py-1 text-[9px] uppercase font-bold tracking-wider flex items-center gap-1 ${tagPanelMode === 'remove' ? 'bg-white text-black' : 'text-white/50 hover:text-white'}`}
                  ><MinusIcon className="w-2.5 h-2.5" />Remove</button>
                </div>
              </div>
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
                            selectedTagsToApply.has(tag.id) ? 'bg-white text-black' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                          }`}
                        >{tag.name}</button>
                      ))}
                    </div>
                  </div>
                ))}
                {allTags.length === 0 && <p className="text-[10px] text-white/20">No tags defined yet.</p>}
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
                    : `${tagPanelMode === 'add' ? 'Apply' : 'Remove'} ${selectedTagsToApply.size} tag${selectedTagsToApply.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          )}

          {/* Location panel */}
          {showLocationPanel && (
            <div className="mb-2 bg-black border border-white/20 p-4 w-[calc(100vw-2rem)] max-w-[360px] flex flex-col gap-2">
              <p className="text-[10px] uppercase font-bold text-white/40 tracking-wider">
                Set Location for {selectedIds.size} photo{selectedIds.size !== 1 ? 's' : ''}
              </p>
              <input
                type="text"
                value={locationForm.location_name}
                onChange={e => setLocationForm(f => ({ ...f, location_name: e.target.value }))}
                placeholder="Location name (e.g. Austin, TX)"
                className="w-full bg-white/5 border border-white/10 text-white text-[11px] px-3 py-2 placeholder-white/20 focus:outline-none focus:border-white/30"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number" step="any"
                  value={locationForm.latitude}
                  onChange={e => setLocationForm(f => ({ ...f, latitude: e.target.value }))}
                  placeholder="Latitude"
                  className="bg-white/5 border border-white/10 text-white text-[11px] px-3 py-2 placeholder-white/20 focus:outline-none focus:border-white/30 font-mono"
                />
                <input
                  type="number" step="any"
                  value={locationForm.longitude}
                  onChange={e => setLocationForm(f => ({ ...f, longitude: e.target.value }))}
                  placeholder="Longitude"
                  className="bg-white/5 border border-white/10 text-white text-[11px] px-3 py-2 placeholder-white/20 focus:outline-none focus:border-white/30 font-mono"
                />
              </div>
              <button
                onClick={applyLocationToSelection}
                disabled={applyingLocation}
                className="w-full py-2 bg-white text-black text-[10px] uppercase font-bold tracking-wider hover:bg-white/90 transition-colors disabled:opacity-40"
              >
                {applyingLocation ? 'Saving…' : 'Save Location'}
              </button>
            </div>
          )}

          {/* Move to folder panel */}
          {showMovePanel && (
            <div className="mb-2 bg-black border border-white/20 p-4 w-[calc(100vw-2rem)] max-w-[360px] flex flex-col gap-2">
              <p className="text-[10px] uppercase font-bold text-white/40 tracking-wider">
                Move {selectedIds.size} photo{selectedIds.size !== 1 ? 's' : ''} to Gallery
              </p>
              <select
                value={moveTargetLibraryId}
                onChange={e => setMoveTargetLibraryId(e.target.value)}
                className="w-full bg-black border border-white/20 text-white text-[11px] px-3 py-2 focus:outline-none focus:border-white/40"
              >
                <option value="">Choose a gallery…</option>
                {libraries.map(lib => (
                  <option key={lib.id} value={lib.id}>{lib.name}</option>
                ))}
              </select>
              <button
                onClick={moveSelectionToLibrary}
                disabled={movingPhotos || !moveTargetLibraryId}
                className="w-full py-2 bg-white text-black text-[10px] uppercase font-bold tracking-wider hover:bg-white/90 transition-colors disabled:opacity-40"
              >
                {movingPhotos ? 'Moving…' : 'Move Photos'}
              </button>
            </div>
          )}

          {/* Post to Social panel */}
          {showSocialPanel && (
            <div className="mb-2 bg-black border border-white/20 p-4 w-[calc(100vw-2rem)] max-w-[360px] flex flex-col gap-3">
              <p className="text-[10px] uppercase font-bold text-white/40 tracking-wider">
                Post {selectedIds.size} photo{selectedIds.size !== 1 ? 's' : ''} to Social
              </p>

              {/* Platform options */}
              <div className="space-y-1">
                <button className="w-full flex items-center gap-3 px-3 py-2 bg-white/5 border border-white/10 text-left group hover:bg-white/10 transition-colors">
                  <span className="text-[10px] font-bold tracking-widest text-white uppercase">Nostr</span>
                  <span className="ml-auto text-[9px] text-white/30 uppercase tracking-widest">npub1rr9…lap3s</span>
                </button>
                <div className="flex items-center gap-3 px-3 py-2 bg-white/[0.02] border border-white/5 opacity-40 cursor-not-allowed">
                  <span className="text-[10px] font-bold tracking-widest text-white/60 uppercase">Instagram</span>
                  <span className="ml-auto text-[9px] text-white/20 uppercase tracking-widest">Coming Soon</span>
                </div>
                <div className="flex items-center gap-3 px-3 py-2 bg-white/[0.02] border border-white/5 opacity-40 cursor-not-allowed">
                  <span className="text-[10px] font-bold tracking-widest text-white/60 uppercase">X / Twitter</span>
                  <span className="ml-auto text-[9px] text-white/20 uppercase tracking-widest">Coming Soon</span>
                </div>
              </div>

              {/* Caption input */}
              <textarea
                value={socialCaption}
                onChange={e => setSocialCaption(e.target.value)}
                placeholder="Add a caption… (optional)"
                rows={3}
                className="w-full bg-white/5 border border-white/10 text-white text-[11px] px-3 py-2 placeholder-white/20 focus:outline-none focus:border-white/30 resize-none font-mono"
              />

              {/* Post result feedback */}
              {postResult && (
                <p className={`text-[10px] font-bold tracking-wider ${postResult.success ? 'text-green-400' : 'text-red-400'}`}>
                  {postResult.success ? '✓' : '✗'} {postResult.message}
                </p>
              )}

              <button
                onClick={postToNostr}
                disabled={posting}
                className="w-full py-2 bg-white text-black text-[10px] uppercase font-bold tracking-wider hover:bg-white/90 transition-colors disabled:opacity-40"
              >
                {posting ? 'Publishing…' : 'Post to Nostr'}
              </button>
            </div>
          )}

          {/* Action bar */}
          <div className="flex items-center gap-3 bg-black border border-white/20 px-4 py-3 overflow-x-auto max-w-[calc(100vw-2rem)]">
            <span className="text-xs font-mono text-white/60 whitespace-nowrap">
              {applySuccess ? '✓ Saved' : postResult?.success ? '✓ Posted' : `${selectedIds.size} selected`}
            </span>
            <div className="w-px h-4 bg-white/20 flex-shrink-0" />
            <button
              onClick={() => { setShowTagPanel(v => !v); setShowLocationPanel(false); setShowMovePanel(false); setShowSocialPanel(false); setPostResult(null); }}
              className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${showTagPanel ? 'text-white' : 'text-white/60 hover:text-white'}`}
            >
              <TagIcon className="w-3.5 h-3.5" />
              Tag
              {selectedTagsToApply.size > 0 && (
                <span className="ml-0.5 bg-white text-black text-[8px] font-black px-1 py-0.5 rounded-sm">{selectedTagsToApply.size}</span>
              )}
            </button>
            <div className="w-px h-4 bg-white/20 flex-shrink-0" />
            <button
              onClick={() => { setShowLocationPanel(v => !v); setShowTagPanel(false); setShowMovePanel(false); setShowSocialPanel(false); setPostResult(null); }}
              className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${showLocationPanel ? 'text-white' : 'text-white/60 hover:text-white'}`}
            >
              <MapPinIcon className="w-3.5 h-3.5" />
              Location
            </button>
            <div className="w-px h-4 bg-white/20 flex-shrink-0" />
            <button
              onClick={() => { setShowMovePanel(v => !v); setShowTagPanel(false); setShowLocationPanel(false); setShowSocialPanel(false); setPostResult(null); }}
              className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${showMovePanel ? 'text-white' : 'text-white/60 hover:text-white'}`}
            >
              <FolderArrowDownIcon className="w-3.5 h-3.5" />
              Move
            </button>
            <div className="w-px h-4 bg-white/20 flex-shrink-0" />
            <button
              onClick={() => { setShowSocialPanel(v => !v); setShowTagPanel(false); setShowLocationPanel(false); setShowMovePanel(false); setPostResult(null); }}
              className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${showSocialPanel ? 'text-white' : 'text-white/60 hover:text-white'}`}
            >
              <ShareIcon className="w-3.5 h-3.5" />
              Share
            </button>
            <div className="w-px h-4 bg-white/20 flex-shrink-0" />
            <button
              onClick={deleteSelection}
              disabled={deletingBatch}
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white/60 hover:text-red-400 transition-colors disabled:opacity-40 whitespace-nowrap"
            >
              <TrashIcon className="w-3.5 h-3.5" />
              {deletingBatch ? 'Deleting…' : 'Delete'}
            </button>
            <div className="w-px h-4 bg-white/20 flex-shrink-0" />
            <button
              onClick={handleSaveAndClose}
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white hover:text-white/80 transition-colors whitespace-nowrap"
            >
              <CheckCircleIcon className="w-3.5 h-3.5" />
              Save
            </button>
            <div className="w-px h-4 bg-white/20 flex-shrink-0" />
            <button onClick={clearSelection} className="text-white/30 hover:text-white transition-colors flex-shrink-0">
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Save → Create Gallery prompt */}
      <AnimatePresence>
        {showCreateGalleryPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[25000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <div className="bg-black border border-white/20 w-full max-w-sm p-6">
              <p className="text-sm font-bold uppercase tracking-wider text-white mb-2">Changes Saved</p>
              <p className="text-white/50 text-xs mb-6">
                Create a new gallery with {editedPhotoIds.size} edited photo{editedPhotoIds.size !== 1 ? 's' : ''}?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={dismissCreateGalleryPrompt}
                  className="flex-1 py-2.5 text-white/60 hover:text-white hover:bg-white/5 transition-colors text-xs uppercase font-bold tracking-wider"
                >
                  Skip
                </button>
                <button
                  onClick={confirmCreateGallery}
                  className="flex-1 py-2.5 bg-white text-black hover:bg-white/90 transition-colors text-xs uppercase font-bold tracking-wider"
                >
                  Create Gallery
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Drawer */}
      <AnimatePresence>
        {drawerPhoto && !selectionMode && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[20000] bg-black/60"
              onClick={() => setDrawerPhoto(null)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: '0%' }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25, ease: 'easeInOut' }}
              className="fixed right-0 top-0 bottom-0 z-[20001] w-full max-w-md bg-black border-l border-white/10 flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
                <p className="text-xs font-bold uppercase tracking-widest text-white truncate pr-4">{drawerPhoto.title || 'Photo Detail'}</p>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {drawerPhoto.google_drive_file_id && (
                    <a
                      href={`https://drive.google.com/file/d/${drawerPhoto.google_drive_file_id}/view`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-white/30 hover:text-white transition-colors"
                      title="Open in Drive"
                    >
                      <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                    </a>
                  )}
                  <button
                    onClick={deleteDrawerPhoto}
                    disabled={deletingPhoto}
                    className="text-white/20 hover:text-red-400 transition-colors disabled:opacity-40"
                    title="Delete photo"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDrawerPhoto(null)} className="text-white/40 hover:text-white transition-colors">
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="aspect-video bg-white/5 overflow-hidden">
                  <img
                    src={getFullPhotoUrl(drawerPhoto)}
                    alt={drawerPhoto.title}
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="p-4 space-y-5">
                  <div className="space-y-1">
                    <MetaRow label="Library" value={libraryName(drawerPhoto.library_id)} />
                    <MetaRow label="Synced" value={new Date(drawerPhoto.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} />
                    <MetaRow label="Status" value={drawerPhoto.status || 'active'} />
                  </div>

                  {drawerPhoto.metadata && Object.values(drawerPhoto.metadata).some(Boolean) && (
                    <div>
                      <SectionLabel icon={<CameraIcon className="w-3 h-3" />} label="Camera & EXIF" />
                      <div className="space-y-1 mt-2">
                        {drawerPhoto.metadata.camera_make && <MetaRow label="Make" value={drawerPhoto.metadata.camera_make} />}
                        {drawerPhoto.metadata.camera_model && <MetaRow label="Model" value={drawerPhoto.metadata.camera_model} />}
                        {drawerPhoto.metadata.iso && <MetaRow label="ISO" value={`ISO ${drawerPhoto.metadata.iso}`} />}
                        {drawerPhoto.metadata.aperture && <MetaRow label="Aperture" value={`ƒ/${drawerPhoto.metadata.aperture}`} />}
                        {drawerPhoto.metadata.shutter_speed && <MetaRow label="Shutter" value={drawerPhoto.metadata.shutter_speed} />}
                        {drawerPhoto.metadata.focal_length && <MetaRow label="Focal" value={`${drawerPhoto.metadata.focal_length}mm`} />}
                        {drawerPhoto.metadata.date_taken && (
                          <MetaRow label="Taken" value={new Date(drawerPhoto.metadata.date_taken).toLocaleString()} />
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between">
                      <SectionLabel icon={<MapPinIcon className="w-3 h-3" />} label="Location" />
                      {!editingDrawerLocation && (
                        <button
                          onClick={() => setEditingDrawerLocation(true)}
                          className="text-white/30 hover:text-white transition-colors"
                          title="Edit location"
                        >
                          <PencilSquareIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {editingDrawerLocation ? (
                      <div className="mt-2 space-y-2">
                        <input
                          type="text"
                          value={drawerLocationForm.location_name}
                          onChange={e => setDrawerLocationForm(f => ({ ...f, location_name: e.target.value }))}
                          placeholder="Location name (e.g. Austin, TX)"
                          className="w-full bg-white/5 border border-white/10 text-white text-[11px] px-2.5 py-1.5 placeholder-white/20 focus:outline-none focus:border-white/30"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number" step="any"
                            value={drawerLocationForm.latitude}
                            onChange={e => setDrawerLocationForm(f => ({ ...f, latitude: e.target.value }))}
                            placeholder="Latitude"
                            className="bg-white/5 border border-white/10 text-white text-[11px] px-2.5 py-1.5 placeholder-white/20 focus:outline-none focus:border-white/30 font-mono"
                          />
                          <input
                            type="number" step="any"
                            value={drawerLocationForm.longitude}
                            onChange={e => setDrawerLocationForm(f => ({ ...f, longitude: e.target.value }))}
                            placeholder="Longitude"
                            className="bg-white/5 border border-white/10 text-white text-[11px] px-2.5 py-1.5 placeholder-white/20 focus:outline-none focus:border-white/30 font-mono"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={saveDrawerLocation}
                            disabled={savingDrawerLocation}
                            className="flex-1 py-1.5 bg-white text-black text-[10px] uppercase font-bold tracking-wider hover:bg-white/90 transition-colors disabled:opacity-40"
                          >
                            {savingDrawerLocation ? 'Saving…' : 'Save'}
                          </button>
                          <button
                            onClick={() => setEditingDrawerLocation(false)}
                            className="px-3 py-1.5 text-white/40 text-[10px] uppercase font-bold tracking-wider hover:text-white transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : drawerPhoto.location_name || drawerPhoto.latitude ? (
                      <div className="space-y-1 mt-2">
                        {drawerPhoto.location_name && <MetaRow label="Name" value={drawerPhoto.location_name} />}
                        {drawerPhoto.latitude && (
                          <MetaRow label="GPS" value={`${drawerPhoto.latitude?.toFixed(5)}, ${drawerPhoto.longitude?.toFixed(5)}`} />
                        )}
                      </div>
                    ) : (
                      <p className="text-white/20 text-[10px] italic mt-2">No location set</p>
                    )}
                  </div>

                  <div>
                    <SectionLabel icon={<TagIcon className="w-3 h-3" />} label="Tags" />
                    {drawerLoading ? (
                      <div className="mt-2"><LoadingSpinner size="sm" /></div>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {drawerTags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {drawerTags.map(tag => (
                              <div
                                key={tag.id}
                                className={`flex items-center gap-1 px-2 py-1 text-[9px] uppercase font-bold tracking-wider ${TYPE_COLORS[tag.type] || TYPE_COLORS.custom}`}
                              >
                                <span>{tag.name}</span>
                                <button
                                  onClick={() => removeTagFromDrawerPhoto(tag.id)}
                                  className="opacity-50 hover:opacity-100 transition-opacity ml-0.5"
                                >
                                  <XMarkIcon className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="relative">
                          <input
                            type="text"
                            value={drawerTagSearch}
                            onChange={e => setDrawerTagSearch(e.target.value)}
                            placeholder="Add tag…"
                            className="w-full bg-white/5 border border-white/10 text-white text-[10px] px-2.5 py-1.5 placeholder-white/20 focus:outline-none focus:border-white/30"
                          />
                          {drawerTagSearch && drawerTagSuggestions.length > 0 && (
                            <div className="absolute top-full left-0 right-0 z-10 bg-black border border-white/20 max-h-40 overflow-y-auto">
                              {drawerTagSuggestions.slice(0, 20).map(tag => (
                                <button
                                  key={tag.id}
                                  onClick={() => addTagToDrawerPhoto(tag.id)}
                                  disabled={drawerAddingTagId === tag.id}
                                  className="w-full text-left px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider text-white/60 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-2"
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${tag.type === 'location' ? 'bg-blue-400' : tag.type === 'venue' ? 'bg-purple-400' : tag.type === 'people' ? 'bg-yellow-400' : tag.type === 'event' ? 'bg-orange-400' : tag.type === 'collection' ? 'bg-green-400' : 'bg-white/40'}`} />
                                  {tag.name}
                                  <span className="text-white/20 font-normal normal-case ml-auto">{tag.type}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {drawerPhoto.google_drive_file_id && (
                    <a
                      href={`https://drive.google.com/file/d/${drawerPhoto.google_drive_file_id}/view`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider text-white/30 hover:text-white transition-colors"
                    >
                      <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                      Open in Google Drive
                    </a>
                  )}

                  <button
                    onClick={deleteDrawerPhoto}
                    disabled={deletingPhoto}
                    className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider text-white/20 hover:text-red-400 transition-colors disabled:opacity-40"
                  >
                    <TrashIcon className="w-3 h-3" />
                    {deletingPhoto ? 'Deleting…' : 'Delete Photo'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[9px] uppercase font-black tracking-widest text-white/25 flex-shrink-0 w-14">{label}</span>
      <span className="text-[11px] text-white/70 font-mono break-all">{value}</span>
    </div>
  );
}

function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[9px] uppercase font-black tracking-[0.2em] text-white/30">
      {icon}
      {label}
    </div>
  );
}
