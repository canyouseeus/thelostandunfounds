/**
 * PORTFOLIO app on /dashboard — for photographers, affiliates, writers and the admin.
 *
 * Writes go straight to Supabase under RLS (owner only), files to the public
 * portfolio-media bucket under the user's own folder. See src/lib/portfolio.ts.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowTopRightOnSquareIcon,
  ArrowUpTrayIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ClipboardIcon,
  CheckIcon,
  LinkIcon,
  PhotoIcon,
  DocumentTextIcon,
  TrashIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import { supabase } from '../../lib/supabase';
import { useToast } from '../Toast';
import { cn } from '../ui/utils';
import { PostCard } from '../../pages/Portfolio';
import {
  cleanSocialHandle,
  cleanWebsite,
  embedSrc,
  isValidHandle,
  kindForFile,
  mediaUrl,
  normalizeHandle,
  parseEmbed,
  portfolioPath,
  portfolioUrl,
  removePortfolioFile,
  uploadPortfolioFile,
  PORTFOLIO_IMAGE_TYPES,
  PORTFOLIO_VIDEO_TYPES,
  PORTFOLIO_MAX_MB,
  type Portfolio,
  type PortfolioClient,
  type PortfolioPost,
} from '../../lib/portfolio';

const input = 'w-full bg-white/5 px-4 py-3 text-base sm:text-sm text-white placeholder-white/30 focus:outline-none focus:bg-white/10 transition-colors';
const label = 'block text-[10px] font-black uppercase tracking-[0.25em] text-white/40 mb-2';
const primary = 'px-5 py-3 bg-white text-black text-[11px] font-black uppercase tracking-widest hover:bg-white/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
const secondary = 'flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold uppercase tracking-widest bg-white/10 text-white hover:bg-white hover:text-black transition-colors disabled:opacity-40';
const sq = { borderRadius: 0 } as const;

type Tab = 'posts' | 'clients' | 'profile';
type ComposeKind = 'media' | 'embed' | 'text';

function friendlyDbError(message: string): string {
  if (/portfolios_handle_key|duplicate key/i.test(message)) return 'That handle is taken. Try another.';
  if (/row-level security/i.test(message)) return 'Portfolios are for photographers, affiliates and writers. Join the affiliate program to get one.';
  return message;
}

export default function PortfolioEditor({ userId, suggestedHandle, suggestedName }: {
  userId: string;
  suggestedHandle?: string;
  suggestedName?: string;
}) {
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [posts, setPosts] = useState<PortfolioPost[]>([]);
  const [clients, setClients] = useState<PortfolioClient[]>([]);
  const [tab, setTab] = useState<Tab>('posts');
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const { data: p, error } = await supabase.from('portfolios').select('*').eq('user_id', userId).maybeSingle();
    if (error) { showError(error.message); setLoading(false); return; }
    setPortfolio((p as Portfolio) || null);
    if (p) {
      const [postsRes, clientsRes] = await Promise.all([
        supabase.from('portfolio_posts').select('*').eq('portfolio_id', p.id)
          .order('pinned', { ascending: false }).order('created_at', { ascending: false }),
        supabase.from('portfolio_clients').select('*').eq('portfolio_id', p.id)
          .order('position', { ascending: true }).order('created_at', { ascending: true }),
      ]);
      setPosts((postsRes.data || []) as PortfolioPost[]);
      setClients((clientsRes.data || []) as PortfolioClient[]);
    }
    setLoading(false);
  }, [userId, showError]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <p className="text-white/40 text-xs uppercase tracking-[0.3em]">Loading…</p>;

  if (!portfolio) {
    return <SetupCard userId={userId} suggestedHandle={suggestedHandle} suggestedName={suggestedName} onCreated={(p) => { setPortfolio(p); success('Portfolio created. Add your first post.'); }} />;
  }

  const togglePublished = async () => {
    const next = !portfolio.published;
    const { data, error } = await supabase.from('portfolios')
      .update({ published: next, updated_at: new Date().toISOString() })
      .eq('id', portfolio.id).select().single();
    if (error) return showError(friendlyDbError(error.message));
    setPortfolio(data as Portfolio);
    success(next ? 'Published. Anyone with the link can see it.' : 'Unpublished. Only you can see it now.');
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(portfolioUrl(portfolio.handle)).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-6 text-left">
      {/* Address + publish */}
      <div className="bg-white/5 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className={label}>Your page</p>
          <p className="font-mono text-sm text-white truncate">thelostandunfounds.com{portfolioPath(portfolio.handle)}</p>
          <p className="text-[10px] uppercase tracking-widest mt-1 text-white/40">
            {portfolio.published ? <span className="text-green-400">Published</span> : 'Draft — only you can see it'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <a data-tour="pf-public-link" href={portfolioPath(portfolio.handle)} target="_blank" rel="noopener noreferrer" className={secondary} style={sq}>
            <ArrowTopRightOnSquareIcon className="w-3 h-3" /> View
          </a>
          <button onClick={copyLink} className={secondary} style={sq}>
            {copied ? <CheckIcon className="w-3 h-3" /> : <ClipboardIcon className="w-3 h-3" />} {copied ? 'Copied' : 'Copy link'}
          </button>
          <button
            data-tour="pf-publish"
            onClick={togglePublished}
            className={portfolio.published ? secondary : 'px-3 py-2 text-[10px] font-black uppercase tracking-widest bg-white text-black hover:bg-white/80 transition-colors'}
            style={sq}
          >
            {portfolio.published ? 'Unpublish' : 'Publish'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1">
        {([['posts', `Posts (${posts.length})`], ['clients', `Worked With (${clients.length})`], ['profile', 'Profile']] as const).map(([id, text]) => (
          <button
            key={id}
            data-tour={`pf-tab-${id}`}
            onClick={() => setTab(id)}
            className={cn('px-3 sm:px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-colors', tab === id ? 'bg-white text-black' : 'bg-white/5 text-white/50 hover:text-white')}
            style={sq}
          >
            {text}
          </button>
        ))}
      </div>

      {tab === 'posts' && (
        <PostsTab
          userId={userId}
          portfolio={portfolio}
          posts={posts}
          onChange={setPosts}
          notify={success}
          fail={showError}
        />
      )}
      {tab === 'clients' && (
        <ClientsTab userId={userId} portfolio={portfolio} clients={clients} onChange={setClients} notify={success} fail={showError} />
      )}
      {tab === 'profile' && (
        <ProfileTab userId={userId} portfolio={portfolio} onSaved={(p) => { setPortfolio(p); success('Profile saved.'); }} fail={showError} />
      )}
    </div>
  );
}

/* ── First run ───────────────────────────────────────────────────────── */

function SetupCard({ userId, suggestedHandle, suggestedName, onCreated }: {
  userId: string;
  suggestedHandle?: string;
  suggestedName?: string;
  onCreated: (p: Portfolio) => void;
}) {
  const [handle, setHandle] = useState(normalizeHandle(suggestedHandle || ''));
  const [name, setName] = useState(suggestedName || '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const valid = isValidHandle(handle);

  const create = async () => {
    if (!valid) return;
    setSaving(true);
    setErr(null);
    const { data, error } = await supabase.from('portfolios')
      .insert({ user_id: userId, handle, display_name: name.trim().slice(0, 80) })
      .select().single();
    setSaving(false);
    if (error) return setErr(friendlyDbError(error.message));
    onCreated(data as Portfolio);
  };

  return (
    <div data-tour="pf-setup" className="bg-white/5 p-6 space-y-5 max-w-xl text-left">
      <div>
        <h3 className="text-xl font-black uppercase tracking-wide">Start your portfolio</h3>
        <p className="text-white/50 text-sm mt-2 leading-relaxed">
          One page for your work: photos, videos, your YouTube and TikTok, and the brands you have worked with.
          It stays a draft until you publish it.
        </p>
      </div>
      <div data-tour="pf-handle">
        <label className={label} htmlFor="pf-handle">Your address</label>
        <div className="flex items-stretch">
          <span className="bg-white/10 px-3 flex items-center text-white/40 text-xs font-mono whitespace-nowrap">/portfolio/</span>
          <input id="pf-handle" className={input} value={handle} onChange={e => setHandle(normalizeHandle(e.target.value))} placeholder="your-name" style={sq} />
        </div>
        <p className={cn('text-[10px] mt-2 uppercase tracking-widest', valid || !handle ? 'text-white/30' : 'text-red-400')}>
          3–30 characters: letters, numbers and hyphens.
        </p>
      </div>
      <div>
        <label className={label} htmlFor="pf-name">Display name</label>
        <input id="pf-name" className={input} value={name} onChange={e => setName(e.target.value)} placeholder="How your name appears" maxLength={80} style={sq} />
      </div>
      {err && <p className="text-red-400 text-[10px] font-bold uppercase tracking-widest">{err}</p>}
      <button data-tour="pf-create" onClick={create} disabled={!valid || saving} className={primary} style={sq}>
        {saving ? 'Creating…' : 'Create portfolio'}
      </button>
    </div>
  );
}

/* ── Posts ───────────────────────────────────────────────────────────── */

function PostsTab({ userId, portfolio, posts, onChange, notify, fail }: {
  userId: string;
  portfolio: Portfolio;
  posts: PortfolioPost[];
  onChange: (p: PortfolioPost[]) => void;
  notify: (m: string) => void;
  fail: (m: string) => void;
}) {
  const [kind, setKind] = useState<ComposeKind>('media');
  const [files, setFiles] = useState<File[]>([]);
  const [link, setLink] = useState('');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [posting, setPosting] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const parsed = kind === 'embed' && link.trim() ? parseEmbed(link) : null;
  const embedOk = parsed && !('error' in parsed);
  const canPost =
    (kind === 'media' && files.length > 0) ||
    (kind === 'embed' && !!embedOk) ||
    (kind === 'text' && (title.trim() || caption.trim()));

  const reset = () => { setFiles([]); setLink(''); setTitle(''); setCaption(''); if (fileRef.current) fileRef.current.value = ''; };

  const pickFiles = (list: FileList | null) => {
    const picked = Array.from(list || []);
    const bad = picked.filter(f => !kindForFile(f));
    if (bad.length) fail(`${bad.map(f => f.name).join(', ')}: use JPG, PNG, WebP, GIF, MP4, MOV or WebM.`);
    setFiles(picked.filter(f => kindForFile(f)));
  };

  const post = async () => {
    if (!canPost || posting) return;
    setPosting(true);
    const base = {
      portfolio_id: portfolio.id,
      user_id: userId,
      title: title.trim().slice(0, 140) || null,
      caption: caption.trim().slice(0, 2000) || null,
    };
    try {
      const rows: Record<string, unknown>[] = [];
      if (kind === 'media') {
        // One post per file, so a batch of shots reads as a feed.
        for (const [i, f] of files.entries()) {
          setProgress(`Uploading ${i + 1} of ${files.length}…`);
          const path = await uploadPortfolioFile(userId, 'posts', f);
          rows.push({ ...base, kind: kindForFile(f), media_path: path });
        }
      } else if (kind === 'embed' && embedOk) {
        rows.push({ ...base, kind: 'embed', provider: parsed.provider, embed_id: parsed.id });
      } else {
        rows.push({ ...base, kind: 'text' });
      }
      setProgress('Posting…');
      const { data, error } = await supabase.from('portfolio_posts').insert(rows).select();
      if (error) {
        await Promise.all(rows.map(r => removePortfolioFile(r.media_path as string | undefined)));
        throw new Error(friendlyDbError(error.message));
      }
      const added = (data || []) as PortfolioPost[];
      // Newest first, behind anything pinned.
      onChange([...posts.filter(p => p.pinned), ...added.reverse(), ...posts.filter(p => !p.pinned)]);
      reset();
      notify(added.length === 1 ? 'Posted.' : `${added.length} posts added.`);
    } catch (e: any) {
      fail(e?.message || 'Could not post.');
    } finally {
      setPosting(false);
      setProgress(null);
    }
  };

  const remove = async (p: PortfolioPost) => {
    if (!confirm('Delete this post? This cannot be undone.')) return;
    const { error } = await supabase.from('portfolio_posts').delete().eq('id', p.id);
    if (error) return fail(error.message);
    await removePortfolioFile(p.media_path);
    onChange(posts.filter(x => x.id !== p.id));
  };

  const togglePin = async (p: PortfolioPost) => {
    const { data, error } = await supabase.from('portfolio_posts').update({ pinned: !p.pinned }).eq('id', p.id).select().single();
    if (error) return fail(error.message);
    const next = posts.map(x => (x.id === p.id ? (data as PortfolioPost) : x));
    next.sort((a, b) => Number(b.pinned) - Number(a.pinned) || (a.created_at < b.created_at ? 1 : -1));
    onChange(next);
  };

  return (
    <div className="space-y-8">
      {/* Composer */}
      <div data-tour="pf-composer" className="bg-white/5 p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap gap-1">
          {([
            ['media', 'Photo / Video', PhotoIcon],
            ['embed', 'YouTube / TikTok', LinkIcon],
            ['text', 'Text', DocumentTextIcon],
          ] as const).map(([id, text, Icon]) => (
            <button
              key={id}
              data-tour={`pf-kind-${id}`}
              onClick={() => setKind(id)}
              className={cn('flex items-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-colors', kind === id ? 'bg-white text-black' : 'bg-white/5 text-white/50 hover:text-white')}
              style={sq}
            >
              <Icon className="w-3 h-3" /> {text}
            </button>
          ))}
        </div>

        {kind === 'media' && (
          <div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full bg-black/40 hover:bg-white/10 transition-colors py-10 flex flex-col items-center gap-2 text-white/50"
              style={sq}
            >
              <ArrowUpTrayIcon className="w-6 h-6" />
              <span className="text-[10px] font-black uppercase tracking-widest">
                {files.length ? `${files.length} file${files.length === 1 ? '' : 's'} ready` : 'Choose photos or videos'}
              </span>
              <span className="text-[10px] text-white/30">JPG, PNG, WebP, GIF, MP4, MOV, WebM · up to {PORTFOLIO_MAX_MB}MB each · one post per file</span>
            </button>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept={[...PORTFOLIO_IMAGE_TYPES, ...PORTFOLIO_VIDEO_TYPES].join(',')}
              className="hidden"
              onChange={e => pickFiles(e.target.files)}
            />
            {files.length > 0 && (
              <ul className="mt-2 space-y-1">
                {files.map(f => (
                  <li key={f.name + f.size} className="text-xs text-white/50 truncate">{f.name} · {(f.size / 1024 / 1024).toFixed(1)}MB</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {kind === 'embed' && (
          <div className="space-y-3">
            <input className={input} value={link} onChange={e => setLink(e.target.value)} placeholder="Paste a YouTube or TikTok video link" style={sq} />
            {parsed && 'error' in parsed && <p className="text-red-400 text-[10px] font-bold uppercase tracking-widest">{parsed.error}</p>}
            {embedOk && (
              <div className={cn('relative bg-black', parsed.provider === 'youtube' ? 'aspect-video' : 'aspect-[9/16] max-w-[325px]')}>
                <iframe src={embedSrc(parsed.provider, parsed.id)!} title="Preview" className="absolute inset-0 w-full h-full" sandbox="allow-scripts allow-same-origin allow-popups allow-presentation" allowFullScreen />
              </div>
            )}
          </div>
        )}

        <input className={input} value={title} onChange={e => setTitle(e.target.value)} placeholder={kind === 'text' ? 'Title' : 'Title (optional)'} maxLength={140} style={sq} />
        <textarea className={cn(input, 'resize-none')} rows={kind === 'text' ? 6 : 3} value={caption} onChange={e => setCaption(e.target.value)} placeholder={kind === 'text' ? 'Write something' : 'Caption (optional) — the client, the shoot, the story'} maxLength={2000} style={sq} />

        <div className="flex flex-wrap items-center gap-3">
          <button data-tour="pf-post" onClick={post} disabled={!canPost || posting} className={primary} style={sq}>
            {posting ? progress || 'Posting…' : 'Post'}
          </button>
          <p className="text-[10px] text-white/30 leading-relaxed flex-1 min-w-[200px]">
            Photos from studio jobs are fine to show unless the client's agreement says otherwise, and never one we
            took down at a subject's request (Photographer Terms §14).
          </p>
        </div>
      </div>

      {/* Feed */}
      <div data-tour="pf-feed">
        {posts.length === 0 ? (
          <p className="text-white/40 text-sm">No posts yet. Your first one shows up here exactly as visitors will see it.</p>
        ) : (
          <div className="columns-1 sm:columns-2 gap-4">
            {posts.map(p => (
              <div key={p.id} className="break-inside-avoid mb-4">
                <PostCard post={p} />
                <div className="flex gap-1 -mt-4 mb-4 bg-[#0a0a0a] p-1">
                  <button onClick={() => togglePin(p)} className={cn(secondary, 'flex-1 justify-center', p.pinned && 'bg-white text-black')} style={sq} title={p.pinned ? 'Unpin' : 'Pin to the top'}>
                    <StarIcon className="w-3 h-3" /> {p.pinned ? 'Pinned' : 'Pin'}
                  </button>
                  <button onClick={() => remove(p)} className={cn(secondary, 'flex-1 justify-center hover:bg-red-500 hover:text-white')} style={sq}>
                    <TrashIcon className="w-3 h-3" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Worked With (client logos) ──────────────────────────────────────── */

function ClientsTab({ userId, portfolio, clients, onChange, notify, fail }: {
  userId: string;
  portfolio: Portfolio;
  clients: PortfolioClient[];
  onChange: (c: PortfolioClient[]) => void;
  notify: (m: string) => void;
  fail: (m: string) => void;
}) {
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const add = async () => {
    if (!name.trim() || !file || saving) return;
    if (!PORTFOLIO_IMAGE_TYPES.includes(file.type)) return fail('Logos must be PNG, JPG, WebP or GIF. A transparent PNG looks best.');
    const site = website.trim() ? cleanWebsite(website) : null;
    if (website.trim() && !site) return fail('That website address does not look right.');
    setSaving(true);
    let path: string | null = null;
    try {
      path = await uploadPortfolioFile(userId, 'clients', file);
      const position = clients.length ? Math.max(...clients.map(c => c.position)) + 1 : 0;
      const { data, error } = await supabase.from('portfolio_clients')
        .insert({ portfolio_id: portfolio.id, user_id: userId, name: name.trim().slice(0, 80), logo_path: path, website: site, position })
        .select().single();
      if (error) throw new Error(error.message);
      onChange([...clients, data as PortfolioClient]);
      setName(''); setWebsite(''); setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      notify('Logo added.');
    } catch (e: any) {
      await removePortfolioFile(path);
      fail(e?.message || 'Could not add the logo.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: PortfolioClient) => {
    if (!confirm(`Remove ${c.name}?`)) return;
    const { error } = await supabase.from('portfolio_clients').delete().eq('id', c.id);
    if (error) return fail(error.message);
    await removePortfolioFile(c.logo_path);
    onChange(clients.filter(x => x.id !== c.id));
  };

  const move = async (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= clients.length) return;
    const next = [...clients];
    [next[index], next[j]] = [next[j], next[index]];
    const renumbered = next.map((c, i) => ({ ...c, position: i }));
    onChange(renumbered);
    const results = await Promise.all(
      [renumbered[index], renumbered[j]].map(c => supabase.from('portfolio_clients').update({ position: c.position }).eq('id', c.id)),
    );
    const failed = results.find(r => r.error);
    if (failed?.error) fail(failed.error.message);
  };

  return (
    <div className="space-y-6">
      <div data-tour="pf-client-form" className="bg-white/5 p-4 sm:p-5 space-y-4">
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest">Add a brand you have worked with</h3>
          <p className="text-white/40 text-xs mt-1">Shows as a logo wall at the top of your page. Use a logo you have permission to show.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input className={input} value={name} onChange={e => setName(e.target.value)} placeholder="Brand name" maxLength={80} style={sq} />
          <input className={input} value={website} onChange={e => setWebsite(e.target.value)} placeholder="Their website (optional)" style={sq} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => fileRef.current?.click()} className={secondary} style={sq}>
            <ArrowUpTrayIcon className="w-3 h-3" /> {file ? file.name.slice(0, 32) : 'Choose logo'}
          </button>
          <input ref={fileRef} type="file" accept={PORTFOLIO_IMAGE_TYPES.join(',')} className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
          <span className="text-[10px] text-white/30">PNG with a transparent background looks best.</span>
        </div>
        <button onClick={add} disabled={!name.trim() || !file || saving} className={primary} style={sq}>
          {saving ? 'Adding…' : 'Add logo'}
        </button>
      </div>

      {clients.length === 0 ? (
        <p className="text-white/40 text-sm">No logos yet.</p>
      ) : (
        <ul className="space-y-1">
          {clients.map((c, i) => (
            <li key={c.id} className="flex items-center gap-3 bg-white/5 p-2">
              <div className="w-20 h-12 bg-black/40 flex items-center justify-center p-1 shrink-0">
                <img src={mediaUrl(c.logo_path)!} alt={c.name} className="max-w-full max-h-full object-contain" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold truncate">{c.name}</p>
                {c.website && <p className="text-[10px] text-white/40 truncate">{c.website}</p>}
              </div>
              <button onClick={() => move(i, -1)} disabled={i === 0} className="p-2 text-white/40 hover:text-white disabled:opacity-20" title="Move up"><ArrowUpIcon className="w-4 h-4" /></button>
              <button onClick={() => move(i, 1)} disabled={i === clients.length - 1} className="p-2 text-white/40 hover:text-white disabled:opacity-20" title="Move down"><ArrowDownIcon className="w-4 h-4" /></button>
              <button onClick={() => remove(c)} className="p-2 text-white/40 hover:text-red-400" title="Remove"><TrashIcon className="w-4 h-4" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── Profile ─────────────────────────────────────────────────────────── */

function ProfileTab({ userId, portfolio, onSaved, fail }: {
  userId: string;
  portfolio: Portfolio;
  onSaved: (p: Portfolio) => void;
  fail: (m: string) => void;
}) {
  const [form, setForm] = useState({
    handle: portfolio.handle,
    display_name: portfolio.display_name || '',
    tagline: portfolio.tagline || '',
    location: portfolio.location || '',
    bio: portfolio.bio || '',
    instagram: portfolio.instagram || '',
    tiktok: portfolio.tiktok || '',
    youtube: portfolio.youtube || '',
    website: portfolio.website || '',
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);
  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!isValidHandle(form.handle)) return fail('Your address needs 3–30 letters, numbers or hyphens.');
    const socials = {
      instagram: form.instagram.trim() ? cleanSocialHandle(form.instagram) : null,
      tiktok: form.tiktok.trim() ? cleanSocialHandle(form.tiktok) : null,
      youtube: form.youtube.trim() ? cleanSocialHandle(form.youtube, true) : null,
    };
    for (const [k, v] of Object.entries(socials)) {
      if ((form as any)[k].trim() && !v) return fail(`That ${k} handle does not look right.`);
    }
    const website = form.website.trim() ? cleanWebsite(form.website) : null;
    if (form.website.trim() && !website) return fail('That website address does not look right.');

    setSaving(true);
    let avatar_path = portfolio.avatar_path;
    try {
      if (avatarFile) {
        if (!PORTFOLIO_IMAGE_TYPES.includes(avatarFile.type)) throw new Error('Profile photo must be JPG, PNG, WebP or GIF.');
        avatar_path = await uploadPortfolioFile(userId, 'avatar', avatarFile);
      }
      const { data, error } = await supabase.from('portfolios').update({
        handle: form.handle,
        display_name: form.display_name.trim().slice(0, 80),
        tagline: form.tagline.trim().slice(0, 140) || null,
        location: form.location.trim().slice(0, 80) || null,
        bio: form.bio.trim().slice(0, 2000) || null,
        ...socials,
        website,
        avatar_path,
        updated_at: new Date().toISOString(),
      }).eq('id', portfolio.id).select().single();
      if (error) throw new Error(friendlyDbError(error.message));
      if (avatarFile && portfolio.avatar_path && portfolio.avatar_path !== avatar_path) await removePortfolioFile(portfolio.avatar_path);
      setAvatarFile(null);
      onSaved(data as Portfolio);
    } catch (e: any) {
      if (avatarFile && avatar_path !== portfolio.avatar_path) await removePortfolioFile(avatar_path);
      fail(e?.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const avatarPreview = avatarFile ? URL.createObjectURL(avatarFile) : mediaUrl(portfolio.avatar_path);

  return (
    <div data-tour="pf-profile-form" className="bg-white/5 p-4 sm:p-5 space-y-5">
      <div className="flex items-center gap-4">
        {avatarPreview ? (
          <img src={avatarPreview} alt="" className="w-16 h-16 rounded-full object-cover" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center text-2xl font-black">
            {(form.display_name || form.handle).charAt(0).toUpperCase()}
          </div>
        )}
        <button type="button" onClick={() => avatarRef.current?.click()} className={secondary} style={sq}>
          <ArrowUpTrayIcon className="w-3 h-3" /> Profile photo
        </button>
        <input ref={avatarRef} type="file" accept={PORTFOLIO_IMAGE_TYPES.join(',')} className="hidden" onChange={e => setAvatarFile(e.target.files?.[0] || null)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={label}>Address</label>
          <div className="flex items-stretch">
            <span className="bg-white/10 px-3 flex items-center text-white/40 text-xs font-mono">/portfolio/</span>
            <input className={input} value={form.handle} onChange={e => set('handle', normalizeHandle(e.target.value))} style={sq} />
          </div>
          {form.handle !== portfolio.handle && <p className="text-[10px] text-amber-500 uppercase tracking-widest mt-2">Old links to your page will stop working.</p>}
        </div>
        <div>
          <label className={label}>Display name</label>
          <input className={input} value={form.display_name} onChange={e => set('display_name', e.target.value)} maxLength={80} style={sq} />
        </div>
        <div>
          <label className={label}>Tagline</label>
          <input className={input} value={form.tagline} onChange={e => set('tagline', e.target.value)} placeholder="Event and portrait photographer" maxLength={140} style={sq} />
        </div>
        <div>
          <label className={label}>Location</label>
          <input className={input} value={form.location} onChange={e => set('location', e.target.value)} placeholder="Austin, TX" maxLength={80} style={sq} />
        </div>
      </div>
      <div>
        <label className={label}>Bio</label>
        <textarea className={cn(input, 'resize-none')} rows={5} value={form.bio} onChange={e => set('bio', e.target.value)} maxLength={2000} style={sq} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className={label}>Instagram</label><input className={input} value={form.instagram} onChange={e => set('instagram', e.target.value)} placeholder="@handle" style={sq} /></div>
        <div><label className={label}>TikTok</label><input className={input} value={form.tiktok} onChange={e => set('tiktok', e.target.value)} placeholder="@handle" style={sq} /></div>
        <div><label className={label}>YouTube</label><input className={input} value={form.youtube} onChange={e => set('youtube', e.target.value)} placeholder="@channel" style={sq} /></div>
        <div><label className={label}>Website</label><input className={input} value={form.website} onChange={e => set('website', e.target.value)} placeholder="yoursite.com" style={sq} /></div>
      </div>
      <button onClick={save} disabled={saving} className={primary} style={sq}>{saving ? 'Saving…' : 'Save profile'}</button>
    </div>
  );
}
