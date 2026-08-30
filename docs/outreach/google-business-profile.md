# Google Business Profile — what to change on the existing one

THE LOST+UNFOUNDS already has a profile. **Do not create a second one.**

A service-area business is allowed exactly one profile unless it runs separate
teams in genuinely non-overlapping areas. A second profile for the microsite
would be a duplicate listing, and duplicates get suspended — which would take
the working profile down with the new one. This is also why there is no
profile-per-microsite strategy: every future microsite points at this same
profile.

**Checked 30 August 2026.**

---

## What the profile says — read off it 30 August 2026

| Field | Value | Where it went |
|---|---|---|
| Name | `THE LOST+UNFOUNDS` | `business.legalName` — already matched, unchanged |
| Phone | `(512) 350-1869` | `business.phone`, in the profile's own format |
| Primary category | Photography service | left alone, deliberately |
| Location | Serves Austin — service-area, no storefront | matches the `GeoCircle` in the JSON-LD |
| Hours | Open 24 hours | — |
| Messaging | Text message enabled | — |

The name and phone are two halves of one NAP and Google reconciles them against
the site's `ProfessionalService` markup, which is why the phone is stored in the
format the profile displays rather than reformatted. Both values are now set and
the phone no longer blocks the build.

The `tel:` href is `+15123501869` while the visible text stays `(512) 350-1869`.
Those are two different jobs: the text is the NAP string, the href has to be
dialable from a roaming handset or a VoIP client, where a bare 10-digit number
is not.

### One thing the profile does not say

The profile describes the business as *"an editorial and nightlife photography
brand and digital media group based in Austin, Texas."* Real estate and
short-term rental work does not appear in it anywhere, and the primary category
is the generic Photography service.

That is the gap this sheet is really about. Google reads the profile to decide
what the business does, and right now nothing on it suggests property work — so
the profile lends the microsite almost no topical support. The secondary
categories and the service list below are what close that, and they are the
highest-value edits here.

---

## The phone: I had this wrong

I previously specced a **call-tracking number** for the site. That was a
mistake, and it would have actively hurt you.

Publishing a tracking number in the site's markup while the profile shows a
different number breaks NAP consistency — exactly the signal the profile exists
to strengthen. `site.json` now asks for `REPLACE_ME_GBP_PHONE`: the real number
from the profile.

Tracking still works, and needs no second number. Every `tel:` link on the site
carries the `wc-phone` class, so a dynamic number insertion script swaps the
**displayed** number at runtime while the canonical number stays in the
structured data. That is what the class was built for.

**This removes a blocker rather than adding one.** You do not need to buy a
tracking number before launching — you need the number you already have.

---

## What to change on the profile

### Leave alone
- **Name.** Do not add a city or a service. Keyword-stuffed names are among the
  most common suspension triggers, and Google has been suspending faster and on
  thinner grounds through 2026, mostly on recently *edited* profiles. Editing a
  working profile carries real risk, so make deliberate changes and stop.
- **Primary website.** Keep `thelostandunfounds.com`. The profile represents the
  whole business; the microsite is one service line and connects through
  Services and Posts instead.

### Add or check
- **Secondary categories** — `Commercial photographer`, and `Real estate
  photographer` if your account offers it. Leave the primary as is; changing a
  primary category on an established profile is the riskiest single edit here.
- **Services**, priced from the same numbers the site uses so the two cannot
  disagree:

  | Service | Price |
  |---|---|
  | Airbnb / short-term rental photography | from $195 |
  | Real estate & multifamily photography | from $225 |
  | Property photography package | $850 |
  | Twilight exteriors | $125 |
  | Drone / aerial photography | $150 |
  | 3D virtual tour | $200 |

  Where a service accepts its own link, point it at the matching page:
  `/short-term-rental-photography/`, `/property-managers/`, `/pricing/`.

- **Photos.** Upload the full-resolution Pease Park and 501 W 30th originals
  from Drive (`AIRBNB CLIENTS`), not the web-sized copies the site uses. Google
  weights recency, so add a few monthly rather than all at once.

- **Posts.** This is the honest way to link the microsite from the profile. One
  post per topic, each linking a real page — the licensing changes, the prep
  checklist, what a shoot costs. Posts expire, so this is a recurring job, not a
  one-off.

- **Reviews.** Ask the Pease Park and 501 W 30th owners. Two real reviews beat
  an empty review section by a wide margin and review count is a ranking factor.
  Never incentivise them; that is its own violation.

---

## Order

1. ~~Send me the exact profile name and phone.~~ Done — both are set in
   `site.json`, which cleared one of the three production blockers.
2. Add secondary categories and the service list.
3. Upload photos.
4. Ask for reviews.
5. Once the domain is registered and the site is live, start posting to the
   profile with links into it.

## What not to do

Do not create a second profile. Do not rename the existing one to include
"Austin" or "photography". Do not change the primary category casually. Do not
put a tracking number anywhere the structured data can see it.
