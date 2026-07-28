# Architecture — THE LOST+UNFOUNDS

## System Overview

```
┌──────────────────────────────────────────────────────────┐
│                    Vercel (Hosting)                       │
│                                                          │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────┐  │
│  │  React SPA  │───▶│  Serverless  │───▶│  Supabase   │  │
│  │  (src/)     │    │  API (api/)  │    │  (Postgres) │  │
│  └─────────────┘    └──────┬───────┘    └─────────────┘  │
│                            │                              │
│                    ┌───────┴────────┐                     │
│                    │  Shared Logic  │                     │
│                    │  (lib/)        │                     │
│                    └───────┬────────┘                     │
│                            │                              │
│              ┌─────────────┼─────────────┐               │
│              │             │             │               │
│         Zoho Mail     Fourthwall      PayPal             │
│         (email)       (shop)        (payments)           │
└──────────────────────────────────────────────────────────┘
```

## Directory Map

### `src/` — Frontend (React SPA)
The entire user-facing application. Built with React 18 + TypeScript + Vite.

| Directory | Purpose |
|---|---|
| `src/pages/` | Route-level page components (54 pages) |
| `src/components/` | Reusable UI components |
| `src/hooks/` | Custom React hooks |
| `src/utils/` | Frontend utility functions |
| `src/services/` | API client services |
| `src/types/` | TypeScript type definitions |
| `src/contexts/` | React context providers |
| `src/constants/` | App-wide constants |
| `src/lib/` | Frontend library code |

### `api/` — Backend (Vercel Serverless Functions)
Each subdirectory is a domain. Each `.ts` file is an API endpoint.

| Directory | Purpose |
|---|---|
| `api/admin/` | Admin dashboard endpoints |
| `api/affiliates/` | Affiliate program management |
| `api/blog/` | Blog CRUD operations |
| `api/cron/` | Scheduled tasks (newsletters, etc.) |
| `api/gallery/` | Photo gallery management |
| `api/mail/` | Email sending endpoints |
| `api/newsletter/` | Newsletter subscription & sending |
| `api/shop/` | Fourthwall shop integration |
| `api/webhooks/` | External service webhooks |
| `api/king-midas/` | Revenue tracking |
| `api/photos/` | Photo management |
| `api/tiktok/` | TikTok integration |
| `api/utils/` | Shared API utilities |

### `lib/` — Shared Logic
Code shared between API routes.

| File/Directory | Purpose |
|---|---|
| `lib/api-handlers/` | Reusable handler functions for API routes |
| `lib/email-template.ts` | **Branded email templates** (MUST use for all emails) |
| `lib/fourthwall/` | Fourthwall shop API client |

### `sql/` — Legacy Database Scripts (archive only)
Historical migration and blog-post scripts from the retired file-based workflow. **Not a live
path** — the `/sql` page that served them has been removed. All database changes now go through
the Supabase MCP server (`apply_migration`). Do not add files here; see the `supabase-mcp` skill.

### `.claude/` — Agent Configuration
| Directory | Purpose |
|---|---|
| `.claude/skills/` | **All** domain-specific skill guides — the single canonical location |
| `.claude/commands/` | Slash commands (`/audit`, `/startdev`, …) |
| `.agent/workflows/` | Step-by-step operational procedures |

> `.agent/skills/` and a top-level `skills/` used to hold duplicate forks of the same skills. They
> drifted apart and produced contradictory rules, so they were deleted and everything was
> consolidated into `.claude/skills/`. Do not recreate them — one skill, one file.

### `scripts/` — Utility Scripts
One-off and helper scripts for operations tasks.

### `public/` — Static Assets
Images, SQL files, and other static content served directly.

## Key Data Flow

1. **Blog Publishing**: Write content → apply via Supabase MCP (`apply_migration`) → verify the row → verify the rendered post at `/thelostarchives/[slug]`
2. **Newsletter**: Create campaign in admin → send via `api/newsletter/send` → Zoho Mail delivers using branded template
3. **Shop Orders**: Customer buys on Fourthwall → webhook hits `api/webhooks/` → order tracked in Supabase
4. **Photo Gallery**: Upload photos → sync to Google Drive → serve via gallery components

## Deployment

- **Branch**: `main` auto-deploys to Vercel
- **Domain**: thelostandunfounds.com
- **Env vars**: Managed in Vercel dashboard + `.env.local` for local dev
- **Verification**: Always check live URL after deploy (see `.agent/workflows/deploy-and-verify.md`)
