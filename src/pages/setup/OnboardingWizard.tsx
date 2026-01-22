import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Copy, ArrowRight, Loader2, AlertCircle, LogIn, UserPlus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function OnboardingWizard() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();
    const { user, signIn, signUp, signOut, signInWithGoogle } = useAuth();

    const [step, setStep] = useState(0); // 0: Intro, 1: Auth, 2: Connect, 3: Link, 4: Success
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

    const AGENT_EMAIL = 'the-gallery-agent@the-lost-and-unf-1737406545588.iam.gserviceaccount.com';

    useEffect(() => {
        verifyToken();
    }, [token]);

    // Check if logged-in user matches invitation email
    const [emailMismatch, setEmailMismatch] = useState(false);

    // Auto-advance if user logs in AND email matches
    useEffect(() => {
        if (user && step === 1 && invitation) {
            // Check if logged-in email matches invitation email
            if (user.email?.toLowerCase() !== invitation.email?.toLowerCase()) {
                setEmailMismatch(true);
            } else {
                setEmailMismatch(false);
                setStep(2);
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
            setEmail(data.email); // Pre-fill email from invite
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
            // Success handled by useEffect
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
        // Save current URL for redirect after callback
        localStorage.setItem('auth_return_url', window.location.pathname + window.location.search);
        setAuthLoading(true);
        const { error } = await signInWithGoogle();
        if (error) {
            setAuthError(error.message);
            setAuthLoading(false);
        }
    };

    const [syncStatus, setSyncStatus] = useState<string>(''); // For UI feedback
    const [syncStats, setSyncStats] = useState<{ synced: number, message: string } | null>(null);

    // Gallery customization fields
    const [galleryName, setGalleryName] = useState('');
    const [galleryDescription, setGalleryDescription] = useState('');
    const [isPrivate, setIsPrivate] = useState(true); // Default to private

    const handlePublish = async () => {
        if (!folderLink || !user) return;
        setPublishLoading(true);
        setSyncStatus('Creating gallery...');
        setError(null);

        try {
            // Extract ID from link
            const match = folderLink.match(/folders\/([a-zA-Z0-9-_]+)/) || folderLink.match(/^([a-zA-Z0-9-_]+)$/);
            const folderId = match ? match[1] : folderLink;

            // 1. Create Gallery
            const response = await fetch('/api/admin/onboard-gallery', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    folderId,
                    name: galleryName || `Gallery by ${invitation.email}`,
                    description: galleryDescription || '',
                    isPrivate: isPrivate,
                    ownerId: user.id // Link to user
                })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to publish');

            const slug = result.slug;

            // 2. Trigger Sync
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
                // Sync failure is non-critical - the scheduled cron job will pick it up
                // Log it for debugging but don't bother the user
                console.error('Sync step failed (will retry via cron):', syncErr);
            }

            setStep(4); // Success step
        } catch (err: any) {
            setError(`Error: ${err.message}`);
        } finally {
            setPublishLoading(false);
            setSyncStatus('');
        }
    };

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>;
    if (error) return <div className="min-h-screen bg-black flex items-center justify-center text-white font-bold">{error}</div>;

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 bg-[grid-pattern] relative overflow-hidden">
            {/* Background elements to make it look nicer */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-purple-500 to-blue-500" />

            <div className="max-w-xl w-full relative z-10">

                {/* Header */}
                <div className="mb-8 text-center">
                    <img src="/logo.png" alt="Logo" className="h-10 mx-auto mb-6 invert brightness-0 opacity-80" />
                    <h1 className="text-3xl font-black uppercase tracking-tighter mb-2">Photographer Setup</h1>
                    {invitation && <p className="text-zinc-500 text-sm">Welcome, {invitation.email}</p>}
                </div>

                {/* Main Card */}
                <div className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">

                    {/* Intro Step */}
                    {step === 0 && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <h2 className="text-xl font-bold mb-6 text-center">Welcome to THE LOST+UNFOUNDS</h2>
                            <p className="text-zinc-400 mb-8 text-center">Follow these 3 simple steps to publish your gallery:</p>

                            <div className="space-y-4 mb-8">
                                <div className="flex items-center gap-4 p-4 bg-black/40 rounded-xl border border-white/5">
                                    <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">1</div>
                                    <div>
                                        <h3 className="font-bold text-white">Account</h3>
                                        <p className="text-xs text-zinc-500">Log in or create an account</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 p-4 bg-black/40 rounded-xl border border-white/5">
                                    <div className="w-10 h-10 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">2</div>
                                    <div>
                                        <h3 className="font-bold text-white">Connect</h3>
                                        <p className="text-xs text-zinc-500">Share your Google Drive folder</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 p-4 bg-black/40 rounded-xl border border-white/5">
                                    <div className="w-10 h-10 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center font-bold">3</div>
                                    <div>
                                        <h3 className="font-bold text-white">Create</h3>
                                        <p className="text-xs text-zinc-500">Publish your gallery instantly</p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => user ? setStep(2) : setStep(1)}
                                className="w-full bg-white text-black py-4 rounded-xl font-black uppercase tracking-widest hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
                            >
                                Get Started <ArrowRight className="w-5 h-5" />
                            </button>

                            <a
                                href="/docs/photographer-guide"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block text-center mt-4 text-sm text-zinc-500 hover:text-white transition-colors"
                            >
                                How does this work? <span className="underline">Learn more</span>
                            </a>
                        </motion.div>
                    )}

                    {/* Step 1: Auth */}
                    {step === 1 && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <h2 className="text-xl font-bold mb-2 text-center">Step 1: Account</h2>
                            <p className="text-zinc-400 text-sm mb-6 text-center">You must be logged in to manage your gallery.</p>

                            {/* Email Mismatch Warning */}
                            {emailMismatch && user && (
                                <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 p-4 rounded-xl mb-6">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-bold mb-1">Wrong Account</p>
                                            <p className="text-sm opacity-80">
                                                You're logged in as <span className="font-bold text-white">{user.email}</span>, but this invitation is for <span className="font-bold text-white">{invitation?.email}</span>.
                                            </p>
                                            <button
                                                onClick={async () => {
                                                    await signOut();
                                                    setEmailMismatch(false);
                                                }}
                                                className="mt-3 bg-amber-500/20 text-amber-300 px-4 py-2 rounded-lg text-sm font-bold hover:bg-amber-500/30 transition-colors"
                                            >
                                                Log Out & Switch Account
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <form onSubmit={handleAuth} className="space-y-4">
                                <div className="flex p-1 bg-black/40 rounded-lg mb-6">
                                    <button
                                        type="button"
                                        onClick={() => setAuthMode('signin')}
                                        className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${authMode === 'signin' ? 'bg-white text-black shadow-lg' : 'text-zinc-500 hover:text-white'}`}
                                    >
                                        Log In
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAuthMode('signup')}
                                        className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${authMode === 'signup' ? 'bg-white text-black shadow-lg' : 'text-zinc-500 hover:text-white'}`}
                                    >
                                        Sign Up
                                    </button>
                                </div>

                                {authError && (
                                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg text-sm flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" /> {authError}
                                    </div>
                                )}

                                <div>
                                    <label className="text-xs uppercase font-bold text-zinc-500 mb-1 block">Email</label>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-white focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs uppercase font-bold text-zinc-500 mb-1 block">Password</label>
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-white focus:outline-none"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={authLoading}
                                    className="w-full bg-white text-black py-3 rounded-xl font-bold uppercase tracking-wider hover:bg-zinc-200 transition-colors disabled:opacity-50 mt-4"
                                >
                                    {authLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (authMode === 'signin' ? 'Log In' : 'Create Account')}
                                </button>
                            </form>

                            {/* OR Divider */}
                            <div className="my-6">
                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-white/20"></div>
                                    </div>
                                    <div className="relative flex justify-center text-sm">
                                        <span className="px-2 bg-zinc-900 text-zinc-500">OR</span>
                                    </div>
                                </div>
                            </div>

                            {/* Google Sign-In */}
                            <button
                                onClick={handleGoogleSignIn}
                                disabled={authLoading}
                                className="w-full px-4 py-3 bg-white/5 text-white font-medium hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 rounded-xl"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path
                                        fill="currentColor"
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    />
                                    <path
                                        fill="currentColor"
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    />
                                    <path
                                        fill="currentColor"
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    />
                                    <path
                                        fill="currentColor"
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    />
                                </svg>
                                Sign in with Google
                            </button>
                        </motion.div>
                    )}

                    {/* Step 2: Connect */}
                    {step === 2 && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <h2 className="text-xl font-bold mb-2 text-center">Step 2: Connect Drive</h2>
                            <p className="text-zinc-400 text-sm mb-6 text-center">Create a Google Drive folder and share it with our Agent.</p>

                            <div className="bg-black/50 p-4 rounded-xl border border-white/10 flex items-center justify-between gap-4 mb-8">
                                <code className="text-xs text-green-400 break-all">{AGENT_EMAIL}</code>
                                <button
                                    onClick={handleCopyEmail}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors shrink-0"
                                    title="Copy Email"
                                >
                                    {copySuccess ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 text-white/60" />}
                                </button>
                            </div>

                            <button
                                onClick={() => setStep(3)}
                                className="w-full bg-white text-black py-4 rounded-xl font-black uppercase tracking-widest hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
                            >
                                Next Step <ArrowRight className="w-5 h-5" />
                            </button>
                        </motion.div>
                    )}

                    {/* Step 3: Link & Create */}
                    {step === 3 && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <h2 className="text-xl font-bold mb-2 text-center">Step 3: Create Gallery</h2>
                            <p className="text-zinc-400 text-sm mb-6 text-center">Customize your gallery details.</p>

                            {/* Gallery Name */}
                            <div className="mb-4">
                                <label className="text-xs uppercase font-bold text-zinc-500 mb-1 block">Gallery Name</label>
                                <input
                                    type="text"
                                    value={galleryName}
                                    onChange={(e) => setGalleryName(e.target.value)}
                                    placeholder={`Gallery by ${invitation?.email || 'you'}`}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white placeholder-zinc-600 focus:outline-none focus:border-white/40"
                                />
                            </div>

                            {/* Description */}
                            <div className="mb-4">
                                <label className="text-xs uppercase font-bold text-zinc-500 mb-1 block">Description <span className="text-zinc-700">(optional)</span></label>
                                <textarea
                                    value={galleryDescription}
                                    onChange={(e) => setGalleryDescription(e.target.value)}
                                    placeholder="Tell visitors about your photography..."
                                    rows={2}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white placeholder-zinc-600 focus:outline-none focus:border-white/40 resize-none"
                                />
                            </div>

                            {/* Privacy Toggle */}
                            <div className="mb-6 p-4 bg-black/40 rounded-xl border border-white/5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-white">Private Gallery</p>
                                        <p className="text-xs text-zinc-500">Only accessible to invited clients</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsPrivate(!isPrivate)}
                                        className={`w-12 h-6 rounded-full transition-colors ${isPrivate ? 'bg-blue-500' : 'bg-zinc-700'} relative`}
                                    >
                                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isPrivate ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="border-t border-white/10 my-6" />

                            {/* Folder Link */}
                            <label className="text-xs uppercase font-bold text-zinc-500 mb-1 block">Google Drive Folder Link</label>
                            <input
                                type="text"
                                value={folderLink}
                                onChange={(e) => setFolderLink(e.target.value)}
                                placeholder="https://drive.google.com/drive/folders/..."
                                className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white placeholder-zinc-600 focus:outline-none focus:border-white/40 mb-2"
                            />
                            <p className="text-xs text-zinc-500 mb-8">Ensure the agent email has "Viewer" or "Editor" access.</p>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setStep(2)}
                                    className="flex-1 bg-transparent border border-white/10 text-white py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-white/5 transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handlePublish}
                                    disabled={!folderLink || publishLoading}
                                    className="flex-[2] bg-white text-black py-4 rounded-xl font-black uppercase tracking-widest hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {publishLoading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            {syncStatus || 'Processing...'}
                                        </>
                                    ) : 'Publish Gallery'}
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* Step 4: Success */}
                    {step === 4 && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-8">
                            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Check className="w-10 h-10 text-black stroke-[3]" />
                            </div>
                            <h2 className="text-2xl font-black uppercase mb-4">Gallery Published!</h2>
                            <p className="text-zinc-400 mb-8">Your photos are syncing. You can view your gallery status in your dashboard.</p>
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="inline-block bg-white/10 text-white px-8 py-3 rounded-xl font-bold uppercase tracking-widest hover:bg-white/20 transition-colors"
                            >
                                Go To Dashboard
                            </button>
                        </motion.div>
                    )}

                </div>
            </div>
        </div >
    );
}
