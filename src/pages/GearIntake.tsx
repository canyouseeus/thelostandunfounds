import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PlusIcon, TrashIcon, CheckIcon } from '@heroicons/react/24/outline';
import { supabase } from '../lib/supabase';

/**
 * "What's in your bag?": the form behind the roster's equipment list.
 *
 * Reachable two ways, because the roster fills up from two directions: an
 * invite link (`/gear?token=…`) mailed to someone who has only ever sent an
 * email address, and the same page opened by an already signed-in photographer
 * updating their kit. The token path is the important one; it has to work for
 * a person with no account, on a phone, in one sitting.
 *
 * Rows are typed as a flat list rather than a fixed set of named fields
 * because kits are not uniform: one person brings two bodies and six lenses,
 * the next brings a gimbal and a drone. The category on each row is what makes
 * the result queryable later.
 */

const CATEGORIES: { value: string; label: string; hint: string }[] = [
  { value: 'camera', label: 'Camera Body', hint: 'e.g. 24MP full-frame, dual card slots, 4K60' },
  { value: 'lens', label: 'Lens', hint: 'e.g. 24-70mm f/2.8, stabilised' },
  { value: 'lighting', label: 'Lighting', hint: 'e.g. 200Ws strobe, bi-colour panel, softbox' },
  { value: 'audio', label: 'Audio', hint: 'e.g. wireless lav pair, shotgun mic, recorder' },
  { value: 'support', label: 'Tripod / Gimbal / Support', hint: 'e.g. 3-axis gimbal, carbon tripod, slider' },
  { value: 'drone', label: 'Drone', hint: 'e.g. 4K, Part 107 certified' },
  { value: 'power', label: 'Power', hint: 'e.g. spare batteries, V-mount, power station' },
  { value: 'storage', label: 'Cards / Storage', hint: 'e.g. 4x 128GB CFexpress, field SSD' },
  { value: 'computer', label: 'Computer / Editing', hint: 'e.g. M2 Pro, Lightroom + Premiere' },
  { value: 'other', label: 'Other', hint: 'Anything else you bring' },
];

const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label]));

interface Row {
  key: string;
  category: string;
  make: string;
  model: string;
  details: string;
  quantity: number;
  is_primary: boolean;
}

let rowCounter = 0;
const blankRow = (category = 'camera'): Row => ({
  key: `row-${rowCounter++}`,
  category,
  make: '',
  model: '',
  details: '',
  quantity: 1,
  is_primary: false,
});

const inputClass =
  'w-full bg-white/5 text-white placeholder-white/30 px-3 py-2 text-sm focus:bg-white/10 focus:outline-none';

export default function GearIntake() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [rows, setRows] = useState<Row[]>([blankRow('camera'), blankRow('lens')]);
  const [notes, setNotes] = useState('');
  const [name, setName] = useState('');
  const [photographer, setPhotographer] = useState<{ name: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const url = token ? `/api/crew/gear?token=${encodeURIComponent(token)}` : '/api/crew/gear';
        const res = await fetch(url, { headers: token ? {} : await authHeaders() });
        const payload = await res.json();
        if (cancelled) return;

        if (!res.ok) {
          setError(payload?.error || 'Could not open your kit list.');
          return;
        }

        if (payload.photographer) {
          setPhotographer(payload.photographer);
          setName(payload.photographer.name || '');
        }
        setNotes(payload.gear_notes || '');
        if (Array.isArray(payload.items) && payload.items.length) {
          setRows(
            payload.items.map((item: any) => ({
              key: `row-${rowCounter++}`,
              category: item.category || 'other',
              make: item.make || '',
              model: item.model || '',
              details: item.details || '',
              quantity: item.quantity || 1,
              is_primary: Boolean(item.is_primary),
            }))
          );
        }
      } catch {
        if (!cancelled) setError('Could not reach the server. Try again in a moment.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, authHeaders]);

  const update = (key: string, patch: Partial<Row>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  const filledCount = useMemo(() => rows.filter((row) => row.model.trim()).length, [rows]);

  const save = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch('/api/crew/gear', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? {} : await authHeaders()),
        },
        body: JSON.stringify({
          token: token || undefined,
          name: name || undefined,
          gear_notes: notes,
          items: rows
            .filter((row) => row.model.trim())
            .map(({ category, make, model, details, quantity, is_primary }) => ({
              category,
              make,
              model,
              details,
              quantity,
              is_primary,
            })),
        }),
      });
      const payload = await res.json();

      if (!res.ok) {
        setError(payload?.error || 'Could not save your kit list.');
        return;
      }
      if (payload.photographer) setPhotographer(payload.photographer);
      setSaved(true);
    } catch {
      setError('Could not reach the server. Try again in a moment.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white/40 flex items-center justify-center text-xs uppercase tracking-[0.3em]">
        Loading your kit…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter text-left">
          Your Equipment
        </h1>
        <p className="mt-3 text-sm text-white/60 text-left max-w-2xl">
          List what you shoot on so we know which jobs to send you. Bodies, lenses, lighting,
          audio, tripods and gimbals: the whole bag.
        </p>
        <p className="mt-2 text-sm text-white/40 text-left max-w-2xl">
          {token
            ? 'Your invite link stays good for a week. After that, sign in and this page picks up where you left off.'
            : 'Update this whenever your kit changes.'}
        </p>
        {photographer && (
          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-white/40 text-left">
            {photographer.email}
          </p>
        )}

        {error && (
          <div className="mt-6 bg-red-500/10 px-4 py-3 text-sm text-red-300 text-left">{error}</div>
        )}

        {!photographer && (
          <div className="mt-8">
            <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-2">
              Your Name
            </label>
            <input
              className={inputClass}
              style={{ borderRadius: 0 }}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="How you want to be credited"
            />
          </div>
        )}

        <div className="mt-10 space-y-3">
          {rows.map((row) => {
            const hint = CATEGORIES.find((c) => c.value === row.category)?.hint || '';
            return (
              <div key={row.key} className="bg-white/5 p-4" style={{ borderRadius: 0 }}>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-3">
                    <select
                      className={inputClass}
                      style={{ borderRadius: 0 }}
                      value={row.category}
                      onChange={(event) => update(row.key, { category: event.target.value })}
                    >
                      {CATEGORIES.map((category) => (
                        <option key={category.value} value={category.value} className="bg-black">
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-3">
                    <input
                      className={inputClass}
                      style={{ borderRadius: 0 }}
                      value={row.make}
                      onChange={(event) => update(row.key, { make: event.target.value })}
                      placeholder="Make (Sony, Canon…)"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <input
                      className={inputClass}
                      style={{ borderRadius: 0 }}
                      value={row.model}
                      onChange={(event) => update(row.key, { model: event.target.value })}
                      placeholder="Model: required"
                    />
                  </div>
                  <div className="sm:col-span-2 flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      className={inputClass}
                      style={{ borderRadius: 0 }}
                      value={row.quantity}
                      onChange={(event) =>
                        update(row.key, { quantity: Math.max(1, Number(event.target.value) || 1) })
                      }
                      aria-label="Quantity"
                    />
                    <button
                      onClick={() => setRows((current) => current.filter((r) => r.key !== row.key))}
                      className="p-2 text-white/40 hover:bg-white hover:text-black transition-colors"
                      style={{ borderRadius: 0 }}
                      aria-label="Remove item"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="sm:col-span-12">
                    <input
                      className={inputClass}
                      style={{ borderRadius: 0 }}
                      value={row.details}
                      onChange={(event) => update(row.key, { details: event.target.value })}
                      placeholder={`Specs: ${hint}`}
                    />
                  </div>
                </div>
                <label className="mt-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={row.is_primary}
                    onChange={(event) => update(row.key, { is_primary: event.target.checked })}
                  />
                  Main piece I shoot with
                </label>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => setRows((current) => [...current, blankRow()])}
          className="mt-4 flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-widest bg-white/10 text-white hover:bg-white hover:text-black transition-colors"
          style={{ borderRadius: 0 }}
        >
          <PlusIcon className="w-3 h-3" />
          Add Item
        </button>

        <div className="mt-10">
          <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-2">
            Anything Else
          </label>
          <textarea
            className={`${inputClass} min-h-[120px]`}
            style={{ borderRadius: 0 }}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="What you specialise in, what you'd rather not shoot, gear you can rent on short notice, how far you'll travel."
          />
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <button
            onClick={save}
            disabled={saving}
            className="px-6 py-3 text-sm font-bold uppercase tracking-widest bg-white text-black hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
            style={{ borderRadius: 0 }}
          >
            {saving ? 'Saving…' : 'Save My Kit'}
          </button>
          <span className="text-xs uppercase tracking-[0.2em] text-white/40">
            {filledCount} item{filledCount === 1 ? '' : 's'}
          </span>
          {saved && (
            <span className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-green-400">
              <CheckIcon className="w-4 h-4" />
              Saved: you're on the roster
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
