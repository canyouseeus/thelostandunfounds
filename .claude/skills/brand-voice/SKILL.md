---
name: brand-voice
description: Punctuation and voice rules for every word this project publishes. The headline rule is that em dashes and en dashes are banned everywhere, in copy, comments, docs and commit messages alike. Use before writing or editing any prose: site copy, page titles, blog posts, emails, invoices, proposals, PR descriptions, code comments. Triggers on "copy", "wording", "rewrite", "tone", "punctuation", "em dash", "en dash", "brand voice", "how should this read".
---

# Brand Voice

## RULE 1: No em dashes. No en dashes. Anywhere.

Never write `—` or `–`. This is the one rule most likely to be broken by an agent, because
LLM-written prose reaches for the em dash constantly. Watch for it in your own output.

It applies to every artifact this project produces:

- site copy, page titles, button labels, toasts, error strings
- blog posts and newsletter campaigns
- emails, invoices, quotes, proposals
- code comments and JSX comments
- markdown docs, skills, workflows, this file
- commit messages and PR descriptions

There is no "internal docs don't count" carve-out. Agents copy the style of the files they read,
so a dash in a skill file becomes a dash in customer-facing copy two tasks later. That is exactly
how the repository accumulated roughly 1,900 of them before the rule was written down.

### What to use instead

| Situation | Use | Example |
|---|---|---|
| Label, then explanation | colon | `Deploy: merge to main, push, verify.` |
| Two independent clauses | semicolon or full stop | `The build passed; the deploy is queued.` |
| Parenthetical aside | paired commas | `The gallery, synced nightly, holds 4k photos.` |
| Aside that already has commas | parentheses | `Consultation work (web, retainer, editorial) bills monthly.` |
| Trailing fragment | comma | `Ship it, carefully.` |
| Numeric or date range | hyphen | `$195-$6,000`, `4-8 items`, `9:00 AM - 5:00 PM` |

Do not reach for a comma every time. A comma between two independent clauses is a splice, which
reads worse than the dash it replaced. Check what is on each side before picking.

### The two exceptions, and they are not writing

1. **Placeholder glyph.** `'—'` standing in for a missing value in a table or dashboard, as in
   `{invoice.paid_at ?? '—'}`. That is typography, not a sentence. `AdminBookingView.tsx`,
   `crm-widget.tsx` and `registry.ts` all use it this way and should keep it.
2. **Regex character class.** `/[—–⸻]/g` in `src/utils/blogUtils.ts` and
   `src/components/BlogSubmissionReview.tsx`, which strips these characters out of copy submitted
   by outside contributors.

Neither exception licenses a dash in a sentence. Do not add a third exception.

### Separators are glyphs too, but not dashes

When joining display values, the house separator is a middot, not a dash:

```ts
[client.business, `${count} invoices`].filter(Boolean).join(' · ')
```

If you are rewriting an old `.join(' — ')`, use `' · '`. Do not substitute prose punctuation into
a separator literal: `join(': ')` renders as `draft: $500 due`, which reads as a label. And if a
`.split()` elsewhere depends on that separator, change both or the parse breaks silently.

## Enforcement

```bash
npm run check:dashes
```

Scans every tracked file and exits non-zero with `file:line` for each violation. It also runs in
`prebuild`, so a stray dash fails the build before it reaches production.

The check is in `scripts/check-dashes.mjs`. Per the Evidence Rule, confirm it can fail before
trusting a pass: add a dash to a scratch file, run it, see exit 1, remove the file.

## History

This rule was not new when it was written into `CLAUDE.md`. It already existed in five contributor
writing prompts under `public/prompts/`, worded as *"Do NOT use em dashes (—) or en dashes (–).
Use plain hyphens (-) or standard punctuation instead."*, and the blog submission pipeline has
stripped the characters programmatically for a long time. What was missing was any statement of it
in the agent rules, so it bound outside contributors and not the agents writing most of the site.
