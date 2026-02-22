import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckIcon, ClipboardDocumentIcon, ArrowRightIcon, ArrowPathIcon, ExclamationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { LoadingSpinner, LoadingOverlay } from '../../components/Loading';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function OnboardingWizard() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();
    const { user, signIn, signUp, signOut, signInWithGoogle } = useAuth();

    const [step, setStep] = useState(0); // 0: Intro, 1: Auth, 2: Profile, 3: Connect, 4: Link, 5: Success
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [invitation, setInvitation] = useState<any>(null);
    const [folderLink, setFolderLink] = useState('');
    const [publishLoading, setPublishLoading] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);

    // Auth State for Step 1
    const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [authError, setAuthError] = useState('');
    const [authLoading, setAuthLoading] = useState(false);

    // Profile State for Step 2
    const [username, setUsername] = useState(user?.user_metadata?.author_name || '');
    const [usernameError, setUsernameError] = useState('');
    const [savingUsername, setSavingUsername] = useState(false);

    // Sync username if user changes
    useEffect(() => {
        if (user?.user_metadata?.author_name && !username) {
            setUsername(user.user_metadata.author_name);
        }
    }, [user]);

    const AGENT_EMAIL = 'the-gallery-agent@the-lost-and-unf-1737406545588.iam.gserviceaccount.com';

    useEffect(() => {
        verifyToken();
    }, [token]);

    // Check if logged-in user matches invitation email
    const [emailMismatch, setEmailMismatch] = useState(false);

    // Auto-advance if user logs in AND email matches
    useEffect(() => {
        if (user && step === 1 && invitation) {
            if (user.email?.toLowerCase() !== invitation.email?.toLowerCase()) {
                setEmailMismatch(true);
            } else {
                setEmailMismatch(false);
                // If user doesn't have a username, go to Profile step
                if (!user.user_metadata?.author_name) {
                    setStep(2);
                } else {
                    // Already has username, skip to Connect Drive
                    setStep(3);
                }
            }
        }
    }, [user, step, invitation]);

    async function verifyToken() {
        if (!token) {
            setLoading(false);
            setError('Invalid invitation link.');
            return;
        }

        const { data, error } = await supabase
            .from('gallery_invitations')
            .select('*')
            .eq('token', token)
            .single();

        if (error || !data) {
            setError('Invitation not found or expired.');
        } else if (data.status === 'accepted') {
            setError('This invitation has already been used.');
        } else {
            setInvitation(data);
            setEmail(data.email);
        }
        setLoading(false);
    }

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthError('');
        setAuthLoading(true);
        try {
            const { error } = authMode === 'signin'
                ? await signIn(email, password)
                : await signUp(email, password);

            if (error) throw error;
        } catch (err: any) {
            setAuthError(err.message || 'Authentication failed');
        } finally {
            setAuthLoading(false);
        }
    };

    const handleCopyEmail = () => {
        navigator.clipboard.writeText(AGENT_EMAIL);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    const handleGoogleSignIn = async () => {
        localStorage.setItem('auth_return_url', window.location.pathname + window.location.search);
        setAuthLoading(true);
        const { error } = await signInWithGoogle();
        if (error) {
            setAuthError(error.message);
            setAuthLoading(false);
        }
    };

    const [syncStatus, setSyncStatus] = useState<string>('');
    const [syncStats, setSyncStats] = useState<{ synced: number, message: string } | null>(null);

    // Gallery customization fields
    const [galleryName, setGalleryName] = useState('');
    const [galleryDescription, setGalleryDescription] = useState('');
    const [isPrivate, setIsPrivate] = useState(true);

    const handlePublish = async () => {
        if (!folderLink || !user) return;
        setPublishLoading(true);
        setSyncStatus('Creating gallery...');
        setError(null);

        try {
            const match = folderLink.match(/\/folders\/([a-zA-Z0-9-_]+)/) ||
                folderLink.match(/id=([a-zA-Z0-9-_]+)/) ||
                folderLink.match(/^([a-zA-Z0-9-_]+)$/);
            const folderId = match ? match[1] : folderLink;

            const response = await fetch('/api/admin/onboard-gallery', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    folderId,
                    name: galleryName || `Gallery by ${invitation.email}`,
                    description: galleryDescription || '',
                    isPrivate: isPrivate,
                    ownerId: user.id
                })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to publish');

            const slug = result.slug;

            setSyncStatus('Syncing photos...');

            try {
                const syncResponse = await fetch('/api/admin/sync-library', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ slug })
                });

                const syncResult = await syncResponse.json();

                if (!syncResponse.ok) {
                    console.error('Sync error:', syncResult);
                    throw new Error(syncResult.error || 'Gallery created but photo sync failed');
                }

                setSyncStats({
                    synced: syncResult.synced,
                    message: syncResult.message
                });

            } catch (syncErr: any) {
                console.error('Sync step failed (will retry via cron):', syncErr);
            }

            setStep(5);
        } catch (err: any) {
            setError(`Error: ${err.message}`);
        } finally {
            setPublishLoading(false);
            setSyncStatus('');
        }
    };

    if (loading) return <LoadingOverlay />;
    if (error) return <div className="min-h-screen bg-black flex items-center justify-center text-white font-bold">{error}</div>;

    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Main Card - matching AuthModal style */}
                <div className="bg-black/90 backdrop-blur-md p-6">

                    {/* Step Progress Bar */}
                    <div className="flex items-center justify-center gap-2 mb-6">
                        {[0, 1, 2, 3, 4].map((s) => (
                            <div key={s} className={`h-1 flex-1 max-w-12 rounded-full ${step >= s ? 'bg-white' : 'bg-white/20'}`} />
                        ))}
                    </div>

                    {/* Intro Step */}
                    {step === 0 && (
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-2">Create Your Gallery</h2>
                            <p className="text-white/60 text-sm mb-6">
                                Welcome, {invitation?.email}. Set up your photo gallery in 3 easy steps.
                            </p>

                            <div className="space-y-3 mb-6">
                                <div className="flex items-center gap-3 p-3 bg-white/5">
                                    <div className="w-6 h-6 rounded-full bg-white/10 text-white/60 flex items-center justify-center text-xs font-bold">1</div>
                                    <span className="text-sm text-white/80">Sign in or create account</span>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-white/5">
                                    <div className="w-6 h-6 rounded-full bg-white/10 text-white/60 flex items-center justify-center text-xs font-bold">3</div>
                                    <span className="text-sm text-white/80">Connect Google Drive folder</span>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-white/5">
                                    <div className="w-6 h-6 rounded-full bg-white/10 text-white/60 flex items-center justify-center text-xs font-bold">4</div>
                                    <span className="text-sm text-white/80">Publish your gallery</span>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    if (user) {
                                        // Check if logged-in email matches invitation email
                                        if (user.email?.toLowerCase() === invitation?.email?.toLowerCase()) {
                                            if (user.user_metadata?.author_name) {
                                                setStep(3);
                                            } else {
                                                setStep(2);
                                            }
                                        } else {
                                            // Email mismatch - show auth step with warning
                                            setEmailMismatch(true);
                                            setStep(1);
                                        }
                                    } else {
                                        setStep(1);
                                    }
                                }}
                                className="w-full px-4 py-2 bg-white text-black font-semibold hover:bg-white/90 transition"
                            >
                                Get Started
                            </button>
                        </div>
                    )}

                    {/* Step 1: Auth - matching AuthModal style */}
                    {step === 1 && (
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-6">
                                {authMode === 'signup' ? 'Sign Up' : 'Sign In'}
                            </h2>

                            {/* Email Mismatch Warning */}
                            {emailMismatch && user && (
                                <div className="mb-4 px-4 py-3 bg-amber-500/20 text-amber-400 text-sm">
                                    <p className="font-medium mb-1">Wrong Account</p>
                                    <p className="text-xs opacity-80 mb-2">
                                        You're logged in as <span className="font-bold">{user.email}</span>, but this invitation is for <span className="font-bold">{invitation?.email}</span>.
                                    </p>
                                    <button
                                        onClick={async () => {
                                            await signOut();
                                            setEmailMismatch(false);
                                        }}
                                        className="text-xs underline hover:no-underline"
                                    >
                                        Switch Account
                                    </button>
                                </div>
                            )}

                            <form onSubmit={handleAuth} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-white/80 mb-2">Email</label>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        placeholder="your@email.com"
                                        className="w-full px-4 py-2 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:bg-white/10 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-white/80 mb-2">Password</label>
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="••••••"
                                        className="w-full px-4 py-2 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:bg-white/10 transition-colors"
                                    />
                                </div>

                                {authError && (
                                    <div className="px-4 py-2 bg-red-500/20 text-red-400 text-sm">
                                        {authError}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={authLoading}
                                    className="w-full px-4 py-2 bg-white text-black font-semibold hover:bg-white/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {authLoading ? 'Loading...' : authMode === 'signup' ? 'Sign Up' : 'Sign In'}
                                </button>
                            </form>

                            {/* OR Divider */}
                            <div className="my-6">
                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-white/20"></div>
                                    </div>
                                    <div className="relative flex justify-center text-sm">
                                        <span className="px-2 bg-black text-white/60">OR</span>
                                    </div>
                                </div>
                            </div>

                            {/* Google Sign-In */}
                            <button
                                onClick={handleGoogleSignIn}
                                disabled={authLoading}
                                className="w-full px-4 py-2 bg-white/5 text-white font-medium hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                Sign in with Google
                            </button>

                            <div className="mt-6 text-center">
                                <button
                                    onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                                    className="text-white/60 hover:text-white text-sm transition"
                                >
                                    {authMode === 'signup' ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                                </button>
                            </div>

                            <button
                                onClick={() => setStep(0)}
                                className="w-full mt-3 px-4 py-2 text-white/60 hover:text-white text-sm transition"
                            >
                                Back
                            </button>
                        </div>
                    )}

                    {/* Step 2: Profile Setup */}
                    {step === 2 && (
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-2">Set Up Your Profile</h2>
                            <p className="text-white/60 text-sm mb-6">
                                Choose the username that will be displayed on your gallery.
                            </p>

                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-white/80 mb-2">Username (Author Name)</label>
                                    <input
                                        type="text"
                                        required
                                        value={username}
                                        onChange={e => {
                                            setUsername(e.target.value);
                                            setUsernameError('');
                                        }}
                                        placeholder="Artist Name or Your Name"
                                        className="w-full px-4 py-2 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:bg-white/10 transition-colors"
                                    />
                                    {usernameError && (
                                        <p className="text-red-400 text-xs mt-1">{usernameError}</p>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={async () => {
                                    if (!username.trim()) {
                                        setUsernameError('Username is required');
                                        return;
                                    }
                                    setSavingUsername(true);
                                    try {
                                        const { error } = await supabase.auth.updateUser({
                                            data: { author_name: username.trim() }
                                        });
                                        if (error) throw error;
                                        setStep(3);
                                    } catch (err: any) {
                                        setUsernameError(err.message || 'Failed to save username');
                                    } finally {
                                        setSavingUsername(false);
                                    }
                                }}
                                disabled={savingUsername || !username.trim()}
                                className="w-full px-4 py-2 bg-white text-black font-semibold hover:bg-white/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {savingUsername ? <LoadingSpinner size="sm" /> : 'Continue'}
                            </button>

                            <button
                                onClick={() => setStep(1)}
                                className="w-full mt-3 px-4 py-2 text-white/60 hover:text-white text-sm transition"
                            >
                                Back
                            </button>
                        </div>
                    )}

                    {/* Step 3: Connect */}
                    {step === 3 && (
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-2">Connect Google Drive</h2>
                            <p className="text-white/60 text-sm mb-6">
                                Share your photo folder with our agent to sync your photos.
                            </p>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-white/80 mb-2">Share with this email:</label>
                                <div className="flex items-center gap-2 p-3 bg-white/5">
                                    <code className="text-xs text-green-400 break-all flex-1">{AGENT_EMAIL}</code>
                                    <button
                                        onClick={handleCopyEmail}
                                        className="p-2 hover:bg-white/10 transition-colors shrink-0"
                                        title="Copy Email"
                                    >
                                        {copySuccess ? <CheckIcon className="w-4 h-4 text-green-500" /> : <ClipboardDocumentIcon className="w-4 h-4 text-white/60" />}
                                    </button>
                                </div>
                                <p className="text-xs text-white/40 mt-2">Give "Viewer" access in Google Drive sharing settings.</p>
                            </div>

                            <button
                                onClick={() => setStep(4)}
                                className="w-full px-4 py-2 bg-white text-black font-semibold hover:bg-white/90 transition"
                            >
                                Continue
                            </button>

                            <button
                                onClick={() => setStep(2)}
                                className="w-full mt-3 px-4 py-2 text-white/60 hover:text-white text-sm transition"
                            >
                                Back
                            </button>
                        </div>
                    )}

                    {/* Step 4: Create */}
                    {step === 4 && (
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-2">Create Gallery</h2>
                            <p className="text-white/60 text-sm mb-6">
                                Customize your gallery and paste your Google Drive folder link.
                            </p>

                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-white/80 mb-2">Gallery Name</label>
                                    <input
                                        type="text"
                                        value={galleryName}
                                        onChange={(e) => setGalleryName(e.target.value)}
                                        placeholder={`Gallery by ${invitation?.email || 'you'}`}
                                        className="w-full px-4 py-2 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:bg-white/10 transition-colors"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-white/80 mb-2">Description <span className="text-white/40">(optional)</span></label>
                                    <textarea
                                        value={galleryDescription}
                                        onChange={(e) => setGalleryDescription(e.target.value)}
                                        placeholder="Tell visitors about your photography..."
                                        rows={2}
                                        className="w-full px-4 py-2 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:bg-white/10 transition-colors resize-none"
                                    />
                                </div>

                                <div className="flex items-center justify-between p-3 bg-white/5">
                                    <div>
                                        <p className="text-sm font-medium text-white">Private Gallery</p>
                                        <p className="text-xs text-white/40">Only accessible via direct link</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsPrivate(!isPrivate)}
                                        className={`w-10 h-6 rounded-full transition-colors ${isPrivate ? 'bg-green-500' : 'bg-white/20'} relative`}
                                    >
                                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isPrivate ? 'left-5' : 'left-1'}`} />
                                    </button>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-white/80 mb-2">Google Drive Folder Link</label>
                                    <input
                                        type="text"
                                        value={folderLink}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            const match = val.match(/\/folders\/([a-zA-Z0-9-_]+)/) || val.match(/id=([a-zA-Z0-9-_]+)/);
                                            setFolderLink(match ? match[1] : val);
                                        }}
                                        placeholder="Paste folder link or ID here..."
                                        className="w-full px-4 py-2 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:bg-white/10 transition-colors"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handlePublish}
                                disabled={!folderLink || publishLoading}
                                className="w-full px-4 py-2 bg-white text-black font-semibold hover:bg-white/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {publishLoading ? (
                                    <>
                                        <LoadingSpinner size="sm" />
                                        {syncStatus || 'Processing...'}
                                    </>
                                ) : 'Publish Gallery'}
                            </button>

                            <button
                                onClick={() => setStep(3)}
                                className="w-full mt-3 px-4 py-2 text-white/60 hover:text-white text-sm transition"
                            >
                                Back
                            </button>
                        </div>
                    )}

                    {/* Step 5: Success */}
                    {step === 5 && (
                        <div className="text-center py-4">
                            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckIcon className="w-8 h-8 text-black stroke-[3]" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Gallery Published!</h2>
                            <p className="text-white/60 text-sm mb-6">
                                Your photos are syncing. View your gallery in the dashboard.
                            </p>
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="w-full px-4 py-2 bg-white text-black font-semibold hover:bg-white/90 transition"
                            >
                                Go to Dashboard
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
