import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Squares2X2Icon,
    CheckCircleIcon,
    EyeIcon,
    CheckIcon,
    LockClosedIcon,
    QueueListIcon,
    StopIcon,
    ArrowUpIcon,
    CalendarIcon,
    XMarkIcon,
    MagnifyingGlassIcon,
    MapPinIcon,
} from '@heroicons/react/24/outline';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import PhotoLightbox from './PhotoLightbox';
import SelectionTray from './SelectionTray';
import Loading from '../Loading';
import AuthModal from '../auth/AuthModal';
import TipModal from '../TipModal';
import DownloadEmailModal from '../DownloadEmailModal';
import { SearchModal } from './SearchModal';
import { PhotoMap } from './PhotoMap';
import { cn } from '../ui/utils';
import { NoirDateRangePicker } from '../ui/NoirDateRangePicker';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface Photo {
    id: string;
    title: string;
    thumbnail_url: string;
    google_drive_file_id: string;
    created_at: string;
    price?: number;
    library_id: string;
    metadata?: {
        camera_make?: string;
        camera_model?: string;
        iso?: number;
        focal_length?: number;
        aperture?: number;
        shutter_speed?: number;
        date_taken?: string;
        time?: string;
        copyright?: string;
        [key: string]: any;
    };
}

interface PhotoLibrary {
    id: string;
    name: string;
    slug: string;
    description: string;
    price: number;
    is_private?: boolean;
    owner_id?: string;
}

export interface PricingOption {
    id: string;
    name: string;
    price: number;
    photo_count: number;
}

const PhotoCard: React.FC<{
    photo: Photo;
    index: number;
    isSelected: boolean;
    isPurchased: boolean;
    activeTab: string;
    singlePrice: number;
    viewMode: 'grid' | 'single';
    onToggleSelect: () => void;
    onLightbox: () => void;
}> = ({ photo, index, isSelected, isPurchased, activeTab, singlePrice, viewMode, onToggleSelect, onLightbox }) => {
    const [rotation, setRotation] = useState(0);

    // Dynamic styles based on view mode (Grid vs Single)
    const isSingle = viewMode === 'single';

    const handleFlip = (e: React.MouseEvent) => {
        e.stopPropagation();
        setRotation(prev => prev + 180);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`relative bg-black group perspective-1000 ${isSingle ? 'w-full' : 'aspect-square'}`}
            style={{ perspective: '1000px' }}
            onContextMenu={(e) => e.preventDefault()}
        >
            <div
                className={`w-full relative transition-transform duration-700 ${isSingle ? 'h-auto' : 'h-full'}`}
                style={{
                    transformStyle: 'preserve-3d',
                    WebkitTransformStyle: 'preserve-3d',
                    transform: `rotateY(${rotation}deg)`
                }}
            >
                {/* FRONT SIDE */}
                <div
                    className={`${isSingle ? 'relative w-full h-auto' : 'absolute inset-0 w-full h-full'} backface-hidden flex items-center justify-center bg-black cursor-pointer`}
                    style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', zIndex: rotation % 360 === 0 ? 2 : 1 }}
                    onClick={handleFlip}
                >
                    {/* Wrapper to constrain overlays to image bounds */}
                    <div className={`relative ${isSingle ? 'w-auto h-auto' : 'w-full h-full'}`}>
                        {/* Protection Layer - Intercepts all touch/click events to prevent saving */}
                        {!isPurchased && (
                            <div
                                className="absolute inset-0 z-20 cursor-pointer"
                                onClick={(e) => { e.stopPropagation(); onLightbox(); }}
                                onContextMenu={(e) => e.preventDefault()}
                                style={{
                                    WebkitTouchCallout: 'none',
                                    WebkitUserSelect: 'none',
                                    userSelect: 'none'
                                }}
                            />
                        )}
                        <img
                            src={`/api/gallery/stream?fileId=${photo.google_drive_file_id}&size=1200`}
                            alt={photo.title}
                            onClick={(e) => { e.stopPropagation(); if (isPurchased) onLightbox(); }}
                            className={`${isSingle ? 'max-w-full w-auto h-auto max-h-[85vh] md:max-h-[calc(100vh-280px)] object-contain' : 'w-full h-full object-contain'} select-none transition-all duration-500 ${!isPurchased ? 'pointer-events-none' : 'cursor-pointer'}`}
                            draggable={false}
                            loading="lazy"
                            onContextMenu={(e) => e.preventDefault()}
                            style={{
                                WebkitTouchCallout: 'none',
                                WebkitUserSelect: 'none',
                                userSelect: 'none'
                            }}
                        />

                        {/* Brand overlay (preview protection) */}
                        {!isPurchased && (
                            <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center overflow-hidden">
                                <img src="/logo.png" alt="" className="w-1/2 opacity-[0.09] brightness-0 invert select-none object-contain" />
                            </div>
                        )}

                        {/* Meta Flip Button */}
                        <button
                            onClick={handleFlip}
                            className="absolute bottom-2 right-2 z-[45] outline-none"
                            title="View Metadata"
                        >
                            <div className={`w-7 h-7 md:w-8 md:h-8 bg-black/40 backdrop-blur-md rounded-full text-white flex items-center justify-center hover:bg-black/60 transition-all ${isSingle ? 'opacity-100' : 'opacity-100 md:opacity-0 md:group-hover:opacity-100'}`}>
                                <EyeIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            </div>
                        </button>

                        {/* Selection Checkbox (Front) */}
                        {activeTab === 'storefront' && !isPurchased && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
                                className="absolute top-2 right-2 z-[45] outline-none"
                            >
                                <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full border-[1px] md:border-2 flex items-center justify-center transition-all ${isSelected
                                    ? 'bg-white border-white scale-110'
                                    : 'bg-black/20 backdrop-blur-md border-white/20 hover:border-white/50'
                                    }`}>
                                    {isSelected && <CheckIcon className="w-3.5 h-3.5 md:w-5 md:h-5 text-black stroke-[3]" />}
                                </div>
                            </button>
                        )}

                        {/* Purchased Badge */}
                        {isPurchased && (
                            <div className="absolute top-1.5 left-1.5 z-[45] flex items-center gap-1 bg-white text-black px-1.5 py-0.5 text-[7px] md:text-[8px] font-black uppercase tracking-[0.1em] shadow-lg">
                                <CheckCircleIcon className="w-2.5 h-2.5" />
                                PROPRIETARY
                            </div>
                        )}
                    </div>
                </div>

                {/* BACK SIDE (METADATA) */}
                <div
                    className="absolute inset-0 w-full h-full backface-hidden bg-black flex flex-col justify-between cursor-pointer"
                    style={{
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                        zIndex: rotation % 360 === 180 ? 2 : 1,
                        padding: isSingle ? '1.25rem' : '1.5vw'
                    }}
                    onClick={handleFlip}
                >
                    <div className={isSingle ? 'space-y-4 md:space-y-8' : 'space-y-[0.5vw] md:space-y-4'}>
                        <div className="space-y-[0.2vw] md:space-y-1">
                            <p className={`${isSingle ? 'text-[9px] md:text-base mb-1' : 'text-[1.4vw] md:text-xs mb-[0.1vw]'} text-white/50 uppercase tracking-widest font-bold leading-none`}>Camera</p>
                            <p className={`${isSingle ? 'text-sm md:text-2xl' : 'text-[1.8vw] md:text-sm'} text-white font-mono uppercase leading-tight truncate`}>
                                {photo.metadata?.cameraMake || photo.metadata?.camera_make || ''} {photo.metadata?.cameraModel || photo.metadata?.camera_model || 'Unknown'}
                            </p>
                        </div>
                        <div className={`grid grid-cols-2 ${isSingle ? 'gap-y-4 gap-x-4 md:gap-x-12' : 'gap-y-[0.5vw] gap-x-[1vw] md:gap-x-4'}`}>
                            <div>
                                <p className={`${isSingle ? 'text-[9px] md:text-base mb-1' : 'text-[1.4vw] md:text-xs mb-[0.1vw]'} text-white/50 uppercase tracking-widest font-bold leading-none`}>ISO</p>
                                <p className={`${isSingle ? 'text-sm md:text-2xl' : 'text-[1.8vw] md:text-sm'} text-white font-mono leading-tight`}>{photo.metadata?.isoSpeed || photo.metadata?.iso || '-'}</p>
                            </div>
                            <div>
                                <p className={`${isSingle ? 'text-[9px] md:text-base mb-1' : 'text-[1.4vw] md:text-xs mb-[0.1vw]'} text-white/50 uppercase tracking-widest font-bold leading-none`}>Aperture</p>
                                <p className={`${isSingle ? 'text-sm md:text-2xl' : 'text-[1.8vw] md:text-sm'} text-white font-mono leading-tight`}>f/{photo.metadata?.aperture || '-'}</p>
                            </div>
                            <div>
                                <p className={`${isSingle ? 'text-[9px] md:text-base mb-1' : 'text-[1.4vw] md:text-xs mb-[0.1vw]'} text-white/50 uppercase tracking-widest font-bold leading-none`}>Focal</p>
                                <p className={`${isSingle ? 'text-sm md:text-2xl' : 'text-[1.8vw] md:text-sm'} text-white font-mono leading-tight`}>{(photo.metadata?.focalLength || photo.metadata?.focal_length) ? `${photo.metadata?.focalLength || photo.metadata?.focal_length}mm` : '-'}</p>
                            </div>
                            <div>
                                <p className={`${isSingle ? 'text-[9px] md:text-base mb-1' : 'text-[1.4vw] md:text-xs mb-[0.1vw]'} text-white/50 uppercase tracking-widest font-bold leading-none`}>Shutter</p>
                                <p className={`${isSingle ? 'text-sm md:text-2xl' : 'text-[1.8vw] md:text-sm'} text-white font-mono leading-tight`}>
                                    {(() => {
                                        const shutter = photo.metadata?.exposureTime || photo.metadata?.shutter_speed;
                                        if (!shutter) return '-';
                                        return Number(shutter) < 1
                                            ? `1/${Math.round(1 / Number(shutter))}s`
                                            : `${shutter}s`;
                                    })()}
                                </p>
                            </div>
                        </div>
                        <div className={`grid grid-cols-2 ${isSingle ? 'gap-y-4 gap-x-4 md:gap-x-12' : 'gap-y-[0.5vw] gap-x-[1vw] md:gap-x-4'}`}>
                            <div>
                                <p className={`${isSingle ? 'text-[9px] md:text-base mb-1' : 'text-[1.4vw] md:text-xs mb-[0.1vw]'} text-white/50 uppercase tracking-widest font-bold leading-none`}>Date Taken</p>
                                <p className={`${isSingle ? 'text-sm md:text-2xl' : 'text-[1.8vw] md:text-sm'} text-white font-mono uppercase leading-tight`}>
                                    {(() => {
                                        const dateVal = photo.metadata?.time || photo.metadata?.date_taken;
                                        return dateVal ? new Date(dateVal).toLocaleDateString() : 'Unknown';
                                    })()}
                                </p>
                            </div>
                            <div>
                                <p className={`${isSingle ? 'text-[9px] md:text-base mb-1' : 'text-[1.4vw] md:text-xs mb-[0.1vw]'} text-white/50 uppercase tracking-widest font-bold leading-none`}>Location</p>
                                <p className={`${isSingle ? 'text-sm md:text-2xl' : 'text-[1.8vw] md:text-sm'} text-white font-mono uppercase leading-tight truncate whitespace-nowrap`}>
                                    {photo.metadata?.city || 'Austin, TX'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-1 md:pt-4">
                        <p className={`${isSingle ? 'text-[8px] md:text-sm' : 'text-[1.2vw] md:text-[10px]'} text-white font-medium tracking-widest uppercase mb-[0.1vw] md:mb-2 text-center w-full`}>
                            © {new Date(photo.metadata?.date_taken || photo.created_at).getFullYear()} {photo.metadata?.copyright || 'THE LOST+UNFOUNDS'}
                        </p>
                        <p className={`${isSingle ? 'text-[7px] md:text-xs' : 'text-[1vw] md:text-[8px]'} text-white/50 uppercase tracking-wider text-center font-bold`}>
                            TAP TO FLIP
                        </p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

const PhotoGallery: React.FC<{ librarySlug: string; inline?: boolean }> = ({ librarySlug, inline = false }) => {
    const { user } = useAuth();
    const [library, setLibrary] = useState<PhotoLibrary | null>(null);
    const [pricingOptions, setPricingOptions] = useState<PricingOption[]>([]);
    const [photos, setPhotos] = useState<Photo[]>([]);
    const toolbarRef = useRef<HTMLDivElement>(null);
    const [purchasedPhotos, setPurchasedPhotos] = useState<Photo[]>([]);
    const [selectedPhotos, setSelectedPhotos] = useState<Photo[]>([]);
    const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);
    const [mapActivePhoto, setMapActivePhoto] = useState<Photo | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'storefront' | 'assets'>('storefront');
    const [showBackToTop, setShowBackToTop] = useState(false);
    const isAllPublic = librarySlug === 'all-public';
    const [viewMode, setViewMode] = useState<'grid' | 'single' | 'map'>('grid');
    const [searchModalOpen, setSearchModalOpen] = useState(false);
    const [authModalOpen, setAuthModalOpen] = useState(false);
    const [authMessage, setAuthMessage] = useState<string | undefined>(undefined);
    const [authTitle, setAuthTitle] = useState<string | undefined>(undefined);

    // Tip modal + download progress
    const [tipModalOpen, setTipModalOpen] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [downloadStatus, setDownloadStatus] = useState('');
    const [isDownloading, setIsDownloading] = useState(false);


    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [showCalendar, setShowCalendar] = useState(false);

    // Tag filter state
    const [availableTags, setAvailableTags] = useState<{ id: string; name: string; type: string }[]>([]);
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
    // Map of photo_id → set of tag_ids it belongs to
    const [photoTagsMap, setPhotoTagsMap] = useState<Map<string, Set<string>>>(new Map());
    const photosRef = useRef<HTMLDivElement>(null);

    const storageKey = `gallery_selection_${librarySlug}`;

    useEffect(() => {
        const controller = new AbortController();
        fetchGallery(controller.signal);

        // Load saved selections from localStorage
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setSelectedPhotos(parsed);
            } catch (err) {
                console.error('Error parsing saved selections:', err);
            }
        }

        return () => controller.abort();
    }, [librarySlug]);

    // Persist selections to localStorage
    useEffect(() => {
        if (selectedPhotos.length > 0) {
            localStorage.setItem(storageKey, JSON.stringify(selectedPhotos));
        } else {
            localStorage.removeItem(storageKey);
        }
    }, [selectedPhotos, storageKey]);

    // Track scroll position to show/hide back to top button
    useEffect(() => {
        const handleScroll = () => {
            setShowBackToTop(window.scrollY > 500);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // ⌘K / Ctrl+K opens search modal
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setSearchModalOpen(v => !v);
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, []);

    // Check for purchased assets if user is logged in
    useEffect(() => {
        const controller = new AbortController();
        if (user?.email && library) {
            fetchPurchasedAssets(controller.signal);
        }
        return () => controller.abort();
    }, [user, library]);

    async function fetchPurchasedAssets(signal?: AbortSignal) {
        // Check for logged in user OR guest email
        const userEmail = user?.email || localStorage.getItem('credit_email');
        if (!library || !userEmail) return;

        try {
            const { data, error } = await supabase
                .from('photo_entitlements')
                .select('photo_id, photos (*), photo_orders!inner(email)')
                .eq('photo_orders.email', userEmail);

            if (error) {
                if (error.message === 'Fetch is aborted' || error.code === '20') return;
                throw error;
            }

            // Filter photos that belong to this library (or all photos in all-public mode)
            const photosLoadedIds = new Set(photos.map(p => p.id));
            const filtered = data
                ?.map(ent => Array.isArray(ent.photos) ? ent.photos[0] : ent.photos)
                ?.filter(p => p && (isAllPublic ? photosLoadedIds.has(p.id) : p.library_id === library.id)) as any as Photo[] || [];

            setPurchasedPhotos(filtered);
        } catch (err: any) {
            if (err.name === 'AbortError') return;
            console.error('Error fetching purchased assets:', err);
        }
    }

    async function fetchGallery(signal?: AbortSignal) {
        try {
            setLoading(true);

            let libraryIds: string[];

            if (isAllPublic) {
                // Aggregate mode: load every public library's photos in one view
                const { data: pubLibs, error: pubLibsError } = await supabase
                    .from('photo_libraries')
                    .select('id, name, slug, description, is_private')
                    .eq('is_private', false);

                if (pubLibsError) {
                    if (pubLibsError.message === 'Fetch is aborted' || pubLibsError.code === '20') return;
                    throw pubLibsError;
                }

                libraryIds = (pubLibs || []).map(l => l.id);

                setLibrary({
                    id: 'all-public',
                    name: 'THE GALLERY',
                    slug: 'all-public',
                    description: 'Free public photos — organized by album.',
                    price: 0,
                    is_private: false,
                });
                setPricingOptions([]);
            } else {
                const { data: libData, error: libError } = await supabase
                    .from('photo_libraries')
                    .select('*')
                    .eq('slug', librarySlug)
                    .single();

                if (libError) {
                    if (libError.message === 'Fetch is aborted' || libError.code === '20') return;
                    throw libError;
                }
                setLibrary(libData);
                libraryIds = [libData.id];

                // Fetch pricing options
                const { data: pricingData } = await supabase
                    .from('gallery_pricing_options')
                    .select('*')
                    .eq('library_id', libData.id)
                    .eq('is_active', true)
                    .order('photo_count', { ascending: true });

                setPricingOptions(pricingData || []);
            }

            if (libraryIds.length === 0) {
                setPhotos([]);
                return;
            }

            const { data: photoData, error: photoError } = await supabase
                .from('photos')
                .select('*')
                .in('library_id', libraryIds)
                .order('created_at', { ascending: false })
                .order('title', { ascending: false })
                .limit(5000);

            if (photoError) {
                if (photoError.message === 'Fetch is aborted' || photoError.code === '20') return;
                throw photoError;
            }
            // Deduplicate by google_drive_file_id in case the DB constraint is not yet applied
            const seen = new Set<string>();
            const fetchedPhotos = (photoData || []).filter((p: Photo) => {
                const key = p.google_drive_file_id || p.id;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
            setPhotos(fetchedPhotos);

            // Fetch tags for photos in this gallery (chunk by 200 to stay under URL length limits)
            if (fetchedPhotos.length > 0) {
                const photoIds = fetchedPhotos.map((p: Photo) => p.id);
                const tagMap = new Map<string, Set<string>>();
                const tagIndex = new Map<string, { id: string; name: string; type: string }>();

                const chunkSize = 200;
                for (let i = 0; i < photoIds.length; i += chunkSize) {
                    const chunk = photoIds.slice(i, i + chunkSize);
                    const { data: ptData } = await supabase
                        .from('photo_tags')
                        .select('photo_id, tag_id, tags(id, name, type)')
                        .in('photo_id', chunk);

                    for (const row of (ptData || []) as any[]) {
                        if (!tagMap.has(row.photo_id)) tagMap.set(row.photo_id, new Set());
                        tagMap.get(row.photo_id)!.add(row.tag_id);
                        if (row.tags) tagIndex.set(row.tags.id, row.tags);
                    }
                }

                if (tagIndex.size > 0) {
                    setPhotoTagsMap(tagMap);
                    setAvailableTags(Array.from(tagIndex.values()).sort((a, b) => a.name.localeCompare(b.name)));
                }
            }
        } catch (err: any) {
            if (err.name === 'AbortError') return;
            console.error('Error fetching gallery:', err);
        } finally {
            // Only set loading false if not aborted (or just always set it, if we're unmounting it doesn't matter)
            setLoading(false);
        }
    }

    const handleToggleSelect = (photo: Photo) => {
        setSelectedPhotos(prev => {
            const isSelected = prev.find(p => p.id === photo.id);
            if (isSelected) {
                return prev.filter(p => p.id !== photo.id);
            }
            return [...prev, photo];
        });
    };

    const handleToggleGroup = (groupPhotos: Photo[], isCurrentlyAllSelected: boolean) => {
        if (isCurrentlyAllSelected) {
            // Remove this group from selection
            setSelectedPhotos(prev => prev.filter(p => !groupPhotos.find(gp => gp.id === p.id)));
        } else {
            // Add missing items from this group
            setSelectedPhotos(prev => {
                const newPhotos = [...prev];
                groupPhotos.forEach(p => {
                    if (!newPhotos.find(np => np.id === p.id)) {
                        newPhotos.push(p);
                    }
                });
                return newPhotos;
            });
        }
    };

    const handleCheckout = async () => {
        await startFreeDownload(selectedPhotos);
    };

    const [downloadEmailModalOpen, setDownloadEmailModalOpen] = useState(false);
    const [pendingDownloadPhotos, setPendingDownloadPhotos] = useState<Photo[] | null>(null);

    const requestDownloadEmail = (photos: Photo[]): Promise<string | null> => {
        return new Promise((resolve) => {
            const cached = typeof window !== 'undefined'
                ? (localStorage.getItem('tlau_download_email') || localStorage.getItem('credit_email'))
                : null;
            if (cached && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cached)) {
                resolve(cached);
                return;
            }
            setPendingDownloadPhotos(photos);
            setDownloadEmailModalOpen(true);
            const onSubmit = (email: string) => {
                localStorage.setItem('tlau_download_email', email);
                localStorage.setItem('credit_email', email);
                setDownloadEmailModalOpen(false);
                (window as any).__tlauDownloadEmailResolver = null;
                resolve(email);
            };
            const onClose = () => {
                setDownloadEmailModalOpen(false);
                (window as any).__tlauDownloadEmailResolver = null;
                resolve(null);
            };
            (window as any).__tlauDownloadEmailResolver = { onSubmit, onClose };
        });
    };

    const startFreeDownload = async (photos: Photo[]) => {
        if (!photos.length) return;

        const email = await requestDownloadEmail(photos);
        if (!email) return; // user cancelled

        setIsDownloading(true);
        setDownloadStatus('Preparing download...');
        setDownloadProgress(5);

        try {
            const zip = new JSZip();
            const folder = zip.folder('TLAU_PHOTOS');

            let completed = 0;
            const total = photos.length;

            for (const photo of photos) {
                setDownloadStatus(`Downloading: ${photo.title || 'photo'}...`);

                try {
                    const response = await fetch(
                        `/api/gallery/stream?fileId=${photo.google_drive_file_id}&download=true&email=${encodeURIComponent(email)}`
                    );

                    if (!response.ok) {
                        console.error(`Failed to fetch ${photo.title}`);
                        continue;
                    }

                    const blob = await response.blob();
                    const cleanTitle = (photo.title || 'untitled').replace(/[^a-z0-9]/gi, '_').toLowerCase();
                    folder?.file(`${cleanTitle}_${photo.id.slice(0, 6)}.jpg`, blob);
                } catch (err) {
                    console.error(`Error downloading ${photo.id}`, err);
                }

                completed++;
                setDownloadProgress(Math.round((completed / total) * 85) + 5);
            }

            setDownloadStatus('Compressing archive...');
            setDownloadProgress(95);
            const content = await zip.generateAsync({ type: 'blob' });

            setDownloadStatus('Saving...');
            saveAs(content, `tlau-photos-${Date.now()}.zip`);

            setDownloadProgress(100);
            setDownloadStatus('Done!');
            setTimeout(() => {
                setIsDownloading(false);
                setDownloadProgress(0);
                setDownloadStatus('');
                setSelectedPhotos([]);
                localStorage.removeItem(storageKey);
                setTipModalOpen(true);
            }, 2000);
        } catch (err: any) {
            console.error('Free download error:', err);
            alert('Download failed. Please try again.');
            setIsDownloading(false);
        }
    };

    if (loading) {
        // Inline mode: show a skeleton that doesn't cover the whole screen.
        // Full-page mode: show the standard full-screen overlay.
        if (inline) {
            return (
                <div className="min-h-screen bg-black pt-0 pb-40 px-4 md:px-8 animate-pulse">
                    <div className="max-w-7xl mx-auto pt-12">
                        <div className="h-12 w-64 bg-white/5 mb-4" />
                        <div className="h-4 w-96 bg-white/5 mb-12" />
                        <div className="grid grid-cols-3 gap-1 md:gap-2">
                            {Array.from({ length: 9 }).map((_, i) => (
                                <div key={i} className="aspect-square bg-white/5" />
                            ))}
                        </div>
                    </div>
                </div>
            );
        }
        return <Loading />;
    }

    // Filter photos based on date range and/or tag selection
    const filteredPhotos = (activeTab === 'storefront' ? photos : purchasedPhotos).filter(photo => {
        // Date filter
        if (startDate || endDate) {
            const photoDateStr = photo.metadata?.date_taken || photo.metadata?.time || photo.created_at;
            const photoDate = new Date(photoDateStr).getTime();
            if (startDate && photoDate < new Date(startDate).getTime()) return false;
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                if (photoDate > end.getTime()) return false;
            }
        }

        // Tag filter (union: photo must have at least one of the selected tags)
        if (selectedTagIds.length > 0) {
            const photoTags = photoTagsMap.get(photo.id);
            if (!photoTags) return false;
            if (!selectedTagIds.some(id => photoTags.has(id))) return false;
        }

        return true;
    });

    const displayedPhotos = filteredPhotos;
    const singlePrice = 0;

    return (
        <div
            className={`min-h-screen bg-black ${inline ? 'pt-0' : 'pt-20'} pb-40 px-4 md:px-8`}
            onContextMenu={(e) => e.preventDefault()}
        >
            {/* Header / Info Section */}
            <div className="max-w-7xl mx-auto mb-6">
                {/* Title Section */}
                <div className="mb-12">
                    <h1 className="text-2xl sm:text-3xl md:text-6xl font-black text-white tracking-tight uppercase mb-2 whitespace-nowrap overflow-hidden text-ellipsis">
                        {library?.name}
                    </h1>
                    <p className="text-zinc-500 text-sm md:text-base font-medium tracking-tight mb-8">
                        {library?.description}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-32">
                    {/* Left Column: Free downloads callout */}
                    <div className="space-y-3 max-w-sm">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5">
                            <span className="text-[9px] font-black tracking-[0.3em] uppercase text-white/70">
                                Free Downloads
                            </span>
                        </div>
                        <p className="text-white/30 text-[10px] font-bold tracking-widest uppercase leading-relaxed">
                            Select any photos and download for free. Tips are always appreciated.
                        </p>
                    </div>

                    {/* Right Column: Instructions */}
                    <div className="space-y-4 max-w-sm flex flex-col justify-start pt-2">
                        <div className="flex items-start gap-4 text-left">
                            <span className="text-[10px] font-black text-white/20 w-4 pt-0.5">01</span>
                            <p className="text-[9px] font-black tracking-[0.2em] uppercase text-white/40 leading-relaxed">
                                Select photos using the checkboxes.
                            </p>
                        </div>
                        <div className="flex items-start gap-4 text-left">
                            <span className="text-[10px] font-black text-white/20 w-4 pt-0.5">02</span>
                            <p className="text-[9px] font-black tracking-[0.2em] uppercase text-white/40 leading-relaxed">
                                Click "Download" in the tray below.
                            </p>
                        </div>
                        <div className="flex items-start gap-4 text-left">
                            <span className="text-[10px] font-black text-white/20 w-4 pt-0.5">03</span>
                            <p className="text-[9px] font-black tracking-[0.2em] uppercase text-white/40 leading-relaxed">
                                Tips are always appreciated.
                            </p>
                        </div>
                        <div className="pt-3 mt-2 border-t border-white/5">
                            <p className="text-[8px] font-black tracking-[0.25em] uppercase text-white/30 leading-relaxed">
                                Personal use only
                            </p>
                            <p className="text-[9px] text-white/30 leading-relaxed mt-1">
                                Free downloads are licensed for personal use — social media, wallpapers, personal printing.{' '}
                                <a href="/licensing" className="text-white/50 hover:text-white underline underline-offset-2 transition-colors">
                                    Commercial licensing →
                                </a>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sticky Toolbar - Full Width, Plain Black Bar */}
            <div
                ref={toolbarRef}
                className="sticky z-[100] bg-black w-full py-3 mb-6"
                style={{ top: 'var(--nav-height, 64px)' }}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center gap-4">
                    {/* Row 1: Tabs */}
                    {user && (
                        <div className="flex gap-8 text-center justify-center w-full relative z-[101]">
                            <button
                                onClick={() => setActiveTab('storefront')}
                                className={`text-[10px] sm:text-xs font-black tracking-[0.2em] uppercase transition-colors relative pb-2 ${activeTab === 'storefront' ? 'text-white' : 'text-white/40 hover:text-white/60'}`}
                            >
                                Storefront
                                {activeTab === 'storefront' && (
                                    <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab('assets')}
                                className={`text-[10px] sm:text-xs font-black tracking-[0.2em] uppercase transition-colors relative pb-2 ${activeTab === 'assets' ? 'text-white' : 'text-white/40 hover:text-white/60'}`}
                            >
                                Your Assets
                                {activeTab === 'assets' && (
                                    <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
                                )}
                            </button>
                        </div>
                    )}

                    {/* Row 2: Icons (Centered underneath) */}
                    <div className="flex items-center justify-center gap-12 sm:gap-16 w-full relative z-[101]">
                        <button
                            onClick={() => setViewMode(viewMode === 'grid' ? 'single' : 'grid')}
                            className="p-2 transition-colors text-white/60 hover:text-white"
                            title={viewMode === 'grid' ? 'Switch to Single Column View' : 'Switch to Grid View'}
                        >
                            <span
                                className="block transition-transform duration-300 ease-in-out"
                                style={{ transform: viewMode === 'single' ? 'rotate(90deg)' : 'rotate(0deg)' }}
                            >
                                {viewMode === 'single' ? (
                                    <StopIcon className="w-5 h-5" />
                                ) : (
                                    <Squares2X2Icon className="w-5 h-5" />
                                )}
                            </span>
                        </button>
                        <button
                            onClick={() => setViewMode(viewMode === 'map' ? 'grid' : 'map')}
                            className={cn("p-2 transition-colors", viewMode === 'map' ? "text-white" : "text-white/40 hover:text-white/60")}
                            title="Map View"
                        >
                            <MapPinIcon className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => {
                                if (startDate || endDate) {
                                    setStartDate('');
                                    setEndDate('');
                                    setShowCalendar(false);
                                } else {
                                    setShowCalendar(true);
                                }
                            }}
                            className={cn(
                                "p-2 transition-colors",
                                startDate || endDate ? "text-white" : "text-white/40 hover:text-white/60"
                            )}
                            title={startDate && endDate ? "Clear Dates" : "Filter by Date"}
                        >
                            <CalendarIcon className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setSearchModalOpen(true)}
                            className="p-2 transition-colors text-white/40 hover:text-white/60"
                            title="Search (⌘K)"
                        >
                            <MagnifyingGlassIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Tag Filter Chips */}
            {availableTags.length > 0 && (
                <div className="max-w-7xl mx-auto mb-6 px-4 md:px-8">
                    <div className="flex items-center gap-2 flex-wrap">
                        {selectedTagIds.length > 0 && (
                            <button
                                onClick={() => setSelectedTagIds([])}
                                className="flex items-center gap-1 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white border border-white/10 hover:border-white/30 transition-colors"
                            >
                                <XMarkIcon className="w-2.5 h-2.5" />
                                Clear
                            </button>
                        )}
                        {availableTags.map(tag => {
                            const active = selectedTagIds.includes(tag.id);
                            return (
                                <button
                                    key={tag.id}
                                    onClick={() => setSelectedTagIds(prev =>
                                        active ? prev.filter(id => id !== tag.id) : [...prev, tag.id]
                                    )}
                                    className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest border transition-colors ${
                                        active
                                            ? 'bg-white text-black border-white'
                                            : 'text-white/40 border-white/20 hover:text-white hover:border-white/40'
                                    }`}
                                >
                                    {tag.name}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Map View */}
            {viewMode === 'map' && (
                <div className="w-full" style={{ height: 'calc(100vh - 200px)' }}>
                    <PhotoMap
                        className="w-full h-full"
                        onPhotoClick={(mapPhoto) => {
                            const idx = photos.findIndex(p => p.id === mapPhoto.id);
                            if (idx !== -1) {
                                setActivePhotoIndex(idx);
                            } else {
                                setMapActivePhoto({
                                    id: mapPhoto.id,
                                    title: mapPhoto.title,
                                    google_drive_file_id: mapPhoto.google_drive_file_id || '',
                                    thumbnail_url: mapPhoto.thumbnail_url || '',
                                    created_at: '',
                                    library_id: mapPhoto.library_id,
                                    metadata: mapPhoto.metadata,
                                });
                            }
                        }}
                    />
                </div>
            )}

            <div className={`max-w-7xl mx-auto ${viewMode === 'map' ? 'hidden' : ''}`}>

                {/* Photos Grouped by Date */}
                <div ref={photosRef} className="space-y-16">
                    {displayedPhotos.length === 0 ? (
                        <div className="py-40 text-center space-y-6">
                            {library?.is_private && !user ? (
                                <>
                                    <LockClosedIcon className="w-12 h-12 mx-auto text-white/20" />
                                    <p className="text-zinc-500 uppercase tracking-widest font-bold">
                                        This is a private gallery.
                                    </p>
                                    <p className="text-white/40 text-sm max-w-md mx-auto">
                                        If you are the owner of this gallery, please log in to view and manage your photos.
                                    </p>
                                    <button
                                        onClick={() => {
                                            setAuthTitle(undefined);
                                            setAuthMessage(undefined);
                                            setAuthModalOpen(true);
                                        }}
                                        className="inline-block mt-4 px-8 py-3 bg-transparent border border-white text-white font-bold uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-colors"
                                    >
                                        Log In
                                    </button>
                                </>
                            ) : activeTab === 'assets' ? (
                                <>
                                    <p className="text-zinc-500 uppercase tracking-widest font-bold">No purchased assets yet.</p>
                                    <p className="text-white/40 text-sm">Select photos from the Storefront and complete checkout to see them here.</p>
                                </>
                            ) : (
                                <p className="text-zinc-500 uppercase tracking-widest font-bold">No items found in this vault section.</p>
                            )}
                        </div>
                    ) : (
                        Object.entries(
                            displayedPhotos
                                .sort((a, b) => {
                                    // Treat the database timestamp as Local Time (ignore Z/Timezone shift)
                                    // If DB says "05:06:00Z", we want "05:06:00 Local"
                                    const getTimeAsLocal = (dateStr: string) => {
                                        const d = new Date(dateStr);
                                        if (!isNaN(d.getTime())) {
                                            // Construct a new date using the UTC components as Local components
                                            return new Date(
                                                d.getUTCFullYear(),
                                                d.getUTCMonth(),
                                                d.getUTCDate(),
                                                d.getUTCHours(),
                                                d.getUTCMinutes(),
                                                d.getUTCSeconds()
                                            ).getTime();
                                        }
                                        return d.getTime();
                                    };

                                    // Priority: Date Taken (EXIF) > Time > Created At
                                    const dateStrA = a.metadata?.date_taken || a.metadata?.time || a.created_at;
                                    const dateStrB = b.metadata?.date_taken || b.metadata?.time || b.created_at;

                                    return getTimeAsLocal(dateStrB) - getTimeAsLocal(dateStrA);
                                })
                                .reduce((acc, photo) => {
                                    const dateStr = photo.metadata?.date_taken || photo.metadata?.time || photo.created_at;

                                    // Local Time Conversion for Display
                                    let date = new Date(dateStr);
                                    if (!isNaN(date.getTime())) {
                                        date = new Date(
                                            date.getUTCFullYear(),
                                            date.getUTCMonth(),
                                            date.getUTCDate(),
                                            date.getUTCHours(),
                                            date.getUTCMinutes(),
                                            date.getUTCSeconds()
                                        );
                                    }

                                    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
                                    const monthName = date.toLocaleDateString('en-US', { month: 'long' });
                                    const dayNum = date.getDate();
                                    const year = date.getFullYear();

                                    let suffix = 'TH';
                                    if (dayNum % 10 === 1 && dayNum !== 11) suffix = 'ST';
                                    if (dayNum % 10 === 2 && dayNum !== 12) suffix = 'ND';
                                    if (dayNum % 10 === 3 && dayNum !== 13) suffix = 'RD';

                                    const dateString = `${dayName} ${monthName} ${dayNum}${suffix}, ${year}`;

                                    if (!acc[dateString]) acc[dateString] = [];
                                    acc[dateString].push(photo);
                                    return acc;
                                }, {} as Record<string, Photo[]>)
                        ).map(([dateHeader, groupPhotos]) => {
                            const isGroupAllSelected = groupPhotos.every(gp => selectedPhotos.find(p => p.id === gp.id));

                            return (
                                <div key={dateHeader}>
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex flex-col items-start">
                                            <h2 className="text-lg md:text-2xl font-black text-white uppercase tracking-tight whitespace-nowrap">
                                                {dateHeader}
                                            </h2>
                                            {/* Camera Model Display (Group Level - optional fallback) */}
                                            {(() => {
                                                const modelPhoto = groupPhotos.find(p => p.metadata?.cameraModel);
                                                if (modelPhoto?.metadata?.cameraModel) {
                                                    return (
                                                        <span className="text-[10px] md:text-xs font-bold text-white/50 tracking-widest uppercase mt-1">
                                                            {modelPhoto.metadata.cameraMake ? `${modelPhoto.metadata.cameraMake} ` : ''}{modelPhoto.metadata.cameraModel}
                                                        </span>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </div>
                                        {activeTab === 'storefront' && (
                                            <button
                                                onClick={() => handleToggleGroup(groupPhotos, isGroupAllSelected)}
                                                className="flex items-center gap-2 px-2 md:px-3 py-1 bg-white/5 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors"
                                                title={isGroupAllSelected ? 'Unselect Group' : 'Select Group'}
                                            >
                                                <QueueListIcon className={`w-3 h-3 ${isGroupAllSelected ? 'text-white' : 'text-white/60'}`} />
                                                <span className="hidden md:inline">{isGroupAllSelected ? 'Unselect Group' : 'Select Group'}</span>
                                            </button>
                                        )}
                                    </div>
                                    <div className={`grid ${viewMode === 'single' ? 'grid-cols-1 gap-4 md:gap-16' : 'grid-cols-3 gap-1 md:gap-2'}`}>
                                        {groupPhotos.map((photo, index) => (
                                            <PhotoCard
                                                key={photo.id}
                                                photo={photo}
                                                index={index}
                                                isSelected={!!selectedPhotos.find(p => p.id === photo.id)}
                                                isPurchased={!!purchasedPhotos.find(p => p.id === photo.id)}
                                                activeTab={activeTab}
                                                singlePrice={singlePrice}
                                                viewMode={viewMode === 'map' ? 'grid' : viewMode}
                                                onToggleSelect={() => handleToggleSelect(photo)}
                                                onLightbox={() => setActivePhotoIndex(photos.findIndex(p => p.id === photo.id))}
                                            />
                                        ))}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div >

            {/* Lightbox */}
            <PhotoLightbox
                photo={activePhotoIndex !== null ? photos[activePhotoIndex] : null}
                onClose={() => setActivePhotoIndex(null)}
                onNext={() => setActivePhotoIndex(prev => prev !== null && (prev < photos.length - 1) ? prev + 1 : 0)}
                onPrev={() => setActivePhotoIndex(prev => prev !== null && (prev > 0) ? prev - 1 : (photos.length - 1))}
                isSelected={activePhotoIndex !== null && !!photos[activePhotoIndex] && !!selectedPhotos.find(p => p.id === photos[activePhotoIndex!].id)}
                isPurchased={activePhotoIndex !== null && !!photos[activePhotoIndex] && !!purchasedPhotos.find(p => p.id === photos[activePhotoIndex!].id)}
                onToggleSelect={() => activePhotoIndex !== null && !!photos[activePhotoIndex] && handleToggleSelect(photos[activePhotoIndex!])}
                singlePhotoPrice={singlePrice}
                galleryName={library?.name}
            />

            {/* Map lightbox — for photos clicked on the map that aren't in the current gallery view */}
            <PhotoLightbox
                photo={mapActivePhoto}
                onClose={() => setMapActivePhoto(null)}
                onNext={() => {}}
                onPrev={() => {}}
                isSelected={false}
                isPurchased={false}
                onToggleSelect={() => {}}
                singlePhotoPrice={singlePrice}
                galleryName={library?.name}
            />

            {/* Back to Top Button */}
            {
                showBackToTop && (
                    <button
                        onClick={() => {
                            if (!photosRef.current) return;
                            // Account for fixed nav + sticky toolbar so the first date group
                            // isn't hidden behind them after scrolling
                            const navH = parseInt(
                                getComputedStyle(document.documentElement)
                                    .getPropertyValue('--nav-height') || '64'
                            );
                            const toolbarH = toolbarRef.current?.offsetHeight ?? 72;
                            const offset = navH + toolbarH + 8; // 8px breathing room
                            const top =
                                photosRef.current.getBoundingClientRect().top +
                                window.scrollY -
                                offset;
                            window.scrollTo({ top, behavior: 'smooth' });
                        }}
                        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 w-10 h-10 bg-white/10 backdrop-blur-md flex items-center justify-center active:bg-white active:text-black md:hover:bg-white md:hover:text-black transition-all rounded-full"
                        aria-label="Back to top"
                    >
                        <ArrowUpIcon className="w-5 h-5" />
                    </button>
                )
            }

            {/* Download Progress Overlay */}
            <AnimatePresence>
                {isDownloading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/90 backdrop-blur-sm"
                    >
                        <div className="w-full max-w-sm px-8 space-y-4 text-center">
                            <p className="text-xs font-black uppercase tracking-[0.3em] text-white/60">
                                Downloading
                            </p>
                            <div className="h-1 bg-white/10 w-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-white"
                                    animate={{ width: `${downloadProgress}%` }}
                                    transition={{ duration: 0.3 }}
                                />
                            </div>
                            <p className="text-[10px] text-white/40 uppercase tracking-widest animate-pulse">
                                {downloadStatus}
                            </p>
                            <p className="text-[8px] text-white/20 uppercase tracking-[0.25em] pt-2">
                                Personal use only ·{' '}
                                <a href="/licensing" className="text-white/40 hover:text-white/70 transition-colors">
                                    Commercial →
                                </a>
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Tray */}
            <SelectionTray
                selectedPhotos={selectedPhotos}
                onRemove={(id) => setSelectedPhotos(prev => prev.filter(p => p.id !== id))}
                onCheckout={handleCheckout}
                loading={isDownloading}
            />

            <AuthModal
                isOpen={authModalOpen}
                onClose={() => {
                    setAuthModalOpen(false);
                }}
                message={authMessage}
                title={authTitle}
                onLoginSuccess={() => {
                    setAuthModalOpen(false);
                }}
            />

            {/* Calendar Modal - Render at root level to prevent clipping */}
            <AnimatePresence>
                {showCalendar && (
                    <NoirDateRangePicker
                        startDate={startDate}
                        endDate={endDate}
                        onChange={(start: string, end: string) => {
                            setStartDate(start);
                            setEndDate(end);
                        }}
                        onClose={() => setShowCalendar(false)}
                    />
                )}
            </AnimatePresence>

            {/* Download Email Modal */}
            <DownloadEmailModal
                isOpen={downloadEmailModalOpen}
                onClose={() => {
                    const r = (window as any).__tlauDownloadEmailResolver;
                    if (r) r.onClose();
                    else setDownloadEmailModalOpen(false);
                }}
                onSubmit={(email) => {
                    const r = (window as any).__tlauDownloadEmailResolver;
                    if (r) r.onSubmit(email);
                    else setDownloadEmailModalOpen(false);
                }}
                photoCount={pendingDownloadPhotos?.length ?? 1}
            />

            {/* Tip Modal */}
            <TipModal
                isOpen={tipModalOpen}
                onClose={() => setTipModalOpen(false)}
            />

            {/* Search Modal */}
            <SearchModal
                isOpen={searchModalOpen}
                onClose={() => setSearchModalOpen(false)}
            />
        </div>
    );
};

export default PhotoGallery;
