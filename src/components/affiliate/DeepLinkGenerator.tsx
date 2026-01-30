import { useState } from 'react';
import { AdminBentoCard } from '../ui/admin-bento-card';
import { LinkIcon, ClipboardIcon, CheckIcon, ArrowTopRightOnSquareIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface DeepLinkGeneratorProps {
    affiliateCode: string;
}

export default function DeepLinkGenerator({ affiliateCode }: DeepLinkGeneratorProps) {
    const [targetUrl, setTargetUrl] = useState('');
    const [generatedLink, setGeneratedLink] = useState('');
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const generateLink = () => {
        setError(null);
        if (!targetUrl.trim()) {
            setGeneratedLink('');
            return;
        }

        try {
            let urlStr = targetUrl.trim();

            // If relative path, prepend origin
            if (urlStr.startsWith('/')) {
                urlStr = window.location.origin + urlStr;
            }
            // If no protocol, assume https
            else if (!urlStr.match(/^https?:\/\//)) {
                urlStr = 'https://' + urlStr;
            }

            const url = new URL(urlStr);

            // Add ref param
            url.searchParams.set('ref', affiliateCode);

            setGeneratedLink(url.toString());
        } catch (e) {
            setError('Please enter a valid URL (e.g., https://thelostandunfounds.com/shop/book)');
            setGeneratedLink('');
        }
    };

    const copyToClipboard = () => {
        if (!generatedLink) return;
        navigator.clipboard.writeText(generatedLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <AdminBentoCard
            title="Deep Link Generator"
            icon={<LinkIcon className="w-4 h-4" />}
            colSpan={12}
            className="min-h-[200px]"
        >
            <div className="space-y-6">
                <div>
                    <label className="text-[10px] items-center font-bold text-white/40 uppercase tracking-widest mb-2 block">
                        Target Page URL
                    </label>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <MagnifyingGlassIcon className="h-4 w-4 text-white/40" />
                            </div>
                            <input
                                type="text"
                                value={targetUrl}
                                onChange={(e) => setTargetUrl(e.target.value)}
                                placeholder="Paste any shop URL (e.g. /shop/poster-1)"
                                className="w-full bg-black border border-white/20 pl-10 pr-4 py-3 text-white text-sm focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all placeholder:text-white/20 font-mono"
                                onKeyDown={(e) => e.key === 'Enter' && generateLink()}
                            />
                        </div>
                        <button
                            onClick={generateLink}
                            className="px-6 py-3 bg-white/10 border border-white/20 text-white font-bold uppercase tracking-wider text-xs hover:bg-white hover:text-black transition-all"
                        >
                            Generate
                        </button>
                    </div>
                    {error && <div className="mt-2 text-red-500 text-xs font-bold uppercase tracking-wider">{error}</div>}
                </div>

                {generatedLink && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                        <label className="text-[10px] items-center font-bold text-green-400 uppercase tracking-widest mb-2 block flex gap-2">
                            <CheckIcon className="w-3 h-3" /> Ready to Share
                        </label>
                        <div className="flex flex-col md:flex-row gap-2">
                            <input
                                type="text"
                                readOnly
                                value={generatedLink}
                                className="flex-1 bg-white/5 border border-white/10 px-4 py-3 text-white/80 text-sm font-mono focus:outline-none"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={copyToClipboard}
                                    className="px-6 py-3 bg-white text-black font-bold uppercase tracking-wider text-xs hover:bg-white/90 transition-all flex items-center gap-2 min-w-[140px] justify-center"
                                >
                                    {copied ? <CheckIcon className="w-4 h-4" /> : <ClipboardIcon className="w-4 h-4" />}
                                    {copied ? 'Copied' : 'Copy Link'}
                                </button>
                                <a
                                    href={generatedLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-4 py-3 bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all flex items-center justify-center"
                                    title="Test Link"
                                >
                                    <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                                </a>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-blue-500/5 border border-blue-500/20 p-4">
                    <h4 className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-1">PRO TIP</h4>
                    <p className="text-white/60 text-xs leading-relaxed">
                        Linking directly to a specific product or collection increases conversion rates by up to 300% compared to linking to the homepage.
                    </p>
                </div>
            </div>
        </AdminBentoCard>
    );
}
