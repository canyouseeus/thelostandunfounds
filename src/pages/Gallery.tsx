import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useGallery } from '../contexts/GalleryContext';
import PhotoGallery from '../components/photos/PhotoGallery';
import AuthModal from '../components/auth/AuthModal';
import { LockClosedIcon, ArrowRightIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import GalleryItem from './GalleryItem';
import PhotographerApplicationModal from '../components/gallery/PhotographerApplicationModal';
import { cn } from '../components/ui/utils';
import MarketplaceBanner from '../components/events/MarketplaceBanner';
import Shop from './Shop';
import EmailSignup from '../components/EmailSignup';

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
 *
 * When `isHomepage` is true, this component is mounted at `/` as the visitor homepage.
 * A Gallery / Shop toggle appears at the top so visitors can switch views without navigating away.
 */
export default function Gallery({ isHomepage = false }: { isHomepage?: boolean }) {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const { activeGallery, openGallery, closeGallery } = useGallery();
    const [userIsAdmin, setUserIsAdmin] = useState(false);

    const [libraries, setLibraries] = useState<PhotoLibrary[]>([]);

    const [loading, setLoading] = useState(true);
    const [authModalOpen, setAuthModalOpen] = useState(false);
    const [applicationModalOpen, setApplicationModalOpen] = useState(false);
    const isMounted = useRef(true);

    const [authMessage, setAuthMessage] = useState<string | undefined>(undefined);

    // Background removal progress — receives events from the hidden Shop component
    const [bgrRemaining, setBgrRemaining] = useState(0);
    const [bgrEnhanced, setBgrEnhanced] = useState(0);
    const [bgrCountdown, setBgrCountdown] = useState<number | null>(null);

    // Newsletter modal — shown to visitors after a delay
    const [newsletterBarVisible, setNewsletterBarVisible] = useState(false);
    const [newsletterBarDismissed, setNewsletterBarDismissed] = useState(false);

    // Set isMounted to false on unmount
    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    useEffect(() => {
        if (!isHomepage) return;
        const onProgress = (e: Event) => {
            const { remaining, newlyEnhanced } = (e as CustomEvent).detail;
            setBgrRemaining(remaining);
            setBgrEnhanced(newlyEnhanced);
        };
        const onReload = (e: Event) => {
            const { countdown } = (e as CustomEvent).detail;
            setBgrCountdown(countdown);
        };
        window.addEventListener('bgr:progress', onProgress);
        window.addEventListener('bgr:reload', onReload);
        return () => {
            window.removeEventListener('bgr:progress', onProgress);
            window.removeEventListener('bgr:reload', onReload);
        };
    }, [isHomepage]);

    // Helper: read/write newsletter cookie (30-day expiry)
    const hasNewsletterCookie = () => document.cookie.split(';').some(c => c.trim().startsWith('nl_done='));
    const setNewsletterCookie = () => {
        const expires = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toUTCString();
        document.cookie = `nl_done=1; expires=${expires}; path=/; SameSite=Lax`;
    };

    // Show newsletter modal to visitors after 1.5s (homepage only, not logged in, not subscribed, not dismissed this session)
    useEffect(() => {
        if (!isHomepage || user || newsletterBarDismissed) return;
        if (hasNewsletterCookie()) return;
        if (sessionStorage.getItem('nl_dismissed')) return;
        const t = setTimeout(() => setNewsletterBarVisible(true), 1500);
        return () => clearTimeout(t);
    }, [isHomepage, user, newsletterBarDismissed]);

    // Lock body scroll while newsletter modal is open
    useEffect(() => {
        const isOpen = isHomepage && !activeGallery && newsletterBarVisible && !newsletterBarDismissed;
        document.body.style.overflow = isOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isHomepage, activeGallery, newsletterBarVisible, newsletterBarDismissed]);

    const handleNewsletterSuccess = () => {
        setNewsletterCookie();
        setTimeout(() => {
            setNewsletterBarDismissed(true);
            setNewsletterBarVisible(false);
        }, 2500);
    };

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

            if (!isMounted.current) return;

            if (librariesError) throw librariesError;
            setLibraries(librariesData || []);

        } catch (err) {
            if (!isMounted.current) return;
            console.error('Error fetching galleries:', err);
        } finally {
            if (isMounted.current) {
                setLoading(false);
            }
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
        if (isHomepage) {
            openGallery(library.slug);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            navigate(`/gallery/${library.slug}`);
        }
    };

    const [activeGalleryTab, setActiveGalleryTab] = useState<'public' | 'private'>('public');
    const [viewMode, setViewMode] = useState<'gallery' | 'shop'>('gallery');

    // Scroll to top when returning from an inline gallery back to the grid
    const prevActiveGallery = useRef<string | null>(null);
    useEffect(() => {
        if (prevActiveGallery.current !== null && activeGallery === null) {
            window.scrollTo({ top: 0, behavior: 'instant' });
        }
        prevActiveGallery.current = activeGallery;
    }, [activeGallery]);

    // Route-based direct URL (non-homepage /gallery/:slug)
    if (slug) {
        return <PhotoGallery librarySlug={slug} />;
    }

    const publicLibraries = libraries.filter(lib => !lib.is_private);
    const privateLibraries = libraries.filter(lib => lib.is_private);
    const displayedLibraries = activeGalleryTab === 'public' ? publicLibraries : privateLibraries;

    return (
        <div className="min-h-screen bg-black pt-0 pb-48" style={{ maxWidth: '100vw', overflowX: 'clip' }}>

            {/* Background removal progress banner — fixed at bottom, visible on any tab */}
            {isHomepage && (bgrRemaining > 0 || bgrCountdown !== null) && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] px-6 py-3 text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl ${
                        bgrCountdown !== null
                            ? 'bg-white text-black'
                            : 'bg-black border border-white/20 text-white'
                    }`}
                    style={{ whiteSpace: 'nowrap' }}
                >
                    {bgrCountdown !== null ? (
                        <>
                            {bgrEnhanced} image{bgrEnhanced !== 1 ? 's' : ''} enhanced — reloading in {bgrCountdown}s
                        </>
                    ) : (
                        <span className="flex items-center gap-2">
                            Enhancing images
                            <span className="inline-flex gap-0.5">
                                <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                                <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                                <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
                            </span>
                            <span className="text-white/40">({bgrRemaining} remaining)</span>
                        </span>
                    )}
                </motion.div>
            )}

            {/* Inline gallery — collapses back to grid via the nav back button */}
            <AnimatePresence mode="wait">
                {isHomepage && activeGallery && (
                    <motion.div
                        key={activeGallery}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <PhotoGallery librarySlug={activeGallery} inline />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Gallery grid — hidden (not unmounted) while a gallery is open */}
            <div style={{ display: isHomepage && activeGallery ? 'none' : 'block' }}>

            <Helmet>
                {isHomepage ? (
                    <title>THE LOST+UNFOUNDS | Browse &amp; Buy Photos</title>
                ) : (
                    <title>THE GALLERY | THE LOST+UNFOUNDS</title>
                )}
                <meta name="description" content="Explore exclusive high-resolution photography collections. Unique findings from the field, beautifully captured in high definition for your inspiration." />
                <link rel="canonical" href={isHomepage ? 'https://www.thelostandunfounds.com/' : 'https://www.thelostandunfounds.com/gallery'} />
            </Helmet>

            {/* Gallery / Shop toggle — homepage visitor mode only */}
            {isHomepage && (
                <div className="sticky z-[98] bg-black px-4 md:px-8 pt-2 pb-0" style={{ top: 'var(--nav-height, 64px)' }}>
                    <div className="max-w-7xl mx-auto">
                        <div className="flex justify-center gap-12 pb-2 mb-0">
                            <button
                                onClick={() => setViewMode('gallery')}
                                className={cn(
                                    "text-[10px] font-black uppercase tracking-[0.3em] transition-all relative pb-2",
                                    viewMode === 'gallery' ? "text-white" : "text-white/30 hover:text-white/60"
                                )}
                            >
                                Gallery
                                {viewMode === 'gallery' && (
                                    <motion.div
                                        layoutId="viewModeUnderline"
                                        className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-white"
                                    />
                                )}
                            </button>
                            <button
                                onClick={() => setViewMode('shop')}
                                className={cn(
                                    "text-[10px] font-black uppercase tracking-[0.3em] transition-all relative pb-2",
                                    viewMode === 'shop' ? "text-white" : "text-white/30 hover:text-white/60"
                                )}
                            >
                                Shop
                                {viewMode === 'shop' && (
                                    <motion.div
                                        layoutId="viewModeUnderline"
                                        className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-white"
                                    />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Shop view — preloaded silently, revealed via display when tab is active */}
            {isHomepage && (
                <div style={{ display: viewMode === 'shop' ? 'block' : 'none' }}>
                    <Shop hideBanner embedded />
                </div>
            )}

            {/* Gallery view */}
            {(!isHomepage || viewMode === 'gallery') && (
            <>

            <div className="px-4 md:px-8">

            {!isHomepage && (
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
            )}

            <div className="max-w-7xl mx-auto">
                {/* Tabs styled like PhotoGallery Storefront/Assets */}
                <div className="flex justify-center gap-12 mb-12 pb-2">
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

                {loading ? null : (
                    <div className="animate-in fade-in duration-500">
                        <div className={`grid gap-3 md:gap-6 md:grid-cols-2 lg:grid-cols-3 ${
                            displayedLibraries.length <= 1
                                ? 'grid-cols-1'
                                : displayedLibraries.length === 2 || (displayedLibraries.length > 2 && displayedLibraries.length % 2 === 0)
                                    ? 'grid-cols-2'
                                    : 'grid-cols-3'
                        }`}>
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
            </>
            )}
        </div> {/* end gallery grid wrapper */}

            {/* Newsletter modal — slides up from bottom to center, like the old homepage */}
            <AnimatePresence>
                {isHomepage && !activeGallery && newsletterBarVisible && !newsletterBarDismissed && (
                    <motion.div
                        initial={{ top: '110%', opacity: 0 }}
                        animate={{ top: '50%', opacity: 1 }}
                        exit={{ top: '110%', opacity: 0 }}
                        transition={{ duration: 1.5, ease: 'easeInOut' }}
                        style={{ transform: 'translate(-50%, -50%)' }}
                        className="fixed left-1/2 z-[9997] w-full max-w-[min(500px,90vw)]"
                    >
                        <div className="relative">
                            {/* Close button */}
                            <button
                                onClick={() => {
                                    sessionStorage.setItem('nl_dismissed', '1');
                                    setNewsletterBarVisible(false);
                                    setNewsletterBarDismissed(true);
                                }}
                                className="absolute top-4 right-4 z-10 text-white/30 hover:text-white transition-colors"
                                aria-label="Close"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>

                            <EmailSignup onSuccess={handleNewsletterSuccess} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

