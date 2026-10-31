/**
 * Portfolios — the public page a photographer or affiliate shows the world.
 *
 * Data lives in portfolios / portfolio_posts / portfolio_clients, written
 * straight from the browser under RLS (owner only; only photographers,
 * affiliates and the admin may create one). Files live in the public
 * `portfolio-media` bucket under `<user id>/...`.
 *
 * Embeds store only the provider's video id. The iframe URL is built here at
 * render time, and the database refuses an id that is not the provider's
 * shape, so a post can never point an iframe somewhere else.
 */

import { supabase } from './supabase';

export const PORTFOLIO_BUCKET = 'portfolio-media';
export const PORTFOLIO_MAX_MB = 100;
export const PORTFOLIO_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const PORTFOLIO_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

export type PostKind = 'photo' | 'video' | 'embed' | 'text';
export type EmbedProvider = 'youtube' | 'tiktok';

export interface Portfolio {
  id: string;
  user_id: string;
  handle: string;
  display_name: string;
  tagline: string | null;
  bio: string | null;
  location: string | null;
  avatar_path: string | null;
  instagram: string | null;
  tiktok: string | null;
  youtube: string | null;
  website: string | null;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export interface PortfolioPost {
  id: string;
  portfolio_id: string;
  user_id: string;
  kind: PostKind;
  media_path: string | null;
  provider: EmbedProvider | null;
  embed_id: string | null;
  title: string | null;
  caption: string | null;
  pinned: boolean;
  created_at: string;
}

export interface PortfolioClient {
  id: string;
  portfolio_id: string;
  user_id: string;
  name: string;
  logo_path: string;
  website: string | null;
  position: number;
  created_at: string;
}

/** Public URL for a file in the portfolio bucket. */
export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return supabase.storage.from(PORTFOLIO_BUCKET).getPublicUrl(path).data.publicUrl;
}

export function portfolioPath(handle: string): string {
  return `/portfolio/${handle}`;
}

export function portfolioUrl(handle: string): string {
  return `https://www.thelostandunfounds.com${portfolioPath(handle)}`;
}

/* ── Handles ─────────────────────────────────────────────────────────── */

/** Same rule as the database check: 3–30 chars, a–z 0–9 and inner hyphens. */
export const HANDLE_PATTERN = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;

export function normalizeHandle(raw: string): string {
  return (raw || '')
    .toLowerCase()
    .replace(/^@/, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30);
}

export function isValidHandle(handle: string): boolean {
  return HANDLE_PATTERN.test(handle);
}

/** Social handles: what the database accepts, minus a leading @ or URL. */
export function cleanSocialHandle(raw: string, allowHyphen = false): string | null {
  let v = (raw || '').trim();
  if (!v) return null;
  v = v.replace(/^https?:\/\/(www\.)?[^/]+\/(@)?/i, '').replace(/^@/, '').split(/[/?#]/)[0];
  const ok = allowHyphen ? /^[A-Za-z0-9._-]{1,60}$/ : /^[A-Za-z0-9._]{1,30}$/;
  return ok.test(v) ? v : null;
}

export function cleanWebsite(raw: string): string | null {
  const v = (raw || '').trim();
  if (!v) return null;
  const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    if (!u.hostname.includes('.')) return null;
    return u.toString().slice(0, 300);
  } catch {
    return null;
  }
}

/* ── Embeds ──────────────────────────────────────────────────────────── */

export interface ParsedEmbed {
  provider: EmbedProvider;
  id: string;
}

const YT_ID = /^[A-Za-z0-9_-]{11}$/;
const TT_ID = /^[0-9]{6,25}$/;

/**
 * Turn a pasted YouTube or TikTok link into a provider + id, or say why not.
 * TikTok short links (vm.tiktok.com / tiktok.com/t/...) hide the id behind a
 * redirect the browser cannot follow, so they are refused with a fix.
 */
export function parseEmbed(input: string): ParsedEmbed | { error: string } {
  const raw = (input || '').trim();
  if (!raw) return { error: 'Paste a YouTube or TikTok link.' };
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return { error: 'That is not a link.' };
  }
  const host = url.hostname.replace(/^(www\.|m\.|music\.)/, '').toLowerCase();

  if (host === 'youtu.be') {
    const id = url.pathname.split('/')[1] || '';
    return YT_ID.test(id) ? { provider: 'youtube', id } : { error: 'That YouTube link has no video in it.' };
  }
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const v = url.searchParams.get('v');
    if (v && YT_ID.test(v)) return { provider: 'youtube', id: v };
    const m = url.pathname.match(/^\/(?:shorts|embed|live|v)\/([A-Za-z0-9_-]{11})/);
    if (m) return { provider: 'youtube', id: m[1] };
    return { error: 'Use the link to one video, not a channel or playlist.' };
  }
  if (host === 'vm.tiktok.com' || host === 'vt.tiktok.com' || (host === 'tiktok.com' && url.pathname.startsWith('/t/'))) {
    return { error: 'That is a TikTok short link. Open it, then copy the full link from your browser (it has /video/ in it).' };
  }
  if (host === 'tiktok.com') {
    const m = url.pathname.match(/\/(?:video|photo)\/(\d{6,25})/) || url.pathname.match(/^\/embed(?:\/v2)?\/(\d{6,25})/);
    if (m && TT_ID.test(m[1])) return { provider: 'tiktok', id: m[1] };
    return { error: 'Use the link to one TikTok video (it has /video/ in it).' };
  }
  return { error: 'Only YouTube and TikTok links can be embedded.' };
}

/** The only iframe URLs a portfolio ever renders. */
export function embedSrc(provider: EmbedProvider, id: string): string | null {
  if (provider === 'youtube' && YT_ID.test(id)) return `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
  if (provider === 'tiktok' && TT_ID.test(id)) return `https://www.tiktok.com/embed/v2/${id}`;
  return null;
}

/* ── Uploads ─────────────────────────────────────────────────────────── */

export function kindForFile(file: File): 'photo' | 'video' | null {
  if (PORTFOLIO_IMAGE_TYPES.includes(file.type)) return 'photo';
  if (PORTFOLIO_VIDEO_TYPES.includes(file.type)) return 'video';
  return null;
}

function safeName(name: string): string {
  const dot = name.lastIndexOf('.');
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) : 'bin';
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
}

/** Upload one file to `<user>/<folder>/...` and return its storage path. */
export async function uploadPortfolioFile(userId: string, folder: 'posts' | 'clients' | 'avatar', file: File): Promise<string> {
  if (file.size > PORTFOLIO_MAX_MB * 1024 * 1024) {
    throw new Error(`${file.name} is over ${PORTFOLIO_MAX_MB}MB.`);
  }
  const path = `${userId}/${folder}/${safeName(file.name)}`;
  const { error } = await supabase.storage.from(PORTFOLIO_BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) throw new Error(`${file.name}: ${error.message}`);
  return path;
}

/** Best-effort: a row is already gone, so a leftover file is only clutter. */
export async function removePortfolioFile(path: string | null | undefined): Promise<void> {
  if (!path) return;
  await supabase.storage.from(PORTFOLIO_BUCKET).remove([path]).catch(() => undefined);
}
