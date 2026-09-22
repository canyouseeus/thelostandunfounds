# Prompt: informational guide page

Guide pages capture research-stage search traffic ("what does X cost", "how do
I prep for Y") and hand it to the money pages. They are the pages most likely
to be generated lazily and the most damaging when they are — a thin guide page
is the clearest signal of a scaled-content operation.

---

## Prompt

> Write one informational page for a local service microsite.
>
> **Business:** `{{niche}}` in `{{city}}, {{region}}`
> **Target query:** `{{query}}`
> **Real data you must use:** `{{paste the actual price ladder, turnaround,
> add-ons, and any market research you hold}}`
>
> Return a JSON page object matching the schema in `content/pages.json`:
> `slug`, `type: "guide"`, `title` (≤60 chars), `description` (70–165 chars),
> `h1`, and a `blocks` array.
>
> **Answer the query first.** Open with the direct answer in one or two
> sentences. Everything after that is support.
>
> **Requirements:**
> - Use the real numbers supplied above. Never invent a price, a percentage,
>   a market rate or a statistic.
> - Include at least one thing that costs you something to say — a limitation,
>   a case where the cheaper option is correct, a situation where the service
>   is not worth buying. A page that only sells is not a guide.
> - Where a `table` block carries market rates, say in its `note` what the
>   range is drawn from.
> - End with a `cta` block pointing at the relevant money page.
>
> **Do not:**
> - Pad to hit a word count. Length is not a ranking factor; completeness is.
> - Repeat the primary keyword mechanically. Once in the h1, once in the
>   opening, then write normally.
> - Restate content that already exists elsewhere on this site — the
>   similarity gate will reject it, and it splits your own rankings.

---

## Review before committing

1. Does the first paragraph answer the query on its own?
2. Is there one honest thing here a competitor would not print?
3. Is every number traceable to real data?
