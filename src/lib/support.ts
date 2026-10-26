/**
 * Client side of technical support (server: lib/api-handlers/_support-handler.ts).
 * Same-origin /api calls carry the signed-in user's token automatically
 * (src/lib/api-auth.ts), so a logged-in ticket is tied to the account.
 */

export const SUPPORT_ROLES = [
    { value: 'affiliate', label: 'Affiliate' },
    { value: 'photographer', label: 'Photographer' },
    { value: 'client', label: 'Client' },
    { value: 'other', label: 'Something else' },
] as const;

// Must match CATEGORIES in the server handler.
export const SUPPORT_CATEGORIES = [
    'Account & login',
    'Payouts & payments',
    'Affiliate links & tracking',
    'Galleries & uploads',
    'Bookings & scheduling',
    'Something is broken',
    'General question',
] as const;

export type SupportRole = typeof SUPPORT_ROLES[number]['value'];
export type SupportStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export const STATUS_LABEL: Record<SupportStatus, string> = {
    open: 'OPEN',
    in_progress: 'IN PROGRESS',
    resolved: 'RESOLVED',
    closed: 'CLOSED',
};

export interface MyTicket {
    ref: string;
    subject: string;
    category: string | null;
    status: SupportStatus;
    created_at: string;
    last_message_at: string;
    awaiting_you: boolean;
    key: string;
}

export interface ThreadMessage {
    id: string;
    author: 'user' | 'admin';
    author_name: string | null;
    message: string;
    is_internal?: boolean;
    created_at: string;
}

export async function supportFetch<T = any>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`/api/support/${path}`, {
        ...init,
        headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body?.error || 'Request failed');
    return body as T;
}

export function formatWhen(iso: string): string {
    return new Date(iso).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
        timeZone: 'America/Chicago',
    });
}
