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

`site.quoteForm` defines the endpoint, method, redirect and every field, so the
form, the endpoint and the privacy policy all come from one definition. Adding a
field to the config adds it to the form and to the policy at once.

**Leads go to the platform, not to a form service.** `quoteForm.action` is
`https://www.thelostandunfounds.com/api/microsite/lead`. A third-party service
would have put the highest-intent enquiries this business gets in someone else's
dashboard, while its bookings, invoices, contracts and CRM all live here — and
`CLAUDE.md`'s Capability Rule says not to send the owner to a third-party
dashboard when the app already holds the credentials.

### Why it is an ordinary form post

The form posts `application/x-www-form-urlencoded` and the endpoint answers
`303` back to `redirectPath`. That shape is doing real work:

- A plain form post is a CORS **simple request**. It crosses origins with no
  preflight and no `Access-Control-Allow-Origin` — which `vercel.json` does not
  set on `/api/*` and should not start setting for this.
- The visitor never sees JSON.
- **It works with JavaScript disabled.** The two inline scripts on the page are
  both optional.

`/api/booking` could not have done this: it is a JSON API, so a form action
pointed there lands the visitor on raw JSON.

### Why leads have their own table

Checked against the live schema on `cxpyqjxhbvuygnxyukli`, not assumed:

```
bookings.event_type   text  NOT NULL  (no default)
bookings.event_date   date  NOT NULL  (no default)
```

A quote request collects a name, an email, an optional phone, a property
address, a bedroom count and a note. It has no date, because at this stage the
visitor is asking what a shoot costs, not choosing a slot. Writing one into
`bookings` therefore means inventing an `event_date` — which puts a shoot nobody
agreed to on the calendar, in front of the availability and travel-buffer logic
in `api/booking/index.ts` that exists to prevent exactly that.

So a quote request is a `microsite_leads` row. RLS is on with a single
`service_role` policy and **no anon or authenticated policy at all**: these rows
carry a member of the public's name, email, phone and property address, and
nothing in a browser has any business reading them. The admin registry endpoint
is the only read path, which is why the dashboard's lead count comes from
`/api/admin/registry?section=leads` rather than the browser Supabase client.

No IP address and no user agent are stored. The privacy policy generates from
`quoteForm.fields`, so retaining anything beyond those fields would be a promise
the policy does not make.

### Three spam guards

The endpoint is public and cross-origin, so it is a spam target.

| Guard | What it catches | Needs JS |
|---|---|---|
| Honeypot | Bots that fill every field they find | no |
| Fill-time stamp | Submissions faster than a person could type | yes, skipped without |
| Turnstile | The rest | yes |

The first two answer with an ordinary-looking success. Telling a bot which check
caught it is telling it how to pass next time.

The honeypot is positioned off-screen rather than `display:none`, because a bot
reading computed styles skips what is hidden outright but will fill a field it
can see in the DOM. It is `aria-hidden` and untabbable, so nobody using
assistive tech or a keyboard ever meets it.

Turnstile is required whenever `TURNSTILE_SECRET_KEY` is set, so omitting the
token is not a way past it. It is skipped outside production, where there is no
widget to solve — which is what makes the endpoint testable on a preview deploy.

> **Before launch:** add `austinairbnbphotography.com` to the Turnstile widget's
> domain list in Cloudflare. The site key is the public half of the same widget
> the main site uses, and it is bound to a domain list. Miss this and every
> submission from the real domain fails the check.

### The redirect is not an open redirect

`lib/api-handlers/_microsite-sites.ts` is a server-side registry of the sites
the platform will accept a lead from, and the origins each is served from. The
endpoint resolves the posted `site` id against it and builds the redirect from a
**registry** origin plus a validated path. A request cannot name its own
destination — the risk any public endpoint answering with a `303` otherwise
carries. `safeRedirectPath` refuses protocol-relative and backslash forms
outright rather than trying to sanitise them.

Adding a microsite means adding a row to that registry. That is deliberate: a
new site should be a decision, not something a form field can assert.

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

**One thing still blocks the build**, and it is not a purchase. Both
placeholders are now real values, so the placeholder gate passes; the `legal`
gate does not, which is the intended behaviour per `brand-ethos`: *"no
placeholders … If it's not wired to a real data source, it doesn't ship."*

1. ~~**The phone from the Google Business Profile.**~~ Done — read off the
   profile on 30 August 2026 and set to `(512) 350-1869`, in the profile's own
   format. `business.legalName` already matched the profile name exactly.
2. ~~**`quoteForm.action`.**~~ Done — built into the platform rather than
   handed to a form service. See *The quote form* above for the endpoint, the
   table and the three spam guards.
3. **`legal.reviewed`.** The trust pages state how personal data is handled.
   That claim should be true, and should be one you have read. **This is the
   only remaining blocker, and only you can clear it** — it is a statement about
   your business, not a technical gap.

A draft build prints exactly this, so the checklist and the build cannot drift:

```
1 warning(s):
  ! [legal] legal pages have not been marked reviewed. Read /about/, /faq/,
    /privacy-policy/, /terms/ and /accessibility/, then set legal.reviewed and
    legal.reviewedBy in site.json.

all 8 gates passed
```

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
