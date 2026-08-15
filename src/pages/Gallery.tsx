import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
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
import BookingPage from './BookingPage';
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

    // Newsletter modal: shown to visitors after a delay
    const [newsletterBarVisible, setNewsletterBarVisible] = useState(false);
    const [newsletterBarDismissed, setNewsletterBarDismissed] = useState(false);

    // Set isMounted to false on unmount
    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

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
        // Arriving on a deep link (?view=booking from a client email, ?view=shop,
        // ?view=services) means the visitor came with a specific intent. Covering
        // that intent with a newsletter signup is how a booking CTA turns into a
        // subscribe prompt: which is what it did to a real client. Read the query
        // string directly rather than useSearchParams: this is a mount-time
        // decision, and the hook is declared further down the component.
        // /services and every /services/<offer> page is the same arrival with
        // intent, just as a path instead of a query param; a visitor landing
        // there from search came to see pricing, not to be asked to subscribe.
        if (/^\/services(\/|$)/.test(window.location.pathname)) return;
        if (new URLSearchParams(window.location.search).get('view')) return;
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
                .eq('published', true)
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
        // A signed-out visitor clicking a private gallery is almost always an
        // invited client, so send them to that gallery's access page rather than
        // the site-wide sign-in modal.
        if (library.is_private && !user && !userIsAdmin && !authLoading) {
            navigate(`/gallery/${library.slug}/access`);
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

    // Read initial viewMode from `?view=shop|services|gallery`. This is how the
    // SERVICES nav link deep-links into the services tab on the homepage.
    const [searchParams] = useSearchParams();
    const location = useLocation();
    // /services is the canonical, indexable URL for the services view, and each
    // /services/<slug> below is the same view led by one offer, so a search for
    // "airbnb photographer austin" lands on a page about that rather than a
    // generic agency page. The ?view= params are kept so existing links and
    // client emails still work.
    const servicePath = location.pathname.replace(/\/$/, '');
    const SERVICE_PAGES = {
        '/services/airbnb-photography': {
            focus: 'airbnb' as const,
            title: 'THE LOST+UNFOUNDS | Austin Airbnb & Short-Term Rental Photography',
            description: 'Airbnb and short-term rental listing photography in Austin, TX. 25-35 edited photos delivered in 24-72 hours, from $195. Twilight, drone and 3D tour add-ons.',
        },
        '/services/real-estate-photography': {
            focus: 'realestate' as const,
            title: 'THE LOST+UNFOUNDS | Austin Real Estate & Apartment Photography',
            description: 'Real estate and multifamily leasing photography in Austin, TX. Model units from $225, full property packages at $850 covering exteriors, amenities and model units, portfolio retainers from $1,600/mo.',
        },
        '/services/web-design': {
            focus: 'web' as const,
            title: 'THE LOST+UNFOUNDS | Austin Small Business Web Design',
            description: 'Website design and development for Austin small businesses, artists and brands. Five-page starter sites from $1,500 through full custom builds with booking and payments.',
        },
        '/services/video': {
            focus: 'video' as const,
            title: 'THE LOST+UNFOUNDS | Austin Video Content & Brand Reels',
            description: 'Short-form video and brand reels in Austin, TX. Reels shot alongside stills on half- and full-day content days, plus event highlight reels within 48 hours.',
        },
    } as const;
    const servicePage = SERVICE_PAGES[servicePath as keyof typeof SERVICE_PAGES];
    const isServicesRoute = servicePath === '/services' || !!servicePage;
    const initialView = (() => {
        if (isServicesRoute) return 'services';
        const v = searchParams.get('view');
        // support legacy ?view=booking so old links still work
        if (v === 'shop' || v === 'gallery') return v;
        if (v === 'services' || v === 'booking') return 'services';
        return 'gallery';
    })();
    const [viewMode, setViewMode] = useState<'gallery' | 'shop' | 'services'>(initialView);

    // Tab clicks swap the view in place; they must never navigate, or the shop's
    // silent preload is thrown away and the page remounts under the user. So the
    // address bar is updated directly instead of through the router: replaceState
    // leaves the router's own location untouched, so nothing re-renders.
    //
    // Each URL below reproduces exactly what is on screen if it is reloaded or
    // shared: /?view=shop returns the embedded shop, not the standalone /shop
    // page, which is a different layout.
    //
    // replace, not push: the back button keeps leaving the page as it does today
    // rather than stepping back through tabs. A pushed entry would also desync,
    // since popstate moves the router but not this component's state.
    const selectView = (next: 'gallery' | 'shop' | 'services') => {
        setViewMode(next);
        if (!isHomepage) return;
        const url = next === 'services' ? '/services' : next === 'shop' ? '/?view=shop' : '/';
        window.history.replaceState(window.history.state, '', url);
    };

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

            {/* Inline gallery: collapses back to grid via the nav back button */}
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

            {/* Gallery grid: hidden (not unmounted) while a gallery is open */}
            <div style={{ display: isHomepage && activeGallery ? 'none' : 'block' }}>

            <Helmet>
                {servicePage ? (
                    <title>{servicePage.title}</title>
                ) : isServicesRoute ? (
                    <title>THE LOST+UNFOUNDS | Austin Photography &amp; Web Design</title>
                ) : isHomepage ? (
                    <title>THE LOST+UNFOUNDS</title>
                ) : (
                    <title>THE LOST+UNFOUNDS | The Gallery</title>
                )}
                <meta
                    name="description"
                    content={servicePage
                        ? servicePage.description
                        : isServicesRoute
                        ? "Austin photography and web design. Airbnb and short-term rental shoots from $195, event coverage from $600, and custom small business websites from $1,500."
                        : isHomepage
                        ? "THE LOST+UNFOUNDS is an Austin, TX based editorial and nightlife photography brand. Explore our galleries, shop, and booking services."
                        : "Explore exclusive high-resolution photography collections. Unique findings from the field, beautifully captured in high definition for your inspiration."}
                />
                {/* Each service page is its own canonical. Pointing them all at
                    /services would tell Google to drop the three specific pages
                    and keep the generic one: the exact opposite of the split. */}
                <link rel="canonical" href={servicePage ? `https://www.thelostandunfounds.com${servicePath}` : isServicesRoute ? 'https://www.thelostandunfounds.com/services' : isHomepage ? 'https://www.thelostandunfounds.com/' : 'https://www.thelostandunfounds.com/gallery'} />
            </Helmet>

            {/* Homepage H1: visually hidden so it doesn't duplicate the Gallery/Shop/Services
                tab toggle below, but gives the page (and bots) a real top-level heading. */}
            {isHomepage && (
                <h1 className="sr-only">THE LOST+UNFOUNDS; Austin, TX Editorial &amp; Nightlife Photography</h1>
            )}

            {/* Gallery / Shop / Booking toggle: homepage visitor mode only */}
            {isHomepage && (
                <div className="sticky z-[98] bg-black px-4 md:px-8 pt-2 pb-0" style={{ top: 'var(--nav-height, 64px)' }}>
                    <div className="max-w-7xl mx-auto">
                        <div className="flex justify-center gap-8 sm:gap-12 pb-2 mb-0">
                            <button
                                onClick={() => selectView('gallery')}
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
                                onClick={() => selectView('shop')}
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
                            <button
                                onClick={() => selectView('services')}
                                className={cn(
                                    "text-[10px] font-black uppercase tracking-[0.3em] transition-all relative pb-2",
                                    viewMode === 'services' ? "text-white" : "text-white/30 hover:text-white/60"
                                )}
                            >
                                Services
                                {viewMode === 'services' && (
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

            {/* Shop view: preloaded silently, revealed via display when tab is active */}
            {isHomepage && (
                <div style={{ display: viewMode === 'shop' ? 'block' : 'none' }}>
                    <Shop hideBanner embedded />
                </div>
            )}

            {/* Services view: shown only when the services tab is active */}
            {isHomepage && viewMode === 'services' && (
                <BookingPage focus={servicePage?.focus} />
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
                                Welcome to <span className="font-bold text-white">THE GALLERY</span>; an invite-only platform for photographers to host, share, and sell their work.
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
                            }}
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

            {/* Newsletter modal: slides up from bottom to center, like the old homepage */}
            <AnimatePresence>
                {isHomepage && !activeGallery && newsletterBarVisible && !newsletterBarDismissed && (
                    <motion.div
                        initial={{ top: '110%', opacity: 0 }}
                        animate={{ top: '50%', opacity: 1 }}
                        exit={{ top: '110%', opacity: 0 }}
                        transition={{ duration: 1.5, ease: 'easeInOut' }}
                        style={{ transform: 'translate(-50%, -50%)' }}
                        className="fixed left-1/2 z-[9997] w-full max-w-md px-4 sm:px-0"
                    >
                        <div className="relative w-full">
                            {/* Close button */}
                            <button
                                onClick={() => {
                                    sessionStorage.setItem('nl_dismissed', '1');
                                    setNewsletterBarVisible(false);
                                    setNewsletterBarDismissed(true);
                                }}
                                className="absolute top-4 right-4 z-10 text-white/50 hover:text-white transition-colors"
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

