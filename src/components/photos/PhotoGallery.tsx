import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import SelectionTray from './SelectionTray';
import PhotoLightbox from './PhotoLightbox';
import Loading from '../Loading';

interface Photo {
    id: string;
    title: string;
    id: string;
    title: string;
    thumbnail_url: string;
    created_at: string;
}

interface PhotoLibrary {
    id: string;
    name: string;
    slug: string;
    description: string;
}

const PhotoGallery: React.FC<{ librarySlug: string }> = ({ librarySlug }) => {
    const [library, setLibrary] = useState<PhotoLibrary | null>(null);
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [selectedPhotos, setSelectedPhotos] = useState<Photo[]>([]);
    const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [checkoutLoading, setCheckoutLoading] = useState(false);

    const storageKey = `selected_photos_${librarySlug}`;

    useEffect(() => {
        fetchLibrary();

        // Load saved selections from localStorage
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            try {
                setSelectedPhotos(JSON.parse(saved));
            } catch (err) {
                console.error('Error parsing saved selections:', err);
            }
        }
    }, [librarySlug]);

    // Persist selections to localStorage
    useEffect(() => {
        if (!loading) {
            localStorage.setItem(storageKey, JSON.stringify(selectedPhotos));
        }
    }, [selectedPhotos, storageKey, loading]);

    async function fetchLibrary() {
        try {
            setLoading(true);
            const { data: libData, error: libError } = await supabase
                .from('photo_libraries')
                .select('*')
                .eq('slug', librarySlug)
                .single();

            if (libError) throw libError;
            setLibrary(libData);

            const { data: photoData, error: photoError } = await supabase
                .from('photos')
                .select('*')
                .eq('library_id', libData.id)
                .eq('status', 'active')
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

    const handleCheckout = async () => {
        try {
            setCheckoutLoading(true);
            const email = prompt('Enter your email for delivery:');
            if (!email) {
                setCheckoutLoading(false);
                return;
            }

            const response = await fetch('/api/photos/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    photoIds: selectedPhotos.map(p => p.id),
                    email
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

    return (
        <div className="min-h-screen bg-black pt-20 pb-40 px-4 md:px-8">
            {/* Header */}
            <div className="max-w-7xl mx-auto mb-16 text-left">
                <h1 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tighter uppercase">
                    {library?.name}
                </h1>
                <p className="text-zinc-500 text-lg max-w-2xl">
                    {library?.description}
                </p>
            </div>

            {/* Photos Grouped by Date */}
            <div className="max-w-7xl mx-auto space-y-16">
                {Object.entries(
                    photos.reduce((acc, photo) => {
                        // Create a date string for grouping. 
                        // Using created_at. Format: "SUNDAY JAN 11TH, 2026"
                        const date = new Date(photo.created_at);
                        const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
                        const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

                        const dayName = days[date.getDay()];
                        const monthName = months[date.getMonth()];
                        const dayNum = date.getDate();
                        const year = date.getFullYear();

                        // Add 'TH', 'ST', 'ND', 'RD'
                        let suffix = 'TH';
                        if (dayNum % 10 === 1 && dayNum !== 11) suffix = 'ST';
                        if (dayNum % 10 === 2 && dayNum !== 12) suffix = 'ND';
                        if (dayNum % 10 === 3 && dayNum !== 13) suffix = 'RD';

                        const dateString = `${dayName} ${monthName} ${dayNum}${suffix}, ${year}`;

                        if (!acc[dateString]) acc[dateString] = [];
                        acc[dateString].push(photo);
                        return acc;
                    }, {} as Record<string, Photo[]>)
                ).map(([dateHeader, groupPhotos]) => (
                    <div key={dateHeader}>
                        <h2 className="text-2xl font-black text-white mb-6 uppercase sticky top-0 z-[5] bg-black/80 backdrop-blur-md py-4 border-b border-white/10">
                            {dateHeader}
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                            {groupPhotos.map((photo) => {
                                const index = photos.findIndex(p => p.id === photo.id);
                                const isSelected = !!selectedPhotos.find(p => p.id === photo.id);
                                return (
                                    <motion.div
                                        key={photo.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        onClick={() => setActivePhotoIndex(index)}
                                        className="relative aspect-[4/5] bg-zinc-900 rounded-xl overflow-hidden cursor-pointer group"
                                    >
                                        {/* Image */}
                                        <img
                                            src={photo.thumbnail_url}
                                            alt={photo.title}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 select-none"
                                            draggable={false}
                                        />

                                        {/* Selection Badge */}
                                        <div className={`absolute top-4 right-4 z-20 w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center ${isSelected
                                            ? 'bg-white border-white'
                                            : 'bg-black/20 backdrop-blur-md border-white/20'
                                            }`}>
                                            {isSelected && <div className="w-3 h-3 bg-black rounded-full" />}
                                        </div>

                                        {/* Hover Overlay */}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-6">
                                            <span className="text-white font-bold text-lg">$5.00</span>
                                            <span className="text-zinc-300 text-xs">Click to view details</span>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Lightbox */}
            <PhotoLightbox
                photo={activePhotoIndex !== null ? photos[activePhotoIndex] : null}
                onClose={() => setActivePhotoIndex(null)}
                onNext={() => setActivePhotoIndex(prev => prev !== null && prev < photos.length - 1 ? prev + 1 : 0)}
                onPrev={() => setActivePhotoIndex(prev => prev !== null && prev > 0 ? prev - 1 : photos.length - 1)}
                isSelected={activePhotoIndex !== null && !!selectedPhotos.find(p => p.id === photos[activePhotoIndex].id)}
                onToggleSelect={() => activePhotoIndex !== null && handleToggleSelect(photos[activePhotoIndex])}
            />

            {/* Tray */}
            <SelectionTray
                selectedPhotos={selectedPhotos}
                onRemove={(id) => setSelectedPhotos(prev => prev.filter(p => p.id !== id))}
                onCheckout={handleCheckout}
                loading={checkoutLoading}
            />
        </div>
    );
};

export default PhotoGallery;
