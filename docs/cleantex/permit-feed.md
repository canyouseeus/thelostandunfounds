# CleanTex permit feed

Turns City of Austin open permit data into a call list of active contractors and a
list of jobsites approaching their final clean.

```bash
node scripts/cleantex-permit-feed.mjs                          # ranked contractor call list
node scripts/cleantex-permit-feed.mjs --mode jobsites          # addresses in cleanup window
node scripts/cleantex-permit-feed.mjs --ring core --csv out/   # core ring, write CSV
```

| Flag | Default | Meaning |
|---|---|---|
| `--mode` | `contractors` | `contractors` = who to call; `jobsites` = where the work is |
| `--days` | `180` | lookback window on issue date |
| `--ring` | `all` | `core` / `secondary` / `all` drive-time ring from the Buda depot |
| `--min-value` | `0` | minimum job valuation |
| `--limit` | `40` | rows printed |
| `--csv DIR` | — | also write a CSV with blank `called` / `outcome` / `callback_date` columns |

## Coverage — read this before trusting the output

The source is Socrata dataset [`3syk-w9eu`](https://data.austintexas.gov/Building-and-Development/Issued-Construction-Permits/3syk-w9eu),
which covers **City of Austin jurisdiction only**. Measured row counts for the
12 months ending 2026-08-20:

| ZIP | Area | Rows | Coverage |
|---|---|---|---|
| 78652 | Manchaca | 368 | good |
| 78610 | Buda | 211 | partial — Austin ETJ slice only |
| 78737 | SW Austin / Dripping edge | 62 | partial |
| 78640 | **Kyle** | **0** | **none** |
| 78620 | **Dripping Springs** | **0** | **none** |

Kyle and Dripping Springs run their own permitting systems and are absent
entirely. This feed supplements the phone list, it does not replace it.

To close those gaps:

- **Kyle** — Tyler EnerGov Citizen Self-Service at
  `https://kyletx-energovpub.tylerhost.net/Apps/SelfService#/home`. The search
  endpoint `POST /Apps/SelfService/api/energov/search/search` is live (a `GET`
  returns 405, confirming it exists and takes POST), but the request body is
  undocumented and rejected every shape tried. Capturing the real payload from a
  browser session is the next step. Building dept: (512) 262-3911.
- **Buda** — MyGovernmentOnline (`mgoconnect.org`, jurisdiction "Buda").
  Public search appears to require an account. Development Services: 512-312-5745.
- **Hays County (unincorporated)** — no public search; open records request only.

## Why `--mode jobsites` filters by permit age

A permit is issued at the *start* of a job. Post-construction cleanup happens at
the end, so calling on a permit issued this week is months premature. The script
surfaces permits that have aged into their typical final-clean window:

| Work class | Window (days after issue) |
|---|---|
| New, Shell | 150–330 |
| Addition, Addition and Remodel | 60–210 |
| Remodel | 30–150 |

Demolition and non-structural interior demo are excluded — nothing to wash.

These windows are estimates, not measured from local data. Once you've worked a
few of these leads, adjust the `CLEANUP_WINDOW` table in the script to match what
you actually observe in Hays County.

## Data quality notes

Austin's contractor fields are clerk-entered free text, so the script normalizes:

- **Phone** — extensions get appended and country codes prefixed. Values are
  reduced to 10 digits where possible; anything shorter renders as `NO PHONE`
  rather than a misleading stub.
- **Company name** — clerks embed `**MAIN**` contact markers. These are stripped
  before grouping so one contractor doesn't split across several rows.
- **Valuation** — frequently null, and sometimes a placeholder like `$1` or `$4`.
  Ranking is by core-territory permit count first for this reason; treat any
  single valuation as unverified until you look at the permit link.

## What the first run turned up

Two things worth knowing before you dial:

1. **Pool builders are all over the core ring** — Denali Pools, Cody Pools,
   Majestic Poolscapes, Golden Hour Pools, Texas Pools & Patios, New Wave Pools.
   Pool construction leaves shotcrete overspray and concrete slurry on a deck the
   owner is about to see for the first time, and these outfits build continuously.
   They were not on the original target list and probably should be.
2. **Bartlett Cocke appears in the Buda ETJ** at 3935 Bright Light Blvd, carrying
   a valuation that looks like a data artifact. Same GC as the Lehman High School
   job in Kyle. Worth verifying the permit directly before treating it as a lead.
