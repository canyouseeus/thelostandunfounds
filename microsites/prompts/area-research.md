# Prompt: area research → `content/areas.json` entry

Used to add one neighborhood to a microsite's area matrix.

**The rule this prompt exists to enforce:** an area entry must contain something
that is *only* true of that area. If the output would still read correctly with
the neighborhood name swapped for another, it has failed — and the build's
similarity gate will reject it.

---

## Prompt

> You are researching one service area for a local microsite.
>
> **Business:** `{{niche}}` in `{{city}}, {{region}}`
> **Area:** `{{area name}}`
>
> Produce a JSON object with exactly these keys:
>
> - `slug` — kebab-case URL segment
> - `name` — display name as locals write it
> - `zips` — array of the ZIP codes actually covered
> - `typical` — the dominant property type and size here, one clause
> - `landmark` — one or two landmarks a local would use to place it
> - `blurb` — 2–3 sentences on why *demand* here differs from the rest of the
>   metro. Who books here and why. Not a description of the neighborhood.
> - `challenge` — 2–4 sentences on a real, specific execution problem in this
>   area, and how it is solved. This must be a working-practitioner detail:
>   light, access, regulation, terrain, building stock, seasonality. If you
>   cannot name a concrete constraint, say so rather than inventing one.
> - `tip` — one piece of advice a client here would not get elsewhere.
>
> **Hard constraints:**
> - Every claim must be checkable. No invented statistics, no fabricated
>   review counts, no made-up regulations.
> - If you are not confident about a local fact (airspace class, permit rule,
>   HOA norm, seasonal event), leave it out. A thinner entry that is true
>   beats a rich one that is wrong.
> - Do not mention the business name or restate pricing — the template
>   injects those.
> - Match the register of the existing entries in `areas.json`.

---

## Review before committing

1. Would this text be *false* if pasted onto a different neighborhood's page?
   If not, rewrite it.
2. Is every factual claim one you could source? Delete what is not.
3. Run `node microsites/build.mjs <site-id>`. The similarity gate is the
   backstop, not the standard — aim well under the threshold, not just past it.
