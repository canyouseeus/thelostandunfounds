import { supabase } from './supabase';

/**
 * Attach the signed-in user's Supabase access token to every same-origin
 * /api/ request that doesn't already carry an Authorization header.
 *
 * Admin routes verify that token server-side (lib/api-handlers/_admin-auth.ts).
 * They used to trust an `X-Admin-Email` header instead, which anyone could set
 * — and dozens of admin components send it. Patching fetch once covers every
 * one of those call sites without touching each, and the old header is now
 * simply ignored by the server.
 *
 * The token only ever goes to this site's own /api/ routes, never to another
 * origin.
 */
export function installApiAuth(): void {
  if (typeof window === 'undefined' || (window.fetch as any).__apiAuth) return;
  const originalFetch = window.fetch.bind(window);

  const patched: typeof window.fetch = async (input, init) => {
    const url = new URL(
      typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
      window.location.href
    );
    if (url.origin !== window.location.origin || !url.pathname.startsWith('/api/')) {
      return originalFetch(input, init);
    }

    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    if (!headers.has('Authorization')) {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) headers.set('Authorization', `Bearer ${token}`);
    }
    return originalFetch(input, { ...init, headers });
  };
  (patched as any).__apiAuth = true;
  window.fetch = patched;
}
