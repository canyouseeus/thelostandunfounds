import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Grid, ShoppingBag, CheckCircle, Download, Eye, Lock, Unlock, Trash2, CheckSquare, Square } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import PhotoLightbox from './PhotoLightbox';
import SelectionTray from './SelectionTray';
import Loading from '../Loading';

interface Photo {
    id: string;
    title: string;
    thumbnail_url: string;
    google_drive_file_id: string;
    created_at: string;
    price?: number;
    library_id: string;
}

interface PhotoLibrary {
    id: string;
    name: string;
    slug: string;
    description: string;
    price: number;
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
                    items: selectedPhotos.map(p => ({ photoId: p.id })),
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
            <div className="max-w-7xl mx-auto mb-20">
                {/* Title Section */}
                <div className="mb-12">
                    <h1 className="text-3xl md:text-6xl font-black text-white tracking-tight uppercase mb-2">
                        {library?.name}
                    </h1>
                    <p className="text-zinc-500 text-sm md:text-base font-medium tracking-tight mb-8">
                        {library?.description}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-32">
                    {/* Left Column: Pricing */}
                    <div className="space-y-8 max-w-sm">
                        {pricingOptions.map((option) => (
                            <div key={option.id} className="flex items-center justify-between group py-2 border-b border-white/5 last:border-0">
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
                    <div className="mt-24 bg-white/[0.02] border-y border-white/[0.05] py-5 text-center">
                        <span className="text-[9px] font-black tracking-[0.8em] uppercase text-white/10">
                            [ SANDBOX MODE ENABLED ] - NO REAL CURRENCY WILL BE CHARGED
                        </span>
                    </div>
                )}
            </div>

            <div className="max-w-7xl mx-auto">
                {/* Tab Switcher & Batch Actions */}
                <div className="flex flex-col md:flex-row justify-end items-start md:items-end gap-8 mb-12 border-b border-white/10 pb-8">
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
                <div className="space-y-16">
                    {displayedPhotos.length === 0 ? (
                        <div className="py-40 text-center border border-dashed border-white/10 rounded-2xl">
                            <p className="text-zinc-500 uppercase tracking-widest font-bold">No items found in this vault section.</p>
                        </div>
                    ) : (
                        Object.entries(
                            displayedPhotos.reduce((acc, photo) => {
                                const date = new Date(photo.created_at);
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
                                    <div className="flex items-center justify-between mb-6 sticky top-0 z-[5] bg-black/80 backdrop-blur-md py-4 border-b border-white/10">
                                        <h2 className="text-lg md:text-2xl font-black text-white uppercase tracking-tight whitespace-nowrap">
                                            {dateHeader}
                                        </h2>
                                        {activeTab === 'storefront' && (
                                            <button
                                                onClick={() => handleToggleGroup(groupPhotos, isGroupAllSelected)}
                                                className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors"
                                            >
                                                {isGroupAllSelected ? (
                                                    <>
                                                        <Trash2 className="w-3 h-3 text-red-500" />
                                                        Unselect Group
                                                    </>
                                                ) : (
                                                    <>
                                                        <CheckSquare className="w-3 h-3 text-green-500" />
                                                        Select Group
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-3 md:grid-cols-3 gap-2 md:gap-4">
                                        {groupPhotos.map((photo) => {
                                            const index = photos.findIndex(p => p.id === photo.id);
                                            const isSelected = !!selectedPhotos.find(p => p.id === photo.id);
                                            const isPurchased = !!purchasedPhotos.find(p => p.id === photo.id);

                                            return (
                                                <motion.div
                                                    key={photo.id}
                                                    initial={{ opacity: 0, y: 20 }}
                                                    whileInView={{ opacity: 1, y: 0 }}
                                                    viewport={{ once: true }}
                                                    className="relative aspect-square bg-zinc-900 rounded-xl overflow-hidden group border border-white/5"
                                                >
                                                    {/* Image */}
                                                    <img
                                                        src={`https://lh3.googleusercontent.com/d/${photo.google_drive_file_id}=s800`}
                                                        alt={photo.title}
                                                        onClick={() => setActivePhotoIndex(index)}
                                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 select-none cursor-pointer"
                                                        draggable={false}
                                                        loading="lazy"
                                                        referrerPolicy="no-referrer"
                                                        crossOrigin="anonymous"
                                                        onContextMenu={(e) => e.preventDefault()}
                                                    />

                                                    {/* Watermark Overlay - Only show if NOT purchased */}
                                                    {!isPurchased && (
                                                        <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center overflow-hidden">
                                                            <div className="text-white/[0.07] text-3xl md:text-4xl font-black tracking-widest transform rotate-[-30deg] select-none uppercase whitespace-nowrap">
                                                                THE LOST+UNFOUNDS • THE LOST+UNFOUNDS
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Selection Corner Tap Target */}
                                                    {activeTab === 'storefront' && !isPurchased && (
                                                        <button
                                                            onClick={() => handleToggleSelect(photo)}
                                                            className={`absolute top-0 right-0 z-30 p-4 transition-all group/select`}
                                                        >
                                                            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${isSelected
                                                                ? 'bg-white border-white scale-110'
                                                                : 'bg-black/20 backdrop-blur-md border-white/20 group-hover/select:border-white/50'
                                                                }`}>
                                                                {isSelected ? (
                                                                    <div className="w-3 h-3 bg-black rounded-full" />
                                                                ) : (
                                                                    <div className="w-3 h-3 bg-white/0 rounded-full group-hover/select:bg-white/20" />
                                                                )}
                                                            </div>
                                                        </button>
                                                    )}

                                                    {/* Purchased Badge */}
                                                    {isPurchased && (
                                                        <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-green-500 text-black px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest">
                                                            <CheckCircle className="w-3 h-3" />
                                                            PROPRIETARY
                                                        </div>
                                                    )}

                                                    {/* Hover Overlay */}
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-6 pointer-events-none">
                                                        <div className="flex items-center justify-between pointer-events-auto">
                                                            <div className="flex flex-col">
                                                                <span className="text-white font-bold text-lg">
                                                                    {isPurchased ? 'OWNED' : `$${singlePrice.toFixed(2)}`}
                                                                </span>
                                                                <span className="text-zinc-400 text-[10px] uppercase tracking-tighter">
                                                                    {photo.title}
                                                                </span>
                                                            </div>
                                                            <div className="flex gap-2 items-center">
                                                                <button
                                                                    onClick={() => setActivePhotoIndex(index)}
                                                                    className="p-2 bg-white/10 hover:bg-white text-white hover:text-black rounded-full transition-colors"
                                                                    title="View Details"
                                                                >
                                                                    <Eye className="w-4 h-4" />
                                                                </button>
                                                                {isPurchased && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            window.open(`/api/gallery/stream?fileId=${photo.google_drive_file_id}&download=true`, '_blank');
                                                                        }}
                                                                        className="bg-white text-black px-3 py-2 rounded-none font-bold text-[10px] flex items-center gap-2 uppercase tracking-wider hover:bg-zinc-200 transition-colors"
                                                                        title="Download Original"
                                                                    >
                                                                        <Download className="w-3 h-3" />
                                                                        <span>Download</span>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

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
            />

            {/* Tray */}
            <SelectionTray
                selectedPhotos={selectedPhotos}
                onRemove={(id) => setSelectedPhotos(prev => prev.filter(p => p.id !== id))}
                onCheckout={handleCheckout}
                loading={checkoutLoading}
                pricingOptions={pricingOptions}
            />
        </div>
    );
};

export default PhotoGallery;
