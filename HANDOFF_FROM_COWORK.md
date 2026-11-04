# Handoff from Cowork → Claude Code

Joshua moved this work to Claude Code mid-task because Cowork's sandbox
couldn't reach `github.com` to push and Cowork doesn't expose a "paste
your own MCP URL" flow yet for GitHub. Everything you need to finish
shipping is below. **Read top to bottom — there's a real bug fix
sitting in a local commit that needs to be pushed.**

---

## TL;DR — what's pending right now

- **Local commit `b0eda5b` on `main`** fixes a real SEO bug. It is
  **not yet pushed.** First action: `git push origin main`.
- After the push, Vercel auto-deploys. Re-crawl in Ahrefs to confirm
  the duplicate-content flag clears on the next pass.

---

## The original problem

Ahrefs Site Audit reported the site's Health Score at **51 ("Fair")**.
Two distinct issues stacked on top of each other:

1. **8 orphan pages** — pages in `sitemap.xml` with zero internal
   inbound links. Slugs: `/advertise`, `/newtheory`, `/pricing`,
   `/borderlands`, `/book-club`, `/science`, `/gearheads`, `/support`.
   Not addressed in this commit; flagged as a follow-up below.
2. **11 duplicate-content URLs** — `/`, `/booking`, plus 9 specific
   blog post slugs (4 under `/blog/<subdomain>/...`, 5 under
   `/thelostarchives/...`) all returning the same homepage shell to
   crawlers. **This is what `b0eda5b` fixes.**

---

## Root cause of the duplicate-content flag

This is the important part — I went in circles before getting here.

The site is a Vite SPA on Vercel. `vercel.json` has a catch-all rewrite
that sends every unmatched URL to `/index.html`. That's normal SPA
behavior, but it relies on pre-rendered static HTML existing in `dist/`
for SEO-critical routes so crawlers don't all see the same shell.

`scripts/pre-render-blog-posts.ts` was writing each post to
`dist/<folder>/<slug>.html` — a **flat `.html` file**. But `vercel.json`
does not enable `cleanUrls: true`, so Vercel doesn't auto-resolve a
request for `/thelostarchives/all-for-a-dream` to
`dist/thelostarchives/all-for-a-dream.html`. It only resolves to a
file at the exact path or to `<path>/index.html`. Neither existed →
catch-all rewrite fired → every blog post returned the homepage shell
→ Ahrefs flagged 9 of them as duplicate content.

Visible proof: before the fix, `dist/thelostarchives/` contained
exactly the 5 `.html` files matching the 5 thelostarchives slugs in
the duplicate-content report. Same for `dist/blog/plutonium/`.
Compare to `pre-render-core-pages.ts` and `pre-render-galleries.ts`
which both correctly write `<dir>/<slug>/index.html` and have never
been flagged.

`/booking` is a separate sub-issue: it was a standalone React Router
route (`<Route path="/booking" ...>`), but booking is also rendered
as a tab on the homepage (`Gallery.tsx`, `viewMode='booking'`). The
standalone `/booking` URL had no pre-render at all, so it always fell
through to the same shell. The route is now removed; the BOOK ME
nav link points at `/?view=booking`, and `Gallery.tsx` reads the
`?view=` query param on mount to pre-select the booking tab.

---

## What's in commit `b0eda5b`

Nine files, no unrelated working-tree changes were staged. Diff:

| File | Change |
|---|---|
| `scripts/pre-render-blog-posts.ts` | **Root-cause fix.** Writes `<folder>/<slug>/index.html` instead of `<folder>/<slug>.html`. |
| `scripts/generate-404-html.ts` (new) | Build-time step that clones `dist/index.html` to `dist/404.html` and injects `<meta name="robots" content="noindex, nofollow">`. |
| `vercel.json` | Catch-all rewrite destination changed from `/index.html` → `/404.html`. Real pre-rendered pages still win the static-file match; truly orphan URLs (drafts, admin-only) get noindex. |
| `package.json` | `generate-404-html.ts` appended to `postbuild` chain. |
| `scripts/generate-sitemap.ts` | `/booking` removed from the sitemap (admin-gated tool — should not be advertised to crawlers). |
| `src/App.tsx` | `/booking` route removed; `BookingPage` import removed. Comments explain why. |
| `src/components/NavLinks.tsx` | BOOK ME link now `/?view=booking`. |
| `src/pages/Gallery.tsx` | Imports `useSearchParams`; reads `?view=shop\|booking\|gallery` and seeds `viewMode` state from it. |
| `src/pages/BookingPage.tsx` | Removed `<SEOHead title="Booking" canonicalPath="/booking" />` so the embedded tab can't override the homepage's SEO. |

**Before pushing:** review the diff (`git show b0eda5b`) if you want.
Otherwise:

```bash
git push origin main
```

That triggers Vercel's auto-deploy.

---

## After deploy — verification steps

1. `curl -A "Googlebot" https://www.thelostandunfounds.com/thelostarchives/all-for-a-dream | head -50`
   - Should return the post body, NOT the generic homepage shell.
   - Title should be `ALL FOR A DREAM | THE LOST ARCHIVES | THE LOST+UNFOUNDS`.
   - Should have `<link rel="canonical" href=".../thelostarchives/all-for-a-dream" />`.
2. `curl -A "Googlebot" https://www.thelostandunfounds.com/booking | head -30`
   - Should now contain `<meta name="robots" content="noindex, nofollow" />`.
3. `curl https://www.thelostandunfounds.com/sitemap.xml | grep booking`
   - Should return nothing (booking removed from sitemap).
4. Open Ahrefs Site Audit → run a fresh crawl → confirm those 11 URLs
   leave the duplicate-content bucket. Health Score should rise.

---

## Recommended MCP setup for Claude Code

The work in Cowork was unblocked by these connectors. Set them up in
Claude Code so future iterations don't ping-pong between tools:

```bash
# Supabase — for verifying blog_posts state, running migrations, etc.
claude mcp add supabase --transport http https://mcp.supabase.com/mcp/<your-org-or-project>
# Auth via OAuth on first use, or pass --header "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"

# Vercel — for build logs, deployment status, env vars
claude mcp add vercel --transport http https://mcp.vercel.com/<team-slug>

# Ahrefs — for the SEO audits this whole task started with
claude mcp add ahrefs --transport http <ahrefs-mcp-url> --header "Authorization: Bearer $AHREFS_API_KEY"

# GitHub — so commit/push is just a tool call, no terminal context-switch
claude mcp add github --transport http https://api.githubcopilot.com/mcp/ --header "Authorization: Bearer $GITHUB_PAT"
```

Verify with `/mcp` inside Claude Code or `claude mcp list`.

**Important:** Joshua's previous GitHub PAT
(`github_pat_11A43ZYQQ0lZzvwUZF32Gl_WZuPnVGa3EUdTyn75KXY4qTMKDkY7WCl`)
appeared in a screenshot during the Cowork session and should be
considered leaked. **Rotate it before configuring the GitHub MCP.**
github.com/settings/tokens → revoke the old PAT, create a new
fine-grained one with `repo` (and `workflow` if you ever want to
touch Actions) scope, then use the new one.

---

## Open follow-ups (not in `b0eda5b`)

1. **Orphan pages.** The 8 URLs from the original Ahrefs orphan-page
   report (`/advertise`, `/pricing`, `/support`, etc.) are pre-rendered
   and in the sitemap, but no internal nav links point to them.
   They'll either need (a) links added to footer/nav for the ones
   meant to be public (`/pricing`, `/support`, `/advertise` at minimum
   probably belong in the footer), or (b) noindex + sitemap removal
   for any that aren't actually public pages.

2. **Sitemap audit.** `scripts/generate-sitemap.ts` hardcodes a list
   of "core" URLs. Worth a sanity check that every URL in there is
   genuinely meant to be indexed. `/newtheory`, `/borderlands`,
   `/science`, `/gearheads`, `/book-club` are all category landing
   pages that probably should stay, but confirm with Joshua.

3. **Ahrefs Site Audit insufficient-plan errors.** The Cowork Ahrefs
   MCP returned `"Insufficient plan"` on `site-audit-projects` and
   `site-audit-issues`. If you want to call those endpoints from
   Claude Code, the API key needs an Ahrefs plan tier with the Site
   Audit add-on. Worth checking before assuming the same wall doesn't
   exist in Claude Code — the wall is on the Ahrefs side, not ours.

4. **Working-tree cleanup.** When I checked `git status` at the start
   of the session there were ~12 unrelated modified files in the tree
   (`api/booking/index.ts`, `AdminCalendarView.tsx`,
   `DashboardCharts.tsx`, etc.). I left them untouched and only staged
   the 9 files for this commit. Joshua may want to review/commit/discard
   those separately — they predate this task.

---

## Lessons learned (so the next loop is faster)

These were the time-wasters in the Cowork session — flagged here so
the same mistakes don't repeat:

1. **Query the data via MCP before trusting any "diagnosis" prompt.**
   The original dev prompt for this task assumed auth-gated pages were
   returning 200 OK with an empty template shell. The Supabase MCP
   would have shown in 30 seconds that all 9 affected blog posts were
   `published: true` — pointing immediately at the pre-render output
   instead of an auth-middleware fix. I designed around the prompt's
   theory for several rounds before checking the database. Don't.

2. **Commit and push by default.** Don't stop at "want me to commit?"
   for non-destructive changes the user has already approved. Stage
   selectively (skip the unrelated dirty tree), commit with a clear
   message, push. If the push fails, name the wall and route around it.

3. **Verify capability before promising it.** I burned turns offering
   to push via Script Editor / AppleScript without checking that
   Cowork's tier system blocks both. If the path hasn't been validated,
   don't pitch it.

4. **Cowork ≠ Antigravity ≠ Claude Code.** They're three separate
   MCP runtimes. A connector configured in one is invisible to the
   others. Don't assume cross-app reach.

— Cowork, 2026-05-07
