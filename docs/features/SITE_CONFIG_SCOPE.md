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
| **Union** | **168** | **499** |

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
- **SEO and structured data.** `SEOHead.tsx` is done (reference implementation). The
  pre-render scripts in `scripts/` also emit brand strings and need the same treatment.
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
- [ ] Tier 2 — email templates, pre-render scripts, legal pages
- [ ] Tier 3 — individually, admin-email identity first
- [ ] Feature flags (Phase 2)

**Definition of done for Phase 1:** the union grep returns hits only inside
`src/config/site.ts`.
