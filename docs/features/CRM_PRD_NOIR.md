# PRD: NOIR CRM ("Project Shadow")

**Status:** Ready to build: supersedes the 22 Dec 2025 draft (see git history)
**Code Name:** Project Shadow
**Design authority:** the `noir-design` / `no-border-design` skills, not this document

---

## 0. Preflight: do this before writing any code

The previous version of this PRD specified *"sharp borders"* and *"Each Lead Card is a simple
white outline box."* Those instructions contradicted the design system, and an agent that followed
this document faithfully produced a bordered CRM. It read the rules; the rules were wrong.

So this PRD does not restate styling rules. It points at the skills that own them. And it requires
you to show your work before you start:

**Step 1: Declare, then read.** Before writing code, list the files you intend to read. Then read
them. At minimum:

```
.claude/skills/no-border-design/SKILL.md      ← authority on borders/shadows
.claude/skills/noir-design/SKILL.md           ← palette, geometry, surface ladder
.claude/skills/bento-design/SKILL.md          ← card grids, console tray
.claude/skills/admin-ops/SKILL.md             ← admin page requirements
.claude/skills/supabase-mcp/SKILL.md          ← how migrations get applied
```

**Step 2: Quote, don't summarise.** For each file, quote the specific line that governs this
task. A fabricated quote is easy to catch; a fabricated summary is not. If you cannot quote it,
you did not read it.

**Step 3: Name conflicts out loud.** If any instruction here conflicts with a skill, say so
explicitly, state which you are following, and why. Do not silently reconcile. The skills win;
this document is wrong if they disagree.

**Step 4: Verify by rendering, not by describing.** Before reporting a UI task complete, render
the page and look at the whole thing, not just the part you changed. Three separate bugs shipped
this month because the check confirmed the specific fix and never looked at the finished output.

> **On self-reporting:** "Did you follow the design system?" is not a useful question to answer,
> because the answer is reconstructed after the fact and will be a confident yes either way. Show
> the rendered page and the grep output instead.

**Step 5: Confirm you are on the right base.** Run `git log --oneline -3` and confirm the
border/shadow reconciliation commits are present. If `noir-design` still says *"Use rigid, thin
borders"*, you are on an old base and every styling rule you read is stale.

---

## 1. Problem

There is no pipeline anywhere in the system. `bookings.status` has exactly two values (`paid`,
`pending`) and describes a transaction, not a relationship. Prospects live in someone's head until
they become a `clients` row, which only happens once money is involved.

Current data: **3 clients, 9 bookings, 3 invoices, $525 invoiced.** The business needs outbound,
and outbound needs a place to put people who have not paid yet.

## 2. Scope

**In:** lead capture, a pipeline board, contact detail, activity notes, conversion of a won lead
into an existing `clients` row, and bulk import from a directory list.

**Out (deferred, see §8):** AI enrichment, automated scraping, email sequences, predictive scoring.

---

## 3. Data model

New table `leads`. It does **not** replace `clients`: a lead is a prospect, a client is someone
you have invoiced. Conversion links the two.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `company` | text not null | Primary display name. Most CAI entries are companies, not people. |
| `contact_name` | text | Nullable: directory listings often have none |
| `email` | text | |
| `phone` | text | |
| `website` | text | |
| `address` | text | |
| `city` / `state` | text | Defaults Austin / TX |
| `stage` | text not null | `discovery` \| `contacted` \| `negotiation` \| `won` \| `lost` |
| `priority` | int | 1-5, default 3 |
| `source` | text | e.g. `cai-austin-directory`, `referral`, `inbound` |
| `owner_notes` | text | Freeform |
| `next_action` | text | What you owe them |
| `next_action_at` | date | Drives the "needs attention" view |
| `client_id` | uuid fk → `clients.id` | Set on conversion, null otherwise |
| `lost_reason` | text | Required when stage = `lost` |
| `created_at` / `updated_at` | timestamptz | |

**Indexes:** `stage`, `next_action_at`, and a unique partial index on `lower(company)` where
`source = 'cai-austin-directory'` so re-importing the directory cannot create duplicates.

**RLS:** enabled, admin-only. Same posture as `invoices`.

**A note on `contacted`:** the old PRD had four stages. Five is correct: "I found them" and "I
reached out" are different states, and the gap between them is where outbound actually dies.

### Conversion

When a lead moves to `won`, create a `clients` row (or link an existing one) and set
`leads.client_id`. Invoices attach to the client, not the lead. The lead stays as history.

---

## 4. Pipeline: the Shadow Board

Five columns: `DISCOVERY → CONTACTED → NEGOTIATION → WON / LOST`.

- **Card:** company, contact name, priority, next action + date. Overdue actions are visually
  distinct: using surface tone and weight, **not** colour (the palette is monochrome).
- **Movement:** drag-and-drop, plus a keyboard-accessible dropdown fallback. Do not ship
  drag-only: it fails on mobile and for keyboard users.
- **Priority:** 1-5, rendered as dashes/dots per the old spec.
- **Moving to `lost`** requires a `lost_reason`. Blocking this is the point: a pipeline without
  loss reasons teaches you nothing.

### Views

1. **Board**: the pipeline
2. **Table**: sortable, filterable; the right view for 200 imported directory rows
3. **Needs attention**: `next_action_at <= today`, across all stages. This is the daily driver.

Detail opens in a side panel, not a route change.

---

## 5. Styling

**This section deliberately contains no CSS values.** Read `no-border-design` and `noir-design`.
They are the authority; restating them here is how the last version drifted.

Two things that are specific to this feature and worth stating:

- **The board is dense.** Column and card separation must come from surface tone and spacing.
  Reaching for a divider is the exact instinct that produced the bordered CRM; `divide-y`
  compiles to a border and is banned.
- **Overdue / priority states are monochrome.** No red for overdue, no green for won. Weight,
  opacity, and surface tone only.

Admin page requirements (`admin-ops`) apply in full, including the Debug Report button, which is
non-negotiable on every admin page.

---

## 6. Data source: CAI Austin directory

First contacts come from `https://caiaustin.org/management_companies.php` (Community Associations
Institute, Austin chapter: property management companies).

**Ingestion is a paste/CSV import, not a scraper.** Reasons, in order:

1. **The site is not reachable from the agent environment.** The network policy denies outbound
   CONNECT to that host (proxy returns 403). This is environment configuration, not the site
   blocking us, and it is not something to work around from inside.
2. **A one-time list does not justify a scraper.** This is a directory read once, not a feed.
3. **Cost.** Firecrawl is a paid API and there is no budget right now.

**Build:** an import panel that accepts pasted HTML/CSV or an uploaded file, parses to the `leads`
shape, shows a preview with a per-row include/exclude toggle, flags rows matching an existing
`company` or `email`, and inserts on confirm with `source = 'cai-austin-directory'`.

Never insert straight from a parse. Always preview first: directory HTML is inconsistent and a
bad parse silently poisons the pipeline.

> ⚠️ **Confirm before bulk outreach.** CAI is a membership association and its directory may be
> member-only or carry terms restricting use for solicitation. Verify the terms permit this before
> emailing the list. This is a business decision, not a technical one, and it belongs to the owner
>, but it should be settled before the first send, not after.

---

## 7. Phasing

Vercel is not currently deployable (billing). Sequence so progress is possible anyway:

| Phase | Deliverable | Needs deploy? |
|---|---|---|
| **1** | `leads` table via `apply_migration` + directory import | **No**; Supabase is live |
| **2** | Table view + detail panel + CRUD | Yes, to use |
| **3** | Shadow Board with drag-and-drop | Yes |
| **4** | Needs-attention view + conversion to `clients` | Yes |

Phase 1 delivers real value with no deployment: the leads exist, are queryable, and are ready the
moment the site is back. Do Phase 1 first.

---

## 8. Deferred

- **Firecrawl enrichment**: costs money, and the import path covers the immediate need
- **AI-generated outbound email**: depends on enrichment; also needs the §6 terms question settled
- **Predictive priority scoring**: needs won/lost history that does not exist yet (3 clients)
- **Real-time multi-user sync**: single operator today

---

## 9. Acceptance criteria

Mechanical where possible. A criterion you cannot check by running something is a criterion that
will be reported as met without being met.

- [ ] `grep -rE "border-|shadow-|divide-[xy]|ring-" src/pages/AdminCRM.tsx src/components/crm/` returns nothing
- [ ] `npx tsc --noEmit` adds no new errors versus the pre-change baseline
- [ ] The page renders at 320px, 375px, and 768px with no horizontal scroll (`frontend-style-guide`)
- [ ] A screenshot of the finished board is produced and reviewed before the task is called done
- [ ] `CopyDebugReport` is mounted (`admin-ops`)
- [ ] Moving a lead to `lost` without a reason is rejected
- [ ] Re-running the directory import creates zero duplicates
- [ ] Converting a won lead produces a `clients` row and sets `leads.client_id`

---

## 10. Open decisions

1. **Directory terms**: does CAI permit this use? (§6). Blocks outreach, not building.
2. **Import format**: will the list arrive as pasted HTML, CSV, or a screenshot? Screenshot means
   manual transcription; worth knowing before building the parser.
3. **Board vs table first**: Phase 2 is the table because 200 imported rows are unusable as
   cards. Confirm that ordering.

---

**Supersedes:** CRM PRD dated 22 Dec 2025 (prepared by Antigravity), which specified outline-box
lead cards and white-bordered buttons, contradicting the design system.
