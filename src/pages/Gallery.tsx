import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import PhotoGallery from '../components/photos/PhotoGallery';
import AuthModal from '../components/auth/AuthModal';
import { Lock, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import GalleryItem from './GalleryItem';
import PhotographerApplicationModal from '../components/gallery/PhotographerApplicationModal';

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
                            Welcome to <span className="font-bold">THE GALLERY</span> — an invite-only platform for photographers to host, share, and sell their work.
                        </p>
                        <p>
                            Private galleries are reserved for invited photographers. If you're a photographer interested in joining, submit your application below and we'll review your work.
                        </p>
                        <p>
                            Public albums contain content available for anyone to browse and purchase.
                        </p>
                    </div>

                    {/* Application CTA */}
                    <div className="pt-4">
                        <button
                            onClick={() => setApplicationModalOpen(true)}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-bold uppercase tracking-wider text-sm hover:bg-white/90 transition-colors"
                        >
                            Apply to Join
                            <ArrowRight className="w-4 h-4" />
                        </button>
                        <p className="text-white/30 text-xs mt-3">
                            Already have an invite? <button onClick={() => setAuthModalOpen(true)} className="text-white/50 hover:text-white underline">Sign in here</button>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1">
                        {libraries.map((lib, index) => (
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

                    <PhotographerApplicationModal
                        isOpen={applicationModalOpen}
                        onClose={() => setApplicationModalOpen(false)}
                    />
                </div>
            )}
        </div>
    );
}
