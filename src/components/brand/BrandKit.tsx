/**
 * BRAND KIT app on /dashboard — for crew (and the admin).
 *
 * Two folders:
 *   STUDIO — the SCOT33 mark in white and black, plus how to use it. Read-only,
 *            same files for everyone (src/lib/brand-kit.ts).
 *   MINE   — the photographer's own logos and brand files, private to them, in
 *            the `brand-kits` bucket under their user id (RLS: own folder only).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  CheckIcon,
  DocumentIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { supabase } from '../../lib/supabase';
import { useToast } from '../Toast';
import { cn } from '../ui/utils';
import {
  BRAND_CREDIT,
  BRAND_NAME,
  BRAND_TAGLINE,
  GUIDELINES,
  MY_KIT_ACCEPT,
  MY_KIT_BUCKET,
  MY_KIT_MAX_MB,
  STUDIO_KIT,
  isPreviewable,
  myKitContentType,
} from '../../lib/brand-kit';

const sq = { borderRadius: 0 } as const;
const secondary = 'flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold uppercase tracking-widest bg-white/10 text-white hover:bg-white hover:text-black transition-colors disabled:opacity-40';

interface MyFile {
  name: string;
  path: string;
  size: number;
  created_at: string;
  previewUrl?: string;
}

/** Stored names carry a timestamp prefix so uploads never collide. */
function displayName(stored: string): string {
  return stored.replace(/^\d{10,}-/, '');
}

export default function BrandKit({ userId }: { userId: string }) {
  const [folder, setFolder] = useState<'studio' | 'mine'>('studio');

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-wrap gap-1">
        {([['studio', 'Studio Logos'], ['mine', 'My Brand Files']] as const).map(([id, text]) => (
          <button
            key={id}
            data-tour={`bk-tab-${id}`}
            onClick={() => setFolder(id)}
            className={cn('px-3 sm:px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-colors', folder === id ? 'bg-white text-black' : 'bg-white/5 text-white/50 hover:text-white')}
            style={sq}
          >
            {text}
          </button>
        ))}
      </div>
      {folder === 'studio' ? <StudioKit /> : <MyFiles userId={userId} />}
    </div>
  );
}

/* ── Studio ──────────────────────────────────────────────────────────── */

function StudioKit() {
  return (
    <div className="space-y-10">
      <div data-tour="bk-studio-files" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {STUDIO_KIT.map(f => (
          <div key={f.id} className="bg-white/5">
            <div className={cn('aspect-square flex items-center justify-center p-10', f.previewOn === 'black' ? 'bg-black' : 'bg-white')}>
              <img src={f.file} alt={f.name} className="max-w-full max-h-full object-contain" />
            </div>
            <div className="p-4 space-y-3">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest">{f.name}</h3>
                <p className="text-white/60 text-sm mt-1">{f.use}</p>
                <p className="text-white/30 text-[10px] uppercase tracking-widest mt-2">{f.spec}</p>
              </div>
              <a href={f.file} download={f.download} className={cn(secondary, 'w-fit')} style={sq}>
                <ArrowDownTrayIcon className="w-3 h-3" /> Download
              </a>
            </div>
          </div>
        ))}
      </div>

      <section data-tour="bk-guidelines" className="space-y-8">
        <div>
          <h3 className="text-xl font-black uppercase tracking-widest">How To Use The Logo</h3>
          <p className="text-white/50 text-sm mt-2">
            {BRAND_NAME} · {BRAND_TAGLINE} · credit {BRAND_CREDIT}
          </p>
        </div>
        {GUIDELINES.map(section => (
          <div key={section.title} className="bg-white/5 p-5 space-y-4">
            <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-white">{section.title}</h4>
            <ul className="space-y-2">
              {section.points.map(p => (
                <li key={p} className="flex gap-3 text-sm text-white/80 leading-relaxed">
                  <CheckIcon className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
            {section.never && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-400 mb-2">Don’t</p>
                <ul className="space-y-2">
                  {section.never.map(p => (
                    <li key={p} className="flex gap-3 text-sm text-white/60 leading-relaxed">
                      <XMarkIcon className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}

/* ── Mine ────────────────────────────────────────────────────────────── */

function MyFiles({ userId }: { userId: string }) {
  const { success, error: showError } = useToast();
  const [files, setFiles] = useState<MyFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.storage.from(MY_KIT_BUCKET).list(userId, {
      limit: 200,
      sortBy: { column: 'created_at', order: 'desc' },
    });
    if (error) { showError(error.message); setLoading(false); return; }
    const rows: MyFile[] = (data || [])
      .filter(o => o.id && o.name !== '.emptyFolderPlaceholder')
      .map(o => ({
        name: o.name,
        path: `${userId}/${o.name}`,
        size: Number((o.metadata as any)?.size || 0),
        created_at: o.created_at || '',
      }));
    // Private bucket: thumbnails need short-lived signed URLs.
    const previewable = rows.filter(r => isPreviewable(r.name));
    if (previewable.length) {
      const { data: signed } = await supabase.storage.from(MY_KIT_BUCKET)
        .createSignedUrls(previewable.map(r => r.path), 3600);
      for (const s of signed || []) {
        const row = rows.find(r => r.path === s.path);
        if (row && s.signedUrl) row.previewUrl = s.signedUrl;
      }
    }
    setFiles(rows);
    setLoading(false);
  }, [userId, showError]);

  useEffect(() => { load(); }, [load]);

  const upload = async (list: FileList | null) => {
    const picked = Array.from(list || []);
    if (!picked.length) return;
    let done = 0;
    for (const [i, file] of picked.entries()) {
      const type = myKitContentType(file);
      if (!type) { showError(`${file.name}: use PNG, JPG, WebP, SVG, PDF, AI, EPS or ZIP.`); continue; }
      if (file.size > MY_KIT_MAX_MB * 1024 * 1024) { showError(`${file.name} is over ${MY_KIT_MAX_MB}MB.`); continue; }
      setUploading(`Uploading ${i + 1} of ${picked.length}…`);
      const clean = file.name.replace(/[^\w.\- ]/g, '_').replace(/\s+/g, ' ').trim().slice(-100) || 'file';
      const { error } = await supabase.storage.from(MY_KIT_BUCKET)
        .upload(`${userId}/${Date.now()}-${clean}`, file, { contentType: type, upsert: false });
      if (error) showError(`${file.name}: ${error.message}`);
      else done++;
    }
    setUploading(null);
    if (inputRef.current) inputRef.current.value = '';
    if (done) { success(done === 1 ? 'Saved to your brand files.' : `${done} files saved.`); load(); }
  };

  const download = async (f: MyFile) => {
    const { data, error } = await supabase.storage.from(MY_KIT_BUCKET)
      .createSignedUrl(f.path, 60, { download: displayName(f.name) });
    if (error || !data) return showError(error?.message || 'Could not get the file.');
    window.location.href = data.signedUrl;
  };

  const remove = async (f: MyFile) => {
    if (!confirm(`Delete ${displayName(f.name)}?`)) return;
    const { error } = await supabase.storage.from(MY_KIT_BUCKET).remove([f.path]);
    if (error) return showError(error.message);
    setFiles(prev => prev.filter(x => x.path !== f.path));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white/5 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-black uppercase tracking-widest">Your logos, all in one place</h3>
          <p className="text-white/40 text-xs mt-1">
            Private to you. PNG, JPG, WebP, SVG, PDF, AI, EPS or ZIP, up to {MY_KIT_MAX_MB}MB each.
          </p>
        </div>
        <button data-tour="bk-upload" onClick={() => inputRef.current?.click()} disabled={!!uploading} className="flex items-center justify-center gap-2 px-5 py-3 bg-white text-black text-[11px] font-black uppercase tracking-widest hover:bg-white/80 transition-colors disabled:opacity-40 shrink-0" style={sq}>
          <ArrowUpTrayIcon className="w-4 h-4" /> {uploading || 'Add files'}
        </button>
        <input ref={inputRef} type="file" multiple accept={MY_KIT_ACCEPT} className="hidden" onChange={e => upload(e.target.files)} />
      </div>

      {loading ? (
        <p className="text-white/40 text-xs uppercase tracking-[0.3em]">Loading…</p>
      ) : files.length === 0 ? (
        <p className="text-white/40 text-sm">Nothing here yet. Add your logo once and it is here whenever you need it.</p>
      ) : (
        <div data-tour="bk-my-files" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {files.map(f => (
            <div key={f.path} className="bg-white/5 flex flex-col">
              {/* Checkerboard-free neutral grey so both black and white logos show. */}
              <div className="aspect-square bg-[#1a1a1a] flex items-center justify-center p-4">
                {f.previewUrl ? (
                  <img src={f.previewUrl} alt={displayName(f.name)} className="max-w-full max-h-full object-contain" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-white/30">
                    <DocumentIcon className="w-8 h-8" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{f.name.split('.').pop()}</span>
                  </div>
                )}
              </div>
              <div className="p-2 flex-1 flex flex-col gap-2">
                <p className="text-xs text-white/80 truncate" title={displayName(f.name)}>{displayName(f.name)}</p>
                <div className="flex gap-1 mt-auto">
                  <button onClick={() => download(f)} className={cn(secondary, 'flex-1 justify-center')} style={sq} title="Download">
                    <ArrowDownTrayIcon className="w-3 h-3" />
                  </button>
                  <button onClick={() => remove(f)} className={cn(secondary, 'flex-1 justify-center hover:bg-red-500 hover:text-white')} style={sq} title="Delete">
                    <TrashIcon className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
