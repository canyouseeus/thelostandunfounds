import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, Check, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { supabase } from '../lib/supabase';

const DownloadPortal: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const navigate = useNavigate();

    // State
    const [email, setEmail] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [verified, setVerified] = useState(false);
    const [photos, setPhotos] = useState<any[]>([]);
    const [downloading, setDownloading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('');
    const [error, setError] = useState('');

    // Verify order and fetch photos
    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setVerifying(true);
        setError('');

        try {
            // 1. Verify credentials match an order
            const { data: order, error: orderError } = await supabase
                .from('photo_orders')
                .select('id, created_at')
                .eq('id', orderId)
                .eq('email', email)
                .single();

            if (orderError || !order) {
                throw new Error('Order not found or email does not match.');
            }

            // 2. Fetch the photos
            const { data: entitlements, error: entError } = await supabase
                .from('photo_entitlements')
                .select('photo_id, photos (id, title, google_drive_file_id, mime_type, storage_path, thumbnail_url)')
                .eq('order_id', orderId);

            if (entError) throw entError;

            const photoData = entitlements?.map(e => e.photos) || [];

            if (photoData.length === 0) {
                throw new Error('No photos found for this order.');
            }

            setPhotos(photoData);
            setVerified(true);
        } catch (err: any) {
            setError(err.message || 'Verification failed');
        } finally {
            setVerifying(false);
        }
    };

    const downloadAll = async () => {
        if (!photos.length) return;

        setDownloading(true);
        setStatus('Initializing secure vault connection...');
        setProgress(5);

        try {
            const zip = new JSZip();
            const folder = zip.folder(`THE_LOST_UNFOUNDS_ORDER_${orderId?.slice(0, 8)}`);

            let completed = 0;
            const total = photos.length;

            // Process sequentially or in small batches to prevent browser hanging
            for (const photo of photos) {
                setStatus(`Retrieving artifact: ${photo.title}...`);

                try {
                    let response;

                    if (photo.storage_path && photo.thumbnail_url) {
                        // Direct Storage Download
                        response = await fetch(photo.thumbnail_url);
                    } else {
                        // Google Drive Proxy Download
                        // Use the local proxy stream to get the blob directly (bypassing CORS and Google's redirect issues)
                        response = await fetch(`/api/gallery/stream?fileId=${photo.google_drive_file_id}&download=true`);
                    }

                    if (!response.ok) {
                        console.error(`Failed to fetch ${photo.title}`);
                        continue;
                    }

                    const blob = await response.blob();
                    // Clean filename
                    const cleanTitle = (photo.title || 'untitled').replace(/[^a-z0-9]/gi, '_').toLowerCase();
                    const ext = photo.mime_type?.includes('video') ? 'mp4' : 'jpg'; // Basic assumption, can refine
                    const filename = `${cleanTitle}_${photo.id.slice(0, 4)}.${ext}`;

                    folder?.file(filename, blob);

                    completed++;
                    const percent = Math.round((completed / total) * 100);
                    setProgress(percent);
                } catch (err) {
                    console.error(`Error downloading ${photo.id}`, err);
                }
            }

            setStatus('Compressing archive...');
            const content = await zip.generateAsync({ type: 'blob' });

            setStatus('Finalizing download...');
            saveAs(content, `THE_LOST_UNFOUNDS_ORDER_${orderId?.slice(0, 8)}.zip`);

            setStatus('Download complete.');
            setTimeout(() => {
                setDownloading(false);
                setProgress(0);
                setStatus('');
            }, 3000);

        } catch (err: any) {
            setError('Download failed. Please try again or contact support.');
            setDownloading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center justify-center font-sans selection:bg-white selection:text-black">

            {/* Header */}
            <header className="mb-12 text-center space-y-4">
                <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase">Vault Access</h1>
                <p className="text-white/40 text-[10px] font-black tracking-[0.3em] uppercase">
                    Secure Artifact Retrieval System
                </p>
            </header>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-zinc-950 border border-white/10 p-8 rounded-2xl shadow-2xl relative overflow-hidden"
            >
                {/* Background Noise/Grain could go here */}

                {!verified ? (
                    <form onSubmit={handleVerify} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/50 pl-1">
                                Verify Identity
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="ENTER EMAIL USED FOR ORDER"
                                className="w-full bg-black/50 border border-white/20 rounded-xl p-4 text-sm font-medium text-white placeholder-white/20 focus:outline-none focus:border-white/50 transition-colors uppercase"
                                required
                            />
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-red-500 text-xs bg-red-950/30 p-4 rounded-lg border border-red-900/50">
                                <AlertCircle className="w-4 h-4" />
                                <span className="uppercase font-bold tracking-wide">{error}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={verifying}
                            className="w-full bg-white text-black h-12 rounded-xl text-xs font-black uppercase tracking-[0.2em] hover:bg-zinc-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Access Vault'}
                        </button>
                    </form>
                ) : (
                    <div className="space-y-8">
                        <div className="text-center space-y-2">
                            <div className="inline-flex items-center gap-2 text-green-500 text-[10px] font-black uppercase tracking-widest bg-green-950/30 px-3 py-1 rounded-full border border-green-900/50 mb-4">
                                <Check className="w-3 h-3" />
                                <span>Access Granted</span>
                            </div>
                            <h2 className="text-2xl font-bold">Order #{orderId?.slice(0, 8)}</h2>
                            <p className="text-white/40 text-xs font-medium">
                                {photos.length} Artifact{photos.length !== 1 && 's'} Found
                            </p>
                        </div>

                        {/* File Preview List (Tiny) */}
                        <div className="max-h-40 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            {photos.map(p => (
                                <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900/50 border border-white/5">
                                    <div className="w-1 h-1 rounded-full bg-white/50" />
                                    <span className="text-xs text-white/70 truncate flex-1 font-mono">{p.title}</span>
                                </div>
                            ))}
                        </div>

                        {downloading ? (
                            <div className="space-y-3">
                                <div className="h-12 bg-zinc-900 rounded-xl overflow-hidden relative border border-white/5">
                                    <motion.div
                                        className="absolute inset-y-0 left-0 bg-white"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                        transition={{ duration: 0.3 }}
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center mix-blend-difference">
                                        <span className="text-white text-[10px] font-black uppercase tracking-widest">
                                            {progress}%
                                        </span>
                                    </div>
                                </div>
                                <p className="text-center text-[10px] text-white/50 uppercase tracking-widest animate-pulse">
                                    {status}
                                </p>
                            </div>
                        ) : (
                            <button
                                onClick={downloadAll}
                                className="w-full bg-white text-black h-14 rounded-xl text-xs font-black uppercase tracking-[0.2em] hover:bg-zinc-200 transition-all flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                            >
                                <Download className="w-4 h-4" />
                                Download All (.ZIP)
                            </button>
                        )}

                        <button
                            onClick={() => navigate('/gallery')}
                            className="w-full text-[10px] text-white/30 uppercase tracking-widest hover:text-white transition-colors flex items-center justify-center gap-2"
                        >
                            <ArrowLeft className="w-3 h-3" />
                            Return to Gallery
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default DownloadPortal;
