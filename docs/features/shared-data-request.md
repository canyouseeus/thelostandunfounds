# Shared Data Request

**Status:** draft, not yet sent
**Audience:** Jack's AI assistant, or whoever operates his systems
**Purpose:** define the minimum data exchange that lets two independent dashboards
inform each other

---

## Why this document exists

We are building a two-sided setup: Jack's dashboard and ours read one shared data
spine, each rendering it in its own vocabulary. Not a shared login, not a shared
UI — a shared set of signals, translated at each end.

Our side's job is to notice where Jack's business is straining and build the thing
that relieves it, ideally before he has to ask for it. That only works if we can
see four things. Nothing sensitive, nothing about individual customers.

---

## The four signals

### 1. Flow — is work coming in?

- New inquiries per week
- What fraction convert to booked work

### 2. Capacity — can he take it?

- Booked hours against available crew hours, next 30 days
- Subcontractor bench: how many, when each was last used

### 3. Geography — where is he going?

- Job locations at zip or region level
- Travel distance per job

### 4. Money friction — does he get paid?

- Average days from invoice issued to invoice paid
- Which pipeline stage consumes the most days

**Aggregates only.** No customer names, no street addresses, no invoice line items.
If a number can identify a person, we do not want it.

---

## What each signal triggers on our side

This is the part worth reading, because it explains why these four and not others.
Each one changes what we build next:

| Signal | What we build |
|---|---|
| Inquiries up, conversion down | Proposal and closing tooling — not more lead generation |
| Utilization over 85% for two straight weeks | Subcontractor recruiting and onboarding |
| Radius expanding while revenue-per-mile drops | Local demand generation in the dense zip |
| Days-to-payment climbing | Invoicing, reminders, payment rails |

None of these four is guessable from outside the business. Without them we would
be building on instinct, and the most likely failure is building excellent lead
generation for someone who is already turning work away.

---

## Two free sources cover most of it

If Jack will grant read access, these two require no new tooling and no
subscription:

**Google Business Profile Insights API** — calls, messages, direction requests,
map views, broken out by area. For a local service business this is the strongest
available signal, and direction-requests-by-area answers the geography question
directly.

**Google Search Console API** — measured search terms, clicks, impressions,
positions. Real data rather than a third-party estimate.

### On Ahrefs

We do not have a paid Ahrefs plan and are not asking anyone to buy one. Verified
directly against the API:

```
subscription-info-limits-and-usage
→ MCP error -32001: { "error": "Insufficient plan" }
```

For our own domains the two Google sources above are strictly better anyway.
Ahrefs estimates traffic and rankings from a third-party crawl; Search Console
and Business Profile report what actually happened. Ahrefs earns its price for
competitor intelligence — sizing up somebody else's site — which is not what this
exchange is for.

---

## What we send back

The same four signals from our side, in the same shape, so this is an exchange
rather than a request. Plus a shared feature-request queue either side can file
into, so "can you build X" is tracked rather than lost in a thread.

---

## Format

Whatever is easiest on Jack's end, in rough order of preference:

1. An API endpoint we poll
2. A read-only database view or shared sheet
3. A weekly CSV drop
4. Manual weekly entry

Option 4 is genuinely fine to start. The numbers matter more than the pipe, and
we would rather begin rough this month than wait for something clean next quarter.

---

## Demo

There is a walkthrough of our side that can be clicked through end to end — real
components, real photos and merch, false numbers, and nothing saves. Every form
runs its full path and then shows the payload it would have written instead of
writing it. Checkout runs to authorization and stops before charging.

Link to follow once deployed. See `src/lib/demo/` for how it works.

---

## Open questions

- Does Jack's system already track booked-vs-available crew hours, or is capacity
  currently in his head? If the latter, that is the first thing worth building,
  and it benefits him whether or not this exchange ever happens.
- Is there an existing CRM or job-management tool in the way, or are we the first
  structured system touching this?
- Who owns the Google Business Profile — Jack directly, or an agency? That
  determines whether read access is a five-minute grant or a longer conversation.
