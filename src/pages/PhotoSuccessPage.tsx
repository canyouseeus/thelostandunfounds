import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, CheckCircle, ArrowLeft } from 'lucide-react';
import Loading from '../components/Loading';

interface Entitlement {
    photoId: string;
    token: string;
    photoTitle?: string;
}

const PhotoSuccessPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const orderId = searchParams.get('token'); // PayPal's token often used as redirect param
    const [loading, setLoading] = useState(true);
    const [entitlements, setEntitlements] = useState<Entitlement[]>([]);

    useEffect(() => {
        if (orderId) {
            captureAndFetchEntitlements();
        }
    }, [orderId]);

    async function captureAndFetchEntitlements() {
        try {
            setLoading(true);
            // Call our capture API
            const response = await fetch('/api/photos/capture', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId })
            });

            const data = await response.json();
            if (data.success) {
                setEntitlements(data.entitlements);
            }
        } catch (err) {
            console.error('Error capturing payment:', err);
        } finally {
            setLoading(false);
        }
    }

    if (loading) return <Loading />;

    return (
        <div className="min-h-screen bg-black pt-32 pb-20 px-4 md:px-8 flex items-center justify-center">
            <div className="max-w-2xl w-full text-left">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="mb-8 flex justify-start"
                >
                    <div className="bg-green-500/10 p-6 rounded-full">
                        <CheckCircle className="w-20 h-20 text-green-500" />
                    </div>
                </motion.div>

                <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tighter uppercase">
                    Access Granted
                </h1>
                <p className="text-zinc-500 text-lg mb-12 text-left">
                    Your payment was successful. You can now download your high-resolution photos.
                    These links will expire in 48 hours.
                </p>

                <div className="space-y-4 mb-12">
                    {entitlements.map((e, i) => (
                        <motion.div
                            key={e.token}
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: i * 0.1 }}
                            className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center justify-between"
                        >
                            <div className="text-left">
                                <span className="text-white font-medium block">Photo Download #{i + 1}</span>
                                <span className="text-zinc-500 text-xs">Ready for high-res save</span>
                            </div>
                            <a
                                href={`/api/photos/download?token=${e.token}`}
                                className="bg-white text-black px-6 py-2 rounded-full font-bold flex items-center gap-2 hover:bg-zinc-200 transition-colors"
                                download
                            >
                                <Download className="w-4 h-4" />
                                <span>Download</span>
                            </a>
                        </motion.div>
                    ))}
                </div>

                <Link
                    to="/photos/kattitude-tattoo"
                    className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Return to Gallery</span>
                </Link>
            </div>
        </div>
    );
};

export default PhotoSuccessPage;
