---
name: brand-ethos
description: Captures the core brand philosophy and operational identity of The Lost and Unfounds. Use when making product decisions, designing new features, pitching services, or onboarding new team members. The north star for every build decision.
---

# Brand Ethos

## The Mission

**The Lost and Unfounds is a creative agency that simplifies business operations.**

We are in transition — from pure creative work to a full-service agency that handles both the creative and the operational layer of a business. The goal is to make clients feel like they gained an entire operations team, not just a design shop.

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

### Rule 3: Embrace New Technology
We are early adopters by identity, not by accident. When a new tool ships:
- Evaluate it within 2 weeks
- If it simplifies ops for any client vertical, prototype it
- If it replaces something we're paying for, switch

AI, automation, no-code/low-code, edge compute — these are not trends to us. They are raw materials.

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
- We say "operations" not "productivity."
- We say "exploit" not "optimize" (in the legal sense — we are hunters).
- We never present ourselves as a vendor. We present as a partner with skin in the game.
- The Noir aesthetic reflects this: stark, no-nonsense, high contrast. No decoration for its own sake.

---

## References
- Design system: `.claude/skills/noir-design/SKILL.md`
- Admin dashboard standards: `.claude/skills/admin-ops/SKILL.md`
- Webmail operations pattern: `.claude/skills/fix-webmail/SKILL.md`
