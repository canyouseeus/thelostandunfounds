import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowDownTrayIcon, CheckCircleIcon, ArrowLeftIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import Loading from '../components/Loading';

interface Entitlement {
    photoId: string;
    token: string;
    photoTitle?: string;
    thumbnailUrl?: string; // Added from backend update
}

const PhotoSuccessPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const orderId = searchParams.get('token');
    const [loading, setLoading] = useState(true);
    const [zipping, setZipping] = useState(false);
    const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
    const [libraryTitle, setLibraryTitle] = useState<string>('GALLERY');

    useEffect(() => {
        if (orderId) {
            captureAndFetchEntitlements();
        }
    }, [orderId]);

    async function captureAndFetchEntitlements() {
        try {
            setLoading(true);
            const response = await fetch('/api/gallery/capture', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId })
            });

            const data = await response.json();
            if (data.success) {
                setEntitlements(data.entitlements || []);
                if (data.libraryTitle) {
                    setLibraryTitle(data.libraryTitle);
                }
            }
        } catch (err) {
            console.error('Error capturing payment:', err);
        } finally {
            setLoading(false);
        }
    }

    const handleDownloadAll = async () => {
        if (entitlements.length === 0) return;
        setZipping(true);

        try {
            const zip = new JSZip();
            const fetchPromises = entitlements.map(async (e, i) => {
                const url = `/api/photos/download?token=${e.token}`;
                try {
                    const response = await fetch(url);
                    if (!response.ok) throw new Error('Network response was not ok');
                    const blob = await response.blob();
                    // Use title or fallback filename
                    const filename = e.photoTitle ? `${e.photoTitle}.jpg` : `photo_${i + 1}.jpg`;
                    zip.file(filename, blob);
                } catch (err) {
                    console.error(`Failed to fetch photo ${e.photoId}`, err);
                }
            });

            await Promise.all(fetchPromises);
            const content = await zip.generateAsync({ type: 'blob' });

            // Format: THE_LOST+UNFOUNDS_ORDER_[SHORT_ID]_[GALLERY_NAME]
            const shortId = orderId ? (orderId.includes('-') ? orderId.split('-')[0] : orderId.substring(0, 8)) : 'DOCS';
            const galleryName = libraryTitle.replace(/\s+/g, '_');
            const finalFilename = `THE_LOST+UNFOUNDS_ORDER_${shortId}_${galleryName}`.toUpperCase();

            saveAs(content, `${finalFilename}.zip`);
        } catch (err) {
            console.error('Error creating zip:', err);
            alert('Could not download all photos. Please try downloading individually.');
        } finally {
            setZipping(false);
        }
    };

    if (loading) return <Loading />;

    return (
        <div className="min-h-screen bg-black pt-32 pb-20 px-4 md:px-8 flex flex-col items-center">
            <div className="max-w-5xl w-full">
                <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-8 gap-6">
                    <div className="text-left max-w-2xl">
                        <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tighter uppercase">
                            Access Granted
                        </h1>
                        <p className="text-zinc-500 text-lg text-left max-w-xl">
                            Your payment was successful. You can now download your high-resolution photos.
                            These links will expire in 48 hours.
                        </p>
                    </div>

                    <button
                        onClick={handleDownloadAll}
                        disabled={zipping || entitlements.length === 0}
                        className="bg-white text-black px-6 py-2 rounded-none font-bold text-sm flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider shrink-0"
                    >
                        {zipping ? (
                            <>
                                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                <span>Zipping...</span>
                            </>
                        ) : (
                            <>
                                <ArrowDownTrayIcon className="w-4 h-4" />
                                <span>Download All ({entitlements.length})</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Grid Layout */}
                <div className="grid grid-cols-3 gap-0 mb-16">
                    {entitlements.map((e, i) => (
                        <motion.div
                            key={e.token}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: i * 0.05 }}
                            className="group relative aspect-square bg-zinc-900 overflow-hidden"
                        >
                            {/* Thumbnail */}
                            {e.thumbnailUrl ? (
                                <img
                                    src={e.thumbnailUrl}
                                    alt="Purchased content"
                                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300"
                                    referrerPolicy="no-referrer"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-600">
                                    No Preview
                                </div>
                            )}

                            {/* Overlay */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-end p-4">
                                <a
                                    href={`/api/photos/download?token=${e.token}`}
                                    className="bg-white text-black w-full py-1.5 rounded-none font-bold text-[9px] flex items-center justify-center gap-1.5 hover:bg-zinc-200 transition-transform transform translate-y-2 group-hover:translate-y-0 duration-300 uppercase tracking-[0.2em]"
                                    download
                                >
                                    <ArrowDownTrayIcon className="w-3 h-3" />
                                    <span>Download</span>
                                </a>
                            </div>

                            {/* Badge */}
                            <div className="absolute top-2 left-2 bg-green-500 text-black text-[7px] md:text-[8px] font-black px-1.5 py-0.5 rounded-none uppercase tracking-[0.2em] shadow-lg">
                                PROPRIETARY
                            </div>
                        </motion.div>
                    ))}
                </div>

                <div className="border-t border-zinc-800 pt-8 flex justify-between items-center">
                    <Link
                        to="/gallery/kattitude-tattoo"
                        className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors"
                    >
                        <ArrowLeftIcon className="w-4 h-4" />
                        <span>Return to Gallery</span>
                    </Link>
                    <span className="text-zinc-600 text-sm">Order ID: {orderId}</span>
                </div>
            </div>
        </div>
    );
};

export default PhotoSuccessPage;
