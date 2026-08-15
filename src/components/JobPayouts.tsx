import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * A contractor's job pay: what they earned on shoots, what has settled, and
 * what has already landed in their bank.
 *
 * Kept apart from the affiliate dashboard on purpose. Affiliate earnings are
 * commission for referring business; this is pay for doing the work, and the
 * two answer different questions ("how is my link doing" vs "was I paid for
 * Saturday"). Reads `crew_payouts` directly: RLS restricts the table to
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

interface ConnectStatus {
    connected: boolean;
    status: 'not_started' | 'pending' | 'restricted' | 'active';
    payouts_enabled: boolean;
    details_submitted: boolean;
    requirements: string[];
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
    const [openingStripe, setOpeningStripe] = useState(false);
    const [stripeError, setStripeError] = useState<string | null>(null);
    const [connect, setConnect] = useState<ConnectStatus | null>(null);
    const [connecting, setConnecting] = useState(false);
    // Signed in, but not on the crew; someone who sells gallery photos and has
    // never worked a booking. They have no job pay to show and nothing to
    // connect for, and the Stripe buttons would only 404 at them.
    const [notContractor, setNotContractor] = useState(false);

    const authHeaders = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        return {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token || ''}`,
        };
    };

    // Start (or finish) Stripe onboarding. Account Links expire within
    // minutes, so one is minted on click rather than held in state.
    const startStripeSetup = async () => {
        setConnecting(true);
        setStripeError(null);
        try {
            const res = await fetch('/api/crew/connect', {
                method: 'POST',
                headers: await authHeaders(),
            });
            const body = await res.json();
            if (!res.ok || !body.url) {
                setStripeError(body.error || 'Could not start Stripe setup.');
                return;
            }
            // Same tab: Stripe returns the contractor here when they finish,
            // and a popup would strand that return on a tab they closed.
            window.location.href = body.url;
        } catch (err: any) {
            setStripeError(err?.message || 'Could not start Stripe setup.');
        } finally {
            setConnecting(false);
        }
    };

    // Stripe login links are single-use and expire, so one is minted on click
    // rather than held in state or embedded in an email.
    const openStripeDashboard = async () => {
        setOpeningStripe(true);
        setStripeError(null);
        try {
            const res = await fetch('/api/crew/stripe-dashboard', {
                method: 'POST',
                headers: await authHeaders(),
            });
            const body = await res.json();
            if (!res.ok || !body.url) {
                setStripeError(body.error || 'Could not open Stripe.');
                return;
            }
            window.open(body.url, '_blank', 'noopener,noreferrer');
        } catch (err: any) {
            setStripeError(err?.message || 'Could not open Stripe.');
        } finally {
            setOpeningStripe(false);
        }
    };

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

    // Ask Stripe where this contractor actually stands, rather than trusting a
    // stored flag: someone can finish onboarding, or have Stripe reopen a
    // requirement, without this app ever hearing about it.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch('/api/crew/connect', { headers: await authHeaders() });
                if (cancelled) return;
                if (res.status === 404) {
                    setNotContractor(true);
                    return;
                }
                if (!res.ok) return;
                setConnect(await res.json());
            } catch {
                // Leave the panel in its neutral state; the payout list below
                // is the point of the page and must still render.
            }
        })();
        return () => { cancelled = true; };
    }, [userId]);

    const sum = (statuses: string[]) =>
        payouts
            .filter(p => statuses.includes(p.status))
            .reduce((n, p) => n + Number(p.amount || 0), 0);

    const paid = sum(['paid']);
    const upcoming = sum(['pending', 'approved']);

    // Nothing to say to someone who isn't crew. Rendering an empty "Job
    // Payouts" panel with a Stripe button that 404s reads as something broken,
    // when the truth is simply that this section isn't theirs. The payout rows
    // are still checked first: a ledger entry outlives a photographer record,
    // and money owed must never be hidden by a missing row.
    if (notContractor && !loading && payouts.length === 0) return null;

    return (
        <section className="mb-6 bg-white/5 p-6" style={{ borderRadius: 0 }}>
            <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-xl font-bold uppercase tracking-tighter text-white">Job Payouts</h2>
                    <p className="text-sm text-zinc-400">
                        Pay for shoots you covered. Sent to your connected Stripe account automatically once the
                        client's payment settles: you don't need to request it.
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

            <div className="mb-6">
                {/* Until Stripe answers we show nothing rather than guessing;
                    flashing "connect your account" at someone who connected
                    months ago reads as though we lost their details. */}
                {connect && !connect.payouts_enabled && (
                    <div className="mb-4 bg-amber-500/10 p-4" style={{ borderRadius: 0 }}>
                        <p className="text-sm font-bold uppercase tracking-wider text-amber-400">
                            {connect.status === 'not_started'
                                ? 'Set up your payouts'
                                : 'Finish your Stripe setup'}
                        </p>
                        <p className="text-sm text-zinc-300 mt-2">
                            {connect.status === 'not_started'
                                ? 'Your pay is already being tracked below; it just needs somewhere to land. Takes about a minute.'
                                : 'Stripe still needs a couple of details before it can pay you. Your pay keeps accruing below in the meantime and goes out on the next run once this clears.'}
                        </p>
                        <p className="text-sm text-zinc-400 mt-2">
                            <strong className="text-white">Already use Stripe?</strong> Choose{' '}
                            <em>Sign in</em> at the top of the Stripe page instead of filling the form
                            out. It reuses the details you've already verified, and this becomes another
                            account you can switch between in your Stripe dashboard; nothing changes
                            about the accounts you already have.
                        </p>
                        <button
                            onClick={startStripeSetup}
                            disabled={connecting}
                            className="mt-4 bg-white text-black px-5 py-3 text-sm font-bold uppercase tracking-wider hover:bg-zinc-200 transition-colors disabled:opacity-50"
                            style={{ borderRadius: 0 }}
                        >
                            {connecting
                                ? 'Opening Stripe…'
                                : connect.status === 'not_started'
                                    ? 'Connect Stripe'
                                    : 'Finish setup'}
                        </button>
                    </div>
                )}

                {(!connect || connect.payouts_enabled) && (
                    <>
                        <button
                            onClick={openStripeDashboard}
                            disabled={openingStripe}
                            className="bg-white text-black px-5 py-3 text-sm font-bold uppercase tracking-wider hover:bg-zinc-200 transition-colors disabled:opacity-50"
                            style={{ borderRadius: 0 }}
                        >
                            {openingStripe ? 'Opening…' : 'Open my Stripe dashboard'}
                        </button>
                        <p className="text-xs text-zinc-500 mt-2">
                            See your balance, the deposits we've sent, and when Stripe pays them out to your bank.
                        </p>
                    </>
                )}

                {stripeError && <p className="text-sm text-red-400 mt-2">{stripeError}</p>}
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
