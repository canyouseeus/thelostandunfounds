import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowPathIcon,
  MagnifyingGlassIcon,
  ClipboardDocumentIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';

/**
 * The roster, read as a deployment tool rather than a contact list.
 *
 * The question this answers is "who can I send tonight?", so the search box
 * matches across gear as well as names: typing "gimbal" or "wireless lav"
 * narrows to the people who own one. Each card shows the kit grouped by
 * category and how recently it was confirmed — a kit last touched a year ago
 * is worth a text before it is worth a booking.
 */

const CATEGORY_LABEL: Record<string, string> = {
  camera: 'Bodies',
  lens: 'Lenses',
  lighting: 'Lighting',
  audio: 'Audio',
  support: 'Support',
  drone: 'Drone',
  power: 'Power',
  storage: 'Storage',
  computer: 'Editing',
  other: 'Other',
};

const CATEGORY_ORDER = Object.keys(CATEGORY_LABEL);

interface GearItem {
  id: string;
  category: string;
  make: string | null;
  model: string;
  details: string | null;
  quantity: number;
  is_primary: boolean;
}

interface RosterEntry {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  instagram: string | null;
  active: boolean;
  gear_notes: string | null;
  gear_updated_at: string | null;
  items: GearItem[];
}

const itemText = (item: GearItem) =>
  [item.make, item.model, item.details].filter(Boolean).join(' ');

function freshness(updatedAt: string | null): { label: string; stale: boolean } {
  if (!updatedAt) return { label: 'No kit on file', stale: true };
  const days = Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86_400_000);
  if (days <= 0) return { label: 'Confirmed today', stale: false };
  if (days === 1) return { label: 'Confirmed yesterday', stale: false };
  if (days < 30) return { label: `Confirmed ${days} days ago`, stale: false };
  const months = Math.floor(days / 30);
  return { label: `Confirmed ${months} month${months === 1 ? '' : 's'} ago`, stale: days > 180 };
}

export default function AdminRosterView({ adminEmail }: { adminEmail?: string }) {
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/crew/gear?roster=1', {
        headers: adminEmail ? { 'x-admin-email': adminEmail } : {},
      });
      const payload = await res.json();
      if (!res.ok) {
        setError(payload?.error || 'Could not load the roster.');
        return;
      }
      setRoster(payload.roster || []);
    } catch {
      setError('Could not reach the server.');
    } finally {
      setLoading(false);
    }
  }, [adminEmail]);

  useEffect(() => {
    load();
  }, [load]);

  // Search spans gear text, not just names — the point is finding capability.
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return roster;
    return roster.filter((person) => {
      const haystack = [
        person.name,
        person.email,
        person.instagram,
        person.gear_notes,
        ...person.items.map((item) => `${itemText(item)} ${CATEGORY_LABEL[item.category] || ''}`),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [roster, query]);

  const copyGearLink = async (email: string) => {
    // Deliberately the plain page: the invite email carries the tokenised
    // version, and a token pasted around chat would be a credential in a DM.
    await navigator.clipboard.writeText('https://www.thelostandunfounds.com/gear');
    setCopied(email);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="text-white">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2 bg-white/5 px-3 py-2 flex-1 min-w-[220px]">
          <MagnifyingGlassIcon className="w-4 h-4 text-white/40" />
          <input
            className="bg-transparent text-sm text-white placeholder-white/30 focus:outline-none w-full"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search gear — gimbal, wireless lav, full-frame, drone…"
          />
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-widest bg-white/10 text-white hover:bg-white hover:text-black transition-colors"
          style={{ borderRadius: 0 }}
        >
          <ArrowPathIcon className="w-3 h-3" />
          Refresh
        </button>
      </div>

      {error && <div className="bg-red-500/10 px-4 py-3 text-sm text-red-300 mb-6">{error}</div>}
      {loading && (
        <div className="text-xs uppercase tracking-[0.3em] text-white/40">Loading roster…</div>
      )}
      {!loading && !filtered.length && (
        <div className="text-xs uppercase tracking-[0.3em] text-white/40">
          {roster.length ? 'Nobody on the roster matches that.' : 'No photographers on the roster yet.'}
        </div>
      )}

      <div className="space-y-4">
        {filtered.map((person) => {
          const stamp = freshness(person.gear_updated_at);
          const grouped = CATEGORY_ORDER.map((category) => ({
            category,
            items: person.items.filter((item) => item.category === category),
          })).filter((group) => group.items.length);

          return (
            <div key={person.id} className="bg-white/5 p-5" style={{ borderRadius: 0 }}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="text-left">
                  <h3 className="text-lg font-black uppercase tracking-tight">
                    {person.name}
                    {!person.active && (
                      <span className="ml-3 px-2 py-0.5 bg-white/10 text-[10px] tracking-[0.2em] align-middle">
                        INACTIVE
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-white/40 mt-1">
                    {person.email}
                    {person.instagram ? ` · @${person.instagram.replace(/^@/, '')}` : ''}
                    {person.phone ? ` · ${person.phone}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                      stamp.stale ? 'text-amber-400' : 'text-white/40'
                    }`}
                  >
                    {stamp.label}
                  </span>
                  <button
                    onClick={() => copyGearLink(person.email)}
                    className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold uppercase tracking-widest bg-white/10 text-white hover:bg-white hover:text-black transition-colors"
                    style={{ borderRadius: 0 }}
                    title="Copy the kit-list page URL"
                  >
                    {copied === person.email ? (
                      <CheckIcon className="w-3 h-3" />
                    ) : (
                      <ClipboardDocumentIcon className="w-3 h-3" />
                    )}
                    {copied === person.email ? 'Copied' : 'Gear Link'}
                  </button>
                </div>
              </div>

              {grouped.length ? (
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {grouped.map((group) => (
                    <div key={group.category}>
                      <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-2">
                        {CATEGORY_LABEL[group.category]}
                      </h4>
                      <ul className="space-y-1.5">
                        {group.items.map((item) => (
                          <li key={item.id} className="text-sm text-white/80 text-left">
                            <span className={item.is_primary ? 'text-white font-semibold' : ''}>
                              {[item.make, item.model].filter(Boolean).join(' ')}
                            </span>
                            {item.quantity > 1 && (
                              <span className="text-white/40"> ×{item.quantity}</span>
                            )}
                            {item.details && (
                              <span className="block text-xs text-white/40">{item.details}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-white/40 text-left">
                  No equipment listed — send them the gear link.
                </p>
              )}

              {person.gear_notes && (
                <p className="mt-5 text-sm text-white/60 text-left bg-white/5 p-3">
                  {person.gear_notes}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
