# MICROSITES

A generator for standalone local-service microsites, and the first one built on it.

A microsite here is not a campaign landing page. It is a small, self-contained site
on its own exact-match domain, targeting one service in one place, with nothing else
on it. It ranks by topical concentration: a 14-page site that is *entirely* about
Airbnb photography in Austin can outrank a national contractor site where that topic
is 0.2% of the corpus. You do not beat them on authority — you beat them on relevance
density.

Output is plain static HTML. No framework, no dependencies, no build server.

---

## Quick start

```bash
npm run microsite austin-str-photography            # production build (gated)
npm run microsite:draft austin-str-photography      # draft build (noindex, allows placeholders)
npm run microsite:serve austin-str-photography      # build draft + serve on :8099
```

Output lands in `microsites/dist/<site-id>/` — deploy that directory as-is.

---

## Layout

```
microsites/
  build.mjs                   orchestrator + the seven gates
  lib/render.mjs              block renderers, Noir stylesheet
  lib/seo.mjs                 meta, JSON-LD, sitemap, robots
  lib/legal.mjs               trust/legal pages, generated from site.json
  prompts/                    page-type prompts for generating new content
  sites/<site-id>/
    site.json                 domain, geo, business identity, price ladder
    content/pages.json        hand-authored pages
    content/areas.json        the area matrix — one entry per neighborhood
  dist/<site-id>/             build output (gitignored)
```

Pages are block lists, not HTML. Available blocks: `hero`, `prose`, `pricing`,
`addons`, `steps`, `checklist`, `faq`, `areas`, `table`, `cta`, `quoteform`.
Adding a block type means adding one function to `lib/render.mjs`.

`pricing` and `addons` render from `site.json`, so the price ladder is defined
once and can never drift between the pricing page, the area pages and the
`Offer` structured data.

---

## The seven gates

A build is not a build until all seven pass. Every one has been verified failing
on an injected violation — a check that cannot fail is not a check.

| Gate | Enforces |
|---|---|
| `placeholders` | No `REPLACE_ME_*` token reaches a production build |
| `design` | No painted border, shadow, outline, gradient or non-zero radius |
| `headings` | Exactly one `<h1>` per page, rendered uppercase |
| `meta` | Title ≤60 chars, description 70–165, both unique site-wide |
| `links` | Every internal href resolves to a generated page |
| `similarity` | No two pages exceed 50% near-duplicate overlap |
| `legal` | The trust/legal set has been read by a human before production |

### Why the similarity gate is the one that matters

Google's March 2024 spam policies added **scaled content abuse** as a named
violation, and mass-produced templated local pages are the stated target. A
generator that emits 1,000 pages differing only by city name is building
precisely the artifact the policy describes, and batches get deindexed
wholesale rather than page by page.

The gate computes Jaccard overlap on 6-word shingles of each page's `<main>`
text and fails the build at 50%. For calibration, on this site:

- as authored, researched per-neighborhood: **34.8%** worst pair
- after replacing one area's copy with another's and swapping the name: **67.1%**

That is the difference the gate exists to catch, and it catches it at build
time instead of at deindex time.

The gate is a backstop, not a standard. It cannot tell you the content is
*good* — only that it is not obviously duplicated. Passing at 49% is still a
failure of craft.

---

### Trust and legal pages

Six pages ship with every site: About, FAQ, Privacy Policy, Terms, Accessibility
and a Thank You page (the form's redirect target, `noindex` and kept out of the
sitemap). They are footer-linked only — there to be found when looked for, not
to compete in the main nav — and carry sitemap priority `0.3` so they never
outrank a money page.

**The privacy policy is generated from `site.quoteForm.fields`.** Every field
tagged `personalData` appears in the policy automatically, so adding a field to
the form updates the policy in the same commit. The usual failure of a
boilerplate privacy policy is describing collection that does not match the
actual form; here it cannot drift.

The `legal` gate blocks a production build until `legal.reviewed` and
`legal.reviewedBy` are set in `site.json`. Generated legal text is a starting
draft, not advice — these pages make factual commitments about handling
personal data, and shipping them unread is a real exposure. Draft builds warn
instead of failing.

Deliberately **not** ported from the source pattern: "Meet the Team" and
"Careers" would mean inventing staff and vacancies for a solo operator, a
"Complaints Policy" duplicates Contact, and a "Referral Marketing Disclosure"
belongs on the parent platform that actually runs an affiliate program.
Fabricated trust pages are worse than absent ones.

### The quote form and call tracking

`site.quoteForm` defines the endpoint, method, redirect and every field. The
endpoint is deliberately a placeholder rather than a default, because the
platform's own `/api/booking?action=request` is a **JSON** API (`name`,
`business_name`, `email`, `phone`, `event_type`…) and `vercel.json` sets no
`Access-Control-Allow-Origin` on `/api/*` — a plain form action pointed there
lands the visitor on raw JSON. Three ways to close it, in `site.json`:

1. a form service (Formspree, Basin) — fastest, no platform change
2. a new form-encoded endpoint on the platform that 303-redirects back
3. keep `/api/booking`, add CORS, and submit by `fetch`

**Options 2 and 3 both need a table before they need an endpoint**, and the
`bookings` table is not it. Checked against the live schema on
`cxpyqjxhbvuygnxyukli`:

```
event_type   text  NOT NULL  (no default)
event_date   date  NOT NULL  (no default)
```

A quote request from the microsite collects a name, an email, an optional
phone, a property address, a bedroom count and a note. It does not collect a
date, because at this stage the visitor is asking what a shoot costs, not
picking a slot. Writing one into `bookings` therefore means inventing an
`event_date` — which puts a shoot on the calendar that nobody agreed to, and
puts it in front of the availability and buffer logic in
`api/booking/index.ts` that exists to stop exactly that.

So option 2 is: a `microsite_leads` table, an endpoint that accepts
`application/x-www-form-urlencoded` and 303s back to `redirectPath`, and spam
protection, since unlike `/api/booking` it would be a public write reachable
from any origin. That is a real piece of platform work with a production
migration in it, not a config change — which is why `quoteForm.action` is still
a placeholder rather than a guess. Option 1 costs nothing and needs none of it;
it is the right choice unless leads are wanted inside the platform's own admin.

`analytics.headScripts` is injected verbatim into every page's `<head>` between
`<!-- head-scripts:start -->` and `<!-- head-scripts:end -->`, and every `tel:`
link carries `analytics.phoneLinkClass` so a dynamic-number-insertion script can
find and swap it. Draft builds omit the scripts so preview traffic is not
counted as leads. **The design gate skips the marked region** — a vendor's
inline shadow is not ours to lint, and failing our own build over it would be a
false positive. The gate still applies to everything outside the markers.

## Design constraints

Inherited from the platform skills and enforced by the `design` gate:

- `.claude/skills/no-border-design` — *"NEVER use border classes in any
  component"*, *"NEVER use shadows or elevation"*. This skill is the authority
  and wins over every other design skill.
- `.claude/skills/noir-design` — `#000` background, white text,
  `border-radius: 0`, uppercase `h1`/`h2`, body copy always `text-left`.
- `CLAUDE.md` Page Title Style Rule — h1 headings are UPPERCASE.
- `frontend-style-guide` rule 2 — nothing clips at any width down to 320px.

Separation comes from surface tone and spacing only: `#000` base → `#0a0a0a`
raised → `rgba(255,255,255,.05)` subtle → `rgba(255,255,255,.10)` interactive
→ inverted white-on-black for primary actions.

One deliberate deviation, documented in `lib/render.mjs`: keyboard focus is
indicated by inverting the surface rather than by an outline. `no-border-design`
bans `outline`, but removing focus indication entirely is an accessibility
regression, so the effect is achieved within the rule instead of around it.

### Testing narrow viewports

Headless Chrome has a **500px minimum window width** — `--window-size=320,900`
silently lays out at 500px and crops the screenshot, which looks exactly like a
clipping bug and hides real ones. Narrow-viewport testing must go through CDP
`Emulation.setDeviceMetricsOverride`. Do not trust a narrow `--window-size`
screenshot.

---

## Adding an area

1. Run `prompts/area-research.md` for the neighborhood.
2. Append the resulting object to `content/areas.json`.
3. Rebuild. The area page, its internal links, its FAQ, its sitemap entry and
   its structured data are all generated.

The bar for an entry: **if the text would still read correctly with the
neighborhood name swapped out, it is not real content.** Every entry needs a
concrete local execution detail — the airspace class, the tree canopy, the
lake level, the building stock.

## Adding a site

1. Run `prompts/new-site.md` and validate the niche *before* writing anything.
   Build only on a yes to entity feasibility and a real answer on
   differentiation.
2. `mkdir -p sites/<id>/content`, write `site.json`, `pages.json`, `areas.json`.
3. Build, then deploy `dist/<id>/` to its own domain.

---

## Before this goes live

The production build is **blocked on purpose** — `site.json` still carries
`REPLACE_ME_FORM_ENDPOINT`, and the placeholder gate refuses to ship it. That is the intended behaviour, per `brand-ethos`: *"no
placeholders … If it's not wired to a real data source, it doesn't ship."*

Two things still block the build:

1. ~~**The phone from the Google Business Profile.**~~ Done — read off the
   profile on 30 August 2026 and set to `(512) 350-1869`, in the profile's own
   format. `business.legalName` already matched the profile name exactly.
2. **`quoteForm.action`.** Verified: `/api/booking` will not work as a plain
   form action — it is a JSON API and `vercel.json` sets no
   `Access-Control-Allow-Origin` on `/api/*`, so a form pointed there lands the
   visitor on raw JSON. Pick one of the three options above.
3. **`legal.reviewed`.** The trust pages state how personal data is handled.
   That claim should be true, and should be one you have read.

Then, to launch:

4. **Register the domain.** `austinairbnbphotography.com`, ~$12/yr.
5. **Update the existing Google Business Profile** — do not create a second
   one. The profile is the actual local ranking lever; the site is largely
   invisible for "near me" and map-pack intent without it, and its name,
   address and phone must match the `ProfessionalService` JSON-LD exactly. A
   mismatched NAP is worse than no markup, and a duplicate profile gets
   suspended, taking the working one down with it. Full sheet:
   `docs/outreach/google-business-profile.md`.
6. Deploy, verify, then submit the sitemap in Search Console.

Do not skip 5. It is the difference between a site that ranks and a site that
exists.

### Why there is no call-tracking number

An earlier version of this file said to buy one. That was wrong, and it would
have cost you the thing the profile is for: publishing a tracking number in the
markup while the profile shows a different number breaks NAP consistency, and a
mismatch is a weaker signal than an omission. `business.phone` takes the real
number from the profile.

Tracking still works and needs no second line. Every `tel:` link carries
`analytics.phoneLinkClass` (`wc-phone`), so a dynamic-number-insertion script
swaps the **displayed** number at runtime while the canonical number stays in
the structured data. That is what the class is for.

### Photography

Done. `content/images.json` registers seven real photographs from the Pease
Park and 501 W 30th shoots, placed twelve times across the site and served
through the platform's gallery stream with `srcset` and explicit dimensions.
The `images` gate fails the build on a missing `alt` or a missing
`width`/`height`. Adding a third property is worth doing, but it is no longer a
launch blocker.

---

## What this is not

This generator will not make a bad niche good, and it deliberately does not
scale to a thousand domains. The volume play — spray 1,000 EMDs, accept that
most die — is the version that gets caught, and it carries an operational tail
of a thousand renewals, certificates, forms and spam queues.

The version that survives is fewer sites, real business entities, real local
knowledge, real photos. Prove one ranks before templating the second.
