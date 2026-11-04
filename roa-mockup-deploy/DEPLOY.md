# Deploy the ROA mockup

You have two paths. Pick whichever is easier.

---

## Path A — One terminal command (fastest, ~60 seconds)

Open Terminal and paste this:

```bash
cd ~/thelostandunfounds/roa-mockup-deploy && npx vercel deploy --prod --yes
```

- First time only: it'll open a browser window asking you to log in to Vercel. Click Continue.
- It'll ask which Vercel team — pick **THE LOST AND UNFOUNDS** (or `joshua-greenes-projects`).
- It deploys and prints a URL like `https://roa-mockup-deploy-xxx.vercel.app`.

Send that URL to Daniel. Done.

---

## Path B — Wire it to thelostandunfounds.com/roa

After Path A gives you the `.vercel.app` URL, you have two ways to make it live at `thelostandunfounds.com/roa`:

### B1. Vercel rewrite (preferred, no code changes)

In your **thelostandunfounds** Vercel project's `vercel.json` add this to your existing config:

```json
{
  "rewrites": [
    { "source": "/roa", "destination": "https://roa-mockup-deploy-xxx.vercel.app/" },
    { "source": "/roa/(.*)", "destination": "https://roa-mockup-deploy-xxx.vercel.app/$1" }
  ]
}
```

Commit + push. Vercel redeploys in ~1 minute. `thelostandunfounds.com/roa` now serves the mockup.

### B2. Drop the file into your Next.js repo

In your `canyouseeus/thelostandunfounds` repo, copy `index.html` from this folder to `public/roa/index.html`. Commit + push. `thelostandunfounds.com/roa` serves it directly. No external deploy needed.

---

## What's in this folder

- `index.html` — the full ROA Industries mockup, self-contained
- `vercel.json` — sets clean URLs, no-index (so search engines don't accidentally crawl the mockup), no-cache (so you see updates immediately)
- `DEPLOY.md` — this file

The `noindex` header means Google won't accidentally show this preview in search results. Safe to share with Daniel without polluting your domain's SEO.
