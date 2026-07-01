---
name: brand-ethos
description: Captures the core brand philosophy and operational identity of The Lost and Unfounds. Use when making product decisions, designing new features, pitching services, or onboarding new team members. The north star for every build decision.
---

# Brand Ethos

## The Mission

**The Lost and Unfounds is a future-forward creative agency that simplifies business operations.**

We are in transition — from pure creative work to a full-service agency that handles the creative, operational, and technological layer of a business. The goal is to make clients feel like they gained an entire operations team and a technology partner, not just a design shop.

We do not follow trends. We operate at the frontier.

---

## The Rules (in order)

### Rule 1: Simplify Business Operations
Every tool, feature, and dashboard we build must reduce friction. If it takes more than 3 taps to do something routine, redesign it. Default to automation over manual process. Default to one screen over multiple. Measure success by how little the client has to think.

### Rule 2: Legal Methods Only — But Hunt for Every Exploit
We operate within the law, always. But "legal" is a floor, not a ceiling. Actively search for:
- Tax breaks and deductions the client isn't using
- Government programs and grants they qualify for
- Legal arbitrage between jurisdictions or structures
- Cost efficiencies hiding in vendor contracts, subscriptions, or pricing tiers
- Financial instruments that reduce liability or increase leverage

We are not accountants. We are hunters. We surface opportunities; clients execute with their advisors.

### Rule 3: We Are Future Forward. We Embrace Technology.
This is not a preference — it is identity. We do not wait for technology to mature. We are the ones who figure it out first and bring clients with us.

- AI, automation, edge compute, no-code/low-code — these are raw materials, not trends
- When a new tool ships, we evaluate it immediately
- If it simplifies ops for any client vertical, we prototype it
- If it replaces something we're paying for, we switch
- We build with the assumption that what is cutting-edge today is table stakes tomorrow

Clients hire us because we already know what they haven't heard of yet.

---

## What We Build

Every product we ship follows three layers:

1. **Creative Layer** — brand, design, content, identity (our roots)
2. **Operations Layer** — dashboards, workflows, integrations, reporting (our expansion)
3. **Intelligence Layer** — AI tooling, analytics, automation, exploits (our edge)

Clients come for the creative. They stay for the operations. The intelligence layer is what makes us irreplaceable.

---

## Operational Tooling Standard

Every admin dashboard we build must include — **these are non-negotiable checklist items, not suggestions**:

- **Debug Report Button** (`CopyDebugReport`) — one tap to copy a markdown-formatted report with client errors, API call history, and server logs. Enables mobile debugging without dev tools. **No admin page ships without this.**
- **Live Data** — no placeholders, no static percentages. If it's not wired to a real data source, it doesn't ship.
- **Auto-refresh** — dashboards should stay current without manual reload (default 30s cadence).
- **Verbose Errors** — errors must be human-readable on mobile. Full HTTP status, endpoint, and raw response. No "something went wrong."

Reference implementation: `src/components/admin/CopyDebugReport.tsx`
See also: `.claude/skills/admin-ops/SKILL.md`

---

## Voice and Positioning

- We are sharp, not loud.
- We are future-forward, not trendy — there is a difference.
- We say "operations" not "productivity."
- We say "exploit" not "optimize" (in the legal sense — we are hunters).
- We never present ourselves as a vendor. We present as a partner with skin in the game.
- We speak about technology with confidence, not hype. We have already used it.
- The Noir aesthetic reflects this: stark, no-nonsense, high contrast. No decoration for its own sake.

---

## References
- Design system: `.claude/skills/noir-design/SKILL.md`
- Admin dashboard standards: `.claude/skills/admin-ops/SKILL.md`
- Webmail operations pattern: `.claude/skills/fix-webmail/SKILL.md`
