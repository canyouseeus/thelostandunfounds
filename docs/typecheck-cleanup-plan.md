# TypeScript cleanup — done

**Status: complete. 68 errors → 0, and the build now enforces it.**
Landed 30 August 2026 in `fed292f`, `eeb1ad4` and `c10b990`.

`npm run prebuild` now runs `tsc --noEmit` before the SEO check, so the count
cannot climb again. That gate was verified able to fail: with a deliberate
`const x: number = "string"` injected the build exits 2 and prints the error;
with it removed the build exits 0 and completes.

This file is kept as the record of what was found, because four of the fixes
were real bugs rather than type noise. The original plan text follows the
findings, unchanged, so the reasoning behind each decision stays readable.

## What it actually found

| Bug | Where | Effect before the fix |
|---|---|---|
| `per_page` should be `perPage` | `_admin-affiliates-handler.ts:57` | Key silently ignored, `listUsers` capped at the default 50. Any affiliate past the 50th rendered with no email. |
| Recharts formatter typed `number` | 5 sites, incl. `AffiliateRevenueTracker.tsx:365` | Recharts passes `number \| undefined`; that site called `.toFixed(2)` on it, so an undefined value threw. The other four printed `$undefined`. |
| Whole preset passed as one variant | `ExpandableExamples.tsx` ×3 | Framer received target keys named `initial`/`animate`, which are not CSS properties. Those three animations never ran. |
| `metadata` read off a `MapPhoto` | `PhotoGallery.tsx:1154` | `PhotoMap` deliberately selects flat `metadata->>` aliases and never selects `metadata`, so opening a photo from the map handed the lightbox `undefined` every time. |

The last one only surfaced because the duplicate `Photo` types were consolidated
rather than cast between — which is why the plan said not to cast there.

**The dead-code deletion was checked, not assumed.** A transitive import graph
from `src/main.tsx` and `src/App.tsx` reached 251 files; none of the eight
candidates was among them, and their only importers were each other. The graph
was control-tested against `Admin.tsx` and `PhotoGallery.tsx`, which it
correctly reported as reachable — a reachability check that cannot say
"reachable" proves nothing.

No `any`, no `@ts-ignore`, no `@ts-expect-error` was added. The single `any` in
the diff is `[key: string]: any` on `PhotoMetadata`, which is deliberate and
commented: `photos.metadata` is genuinely an open-ended jsonb column.

**Two things changed behaviour and are worth clicking through:** the affiliate
admin view (previously blank emails should now fill in) and opening a photo from
the gallery's map view (metadata now arrives).

---

# The original plan

Kept verbatim from here down.

## Reproduce it correctly

```bash
npx tsc --noEmit > /tmp/tsc.txt 2>&1
grep -c 'error TS' /tmp/tsc.txt        # 68 at the start, 0 at the end
```

**Redirect to a file. Do not pipe into `head`.** An earlier pass of this
document said 30 errors because it ran `tsc | tee f | head -40`; `head` closed
the pipe, `tsc` took SIGPIPE and died partway through, and the count was of a
truncated run. It silently missed 38 errors across ten files — including the
single largest cluster. A count from a truncated pipe is not a count.

## Read this first

**Nothing here is currently breaking the build.** `npm run build` is
`vite build`, and `prebuild` runs `scripts/seo-check.ts`, not `tsc`. Vite
transpiles without typechecking, so these have never blocked a deploy — which
is why sixty-eight of them accumulated.

Two consequences:

1. **Fixing them should change no runtime behaviour.** If a fix changes what the
   code does, you have found a real bug — say so rather than quietly changing it.
   Three such bugs are already flagged below.
2. **The cleanup is worthless without item 6.** That adds `tsc --noEmit` to the
   build. Without it the count starts climbing again the day after this lands.

No `any`, no `@ts-ignore`, no `@ts-expect-error`. Every item has a real fix. If
you reach for a suppression, stop and write down why instead.

---

## 1. A missing optional package, and the 33 errors downstream of it

**33 of the 68 errors — nearly half — come from one absent dependency.**

Six `TS2307 Cannot find module`:

| File | Missing module |
|---|---|
| `src/services/mcp-registry.ts:30` | `@scot33/tools-registry` |
| `src/services/skills-registry.ts:23` | `@scot33/tools-registry` |
| `src/skills/auth-signup-skill.ts:11` | `../../../tools-registry/src/skills/types` |
| `src/skills/create-skill-skill.ts:8` | same |
| `src/skills/subscription-check-skill.ts:8` | same |
| `src/skills/tiktok-download-skill.ts:12` | same |

`@scot33/tools-registry` is **not in `package.json`**, and there is no sibling
`../tools-registry` checkout. The relative path climbs three levels out of the
repo, so it could never resolve from a clean clone.

The remaining 27 errors in those files are `TS7006 implicitly has an 'any'
type` — every `params`, `context`, `value`, `error` callback parameter. They are
not separate problems: the types those signatures depend on live in the module
that will not resolve. **Fix the import and they go away together.**

### This is deliberate, which changes the fix

`src/services/mcp-registry.ts:30` imports it dynamically, inside a `try`, with a
comment saying so:

```ts
// Try to dynamically import - will fail gracefully if not available
const toolsModule = await import(/* @vite-ignore */ '@scot33/tools-registry');
…
} catch (error) {
  // MCP registry is optional - create a minimal fallback
```

So the package is *meant* to be absent. Do not "fix" this by adding a dependency
nobody asked for.

Also: **none of this code is reachable from the app.** Nothing under `src/`
imports `agent-skills-helper`, `agent-skills-enhanced`, `skills-registry` or
anything in `src/skills/` from a component, and none of it is referenced from
`src/App.tsx` or `src/main.tsx`. It is not in the shipped bundle.

Three options, in order of preference. **This one needs the owner's decision —
do not pick unilaterally:**

1. **Delete `src/skills/` and the two registry services.** Cleanest. It is dead
   code depending on a package that is not declared and a path that cannot
   resolve. Closes 33 errors and removes a maintenance liability.
2. **Add a local ambient declaration** — `src/types/tools-registry.d.ts`
   declaring both module paths with real signatures. Keeps the code, closes the
   errors, but keeps dead code alive and the declarations will drift from a
   package nobody can see.
3. **Exclude the paths in `tsconfig.json`.** Fastest, worst: it hides the
   problem rather than resolving it, and the next person has to rediscover why
   those directories are unchecked.

Start here regardless of the choice — it is half the list.

---

## 2. Untyped Supabase client collapses rows to `never` — 12 errors, one line

`scripts/claptrop-retrograde.ts` lines 92, 99 (×2), 108, 109 (×2), 116, 143, 150, 151, 157 (×2)

All twelve are the same cause. Line 36:

```ts
let supabase: ReturnType<typeof createClient>;
```

`createClient` with no `Database` generic resolves row types to `never`, so every
property access on a selected row (`p.title`, `p.google_drive_file_id`,
`p.metadata`, `p.created_at`, `p.id`) fails, and so does the `.update({ title })`
at line 150.

Two fixes, in order of preference:

1. **Generate the real database types.** The Supabase MCP exposes
   `generate_typescript_types`. Commit it as `src/types/database.ts` and type the
   client `createClient<Database>(…)`. Fixes these twelve and prevents the class
   of error everywhere else.
2. **Type the query result locally,** if generating types is out of scope:

   ```ts
   type PhotoRow = {
       id: string
       google_drive_file_id: string | null
       title: string | null
       metadata: Record<string, unknown> | null
       created_at: string
   }
   const { data: photos, error } = await supabase
       .from('photos')
       .select('id, google_drive_file_id, title, metadata, created_at')
       .returns<PhotoRow[]>()
   ```

Check nullability against the live schema rather than guessing — `photos.title`
in particular. The live project is `cxpyqjxhbvuygnxyukli`; see the **Database
Project Rule** in `CLAUDE.md`.

---

## 3. Small independent fixes — 12 errors

Each is self-contained. None should take more than a few minutes.

### 3a. Missing type import — 3 errors

`src/components/InteractiveCard.tsx` lines 11, 13, 17 — `TS2304: Cannot find name 'ReactNode'`

Used in the props interface, never imported. Line 2 is `import { useState } from 'react'`:

```ts
import { useState, type ReactNode } from 'react';
```

### 3b. Wrong Supabase parameter casing — 1 error, **and a live bug**

`src/lib/api-handlers/_admin-affiliates-handler.ts:57` — `TS2561: 'per_page' does not exist in type 'PageParams'. Did you mean 'perPage'?`

```ts
await supabase.auth.admin.listUsers({ per_page: 1000 })   // ← ignored
```

The key is ignored, so the call silently falls back to the default page size of
**50**. The `userMap` built on the next line is then missing entries, and any
affiliate past the 50th renders without an email. Fix to `perPage: 1000`, then
check the affiliate admin view and confirm previously blank emails appear.

### 3c. Array literal inferred too narrowly — 1 error

`api/cron/sync-gallery.ts:110` — `TS2322: Type 'null' is not assignable to type 'string'`

```ts
const rows = subfolders.map(s => ({ …, subfolder_name: s.name }));   // infers string
rows.push({ …, subfolder_name: null });                              // sentinel row
```

The sentinel legitimately has a null name. Declare the element type:

```ts
type SyncProgressRow = { library_slug: string; subfolder_id: string; subfolder_name: string | null }
const rows: SyncProgressRow[] = subfolders.map(s => ({ … }));
```

This is the error visible in every Vercel build log for this repo. Non-fatal —
every deploy including production reaches READY with it present — but real.

### 3d. Missing null narrowing — 3 errors

`src/components/photos/PhotoLightbox.tsx:44` (×2) — `TS18047: 'photo' is possibly 'null'`

The prop is `photo: Photo | null` (line 17); `triggerDownload` dereferences it
unguarded. Almost certainly unreachable with `null`, but guard rather than cast:

```ts
const triggerDownload = (email: string) => {
    if (!photo) return;
    …
};
```

`api/contracts/sign.ts:96` — `TS2345: 'number | undefined' is not assignable to 'number'`

`loaded.code` is optional on the error branch of `loadByToken`. Prefer making it
required in that return type — every error path should know its status — over
defaulting at the call site.

### 3e. Implicit `any` in a callback — 2 errors

`src/components/SendWelcomeEmailsButton.tsx:235` — `TS7006` on `subdomain`, `index`

`result.debug.subdomainsWithoutEmails` is untyped. Type `result.debug` where
`result` is declared so the array is `string[]` and both params infer.

### 3f. Reaching into a private member — 1 error

`src/components/ErrorBoundary.tsx:49` — `TS2341: Property 'logError' is private`

The error boundary is a legitimate caller — reporting errors is its whole job —
so the encapsulation is what is wrong, not the call. Add a public method on
`ErrorMonitor` expressing the intent, or make `logError` public if it is already
the intended entry point. Do not cast to `any` to reach it.

### 3g. Implicit `any` in the skills helper — 3 errors

`src/services/agent-skills-helper.ts:33, 175 (×2)` — `TS7006` on `tag`, `acc`, `param`

Same family as item 1 and likely resolved by whatever you decide there, since
this file imports `./mcp-registry`. Re-run the typecheck after item 1 before
touching it.

---

## 4. Library signature mismatches — 4 errors

### `src/components/ExpandableExamples.tsx:265, 358, 375` — `TS2353: 'initial' does not exist in type 'Variant'`

```tsx
animateIn={{
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { … },
}}
```

Framer Motion's `Variant` describes a *single* animation target; `initial` and
`animate` are props on `motion.*`, not keys inside a variant. Read how
`ExpandableContent` declares its `animateIn` prop — either that type is wrong or
these three call sites are. Fix whichever is actually wrong; do not widen the
prop to `any` to make all three compile.

### `src/components/affiliate/AffiliateRevenueTracker.tsx:365` — `TS2322`, **and a latent crash**

```tsx
formatter={(v: number) => [`${cfg.prefix}${tab === 'earnings' ? v.toFixed(2) : v}`, …]}
```

Recharts types the formatter's value as `number | undefined`. The body calls
`v.toFixed(2)` unguarded, so an undefined value throws at runtime — not merely a
type complaint. Accept the real type and handle the empty case.

Read the **Graph Style Rule** in `CLAUDE.md` before touching anything else in
this chart.

---

## 5. Duplicate type declarations — 5 errors. **Slow down here.**

### `src/components/photos/PhotoGallery.tsx:1337, 1350` — `TS2719`

> Two different types with this name exist, but they are unrelated.

`PhotoGallery.tsx` declares `interface Photo` at line 43. `PhotoLightbox.tsx`
declares a *different* `interface Photo` at line 7. The gallery passes its
`Photo | null` into the lightbox's `Photo | null` prop and they do not match —
`metadata` is rich EXIF in one and `{ width?, height? }` in the other.

`PhotoGallery.tsx:1154` (`TS2339: Property 'metadata' does not exist on type
'MapPhoto'`) is the same disease in a third shape.

### `src/pages/Shop.tsx:135` — `TS2345`, product union not assignable to `Product[]`

Same family: a locally-built object union whose `productKind` is `string` where
`Product` wants `"physical" | "digital" | undefined`.

**Fix by consolidation, not by casting.** Move one canonical `Photo` into
`src/types/photo.ts` with `metadata` typed as what consumers actually read, then
import it in `PhotoGallery.tsx`, `PhotoLightbox.tsx` and `PhotoMap.tsx` and
delete the local declarations. Narrow `productKind` to the literal union at its
source in `Shop.tsx`.

Casting will compile and will hide a real mismatch — the two components
genuinely disagree today about what `metadata` contains. Do this in its own
commit.

---

## 6. Stop it happening again — do this last, and do not skip it

Once the count is zero:

```jsonc
// package.json
"typecheck": "tsc --noEmit",
"prebuild": "npm run typecheck && npx tsx scripts/seo-check.ts --strict"
```

Two cautions:

- **Land it only at genuinely 0.** Earlier turns every deploy red, and the first
  thing anyone does under that pressure is take it back out.
- **`vercel.json` sets `ignoreCommand`,** so a commit touching only `microsites/`
  or `docs/` skips the build entirely. Correct and unrelated — but it means "the
  build passed" after a docs-only commit does not prove the typecheck ran.
  Confirm against a commit that touches `src/` or `api/`.

---

## Summary

| # | Root cause | Errors | Risk |
|---|---|---:|---|
| 1 | Missing optional package `@scot33/tools-registry` + its `any` fallout | 33 | needs an owner decision |
| 2 | Untyped Supabase client → `never` rows | 12 | medium |
| 3 | Small independent fixes (import, casing, inference, null, private) | 12 | low |
| 4 | Library signature mismatches — **1 latent crash** | 4 | medium |
| 5 | Duplicate `Photo` / `Product` types | 5 | **high** |
| 6 | No typecheck in CI | — | — |
| | **Total** | **66** | |

Two errors are second lines of multi-line messages already counted in items 4
and 5, which is why the column sums to 66 against a 68-line grep.

**Suggested order.** Item 3 first for the quick 12 — it is mechanical and builds
confidence in the harness. Then item 1, which is the big one but needs a
decision before any code is touched. Then 2, then 4. Item 5 last and alone.

Three findings are more than cosmetic and deserve a specific report back:

- **the affiliate page size** (3b) — silently capped at 50 users
- **the Recharts formatter** (4) — throws on an undefined value
- **whatever the `Photo` consolidation turns up** (5) — the two components
  disagree about `metadata` today, and something is reading the wrong shape
