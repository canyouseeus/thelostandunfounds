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
    const { user, signIn, signUp } = useAuth();

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

    // Auto-advance if user logs in
    useEffect(() => {
        if (user && step === 1) {
            setStep(2);
        }
    }, [user, step]);

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

    const handlePublish = async () => {
        if (!folderLink || !user) return;
        setPublishLoading(true);

        try {
            // Extract ID from link
            const match = folderLink.match(/folders\/([a-zA-Z0-9-_]+)/) || folderLink.match(/^([a-zA-Z0-9-_]+)$/);
            const folderId = match ? match[1] : folderLink;

            const response = await fetch('/api/admin/onboard-gallery', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    folderId,
                    name: `Gallery by ${invitation.email}`,
                    ownerId: user.id // Link to user
                })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to publish');

            setStep(4); // Success step
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        } finally {
            setPublishLoading(false);
        }
    };

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>;
    if (error) return <div className="min-h-screen bg-black flex items-center justify-center text-red-500 font-bold">{error}</div>;

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
                            <p className="text-zinc-400 text-sm mb-6 text-center">Paste the link to your shared Google Drive folder.</p>

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
                                    {publishLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Publish Gallery'}
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
        </div>
    );
}
