import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Grid, ShoppingBag, CheckCircle, Download, Eye, Check, Lock, Unlock, Layers, Square, ArrowUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import PhotoLightbox from './PhotoLightbox';
import SelectionTray from './SelectionTray';
import Loading from '../Loading';
import AuthModal from '../auth/AuthModal';

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

const PhotoGallery: React.FC<{ librarySlug: string }> = ({ librarySlug }) => {
    const { user } = useAuth();
    const [library, setLibrary] = useState<PhotoLibrary | null>(null);
    const [pricingOptions, setPricingOptions] = useState<PricingOption[]>([]);
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [purchasedPhotos, setPurchasedPhotos] = useState<Photo[]>([]);
    const [selectedPhotos, setSelectedPhotos] = useState<Photo[]>([]);
    const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'storefront' | 'assets'>('storefront');
    const [showBackToTop, setShowBackToTop] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'single'>('grid');
    const [authModalOpen, setAuthModalOpen] = useState(false);
    const photosRef = useRef<HTMLDivElement>(null);

    const storageKey = `gallery_selection_${librarySlug}`;

    useEffect(() => {
        fetchGallery();
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
            // Show button when scrolled down more than 500px
            setShowBackToTop(window.scrollY > 500);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Check for purchased assets if user is logged in
    useEffect(() => {
        if (user?.email && library) {
            fetchPurchasedAssets();
        }
    }, [user, library]);

    async function fetchPurchasedAssets() {
        // Check for logged in user OR guest email
        const userEmail = user?.email || localStorage.getItem('guest_email');
        if (!library || !userEmail) return;

        try {
            const { data, error } = await supabase
                .from('photo_entitlements')
                .select('photo_id, photos (*), photo_orders!inner(email)')
                .eq('photo_orders.email', userEmail); // Use the resolved email

            if (error) throw error;

            // Filter photos that belong to this library
            const filtered = data
                ?.map(ent => Array.isArray(ent.photos) ? ent.photos[0] : ent.photos)
                ?.filter(p => p && p.library_id === library.id) as any as Photo[] || [];

            setPurchasedPhotos(filtered);
        } catch (err) {
            console.error('Error fetching purchased assets:', err);
        }
    }

    async function fetchGallery() {
        try {
            setLoading(true);
            const { data: libData, error: libError } = await supabase
                .from('photo_libraries')
                .select('*')
                .eq('slug', librarySlug)
                .single();

            if (libError) throw libError;
            setLibrary(libData);

            // Fetch pricing options
            const { data: pricingData } = await supabase
                .from('gallery_pricing_options')
                .select('*')
                .eq('library_id', libData.id)
                .eq('is_active', true)
                .order('photo_count', { ascending: true });

            setPricingOptions(pricingData || []);

            const { data: photoData, error: photoError } = await supabase
                .from('photos')
                .select('*')
                .eq('library_id', libData.id)
                .order('created_at', { ascending: false })
                .order('title', { ascending: false });

            if (photoError) throw photoError;
            setPhotos(photoData || []);
        } catch (err) {
            console.error('Error fetching gallery:', err);
        } finally {
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
        try {
            setCheckoutLoading(true);

            // If user is logged in, use their email directly
            const email = user?.email || prompt('Enter your email for delivery:');
            if (!email) {
                setCheckoutLoading(false);
                return;
            }

            // Save email for guest retrieval after redirect
            if (!user?.email) {
                localStorage.setItem('guest_email', email);
            }

            const response = await fetch('/api/gallery/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    photoIds: selectedPhotos.map(p => p.id),
                    email,
                    userId: user?.id,
                    librarySlug
                })
            });

            const data = await response.json();
            if (response.ok && data.approvalUrl) {
                // Clear saved selections before redirecting
                localStorage.removeItem(storageKey);
                window.location.href = data.approvalUrl;
            } else {
                const errorMessage = data.details || data.message || data.error || 'Unknown error';
                alert(`Checkout failed: ${errorMessage}`);
                console.error('Checkout error details:', data);
            }
        } catch (err: any) {
            console.error('Checkout fetch error:', err);
            alert(`Checkout error: ${err.message || 'Check your connection'}`);
        } finally {
            setCheckoutLoading(false);
        }
    };

    if (loading) return <Loading />;

    const displayedPhotos = activeTab === 'storefront' ? photos : purchasedPhotos;
    const singlePrice = pricingOptions.find(o => o.photo_count === 1)?.price || library?.price || 5.00;

    return (
        <div className="min-h-screen bg-black pt-20 pb-40 px-4 md:px-8">
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
                    {/* Left Column: Pricing */}
                    <div className="space-y-2 max-w-sm">
                        {pricingOptions.map((option) => (
                            <div key={option.id} className="flex items-center justify-between group py-2">
                                <span className={`text-[10px] font-black tracking-[0.2em] uppercase transition-colors ${option.photo_count >= 10 ? 'text-green-500' : 'text-white/40'}`}>
                                    {option.name} {option.photo_count > 1 && `(${option.photo_count})`}
                                </span>
                                <span className={`text-sm font-bold tracking-[0.1em] ${option.photo_count >= 10 ? 'text-green-500' : 'text-white'}`}>
                                    ${option.price.toFixed(2)}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Right Column: Instructions */}
                    <div className="space-y-10">
                        <div className="flex gap-8 items-start">
                            <span className="text-[10px] font-black text-white/10 pt-1">01</span>
                            <p className="text-[10px] font-black tracking-[0.25em] uppercase text-white/40 leading-relaxed max-w-[320px]">
                                Select frames by clicking the SELECT button on any photo or video.
                            </p>
                        </div>
                        <div className="flex gap-8 items-start">
                            <span className="text-[10px] font-black text-white/10 pt-1">02</span>
                            <p className="text-[10px] font-black tracking-[0.25em] uppercase text-white/40 leading-relaxed max-w-[320px]">
                                Review your selection in the vault tray at the bottom of the screen.
                            </p>
                        </div>
                        <div className="flex gap-8 items-start">
                            <span className="text-[10px] font-black text-white/10 pt-1">03</span>
                            <p className="text-[10px] font-black tracking-[0.25em] uppercase text-white/40 leading-relaxed max-w-[320px]">
                                Complete secure checkout to receive your high-resolution download links via email.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Sandbox Banner - ONLY SHOW IN DEV */}
                {!import.meta.env.PROD && (
                    <div className="mt-4 bg-white/[0.02] py-5 text-center">
                        <span className="text-[9px] font-black tracking-[0.8em] uppercase text-white/10">
                            [ SANDBOX MODE ENABLED ] - NO REAL CURRENCY WILL BE CHARGED
                        </span>
                    </div>
                )}
            </div>

            <div className="max-w-7xl mx-auto">

                {/* Tab Switcher & Batch Actions */}
                <div className="sticky top-16 z-40 bg-black/95 backdrop-blur-md flex flex-col md:flex-row justify-center items-center gap-4 md:gap-8 mb-2 py-2 -mx-4 px-4 md:-mx-8 md:px-8 transition-all">
                    <div className="flex gap-4 items-center">
                        <button
                            onClick={() => setViewMode('single')}
                            className={`p-2 transition-colors ${viewMode === 'single' ? 'text-white' : 'text-white/40 hover:text-white/60'}`}
                            title="Single Column View"
                        >
                            <Square className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 transition-colors ${viewMode === 'grid' ? 'text-white' : 'text-white/40 hover:text-white/60'}`}
                            title="Grid View"
                        >
                            <Grid className="w-4 h-4" />
                        </button>
                    </div>

                    {user && (
                        <div className="flex gap-8">
                            <button
                                onClick={() => setActiveTab('storefront')}
                                className={`text-[10px] font-black tracking-[0.3em] uppercase transition-colors relative pb-2 ${activeTab === 'storefront' ? 'text-white' : 'text-white/40 hover:text-white/60'}`}
                            >
                                Storefront
                                {activeTab === 'storefront' && (
                                    <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab('assets')}
                                className={`text-[10px] font-black tracking-[0.3em] uppercase transition-colors relative pb-2 ${activeTab === 'assets' ? 'text-white' : 'text-white/40 hover:text-white/60'}`}
                            >
                                Your Assets
                                {activeTab === 'assets' && (
                                    <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
                                )}
                            </button>
                        </div>
                    )}
                </div>

                {/* Photos Grouped by Date */}
                <div ref={photosRef} className="space-y-16 scroll-mt-40">
                    {displayedPhotos.length === 0 ? (
                        <div className="py-40 text-center space-y-6">
                            {library?.is_private && !user ? (
                                <>
                                    <Lock className="w-12 h-12 mx-auto text-white/20" />
                                    <p className="text-zinc-500 uppercase tracking-widest font-bold">
                                        This is a private gallery.
                                    </p>
                                    <p className="text-white/40 text-sm max-w-md mx-auto">
                                        If you are the owner of this gallery, please log in to view and manage your photos.
                                    </p>
                                    <button
                                        onClick={() => setAuthModalOpen(true)}
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
                            // Sort photos by date taken first
                            [...displayedPhotos].sort((a, b) => {
                                const getDate = (p: Photo) => {
                                    // Prioritize metadata.time (Google Drive) or date_taken, fall back to created_at
                                    return new Date(p.metadata?.time || p.metadata?.date_taken || p.created_at).getTime();
                                };
                                return getDate(b) - getDate(a); // Descending (Newest first)
                            })
                                .reduce((acc, photo) => {
                                    const date = new Date(photo.metadata?.date_taken || photo.created_at);
                                    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
                                    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

                                    const dayName = days[date.getDay()];
                                    const monthName = months[date.getMonth()];
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
                                                <Layers className={`w-3 h-3 ${isGroupAllSelected ? 'text-white' : 'text-white/60'}`} />
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
                                                viewMode={viewMode}
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

            {/* Back to Top Button */}
            {
                showBackToTop && (
                    <button
                        onClick={() => photosRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 w-10 h-10 bg-white/10 backdrop-blur-md flex items-center justify-center active:bg-white active:text-black md:hover:bg-white md:hover:text-black transition-all rounded-full"
                        aria-label="Back to top"
                    >
                        <ArrowUp className="w-5 h-5" />
                    </button>
                )
            }

            {/* Tray */}
            <SelectionTray
                selectedPhotos={selectedPhotos}
                onRemove={(id) => setSelectedPhotos(prev => prev.filter(p => p.id !== id))}
                onCheckout={handleCheckout}
                loading={checkoutLoading}
                pricingOptions={pricingOptions}
            />

            {/* Auth Modal */}
            <AuthModal
                isOpen={authModalOpen}
                onClose={() => setAuthModalOpen(false)}
                onLoginSuccess={() => {
                    // Reload to clean URL (stripping error params)
                    window.location.href = window.location.pathname;
                }}
            />
        </div>
    );
};



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
                    <img
                        src={`https://lh3.googleusercontent.com/d/${photo.google_drive_file_id}=s1200`}
                        alt={photo.title}
                        onClick={(e) => { e.stopPropagation(); onLightbox(); }}
                        className={`${isSingle ? 'w-full h-auto object-contain max-h-[85vh]' : 'w-full h-full object-cover'} select-none cursor-pointer`}
                        draggable={false}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        onContextMenu={(e) => e.preventDefault()}
                    />

                    {/* Watermark (Front) */}
                    {!isPurchased && (
                        <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center overflow-hidden">
                            <img src="/logo.png" alt="Watermark" className="w-1/2 opacity-[0.09] brightness-0 invert select-none object-contain" />
                        </div>
                    )}

                    {/* Meta Flip Button */}
                    <button
                        onClick={handleFlip}
                        className={`absolute z-[45] p-1.5 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 ${isSingle ? 'bottom-2 right-2' : 'bottom-0 right-0'}`}
                        title="View Metadata"
                    >
                        <div className="w-7 h-7 md:w-8 md:h-8 bg-black/40 backdrop-blur-md rounded-full text-white flex items-center justify-center hover:bg-black/60 transition-all">
                            <Eye className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        </div>
                    </button>

                    {/* Selection Checkbox (Front) */}
                    {activeTab === 'storefront' && !isPurchased && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
                            className="absolute top-0 right-0 z-[45] p-1.5 md:p-3 transition-all"
                        >
                            <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full border-[1px] md:border-2 flex items-center justify-center transition-all ${isSelected
                                ? 'bg-white border-white scale-110'
                                : 'bg-black/20 backdrop-blur-md border-white/20 hover:border-white/50'
                                }`}>
                                {isSelected && <Check className="w-3.5 h-3.5 md:w-5 md:h-5 text-black stroke-[3]" />}
                            </div>
                        </button>
                    )}

                    {/* Purchased Badge */}
                    {isPurchased && (
                        <div className="absolute top-1.5 left-1.5 z-[45] flex items-center gap-1 bg-green-500 text-black px-1.5 py-0.5 text-[7px] md:text-[8px] font-black uppercase tracking-[0.1em] shadow-lg">
                            <CheckCircle className="w-2.5 h-2.5" />
                            PROPRIETARY
                        </div>
                    )}
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

export default PhotoGallery;
