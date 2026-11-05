/**
 * Bills and loans, as served by /api/admin/money-ledger.
 *
 * Shared by the Money In / Out view (the list) and the admin calendar (the
 * red dots), so both agree on which days a bill falls on.
 */
import { supabase } from './supabase';

export type BillPriority = 'critical' | 'high' | 'normal' | 'low';

export interface Bill {
    id: string;
    name: string;
    kind: 'bill' | 'loan';
    category: string;
    amount_cents: number | null;
    balance_cents: number | null;
    frequency: 'monthly' | 'yearly' | 'once';
    next_due: string;
    priority: BillPriority;
    pay_from: string | null;
    notes: string | null;
    active: boolean;
}

export const PRIORITY_ORDER: BillPriority[] = ['critical', 'high', 'normal', 'low'];

/** Text colour per priority. Critical is the only red; low fades out. */
export const PRIORITY_TEXT: Record<BillPriority, string> = {
    critical: 'text-red-400',
    high: 'text-amber-500',
    normal: 'text-white/60',
    low: 'text-white/30',
};

const shift = (ymd: string, months: number) => {
    const [y, m, d] = ymd.split('-').map(Number);
    const target = new Date(Date.UTC(y, m - 1 + months, 1));
    const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
    target.setUTCDate(Math.min(d, lastDay));
    return target.toISOString().slice(0, 10);
};

/**
 * Every date in [start, end] a bill is due, starting from its next_due.
 * Earlier dates are not shown: once a bill is marked paid, next_due moves on.
 */
export function dueDatesInRange(bill: Bill, start: string, end: string): string[] {
    const step = bill.frequency === 'yearly' ? 12 : bill.frequency === 'monthly' ? 1 : 0;
    const out: string[] = [];
    let d = bill.next_due;
    for (let i = 0; i < 400 && d <= end; i++) {
        if (d >= start) out.push(d);
        if (!step) break;
        d = shift(bill.next_due, step * (i + 1));
    }
    return out;
}

/** Days from today (local) until a YYYY-MM-DD date; negative when overdue. */
export function daysUntil(ymd: string): number {
    const now = new Date();
    const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const [y, m, d] = ymd.split('-').map(Number);
    return Math.round((Date.UTC(y, m - 1, d) - today) / 86_400_000);
}

export async function fetchBills(): Promise<Bill[]> {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/admin/money-ledger?view=bills', {
        headers: { Authorization: `Bearer ${session?.access_token || ''}` },
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || 'Could not load bills');
    return (await res.json()).bills ?? [];
}
