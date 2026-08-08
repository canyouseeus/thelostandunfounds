# PHASE 1 SCOPE — SITE CONFIG EXTRACTION

Scope for making the brand a variable instead of a string literal. Companion to
[WHITE_LABEL_PROGRAM.md](WHITE_LABEL_PROGRAM.md).

---

## Corrected scope

The white-label plan originally said "140 files." That undercounted, because it only
grepped the **domain**. The **display name** is a separate string and is the bigger half.

```
grep -rlE "thelostandunfounds|LOST\+UNFOUNDS" src lib api --include="*.ts" --include="*.tsx"
```

| | Files | Occurrences |
|---|---|---|
| Domain `thelostandunfounds` | 140 | 296 |
| Display name `LOST+UNFOUNDS` | 94 | 203 |
| **Union, `src` + `lib` + `api`** | **168** | **499** |

That grep was still too narrow — it only covered `.ts`/`.tsx`. The brand also lives
outside TypeScript entirely:

| Location | Files | Occurrences | Notes |
|---|---|---|---|
| `src` + `lib` + `api` (`.ts`/`.tsx`) | 168 | 499 | |
| `index.html` | 1 | 21 | Static; includes the full JSON-LD business schema |
| `scripts/` (`.ts`/`.js`) | 26 | 155 | Pre-render, sitemap, email and admin scripts |
| **Code total** | **195** | **675** | |
| `public/` | — | 118 | Mostly generated output + one-off client proposals |
| `scripts/upload-history.json` | 1 | 3049 | Data log, not code — out of scope |

Distribution of the union: `src/pages` is the largest surface, then `lib/api-handlers`,
`src/components`, and `api/`.

Hot spots worth doing first, since they establish the patterns everything else follows:
`src/pages/BlogPost.tsx` (14), `src/components/photos/PhotoGallery.tsx` (11),
`api/gallery/[...path].ts` (11), `src/pages/Blog.tsx` (10),
`lib/api-handlers/_newsletter-send-handler.ts` (9).

---

## Tiering

### Tier 1 — mechanical (roughly 3/4 of occurrences)

Direct substitutions with no judgment required:

- Brand name in JSX copy and page headings → `SITE.brandName`
- Absolute URLs → `siteUrl('/path')`
- The eight `@thelostandunfounds.com` addresses (67 occurrences) → `SITE.email.*`
  (`admin@` 31, `media@` 22, `noreply@` 5, `support@` 3, `privacy@` 2, `business@` 2,
  `sync@` 1, `legal@` 1)

Batchable. The risk here is volume and merge conflicts, not difficulty.

### Tier 2 — needs judgment

- **Email templates** (`lib/email-template.ts` and the newsletter handlers). Mail clients
  cannot resolve relative URLs, so every link and the banner image must stay absolute.
  `brand/banner.png` appears 11 times. Governed by `brand-email-manager` and
  `email-rendering` skills — read both before touching.
- **SEO and structured data.** `SEOHead.tsx` is done (reference implementation), but it
  turns out to cover the smaller half of the site's SEO surface:
  - **`index.html` (21 occurrences)** carries the `LocalBusiness` + `Photographer` JSON-LD
    block — business name, `admin@` address, Austin TX locality, `areaServed`, the
    five-service `hasOfferCatalog`, `priceRange`, Instagram `sameAs`, and a `ReserveAction`
    booking entry point. It is static HTML and reads no config at all. For a client fork
    this entire block is wrong, and it is probably the highest-SEO-value markup on the
    site — a photographer's local-business schema is exactly what earns local search
    placement. Templating it is a Phase 1 deliverable, not an afterthought.
  - **`scripts/pre-render-core-pages.ts` (18)** and `pre-render-blog-posts.ts` (12) hold
    their own copies of the brand. Verified: the pre-rendered `<title>` on `/about` comes
    from these scripts, not from `SEOHead`.
- **Legal pages** (`src/pages/docs/Terms.tsx` 7, `Privacy.tsx` 5). These need
  `SITE.legalName`, not `SITE.brandName` — a client's legal entity is not their display
  brand, and getting this wrong in a Terms page is a real problem rather than a cosmetic
  one.
- **Proposal templates** (`src/templates/silva-star/`, `src/templates/fadebox/`). These are
  one-off client documents. Decide whether they belong in a forkable template at all
  before spending effort parameterising them.

### Tier 3 — do not batch, one decision each

These encode the brand into something other than presentation. Each needs a deliberate
call, and several are not "branding" at all:

- **`thelostandunfounds@gmail.com` as an auth identity.** Hardcoded in `X-Admin-Email` /
  `x-admin-email` request headers across at least six frontend files —
  `ProductCostManagement.tsx`, `AdminPrintShopView.tsx` (5×), `NewsletterManagement.tsx`
  (3×), `BookingInvoicePanel.tsx`, `AdminInvoices.tsx` — plus `src/utils/admin.ts` and
  `lib/api-handlers/_client-uploads-handler.ts`. This is an authorization identity shipped
  in client-side code, not a brand string. It needs its own review; do not sweep it into a
  cosmetic rename.
- **Photo filename convention.** `_photo-sync-utils.ts` parses
  `@tlau.photos_thelostandunfounds_YYYY-MM-DD_...` with a regex. The brand is embedded in
  a **data format** — changing it breaks recognition of every already-synced file. Needs a
  migration story, not a substitution.
- **Browser storage keys.** `tlau_visitor_id`, `tlau_download_email`. `storageKey()` exists
  for new code, but changing the prefix on the live site orphans existing entries. Leave
  production on `tlau` and only vary it per fork.
- **Hostname / subdomain logic.** `BlogPost.tsx:152,246` compare a hostname part against
  `'thelostandunfounds'`; `SubdomainRegistration.tsx:73` lists it as a reserved subdomain.
  Behavioural, not cosmetic.
- **Analytics referrer classification.** `_analytics-handler.ts:198` treats any referrer
  not containing the brand as external.
- **External accounts.** Fourthwall storefront (`thelostandunfounds-shop.fourthwall.com`),
  Venmo (`venmo.com/u/thelostandunfounds`), Instagram (`tlau.photos`). Per-client
  credentials/accounts — config fields exist, but each fork must supply its own or have
  the feature flagged off.
- **`ZohoCallback.tsx:71`** contains a hardcoded local dev path
  (`/Users/canyouseeus/Desktop/...`). Unrelated to branding; delete it.

---

## Estimate

Tier 1 is the volume but not the risk — call it two or three focused passes, split by
directory to keep diffs reviewable. Tier 2 is smaller but slower, because email rendering
and legal copy each need verification rather than a grep. Tier 3 is a handful of items but
should be treated as its own small project, and the admin-email item may well be worth
doing on its own merits regardless of the white-label work.

Sequencing that keeps the tree green throughout: config module → one reference consumer →
Tier 1 by directory → Tier 2 → Tier 3 individually.

---

## Status

- [x] `src/config/site.ts` created, holding current production values
- [x] `SEOHead.tsx` converted as the reference implementation
- [ ] Tier 1 sweep — `src/pages`
- [ ] Tier 1 sweep — `src/components`
- [ ] Tier 1 sweep — `lib/` and `api/`
- [ ] Tier 2 — `index.html` business schema, pre-render scripts, email templates, legal pages
- [ ] Tier 3 — individually, admin-email identity first
- [ ] Feature flags (Phase 2)

**Definition of done for Phase 1:**

```bash
grep -rE "thelostandunfounds|LOST\+UNFOUNDS" src lib api scripts index.html \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.html"
```

returns hits only inside `src/config/site.ts`. Note this check must span `scripts/` and
`index.html`, not just `src`/`lib`/`api` — restricting it to TypeScript sources is what
hid a third of the work.

`index.html` cannot import the config at build time as-is; templating it needs either a
Vite HTML transform or generation from `site.ts` in `prebuild`. Decide which before
starting Tier 2.
