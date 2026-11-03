/**
 * Gallery passes: who a signed-in viewer is to one gallery, as a signed token
 * the image/download route can check without a session.
 *
 * An <img> or a download link carries no Authorization header, so the stream
 * route cannot see who is asking. The page asks GET /api/gallery/pass (with
 * the session), gets a pass, and appends it to every stream URL as &gp=.
 *
 * Roles (owner-confirmed 2026-11-02 — one album, two invite lists):
 *   owner — the gallery's album owners (invited_emails), its owner_id/user_id,
 *           or the admin. Sees clean photos, downloads everything free.
 *   buyer — "à la carte" (buyer_emails). Sees the whole album, watermarked,
 *           and downloads only the photos they bought (photo_entitlements).
 *
 * A pass is an HMAC of (library, email, role, expiry); it only ever says what
 * the live lists said when it was minted, and expires in 12 hours.
 * Secret: GALLERY_INVITE_SECRET, else derived from the service-role key.
 */
import { createHmac, timingSafeEqual } from 'crypto';

export type GalleryRole = 'owner' | 'buyer';

const TTL_MS = 12 * 60 * 60 * 1000;

function secret(): string {
    const base = process.env.GALLERY_INVITE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!base) throw new Error('No secret for gallery passes.');
    return `gallery-pass-v1:${base}`;
}

function sign(libraryId: string, email: string, role: string, exp: number): string {
    return createHmac('sha256', secret()).update(`${libraryId}|${email}|${role}|${exp}`).digest('base64url');
}

export function emailList(raw: string | null | undefined): string[] {
    return (raw || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
}

/** The viewer's role in a gallery, from the live lists. Null: no access. */
export function roleFor(
    library: { invited_emails?: string | null; buyer_emails?: string | null; owner_id?: string | null; user_id?: string | null },
    viewer: { email?: string | null; userId?: string | null; isAdmin?: boolean },
): GalleryRole | null {
    const email = (viewer.email || '').trim().toLowerCase();
    if (viewer.isAdmin) return 'owner';
    if (viewer.userId && (viewer.userId === library.owner_id || viewer.userId === library.user_id)) return 'owner';
    if (email && emailList(library.invited_emails).includes(email)) return 'owner';
    if (email && emailList(library.buyer_emails).includes(email)) return 'buyer';
    return null;
}

export function mintPass(libraryId: string, email: string, role: GalleryRole, now = Date.now()): string {
    const e = email.trim().toLowerCase();
    const exp = now + TTL_MS;
    return `${Buffer.from(e).toString('base64url')}.${role}.${exp}.${sign(libraryId, e, role, exp)}`;
}

export function verifyPass(
    pass: unknown,
    libraryId: string,
    now = Date.now(),
): { email: string; role: GalleryRole } | null {
    if (typeof pass !== 'string' || pass.length > 800) return null;
    const parts = pass.split('.');
    if (parts.length !== 4) return null;
    const [e64, role, expStr, sig] = parts;
    if (role !== 'owner' && role !== 'buyer') return null;
    const exp = Number(expStr);
    if (!Number.isFinite(exp) || exp < now) return null;
    let email: string;
    try {
        email = Buffer.from(e64, 'base64url').toString('utf8');
    } catch {
        return null;
    }
    const expected = Buffer.from(sign(libraryId, email, role, exp));
    const given = Buffer.from(sig);
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
    return { email, role };
}

/** A gallery is free when its per-photo price is 0 and no bundle costs anything. */
export function isFreeLibrary(
    library: { price?: number | string | null },
    options: { price?: number | string | null; photo_count?: number | null }[],
): boolean {
    const single = options.find(o => o.photo_count === 1);
    const singlePrice = single ? Number(single.price) || 0 : Number(library.price) || 0;
    return singlePrice <= 0 && !options.some(o => Number(o.price) > 0);
}
