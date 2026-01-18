import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import PhotoGallery from '../components/photos/PhotoGallery';
import AuthModal from '../components/auth/AuthModal';
import { Lock, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface PhotoLibrary {
    id: string;
    name: string;
    slug: string;
    description: string;
    is_private: boolean;
    cover_image_url?: string;
    google_drive_folder_id?: string;
    // price?: number; // Removed as pricing is now handled by gallery_pricing_options
}



/**
 * Photos Page - Handles the gallery listing index and individual specialized galleries.
 * Part of the "Noir" architectural refactor.
 */
export default function Gallery() {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const [userIsAdmin, setUserIsAdmin] = useState(false);

    const [libraries, setLibraries] = useState<PhotoLibrary[]>([]);

    const [loading, setLoading] = useState(true);
    const [authModalOpen, setAuthModalOpen] = useState(false);

    const [authMessage, setAuthMessage] = useState<string | undefined>(undefined);

    // Track admin status
    useEffect(() => {
        if (user?.email) {
            setUserIsAdmin(user.email === 'thelostandunfounds@gmail.com' || user.email === 'admin@thelostandunfounds.com');
        } else {
            setUserIsAdmin(false);
        }
    }, [user]);

    useEffect(() => {
        if (!slug) {
            fetchLibraries();
        }
    }, [slug]);

    async function fetchLibraries() {
        try {
            setLoading(true);
            const { data: librariesData, error: librariesError } = await supabase
                .from('photo_libraries')
                .select('*')
                .order('created_at', { ascending: false });

            if (librariesError) throw librariesError;
            setLibraries(librariesData || []);



        } catch (err) {
            console.error('Error fetching galleries:', err);
        } finally {
            setLoading(false);
        }
    }

    const handleGalleryClick = (library: PhotoLibrary) => {
        if (library.is_private && !user && !userIsAdmin && !authLoading) {
            setAuthMessage(
                "This gallery is private. Please log in if you are the owner. To request access, please contact us at media@thelostandunfounds.com."
            );
            setAuthModalOpen(true);
            return;
        }
        navigate(`/gallery/${library.slug}`);
    };

    // If a slug is present, render the specific gallery component
    if (slug) {
        return <PhotoGallery librarySlug={slug} />;
    }

    return (
        <div className="min-h-screen bg-black pt-24 pb-48 px-4 md:px-8 max-w-[100vw] overflow-x-hidden">
            <Helmet>
                <title>THE GALLERY | THE LOST+UNFOUNDS</title>
                <meta name="description" content="Exclusive high-resolution photography collections. Findings from the field, captured in high definition." />
            </Helmet>

            <div className="max-w-7xl mx-auto mb-20">
                <div className="text-left space-y-6 max-w-3xl pb-12">

                    <h1 className="text-5xl md:text-8xl font-black text-white tracking-tighter leading-[0.8] uppercase whitespace-nowrap">
                        THE GALLERY
                    </h1>
                    <div className="text-xl md:text-2xl text-white/50 font-light leading-relaxed space-y-6">
                        <p>
                            Thank you for visiting <span className="font-bold">THE GALLERY</span>! Here you will find collections of photos and videos available for purchase and download.
                        </p>
                        <p>
                            To access private galleries you must be the owner of the photos within that gallery. If you have not received access to a gallery of your photos then you can email us at <span className="font-bold">media@thelostandunfounds.com</span> to request access.
                        </p>
                        <p>
                            Our public albums contain content that is availble for anyone to download.
                        </p>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-40 gap-4">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                    <span className="text-xs font-bold tracking-widest text-white/40 uppercase">Decrypting Archives...</span>
                </div>
            ) : (
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-3 gap-0">
                        {libraries.map((lib, index) => {

                            return (
                                <motion.div
                                    key={lib.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    onClick={() => handleGalleryClick(lib)}
                                    className="group relative bg-zinc-900/30 hover:bg-zinc-800/30 transition-all duration-500 cursor-pointer overflow-hidden aspect-[4/5] flex flex-col justify-end p-8"
                                >
                                    {/* Background Image/Overlay */}
                                    {lib.cover_image_url ? (
                                        <div
                                            className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-110 opacity-40 group-hover:opacity-60"
                                            style={{ backgroundImage: `url(${lib.cover_image_url})` }}
                                        />
                                    ) : (
                                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 opacity-60" />
                                    )}

                                    {/* Hover Gradient Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-80 group-hover:opacity-40 transition-opacity duration-500" />

                                    {/* Content Wrapper - Positioned at bottom */}
                                    <div className="relative z-10 space-y-3">
                                        {/* Badge */}
                                        <div className="flex items-center">
                                            {lib.is_private ? (
                                                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1">
                                                    <Lock className="w-3 h-3 text-white" />
                                                    <span className="text-[10px] font-bold text-white tracking-widest uppercase">Private</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 bg-white px-3 py-1">
                                                    <span className="text-[10px] font-bold text-black tracking-widest uppercase">Public</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Title - Allow wrapping, no truncation */}
                                        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight uppercase group-hover:translate-x-2 transition-transform duration-500">
                                            {lib.name}
                                        </h2>

                                        {/* Description */}
                                        <p className="text-sm text-white/60 line-clamp-2 font-light leading-relaxed group-hover:text-white/80 transition-colors duration-500">
                                            {lib.description}
                                        </p>

                                        {/* View Gallery Link */}
                                        <div className="pt-2 flex items-center gap-2 text-[10px] font-black tracking-widest uppercase text-white opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-500">
                                            {lib.is_private && !user ? 'Log in to View' : 'View Gallery'}
                                            <ArrowRight className="w-3 h-3" />
                                        </div>
                                    </div>

                                </motion.div>
                            );
                        })}
                    </div>

                    {libraries.length === 0 && (
                        <div className="text-center py-40">
                            <p className="text-white/40 font-bold tracking-widest uppercase">No available archives found.</p>
                        </div>
                    )}


                    <AuthModal
                        isOpen={authModalOpen}
                        onClose={() => {
                            setAuthModalOpen(false);
                            setAuthMessage(undefined);
                        }}
                        message={authMessage}
                        title={authMessage ? "Private Access" : undefined}
                    />
                </div>
            )}
        </div>
    );
}
