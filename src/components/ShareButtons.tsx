import React, { useState, useEffect, useRef } from 'react';
import { Share2, Twitter, Facebook, Linkedin, Link2, Check } from 'lucide-react';

interface ShareButtonsProps {
  title: string;
  url: string;
  description?: string;
}

export default function ShareButtons({ title, url, description }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const fullUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}${url}` 
    : url;

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [menuOpen]);

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description || title,
          url: fullUrl,
        });
        setMenuOpen(false);
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
      setTimeout(() => {
        setCopied(false);
        setMenuOpen(false);
      }, 1500);
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
        setTimeout(() => {
          setCopied(false);
          setMenuOpen(false);
        }, 1500);
      } catch (fallbackErr) {
        console.error('Fallback copy failed:', fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  };

  const shareToTwitter = () => {
    const text = description ? `${title} - ${description}` : title;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(fullUrl)}`;
    const width = 550;
    const height = 420;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    window.open(
      twitterUrl,
      'twitter-share',
      `width=${width},height=${height},left=${left},top=${top},toolbar=0,status=0`
    );
    setMenuOpen(false);
  };

  const shareToFacebook = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullUrl)}`;
    const width = 600;
    const height = 400;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    window.open(
      facebookUrl,
      'facebook-share',
      `width=${width},height=${height},left=${left},top=${top},toolbar=0,status=0`
    );
    setMenuOpen(false);
  };

  const shareToLinkedIn = () => {
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(fullUrl)}`;
    const width = 600;
    const height = 500;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    window.open(
      linkedInUrl,
      'linkedin-share',
      `width=${width},height=${height},left=${left},top=${top},toolbar=0,status=0`
    );
    setMenuOpen(false);
  };

  const shareToReddit = () => {
    const redditUrl = `https://reddit.com/submit?title=${encodeURIComponent(title)}&url=${encodeURIComponent(fullUrl)}`;
    const width = 600;
    const height = 500;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    window.open(
      redditUrl,
      'reddit-share',
      `width=${width},height=${height},left=${left},top=${top},toolbar=0,status=0`
    );
    setMenuOpen(false);
  };

  const supportsNativeShare = typeof navigator !== 'undefined' && navigator.share;

  return (
    <div className="mt-8 pt-8 border-t border-white/10">
      <div className="relative inline-block" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium transition rounded-none"
          aria-label="Share this post"
          aria-expanded={menuOpen}
        >
          <Share2 className="w-4 h-4" />
          <span>Share</span>
        </button>
        
        {menuOpen && (
          <div className="absolute top-full left-0 mt-2 bg-black/95 border border-white/20 rounded-none min-w-[180px] z-50 shadow-lg">
            <div className="py-1">
              {supportsNativeShare && (
                <button
                  onClick={handleNativeShare}
                  className="w-full px-4 py-2 text-left text-white hover:bg-white hover:text-black transition flex items-center gap-3 text-sm"
                  aria-label="Share via native share"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share via...</span>
                </button>
              )}
              <button
                onClick={shareToTwitter}
                className="w-full px-4 py-2 text-left text-white hover:bg-white hover:text-black transition flex items-center gap-3 text-sm"
                aria-label="Share on Twitter"
              >
                <Twitter className="w-4 h-4" />
                <span>Twitter</span>
              </button>
              <button
                onClick={shareToFacebook}
                className="w-full px-4 py-2 text-left text-white hover:bg-white hover:text-black transition flex items-center gap-3 text-sm"
                aria-label="Share on Facebook"
              >
                <Facebook className="w-4 h-4" />
                <span>Facebook</span>
              </button>
              <button
                onClick={shareToLinkedIn}
                className="w-full px-4 py-2 text-left text-white hover:bg-white hover:text-black transition flex items-center gap-3 text-sm"
                aria-label="Share on LinkedIn"
              >
                <Linkedin className="w-4 h-4" />
                <span>LinkedIn</span>
              </button>
              <button
                onClick={shareToReddit}
                className="w-full px-4 py-2 text-left text-white hover:bg-white hover:text-black transition flex items-center gap-3 text-sm"
                aria-label="Share on Reddit"
              >
                <span className="text-base leading-none">🔴</span>
                <span>Reddit</span>
              </button>
              <button
                onClick={handleCopyLink}
                className="w-full px-4 py-2 text-left text-white hover:bg-white hover:text-black transition flex items-center gap-3 text-sm"
                aria-label="Copy link"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
