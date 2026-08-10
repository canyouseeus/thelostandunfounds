import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * A contractor's job pay — what they earned on shoots, what has settled, and
 * what has already landed in their bank.
 *
 * Kept apart from the affiliate dashboard on purpose. Affiliate earnings are
 * commission for referring business; this is pay for doing the work, and the
 * two answer different questions ("how is my link doing" vs "was I paid for
 * Saturday"). Reads `crew_payouts` directly — RLS restricts the table to
 * `auth.uid() = user_id`, so the session is the authorization.
 */

interface CrewPayout {
    id: string;
    amount: number | string;
    status: string;
    description: string | null;
    available_at: string | null;
    paid_at: string | null;
    stripe_transfer_id: string | null;
    created_at: string;
}

const money = (value: unknown) =>
    `$${(Math.round(Number(value || 0) * 100) / 100).toFixed(2)}`;

const shortDate = (value: string | null) =>
    value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
    pending: { label: 'Clearing', tone: 'text-amber-400' },
    approved: { label: 'Queued', tone: 'text-blue-400' },
    paid: { label: 'Paid', tone: 'text-green-400' },
    failed: { label: 'Failed', tone: 'text-red-400' },
    cancelled: { label: 'Cancelled', tone: 'text-zinc-500' },
};

export default function JobPayouts({ userId }: { userId: string }) {
    const [payouts, setPayouts] = useState<CrewPayout[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const { data, error: err } = await supabase
                .from('crew_payouts')
                .select('id, amount, status, description, available_at, paid_at, stripe_transfer_id, created_at')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
            if (cancelled) return;
            if (err) setError(err.message);
            else setPayouts((data as CrewPayout[]) || []);
            setLoading(false);
        })();
        return () => { cancelled = true; };
    }, [userId]);

    const sum = (statuses: string[]) =>
        payouts
            .filter(p => statuses.includes(p.status))
            .reduce((n, p) => n + Number(p.amount || 0), 0);

    const paid = sum(['paid']);
    const upcoming = sum(['pending', 'approved']);

    return (
        <section className="mb-6 bg-white/5 p-6" style={{ borderRadius: 0 }}>
            <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-xl font-bold uppercase tracking-tighter text-white">Job Payouts</h2>
                    <p className="text-sm text-zinc-400">
                        Pay for shoots you covered. Sent to your connected Stripe account automatically once the
                        client's payment settles — you don't need to request it.
                    </p>
                </div>
                <div className="flex gap-8">
                    <div>
                        <p className="text-xs uppercase tracking-wider text-zinc-500">Paid to date</p>
                        <p className="text-2xl font-semibold text-green-400">{money(paid)}</p>
                    </div>
                    <div>
                        <p className="text-xs uppercase tracking-wider text-zinc-500">On the way</p>
                        <p className="text-2xl font-semibold text-amber-400">{money(upcoming)}</p>
                    </div>
                </div>
            </div>

            {loading && <p className="text-sm text-zinc-500">Loading your payouts…</p>}
            {error && <p className="text-sm text-red-400">Couldn't load payouts: {error}</p>}

            {!loading && !error && payouts.length === 0 && (
                <p className="text-sm text-zinc-500">
                    No job payouts yet. Once a client pays for a shoot you covered, your share shows up here.
                </p>
            )}

            {payouts.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs uppercase tracking-wider text-zinc-500">
                                <th className="pb-3 pr-4 font-medium">Job</th>
                                <th className="pb-3 pr-4 font-medium">Amount</th>
                                <th className="pb-3 pr-4 font-medium">Status</th>
                                <th className="pb-3 font-medium">Sent</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payouts.map(p => {
                                const status = STATUS_LABEL[p.status] || { label: p.status, tone: 'text-zinc-400' };
                                return (
                                    <tr key={p.id} className="align-top">
                                        <td className="py-3 pr-4 text-zinc-300">
                                            {p.description || 'Photography job'}
                                        </td>
                                        <td className="py-3 pr-4 text-white font-medium whitespace-nowrap">
                                            {money(p.amount)}
                                        </td>
                                        <td className={`py-3 pr-4 whitespace-nowrap ${status.tone}`}>
                                            {status.label}
                                            {p.status === 'pending' && p.available_at && (
                                                <span className="block text-xs text-zinc-500">
                                                    expected {shortDate(p.available_at)}
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3 text-zinc-400 whitespace-nowrap">
                                            {shortDate(p.paid_at)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
