# Live URLs

Maintained per the **Always Ship A Link Rule** in `CLAUDE.md`. Update this file whenever a URL
changes. Every entry below was verified at the time it was written — see the verification note.

_Last verified: 2026-08-02_

## Production site

| What | URL |
|---|---|
| Primary (stable, always current) | https://www.thelostandunfounds.com |
| Apex (redirects to `www`) | https://thelostandunfounds.com |
| Vercel default domain | https://thelostandunfounds.vercel.app |

Verified live via `curl` with a browser user-agent → `HTTP 200`. A plain `WebFetch`/non-browser
request gets `HTTP 403` from this site — that's Cloudflare/Turnstile bot-blocking, not the site
being down. Don't read a 403 from a non-browser tool as an outage.

## Admin dashboard

| What | URL |
|---|---|
| Admin (auth-gated) | https://www.thelostandunfounds.com/admin |

Requires login — see `admin-ops` skill.

## Deployment platform

| What | URL |
|---|---|
| Vercel project (build status, logs, current deployment) | https://vercel.com/joshua-greenes-projects/thelostandunfounds |
| `main`-branch alias (mirrors current production build) | https://thelostandunfounds-git-main-joshua-greenes-projects.vercel.app |

Preview deployments get a unique URL per push and go stale within minutes — don't hardcode one
here. Use the Vercel project link above to find whatever preview is current for a given branch/PR.

## Database — Supabase

| What | Project ref | URL |
|---|---|---|
| **Live project** ("SCOT33 BACK-UP" — use this one) | `cxpyqjxhbvuygnxyukli` | https://cxpyqjxhbvuygnxyukli.supabase.co · [dashboard](https://supabase.com/dashboard/project/cxpyqjxhbvuygnxyukli) |
| Kattitude flash gallery project | `tovydesiocfgmasvzjvt` | https://tovydesiocfgmasvzjvt.supabase.co · [dashboard](https://supabase.com/dashboard/project/tovydesiocfgmasvzjvt) |

**⚠️ Stale reference still checked in:** `.env` / `.env.local` in this repo currently sets
`VITE_SUPABASE_URL` to the **old, paused** project (`nonaqhllakrckbtbawrb`) — do not use it. The
above `cxpyqjxhbvuygnxyukli` project is the one confirmed live via the Supabase MCP. Whether
Vercel's *deployed* environment variables have already been repointed to the live project (vs. the
checked-in `.env` file, which is local-only) has not been verified — flagged, not yet swept. Treat
that as open until someone checks Vercel's env var values directly.

## Source

| What | URL |
|---|---|
| GitHub repo | https://github.com/canyouseeus/thelostandunfounds |
