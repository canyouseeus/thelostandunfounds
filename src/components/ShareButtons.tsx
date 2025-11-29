import React, { useState } from 'react';
import { Share2, Twitter, Facebook, Linkedin, Link2, Check } from 'lucide-react';

interface ShareButtonsProps {
  title: string;
  url: string;
  description?: string;
}

export default function ShareButtons({ title, url, description }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const fullUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}${url}` 
    : url;

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description || title,
          url: fullUrl,
        });
      } catch (err) {
        // User cancelled or error occurred
        console.log('Share cancelled or failed');
      }
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = fullUrl;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackErr) {
        console.error('Fallback copy failed:', fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  };

  const shareToTwitter = () => {
    const text = description ? `${title} - ${description}` : title;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(fullUrl)}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
  };

  const shareToFacebook = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullUrl)}`;
    window.open(facebookUrl, '_blank', 'noopener,noreferrer');
  };

  const shareToLinkedIn = () => {
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(fullUrl)}`;
    window.open(linkedInUrl, '_blank', 'noopener,noreferrer');
  };

  const shareToReddit = () => {
    const redditUrl = `https://reddit.com/submit?title=${encodeURIComponent(title)}&url=${encodeURIComponent(fullUrl)}`;
    window.open(redditUrl, '_blank', 'noopener,noreferrer');
  };

  const supportsNativeShare = typeof navigator !== 'undefined' && navigator.share;

  return (
    <div className="mt-8 pt-8 border-t border-white/10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <span className="text-white/60 text-sm font-medium whitespace-nowrap">Share this post:</span>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {supportsNativeShare && (
            <button
              onClick={handleNativeShare}
              className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium transition rounded-none min-w-[60px] sm:min-w-0"
              aria-label="Share"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Share</span>
            </button>
          )}
          <button
            onClick={shareToTwitter}
            className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium transition rounded-none"
            aria-label="Share on Twitter"
            title="Share on Twitter"
          >
            <Twitter className="w-4 h-4" />
            <span className="hidden sm:inline">Twitter</span>
          </button>
          <button
            onClick={shareToFacebook}
            className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium transition rounded-none"
            aria-label="Share on Facebook"
            title="Share on Facebook"
          >
            <Facebook className="w-4 h-4" />
            <span className="hidden sm:inline">Facebook</span>
          </button>
          <button
            onClick={shareToLinkedIn}
            className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium transition rounded-none"
            aria-label="Share on LinkedIn"
            title="Share on LinkedIn"
          >
            <Linkedin className="w-4 h-4" />
            <span className="hidden sm:inline">LinkedIn</span>
          </button>
          <button
            onClick={shareToReddit}
            className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium transition rounded-none"
            aria-label="Share on Reddit"
            title="Share on Reddit"
          >
            <span className="text-base leading-none">🔴</span>
            <span className="hidden sm:inline">Reddit</span>
          </button>
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium transition rounded-none"
            aria-label="Copy link"
            title="Copy link to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                <span className="hidden sm:inline">Copied!</span>
              </>
            ) : (
              <>
                <Link2 className="w-4 h-4" />
                <span className="hidden sm:inline">Copy Link</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
