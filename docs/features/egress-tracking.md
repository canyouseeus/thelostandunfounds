# Egress Tracking — Design Spec

**Status:** proposed, not built
**Motivation:** the Supabase overage on `nonaqhllakrckbtbawrb` was discovered by a billing email, not by us. The response was an emergency project switch. Nothing in the stack counts what we consume, so the first signal is always the invoice.

---

## What problem this actually solves

Supabase and Vercel both meter on their side and expose the result only in a billing dashboard. Neither MCP server available to this project has a usage or billing endpoint — `list_projects`, `get_logs`, `get_advisors` and `get_web_analytics` return no byte counts. So an agent investigating cost can count *our* calls but can never read *their* bill.

That gap has a second, worse half: **vendor dashboards report totals, never attribution.** Even reading the Supabase bill tells you the month cost $X — not that `sync-gallery` accounted for most of it. The expensive query is invisible at exactly the altitude the vendor reports at.

This system exists to answer one question the vendor cannot: **which caller is generating our bytes, and is that changing?**

### Non-goal

**This will not reproduce the invoice.** We measure response bodies at the client. The bill includes headers, TLS framing, and connection overhead, and is affected by compression we don't observe. Expect our number to run meaningfully below the billed figure and to drift.

Treat the output as **relative attribution and trend**, never as a reconciliation of a Supabase invoice. A spec that promises "track our egress" and delivers a number that disagrees with billing is worse than no number, because it will be trusted. The tile must be labelled as an estimate.

---

## Why the cron went unnoticed for months

Worth encoding, because it drives the design. `/api/cron/sync-gallery` returned `200 OK` on all 720 daily runs while doing nothing, reporting `remaining_count: 2` for rows it was structurally incapable of ever claiming. It never errored. Every health check it could have had would have been green.

**The failure mode is not "job fails." It is "job succeeds, expensively, forever."** Error monitoring cannot see this class of bug. Only rate and work-done can. Hence part 3 below is not optional garnish — it is the part that catches the next one.

---

## Architecture

Three parts, independently useful, in dependency order.

### Part 1 — Metered client (the measurement)

`@supabase/supabase-js` accepts `global.fetch`. Overriding it gives us every request's path, method, status, duration and response size without touching a single query.

New `lib/supabase-metered.ts`:

```ts
export function createMeteredClient(url: string, key: string, opts?: {
    caller?: string;   // 'cron:sync-gallery', 'page:PhotoGallery'
    sampleRate?: number;
}) {
    return createClient(url, key, {
        ...opts,
        global: {
            fetch: async (input, init) => {
                const started = Date.now();
                const res = await fetch(input, init);
                // Read length without consuming the body the caller needs.
                const bytes = Number(res.headers.get('content-length')) || 0;
                record({
                    caller, path: pathOf(input), method: init?.method ?? 'GET',
                    status: res.status, bytes, ms: Date.now() - started,
                });
                return res;
            },
        },
    });
}
```

`content-length` is absent on chunked responses. Do **not** fall back to `res.clone().arrayBuffer()` to measure those — cloning buffers the whole body in a serverless function and doubles memory on exactly the largest responses. Record `bytes: null` and count them separately as unmeasured. A known-incomplete number beats an OOM.

#### The instrumentation must not become the problem

Writing a row per query would add a write for every read — the very pattern being diagnosed.

- **Buffer in memory** per invocation; flush once on response finish.
- **Sample** high-frequency paths (default 100% for cron, 5% for page traffic), storing `sample_rate` so rollups can scale back up.
- **Never let a metrics failure break a request** — the recorder is wrapped in try/catch and drops on error. Metrics are not worth an outage.

### Part 2 — Storage and rollup

```sql
CREATE TABLE query_metrics_daily (
    day date NOT NULL,
    caller text NOT NULL,
    path text NOT NULL,
    method text NOT NULL,
    requests bigint NOT NULL DEFAULT 0,
    bytes bigint NOT NULL DEFAULT 0,
    unmeasured_requests bigint NOT NULL DEFAULT 0,
    p95_ms integer,
    PRIMARY KEY (day, caller, path, method)
);
```

Raw events land in `query_metrics_raw` with a **7-day retention** and are rolled up nightly. Retaining raw rows indefinitely would make the metrics table the largest in the database, which is its own comic failure. The rollup and the prune run in the same cron so retention cannot silently stop while collection continues.

Migrations follow invariant #3 — check-and-insert, never `ON CONFLICT (slug)`.

### Part 3 — Cron heartbeat (the part that catches the next one)

```sql
CREATE TABLE cron_heartbeat (
    job text PRIMARY KEY,
    last_run_at timestamptz,
    last_duration_ms integer,
    last_did_work boolean,       -- the load-bearing column
    consecutive_no_work integer NOT NULL DEFAULT 0,
    last_error text
);
```

`last_did_work` is the entire point. A job reporting **no work done for hundreds of consecutive runs is a defect**, whatever its status code. `sync-gallery` would have shown `consecutive_no_work` in the thousands.

Alert rule: `consecutive_no_work > (24h worth of runs)` → surface it. Not an error, but a job earning nothing.

### Part 4 — Surfacing

An admin tile in `AdminOverviewView.tsx`, drawn per the **Graph Style Rule** — `Sparkline` from `src/components/ui/viz.tsx`, monotone-smoothed 2px line, ~12% fill, r=2 dots, analytics **blue-400** accent. No new chart dialect.

- Daily bytes, 30-day trend, with a threshold line at the plan limit.
- Top callers by bytes, descending — the attribution the vendor never gives.
- Any job with a high `consecutive_no_work`.
- An explicit "estimated, excludes protocol overhead" caption. Non-negotiable, per the non-goal above.

---

## The hard part, stated honestly

Part 1 is one line for the frontend — `src/lib/supabase.ts` is already a singleton with a `global` config block, so every browser query is covered by a single edit.

**The server side is not one line.** **111 runtime files** call `createClient` directly — `lib/` (71) and `api/` (40) — plus a further **25 in `scripts/`**, which run at build time and matter less. There is no shared server helper. Full runtime coverage means introducing `lib/supabase-server.ts` and migrating those 111.

Do not attempt that as one change. Staged, by value:

| Stage | Scope | Effort | Buys |
|---|---|---|---|
| 1 | `lib/supabase-metered.ts` + frontend one-liner | ~2h | All browser traffic |
| 2 | Heartbeat + all `api/cron/*` (5 jobs) | ~3h | Catches the sync-gallery class of bug |
| 3 | Rollup cron, retention, admin tile | ~4h | Trend + attribution visible |
| 4 | Migrate remaining `lib/`+`api/` call sites | ~1d, incremental | Full attribution |

**Stages 1–3 are roughly a day and deliver most of the value.** Stage 4 is a long tail that can proceed file-by-file forever without blocking anything.

If only one stage is ever built, **build stage 2.** The heartbeat is a few hours, needs no client migration, and directly targets the failure mode that actually cost money — a job that succeeds while doing nothing.

---

## Rejected alternatives

**Parsing Supabase's API logs via MCP.** `get_logs` returns request lines with no byte counts and a short retention window. Good for spot-diagnosis — it is how the sync-gallery loop was found — but it cannot produce a trend.

**Scraping the billing dashboard.** Brittle, needs credentials the platform doesn't hold, and breaks the moment the page changes. Rejected in favour of measuring what we control.

**Postgres-side measurement (`pg_stat_statements`).** Counts rows and execution time, not bytes over the wire, and attributes to SQL text rather than to the calling feature. Complementary at best.

---

## Open questions

1. Sample rates — 5% of page traffic may be too coarse for low-volume routes.
2. Should Vercel bandwidth be tracked in the same tile? Different vendor, same question, and `get_web_analytics` gives pageviews rather than bytes.
3. Alert delivery — the platform already sends email via Zoho; a threshold breach could reuse that rather than needing a new channel.
