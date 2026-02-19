# THE LOST+UNFOUNDS — Agent Guide

> **This is your map, not your manual.** Read this first, then follow the pointers to deeper docs.

## What This Project Is

A content platform and creative community at [thelostandunfounds.com](https://www.thelostandunfounds.com). Features include: blog/book club, photo gallery, newsletter, merch shop (Fourthwall), affiliate program, admin dashboard, and QR tools. Solo-operated by one person with AI agents.

## Architecture Overview

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full codebase map.

| Layer | Location | Tech |
|---|---|---|
| Frontend | `src/` | React 18, TypeScript, Vite |
| API | `api/` | Vercel Serverless Functions |
| Shared Logic | `lib/` | TypeScript handlers & utilities |
| Database | Supabase | PostgreSQL + RLS |
| Deployment | Vercel | Auto-deploy from `main` branch |
| Email | Zoho Mail | OAuth2 integration |
| Payments | PayPal | MCP server integration |
| Shop | Fourthwall | External platform |

## Where to Find Things

| What you need | Where to look |
|---|---|
| Agent skills (domain-specific guides) | `.agent/skills/*/SKILL.md` and `skills/*/SKILL.md` |
| Step-by-step workflows | `.agent/workflows/*.md` |
| Blog publishing rules | `.cursorrules` → Blog Publishing Rule section |
| Email branding rules | `.agent/skills/brand-email-manager/SKILL.md` |
| Design system & styling | `.agent/skills/noir-design/SKILL.md` |
| Database schema & migrations | `sql/` directory, `.agent/skills/infra-ops/SKILL.md` |
| Environment variables | `.env.local` (local), Vercel dashboard (prod) |
| Deployment verification | `.agent/workflows/deploy-and-verify.md` |
| Setup & onboarding docs | `docs/setup/` |
| Feature documentation | `docs/features/` |
| Security docs | `docs/security/` |
| Archived/completed docs | `docs/archive/` |

## Five Critical Invariants

These rules are **non-negotiable**. Violating them will break production.

1. **Blog text alignment is always `text-left`** — never `text-center` or `text-justify` on body text
2. **Emails must use branded templates** — `generateNewsletterEmail()` or `generateTransactionalEmail()` from `lib/email-template.ts`. Never raw HTML.
3. **SQL scripts use check-and-insert pattern** — never `ON CONFLICT (slug)`. Always check existence first.
4. **Deploy = merge to `main` + push** — then verify at the live URL
5. **Read the relevant skill BEFORE writing code** — use the keyword table in `.cursorrules`

## Skill Lookup

Before starting any task, check `.cursorrules` for the full keyword-to-skill mapping table. When in doubt whether a skill applies, read it anyway.

## Workflow Reference

| Workflow | Purpose |
|---|---|
| `ralph-loop.md` | Self-verification loop: execute → verify → review → fix or escalate |
| `deploy-and-verify.md` | Full deployment pipeline with live verification |
| `preflight-check.md` | Pre-commit invariant checklist |
| `cleanup.md` | Periodic doc/code maintenance |
| `send-email.md` | Email sending procedure |
| `api-route-development.md` | Creating new API routes |
