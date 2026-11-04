# Deploy ROA Industries mockup to thelostandunfounds.com/roa

You're picking up a handoff. Joshua (THE LOST+UNFOUNDS) is pitching a website redesign to ROA Industries Unlimited LLC, a Texas construction company. The mockup is built and needs to go live at `thelostandunfounds.com/roa` so the client (Daniel at ROA) can preview it via link.

## What's already done

- The mockup is a single self-contained HTML file at `~/thelostandunfounds/roa-mockup-deploy/index.html` (~44 KB).
- A `vercel.json` in that same folder already sets `X-Robots-Tag: noindex` (so Google won't crawl the client preview) and `Cache-Control: max-age=0` (so updates appear instantly on reload).
- The hosting target is Joshua's existing Vercel team **THE LOST AND UNFOUNDS** (team slug `joshua-greenes-projects`, team ID `team_mb29bMintz7Ffd29VRICdhGx`).
- The main production site is the **`thelostandunfounds`** Vercel project (ID `prj_6AFga8ibmQFfKL5zP5qsRu1q8RkT`), connected to the GitHub repo `canyouseeus/thelostandunfounds`, custom domain `thelostandunfounds.com`.

## What needs to happen

1. **Deploy `~/thelostandunfounds/roa-mockup-deploy/` to Vercel** as a new project under THE LOST AND UNFOUNDS team. Use `vercel deploy --prod --yes` from that directory. If Vercel asks for project name, use `roa-mockup`. Capture the production URL it prints (will look like `https://roa-mockup-xxx.vercel.app` or with a clean alias).

2. **Wire `/roa` on the main site to point at it.** In Joshua's `canyouseeus/thelostandunfounds` repo, find the existing `vercel.json` (or create one at repo root if none exists). Add these rewrites — preserving any rewrites already in the file:

   ```json
   {
     "rewrites": [
       { "source": "/roa", "destination": "https://roa-mockup-xxx.vercel.app/" },
       { "source": "/roa/(.*)", "destination": "https://roa-mockup-xxx.vercel.app/$1" }
     ]
   }
   ```

   Replace `roa-mockup-xxx.vercel.app` with the actual URL from step 1. Commit with message `feat: add /roa client preview rewrite` and push to `main`. Vercel auto-deploys in ~60 seconds.

3. **Verify it works.** Open `https://thelostandunfounds.com/roa` in a browser. You should see the ROA Industries dark-mode landing page (hero says "Unlimited Standards, Unmatched Results"). If you see a 404 or the main thelostandunfounds.com homepage instead, the rewrite didn't take effect — check that the rewrite was applied to the right project and that the build completed.

## Authentication

- **Vercel:** Joshua is logged in via Vercel CLI on his machine. If `vercel deploy` errors with "no credentials," run `vercel login` first — it opens a browser tab for one-click auth. Do not create or use long-lived API tokens.
- **GitHub:** Joshua's local git is already authenticated to push to `canyouseeus/thelostandunfounds`. Use his existing credentials, don't try to set up new ones.

## What NOT to do

- Don't modify `index.html` itself — the design is approved as-is by Joshua. If anything looks broken, report back rather than editing.
- Don't change sharing/permission settings on the Vercel project or GitHub repo.
- Don't deploy under a personal Vercel account — must be under THE LOST AND UNFOUNDS team.
- Don't add the `/roa` rewrite to the production `vercel.json` until the mockup deploy succeeds and you have its real URL.
- Don't make this preview SEO-discoverable. The `vercel.json` in the mockup folder already sets `noindex`; leave that header in place.

## Success criteria

- `https://thelostandunfounds.com/roa` loads the ROA Industries mockup (dark background, "ROA INDUSTRIES" in nav, hero headline "Unlimited Standards, Unmatched Results").
- The page has `X-Robots-Tag: noindex` in the response headers (verify with curl: `curl -I https://thelostandunfounds.com/roa | grep -i robots`).
- Form on the page renders correctly (it's wired to fall back to a mailto: until the Supabase Edge Function endpoint is added — that's a later phase, not your concern).
- You report back to Joshua with the live URL and a screenshot.

## If you get stuck

- If Vercel CLI doesn't work, fall back to **Path B** in `~/thelostandunfounds/roa-mockup-deploy/DEPLOY.md`: drop `index.html` into the `public/roa/index.html` path of the GitHub repo, commit, push. Vercel auto-serves it at `/roa` without needing the rewrite.
- If the GitHub push is blocked, stop and ask Joshua rather than forcing it.
- Don't burn more than 15 minutes. If it's not working, report what you tried and what failed; the manual fallback is just running the CLI command in Terminal.
