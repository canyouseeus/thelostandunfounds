# Google Business Profile — setup sheet

Everything pre-decided, so this is a copy-paste job rather than a series of
judgement calls. **Checked 30 August 2026.**

## What I could not do, and why it is not a tooling gap

I cannot create or verify this profile. Two hard blocks, neither of which more
credentials would solve:

1. **Verification is deliberately human.** Google verifies by postcard to a
   physical address, a recorded video showing the business and its equipment, or
   a phone/email code. It is designed to resist automation. There is no API path
   around it.
2. **The platform holds Drive scopes only** (`auth/drive`,
   `auth/drive.readonly`). No Business Profile API access, and requesting it
   would need Google to approve the API project plus fresh OAuth consent — and
   would still leave verification untouched.

So this is yours to click through. It takes about twenty minutes, and everything
below is already decided.

---

## The two things that would have gone wrong

### 1. The profile is NOT called "Austin Short-Term Rental Photography"

Name it **THE LOST+UNFOUNDS**.

Google requires the profile name to be the real-world business name without
descriptors. Adding a city or a service — exactly what the microsite brand is —
is keyword stuffing, and it is among the most common suspension triggers.
Google has been suspending faster and on thinner grounds through 2026, and
newly created or freshly edited profiles are the ones being pulled.

The microsite brand is a trading name. It belongs on the site, not on the
profile. The site's structured data has been corrected to match: `name` is now
`THE LOST+UNFOUNDS` with `Austin Short-Term Rental Photography` as
`alternateName`, so the GBP and the markup form one consistent NAP.

*Caveat on the stylisation:* all-caps is disallowed unless it is genuinely the
official brand form. It is here, so it should pass — but if Google pushes back,
accept "The Lost+Unfounds" and change `business.legalName` in `site.json` to
match, rather than arguing.

### 2. You get ONE profile, not one per microsite

A service-area business is limited to a single profile unless it runs separate
teams in genuinely non-overlapping areas. So there is no profile-per-microsite
strategy: every microsite points at this one profile. Worth knowing before
building a second site on the assumption it gets its own.

---

## Fields

| Field | Value |
|---|---|
| **Business name** | `THE LOST+UNFOUNDS` |
| **Primary category** | `Photographer` |
| **Secondary categories** | `Commercial photographer`, `Real estate photographer` if offered in your account |
| **Business type** | Service-area business — hide the address, set the service area |
| **Service area** | Austin, Round Rock, Cedar Park, Lakeway, Dripping Springs, Buda, Kyle, Pflugerville, Georgetown |
| **Phone** | The call-tracking number — the *same* one that goes in `site.json` |
| **Website** | `https://austinairbnbphotography.com` |
| **Email** | `media@thelostandunfounds.com` |

On categories: primary is the strongest single ranking signal. `Photographer`
is the safe base. Add the specific ones as secondary rather than reaching for a
narrow primary that may not exist in your account — a community thread suggests
`Real estate photographer` is not universally available and has to be requested.

### Description (750 char limit — this is 712)

> THE LOST+UNFOUNDS is an Austin creative studio. We photograph short-term
> rentals, multifamily properties and brands across the Austin metro, within
> about forty miles of downtown.
>
> Short-term rental shoots are priced flat by bedroom count rather than by the
> hour: a studio or one-bedroom is $195, a two-bedroom $265, a three-bedroom
> $335, and larger or luxury properties start at $425. Edited sets come back in
> 24 to 72 hours, ordered for upload. Twilight exteriors, Part 107 licensed
> drone and 3D virtual tours are available as add-ons.
>
> Property managers are quoted per portfolio, with per-property packages and
> ongoing retainers.
>
> You receive full commercial rights to every image, with no watermark and no
> per-platform licensing.

### Services to add

Name each one, and reuse the pricing already on the site so the profile and the
site cannot disagree.

- Airbnb / short-term rental photography — from $195
- Real estate & multifamily photography — from $225
- Property photography package — $850
- Twilight exteriors — $125
- Drone / aerial photography — $150
- 3D virtual tour — $200

---

## Photos

The profile needs photographs immediately; a profile without them converts
badly and looks abandoned. Use the same Austin work now on the microsite —
Pease Park and 501 W 30th. Upload the full-resolution originals from Drive
(`AIRBNB CLIENTS`), not the web-sized copies.

Google weights recency, so add a few every month rather than dumping everything
once.

---

## Order of operations

1. Create the profile as **THE LOST+UNFOUNDS**, service-area, no public address.
2. Set primary category `Photographer`, then secondaries.
3. Start verification immediately — postcards take one to two weeks and
   everything else waits on it.
4. While waiting: description, services, hours, service area, photos.
5. **Register the domain and set the call-tracking number** — the same number
   must appear on the profile, in `site.json`, and therefore in the site's
   JSON-LD. A mismatched phone is a weaker signal than no phone at all.
6. Once verified, set the website field to the microsite.
7. Ask the Pease Park and 501 W 30th owners for reviews. Two real reviews beat
   an empty profile by a wide margin, and review count is a ranking factor.

## What not to do

Do not put keywords in the name. Do not create a second profile for a second
microsite. Do not use a residential address you do not operate from as a
verified storefront. Each of these is a suspension, and reinstatement is far
more work than doing it correctly once.
