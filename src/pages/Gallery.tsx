import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import PhotoGallery from '../components/photos/PhotoGallery';
import AuthModal from '../components/auth/AuthModal';
import { LockClosedIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { LoadingOverlay } from '../components/Loading';
import { motion } from 'framer-motion';
import GalleryItem from './GalleryItem';
import PhotographerApplicationModal from '../components/gallery/PhotographerApplicationModal';
import { cn } from '../components/ui/utils';

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
    const [applicationModalOpen, setApplicationModalOpen] = useState(false);

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

    const [activeGalleryTab, setActiveGalleryTab] = useState<'public' | 'private'>('public');

    // If a slug is present, render the specific gallery component
    if (slug) {
        return <PhotoGallery librarySlug={slug} />;
    }

    const publicLibraries = libraries.filter(lib => !lib.is_private);
    const privateLibraries = libraries.filter(lib => lib.is_private);
    const displayedLibraries = activeGalleryTab === 'public' ? publicLibraries : privateLibraries;

    return (
        <div className="min-h-screen bg-black pt-32 pb-48 px-4 md:px-8 max-w-[100vw] overflow-x-hidden">
            <Helmet>
                <title>THE GALLERY | THE LOST+UNFOUNDS</title>
                <meta name="description" content="Exclusive high-resolution photography collections. Findings from the field, captured in high definition." />
            </Helmet>

            <div className="max-w-7xl mx-auto mb-20 relative z-10">
                <div className="text-left space-y-6 max-w-4xl pb-12">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <h1 className="font-black text-white tracking-tighter leading-[0.8] uppercase text-[clamp(3.5rem,12vw,10rem)] mb-8">
                            THE GALLERY
                        </h1>
                        <div className="text-xl md:text-2xl text-white/50 font-light leading-relaxed max-w-2xl">
                            <p>
                                Welcome to <span className="font-bold text-white">THE GALLERY</span> — an invite-only platform for photographers to host, share, and sell their work.
                            </p>
                        </div>

                        {/* Application CTA */}
                        <div className="pt-8 flex flex-col sm:flex-row items-start sm:items-center gap-6">
                            <button
                                onClick={() => setApplicationModalOpen(true)}
                                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-black font-black uppercase tracking-widest text-xs hover:bg-zinc-200 transition-all active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.1)]"
                            >
                                Apply to Join
                                <ArrowRightIcon className="w-4 h-4" />
                            </button>
                            <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest">
                                Already have an invite? <button onClick={() => setAuthModalOpen(true)} className="text-white/60 hover:text-white underline underline-offset-4 decoration-white/20 hover:decoration-white transition-all">Sign in here</button>
                            </p>
                        </div>
                    </motion.div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto">
                {/* Tabs styled like PhotoGallery Storefront/Assets */}
                <div className="flex gap-12 border-b border-white/5 mb-12 pb-2">
                    <button
                        onClick={() => setActiveGalleryTab('public')}
                        className={cn(
                            "text-[10px] font-black uppercase tracking-[0.3em] transition-all relative pb-2",
                            activeGalleryTab === 'public'
                                ? "text-white"
                                : "text-white/30 hover:text-white/60"
                        )}
                    >
                        Public Albums
                        {activeGalleryTab === 'public' && (
                            <motion.div
                                layoutId="galleryTabUnderline"
                                className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-white"
                            />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveGalleryTab('private')}
                        className={cn(
                            "text-[10px] font-black uppercase tracking-[0.3em] transition-all relative pb-2",
                            activeGalleryTab === 'private'
                                ? "text-white"
                                : "text-white/30 hover:text-white/60"
                        )}
                    >
                        Private Archives
                        {activeGalleryTab === 'private' && (
                            <motion.div
                                layoutId="galleryTabUnderline"
                                className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-white"
                            />
                        )}
                    </button>
                </div>

                {loading ? (
                    <LoadingOverlay message="Decrypting Archives..." />
                ) : (
                    <div className="animate-in fade-in duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {displayedLibraries.map((lib, index) => (
                                <GalleryItem
                                    key={lib.id}
                                    lib={lib}
                                    index={index}
                                    userIsAdmin={userIsAdmin}
                                    authLoading={authLoading}
                                    onGalleryClick={handleGalleryClick}
                                />
                            ))}
                        </div>

                        {displayedLibraries.length === 0 && (
                            <div className="text-center py-40 bg-white/[0.02] border border-dashed border-white/5">
                                <p className="text-white/20 text-[10px] font-black tracking-widest uppercase">
                                    No {activeGalleryTab} archives found in this sector.
                                </p>
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

                        <PhotographerApplicationModal
                            isOpen={applicationModalOpen}
                            onClose={() => setApplicationModalOpen(false)}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
