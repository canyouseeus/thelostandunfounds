/**
 * Public portfolio — /portfolio/:handle
 *
 * A photographer's or affiliate's own page, Tumblr-style: one masonry feed of
 * photos, videos, YouTube/TikTok embeds and text posts, with the brands they
 * have worked with up top. Read under RLS: anyone sees a published portfolio,
 * the owner also sees their own draft (with a PREVIEW banner).
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MapPinIcon, GlobeAltIcon, XMarkIcon } from '@heroicons/react/24/outline';
import SEOHead from '../components/SEOHead';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  embedSrc,
  mediaUrl,
  portfolioPath,
  type Portfolio as PortfolioRow,
  type PortfolioClient,
  type PortfolioPost,
} from '../lib/portfolio';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function PostMedia({ post, onOpenPhoto }: { post: PortfolioPost; onOpenPhoto?: (url: string) => void }) {
  if (post.kind === 'photo' && post.media_path) {
    const url = mediaUrl(post.media_path)!;
    return (
      <button type="button" onClick={() => onOpenPhoto?.(url)} className="block w-full cursor-zoom-in" style={{ borderRadius: 0 }}>
        <img src={url} alt={post.title || post.caption || 'Portfolio photo'} loading="lazy" className="w-full h-auto block" />
      </button>
    );
  }
  if (post.kind === 'video' && post.media_path) {
    return (
      <video src={mediaUrl(post.media_path)!} controls playsInline preload="metadata" className="w-full h-auto block bg-black" />
    );
  }
  if (post.kind === 'embed' && post.provider && post.embed_id) {
    const src = embedSrc(post.provider, post.embed_id);
    if (!src) return null;
    // YouTube is landscape; TikTok's player is a tall card with its own chrome.
    const ratio = post.provider === 'youtube' ? 'aspect-video' : 'aspect-[9/16] max-h-[740px]';
    return (
      <div className={`relative w-full ${ratio} bg-black`}>
        <iframe
          src={src}
          title={post.title || `${post.provider} video`}
          className="absolute inset-0 w-full h-full"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
        />
      </div>
    );
  }
  return null;
}

export function PostCard({ post, onOpenPhoto }: { post: PortfolioPost; onOpenPhoto?: (url: string) => void }) {
  const isText = post.kind === 'text';
  return (
    <article className="break-inside-avoid mb-4 bg-white/5" style={{ borderRadius: 0 }}>
      {!isText && <PostMedia post={post} onOpenPhoto={onOpenPhoto} />}
      {(post.title || post.caption || post.pinned) && (
        <div className={isText ? 'p-6' : 'p-4'}>
          {post.pinned && (
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 mb-2">Pinned</p>
          )}
          {post.title && (
            <h2 className={`font-black uppercase tracking-wide text-white text-left ${isText ? 'text-xl mb-3' : 'text-sm mb-1'}`}>
              {post.title}
            </h2>
          )}
          {post.caption && (
            <p className={`text-left whitespace-pre-line break-words ${isText ? 'text-white/80 text-base leading-relaxed' : 'text-white/60 text-sm leading-relaxed'}`}>
              {post.caption}
            </p>
          )}
        </div>
      )}
      <p className={`text-[9px] font-bold uppercase tracking-[0.25em] text-white/25 ${isText ? 'px-6' : 'px-4'} ${post.title || post.caption || post.pinned ? 'pb-4' : 'py-3'}`}>
        {formatDate(post.created_at)}
      </p>
    </article>
  );
}

export function WorkedWith({ clients }: { clients: PortfolioClient[] }) {
  if (!clients.length) return null;
  return (
    <section className="mb-10">
      <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 mb-4 text-left">Worked With</h2>
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
        {clients.map(c => {
          const tile = (
            <div className="aspect-[3/2] bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center p-4 group" title={c.name}>
              <img
                src={mediaUrl(c.logo_path)!}
                alt={c.name}
                loading="lazy"
                className="max-w-full max-h-full object-contain grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition"
              />
            </div>
          );
          return c.website ? (
            <a key={c.id} href={c.website} target="_blank" rel="noopener noreferrer nofollow">{tile}</a>
          ) : (
            <div key={c.id}>{tile}</div>
          );
        })}
      </div>
    </section>
  );
}

export default function Portfolio() {
  const { handle = '' } = useParams();
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState<PortfolioRow | null>(null);
  const [posts, setPosts] = useState<PortfolioPost[]>([]);
  const [clients, setClients] = useState<PortfolioClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data: p, error: pErr } = await supabase
        .from('portfolios')
        .select('*')
        .eq('handle', handle.toLowerCase())
        .maybeSingle();
      if (cancelled) return;
      if (pErr) { setError(pErr.message); setLoading(false); return; }
      if (!p) { setPortfolio(null); setLoading(false); return; }
      const [postsRes, clientsRes] = await Promise.all([
        supabase.from('portfolio_posts').select('*').eq('portfolio_id', p.id)
          .order('pinned', { ascending: false }).order('created_at', { ascending: false }),
        supabase.from('portfolio_clients').select('*').eq('portfolio_id', p.id)
          .order('position', { ascending: true }).order('created_at', { ascending: true }),
      ]);
      if (cancelled) return;
      setPortfolio(p as PortfolioRow);
      setPosts((postsRes.data || []) as PortfolioPost[]);
      setClients((clientsRes.data || []) as PortfolioClient[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [handle, user?.id]);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightbox(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox]);

  const ogImage = useMemo(() => {
    const firstPhoto = posts.find(p => p.kind === 'photo')?.media_path;
    return mediaUrl(portfolio?.avatar_path) || mediaUrl(firstPhoto) || undefined;
  }, [portfolio, posts]);

  const shell = 'min-h-screen bg-black text-white px-4 sm:px-6 lg:px-8 py-12';

  if (loading) {
    return (
      <div className={shell}>
        <p className="max-w-6xl mx-auto text-white/40 text-xs uppercase tracking-[0.3em]">Loading…</p>
      </div>
    );
  }

  if (error || !portfolio) {
    return (
      <div className={shell}>
        <SEOHead title="Portfolio Not Found" description="This portfolio does not exist." canonicalPath={portfolioPath(handle)} noIndex />
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-black uppercase tracking-widest mb-4 text-left">PORTFOLIO NOT FOUND</h1>
          <p className="text-white/60 text-left">{error || 'Nobody has published a portfolio at this address.'}</p>
          <Link to="/" className="inline-block mt-8 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white">Home</Link>
        </div>
      </div>
    );
  }

  const name = portfolio.display_name || portfolio.handle;
  const isOwner = user?.id === portfolio.user_id;
  const links = [
    portfolio.instagram && { label: 'Instagram', href: `https://instagram.com/${portfolio.instagram}` },
    portfolio.tiktok && { label: 'TikTok', href: `https://www.tiktok.com/@${portfolio.tiktok}` },
    portfolio.youtube && { label: 'YouTube', href: `https://www.youtube.com/@${portfolio.youtube}` },
  ].filter(Boolean) as Array<{ label: string; href: string }>;

  return (
    <div className={shell}>
      <SEOHead
        title={`${name} — Portfolio`}
        description={portfolio.tagline || portfolio.bio?.slice(0, 155) || `${name} on THE LOST+UNFOUNDS.`}
        canonicalPath={portfolioPath(portfolio.handle)}
        ogImage={ogImage}
        noIndex={!portfolio.published}
      />
      <div className="max-w-6xl mx-auto">
        {isOwner && !portfolio.published && (
          <div className="bg-white/10 px-4 py-3 mb-8 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Preview — only you can see this. Publish it from your dashboard.</p>
            <Link to="/dashboard?section=portfolio" className="text-[10px] font-black uppercase tracking-widest bg-white text-black px-3 py-2 hover:bg-white/80" style={{ borderRadius: 0 }}>
              Edit
            </Link>
          </div>
        )}

        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-end gap-6 mb-10">
          {portfolio.avatar_path ? (
            <img src={mediaUrl(portfolio.avatar_path)!} alt={name} className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-white text-black flex items-center justify-center text-4xl font-black shrink-0">
              {name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1 text-left">
            <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-tight leading-none break-words">{name}</h1>
            {portfolio.tagline && <p className="text-white/70 text-base sm:text-lg mt-3">{portfolio.tagline}</p>}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 text-[10px] font-black uppercase tracking-widest text-white/40">
              {portfolio.location && (
                <span className="flex items-center gap-1"><MapPinIcon className="w-3 h-3" />{portfolio.location}</span>
              )}
              {links.map(l => (
                <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">{l.label}</a>
              ))}
              {portfolio.website && (
                <a href={portfolio.website} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-1 hover:text-white transition-colors">
                  <GlobeAltIcon className="w-3 h-3" />Website
                </a>
              )}
            </div>
          </div>
        </header>

        {portfolio.bio && (
          <p className="text-white/70 text-base leading-relaxed whitespace-pre-line max-w-3xl mb-10 text-left">{portfolio.bio}</p>
        )}

        <WorkedWith clients={clients} />

        {posts.length === 0 ? (
          <p className="text-white/40 text-sm text-left">Nothing posted yet.</p>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
            {posts.map(post => <PostCard key={post.id} post={post} onOpenPhoto={setLightbox} />)}
          </div>
        )}

        <p className="mt-16 text-[9px] font-black uppercase tracking-[0.4em] text-white/20 text-left">
          On <Link to="/" className="hover:text-white">THE LOST+UNFOUNDS</Link>
        </p>
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
        >
          <button className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white hover:text-black transition-colors" aria-label="Close" style={{ borderRadius: 0 }}>
            <XMarkIcon className="w-5 h-5" />
          </button>
          <img src={lightbox} alt="" className="max-w-full max-h-full object-contain" />
        </div>
      )}
    </div>
  );
}
