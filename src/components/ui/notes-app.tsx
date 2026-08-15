import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MagnifyingGlassIcon, PlusIcon, TrashIcon, ChevronLeftIcon, StarIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { supabase } from '../../lib/supabase';
import { cn } from './utils';

interface Note {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

const stamp = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' });
};

/**
 * The notes app that lives behind the NOTES card in the master calendar;
 * list on the left, editor on the right, Apple Notes' shape in the site's
 * colours. Notes autosave as you type; rows are ordered pinned-first, then
 * most recently touched. Backed by `admin_notes` with per-user RLS.
 */
export function NotesApp() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  // On a phone the two panes take turns; `showEditor` is which one is up.
  const [showEditor, setShowEditor] = useState(false);
  const saveTimer = useRef<number | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('admin_notes')
      .select('id, title, body, pinned, created_at, updated_at')
      .order('pinned', { ascending: false })
      .order('updated_at', { ascending: false });
    if (!error && data) setNotes(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const active = notes.find(n => n.id === activeId) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(n => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q));
  }, [notes, query]);

  const create = async () => {
    const { data, error } = await supabase
      .from('admin_notes')
      .insert({ title: '', body: '' })
      .select('id, title, body, pinned, created_at, updated_at')
      .single();
    if (error || !data) { setSaveState('error'); return; }
    setNotes(ns => [data, ...ns]);
    setActiveId(data.id);
    setShowEditor(true);
  };

  /** Local state immediately; the row a moment later. */
  const patch = (id: string, fields: Partial<Pick<Note, 'title' | 'body' | 'pinned'>>) => {
    setNotes(ns => ns.map(n => (n.id === id ? { ...n, ...fields, updated_at: new Date().toISOString() } : n)));
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    setSaveState('saving');
    saveTimer.current = window.setTimeout(async () => {
      const { error } = await supabase
        .from('admin_notes')
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq('id', id);
      setSaveState(error ? 'error' : 'saved');
    }, 600);
  };

  const remove = async (id: string) => {
    setNotes(ns => ns.filter(n => n.id !== id));
    if (activeId === id) { setActiveId(null); setShowEditor(false); }
    await supabase.from('admin_notes').delete().eq('id', id);
  };

  const open = (id: string) => { setActiveId(id); setShowEditor(true); };

  const List = (
    <div className="flex flex-col min-h-0 h-full">
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex-1 flex items-center gap-2 bg-white/5 px-3" style={{ borderRadius: 0 }}>
          <MagnifyingGlassIcon className="w-4 h-4 text-white/40 flex-shrink-0" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="SEARCH NOTES"
            className="w-full bg-transparent py-2.5 text-sm text-white placeholder:text-white/30 placeholder:tracking-widest focus:outline-none select-text"
            style={{ borderRadius: 0 }}
          />
        </div>
        <button
          onClick={create}
          aria-label="New note"
          className="p-2.5 bg-white text-black hover:bg-white/10 hover:text-white transition-colors"
          style={{ borderRadius: 0 }}
        >
          <PlusIcon className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto mt-2">
        {loading ? (
          <p className="text-[11px] uppercase tracking-widest text-white/30 py-6 text-left">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-[11px] uppercase tracking-widest text-white/30 py-6 text-left">
            {query ? 'Nothing matches.' : 'No notes yet; start one.'}
          </p>
        ) : (
          filtered.map(n => (
            <button
              key={n.id}
              onClick={() => open(n.id)}
              className={cn(
                'w-full px-3 py-3 text-left transition-colors mb-px',
                n.id === activeId ? 'bg-white text-black' : 'bg-white/5 text-white hover:bg-white/10',
              )}
              style={{ borderRadius: 0 }}
            >
              <span className="flex items-center gap-2">
                {n.pinned && <StarSolidIcon className="w-3 h-3 flex-shrink-0" />}
                <span className="text-sm font-bold truncate">{n.title || 'Untitled'}</span>
              </span>
              <span className={cn('block text-[11px] truncate mt-0.5', n.id === activeId ? 'text-black/60' : 'text-white/40')}>
                <span className="tabular-nums">{stamp(n.updated_at)}</span>
                {'  '}
                {n.body.split('\n')[0].slice(0, 60) || 'No additional text'}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );

  const Editor = active ? (
    <div className="flex flex-col min-h-0 h-full">
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => setShowEditor(false)}
          className="md:hidden p-2 text-white/60 hover:text-white transition-colors"
          aria-label="Back to notes list"
        >
          <ChevronLeftIcon className="w-4 h-4" />
        </button>
        <span className="text-[10px] uppercase tracking-widest text-white/30 tabular-nums flex-1 text-left">
          {saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Save failed: retrying on next edit' : `Edited ${stamp(active.updated_at)}`}
        </span>
        <button
          onClick={() => patch(active.id, { pinned: !active.pinned })}
          aria-label={active.pinned ? 'Unpin note' : 'Pin note'}
          className="p-2 text-white/60 hover:text-white transition-colors"
        >
          {active.pinned ? <StarSolidIcon className="w-4 h-4" /> : <StarIcon className="w-4 h-4" />}
        </button>
        <button
          onClick={() => remove(active.id)}
          aria-label="Delete note"
          className="p-2 text-white/60 hover:text-white transition-colors"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
      <input
        value={active.title}
        onChange={e => patch(active.id, { title: e.target.value })}
        placeholder="TITLE"
        className="w-full bg-transparent mt-2 text-xl font-black text-white placeholder:text-white/20 placeholder:tracking-widest focus:outline-none select-text"
        style={{ borderRadius: 0 }}
      />
      <textarea
        value={active.body}
        onChange={e => patch(active.id, { body: e.target.value })}
        placeholder="Start writing…"
        className="flex-1 min-h-0 w-full bg-transparent mt-3 text-sm leading-relaxed text-white/90 placeholder:text-white/20 focus:outline-none resize-none select-text text-left"
        style={{ borderRadius: 0 }}
      />
    </div>
  ) : (
    <div className="hidden md:flex items-center justify-center h-full">
      <p className="text-[11px] uppercase tracking-widest text-white/30">Select a note, or start one</p>
    </div>
  );

  return (
    <div className="h-[70vh] min-h-[420px]">
      {/* Desktop: both panes. Phone: one at a time. */}
      <div className="hidden md:grid h-full min-h-0 grid-cols-[minmax(220px,1fr)_2fr] gap-6">
        {List}
        {Editor}
      </div>
      <div className="md:hidden h-full min-h-0">
        {showEditor && active ? Editor : List}
      </div>
    </div>
  );
}
