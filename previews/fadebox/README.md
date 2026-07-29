# FADEBOX — standalone client preview

A self-contained deployment of the Fadebox redesign mockup, so it can be shown
to the client independently of the main site.

| Route | Page | Source |
| --- | --- | --- |
| `/` | Landing page | `src/pages/FadeboxLanding.tsx` |
| `/proposal` | 3-page proposal | `src/pages/FadeboxProposal.tsx` |
| `/dashboard` | Owner console | `src/pages/FadeboxDashboard.tsx` |

`/fadebox-preview`, `/fadebox-preview/proposal` and `/fadebox-preview/dashboard`
are routed to the same three pages, so links written against the main site's
paths resolve here too.

## Relationship to the main app

The three page components are copies of `src/templates/fadebox/*.tsx`, which the
main app serves at `/fadebox-preview`. They are copied rather than imported
because this is a separate Vercel project with its own dependency tree; it does
not build the main site. Two deliberate differences from the originals:

1. **Proposal cover logo** uses `/logo-black.png` instead of
   `https://www.thelostandunfounds.com/logo.png`. The hosted `logo.png` is
   white-on-transparent, so on the proposal's white cover it renders as a blank
   150px gap. `logo-black.png` is the same mark inverted. The main app's
   proposal page still has this bug.
2. **Proposal "see it live" callout** links to this deployment's own `/` and
   `/dashboard` instead of naming `thelostandunfounds.com/fadebox-preview`.

Keeping the copies in sync is manual. If the originals change, re-copy them and
re-apply those two edits.

## Local development

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # -> dist/
```

## Deploying

Deployed as its own Vercel project (`fadebox-preview`) via the file-upload API,
not the git integration, so it is unaffected by the main project's state. Only
the config files are uploaded; `scripts/fetch-remote-sources.mjs` pulls the page
components and images from a pinned commit of this repo during the build. Those
files already exist in a local checkout, so the script no-ops during local
builds.

To deploy from a newer commit, set `FADEBOX_SOURCE_REF` to that commit SHA, or
update the `REF` default in the script.
