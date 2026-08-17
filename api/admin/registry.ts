import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

/**
 * Registry drill-downs: each census figure, broken down into who/what it
 * actually is, so a count is never just a number you have to take on faith.
 *
 * GET /api/admin/registry?section=users|photos|posts|products|writers|affiliates|subscribers
 *
 * Every section returns { total, rows }: rows are the most recent dozen,
 * each with a name, a supporting line, and a timestamp. Users come from
 * auth.users via the service key (real accounts with real emails), which is
 * the census the dashboard's old max-of-three-side-tables guess never was.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return res.status(500).json({ error: 'Missing Supabase credentials' })
    const supabase = createClient(url, key)

    const section = String(req.query.section || '')

    interface Row { name: string; line: string; at: string | null; fields?: Record<string, string> }
    const out = async (total: number, rows: Row[]) => res.status(200).json({ section, total, rows })
    const when = (iso?: string | null) => iso ?? null

    try {
        if (section === 'users') {
            // Real accounts. listUsers pages at 50: plenty for a platform this
            // size; the count comes from the same call.
            const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 50 })
            if (error) throw error
            const users = [...data.users].sort((a, b) => (b.created_at > a.created_at ? 1 : -1))
            return out(data.total ?? users.length, users.slice(0, 12).map(u => ({
                name: u.email ?? '(no email)',
                line: [
                    u.app_metadata?.provider ? `via ${u.app_metadata.provider}` : null,
                    u.last_sign_in_at ? `last seen ${u.last_sign_in_at.slice(0, 10)}` : 'never signed in',
                ].filter(Boolean).join(' · '),
                at: when(u.created_at),
                fields: {
                    Email: u.email ?? '(no email)',
                    Provider: u.app_metadata?.provider ?? 'email',
                    Created: u.created_at?.slice(0, 10) ?? '—',
                    'Last sign-in': u.last_sign_in_at?.slice(0, 10) ?? 'never',
                    Confirmed: u.email_confirmed_at ? 'yes' : 'no',
                },
            })))
        }

        if (section === 'photos') {
            const [{ count }, recent, orders] = await Promise.all([
                supabase.from('photos').select('*', { count: 'exact', head: true }),
                supabase.from('photos').select('title, status, price_cents, location_name, created_at, updated_at').order('updated_at', { ascending: false }).limit(12),
                supabase.from('photo_orders').select('*', { count: 'exact', head: true }).in('payment_status', ['paid', 'completed']),
            ])
            const rows: Row[] = (recent.data ?? []).map(p => ({
                name: p.title || '(untitled)',
                line: p.status ?? '',
                at: when(p.updated_at),
                fields: {
                    Status: p.status ?? '—',
                    Price: p.price_cents != null ? `$${(p.price_cents / 100).toFixed(2)}` : '—',
                    Location: p.location_name ?? '—',
                    Added: p.created_at?.slice(0, 10) ?? '—',
                    Updated: p.updated_at?.slice(0, 10) ?? '—',
                },
            }))
            // The purchases figure rides in front so "how many were bought"
            // has a home, per the census brief.
            rows.unshift({ name: `${orders.count ?? 0} gallery orders (paid)`, line: 'all time', at: null })
            return out(count ?? 0, rows)
        }

        if (section === 'posts') {
            const { data, count } = await supabase
                .from('blog_posts')
                .select('title, author_name, published_at, blog_column, slug', { count: 'exact' })
                .eq('status', 'published')
                .order('published_at', { ascending: false })
                .limit(12)
            return out(count ?? 0, (data ?? []).map(p => ({
                name: p.title,
                line: [p.author_name, p.blog_column].filter(Boolean).join(' · '),
                at: when(p.published_at),
                fields: {
                    Author: p.author_name ?? '—',
                    Column: p.blog_column ?? 'The Lost Archives',
                    Published: p.published_at?.slice(0, 10) ?? '—',
                    Slug: p.slug ?? '—',
                },
            })))
        }

        if (section === 'products') {
            const { data, count } = await supabase
                .from('products')
                .select('name, title, price, status, sku, inventory_quantity, created_at', { count: 'exact' })
                .order('created_at', { ascending: false })
                .limit(12)
            return out(count ?? 0, (data ?? []).map(p => ({
                name: p.name || p.title || '(unnamed)',
                line: [p.price != null ? `$${Number(p.price).toFixed(2)}` : null, p.status].filter(Boolean).join(' · '),
                at: when(p.created_at),
                fields: {
                    Price: p.price != null ? `$${Number(p.price).toFixed(2)}` : '—',
                    Status: p.status ?? '—',
                    SKU: p.sku ?? '—',
                    Inventory: p.inventory_quantity != null ? String(p.inventory_quantity) : '—',
                    Added: p.created_at?.slice(0, 10) ?? '—',
                },
            })))
        }

        if (section === 'writers') {
            // A writer is anyone with a published byline; group their output.
            const { data } = await supabase
                .from('blog_posts')
                .select('author_name, author_id, published_at')
                .eq('status', 'published')
            const byAuthor = new Map<string, { name: string; posts: number; last: string | null }>()
            for (const p of data ?? []) {
                const k = p.author_id ?? p.author_name ?? 'unknown'
                const cur = byAuthor.get(k) ?? { name: p.author_name || '(unnamed writer)', posts: 0, last: null }
                cur.posts += 1
                if (!cur.last || (p.published_at && p.published_at > cur.last)) cur.last = p.published_at
                byAuthor.set(k, cur)
            }
            const rows = [...byAuthor.values()].sort((a, b) => b.posts - a.posts)
            return out(rows.length, rows.slice(0, 12).map(w => ({
                name: w.name,
                line: `${w.posts} post${w.posts === 1 ? '' : 's'} in The Lost Archives`,
                at: when(w.last),
                fields: {
                    Writer: w.name,
                    'Published posts': String(w.posts),
                    'Last published': w.last?.slice(0, 10) ?? '—',
                },
            })))
        }

        if (section === 'affiliates') {
            const { data, count } = await supabase
                .from('affiliates')
                .select('first_name, last_name, paypal_email, code, status, total_conversions, created_at', { count: 'exact' })
                .order('created_at', { ascending: false })
                .limit(12)
            return out(count ?? 0, (data ?? []).map(a => ({
                name: [a.first_name, a.last_name].filter(Boolean).join(' ') || a.paypal_email || a.code || '(unnamed)',
                line: [a.status, `${a.total_conversions ?? 0} conversions`].filter(Boolean).join(' · '),
                at: when(a.created_at),
                fields: {
                    Name: [a.first_name, a.last_name].filter(Boolean).join(' ') || '—',
                    'PayPal email': a.paypal_email ?? '—',
                    Code: a.code ?? '—',
                    Status: a.status ?? '—',
                    Conversions: String(a.total_conversions ?? 0),
                    Joined: a.created_at?.slice(0, 10) ?? '—',
                },
            })))
        }

        if (section === 'subscribers') {
            const { data, count } = await supabase
                .from('newsletter_subscribers')
                .select('email, source, verified, subscribed_at, created_at', { count: 'exact' })
                .order('created_at', { ascending: false })
                .limit(12)
            return out(count ?? 0, (data ?? []).map(s => ({
                name: s.email,
                line: [s.source, s.verified ? 'verified' : 'unverified'].filter(Boolean).join(' · '),
                at: when(s.subscribed_at ?? s.created_at),
                fields: {
                    Email: s.email,
                    Source: s.source ?? '—',
                    Verified: s.verified ? 'yes' : 'no',
                    Subscribed: (s.subscribed_at ?? s.created_at)?.slice(0, 10) ?? '—',
                },
            })))
        }

        return res.status(400).json({ error: 'unknown section' })
    } catch (err: any) {
        console.error('[Registry] error:', err)
        return res.status(500).json({ error: err?.message || 'Registry breakdown failed' })
    }
}
