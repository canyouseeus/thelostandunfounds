---
name: admin-ops
description: Orchestrates the admin dashboard, ensuring live data integrity and Noir design compliance. Use when working on admin panel, dashboard components, analytics views, user management, or content moderation.
---

# Admin Operations Skill

This skill governs the maintenance, data integrity, and visual excellence of the Admin Dashboard (`/admin`).

## Core Responsibilities

### 1. Data Integrity & Live Feeds
- **No Placeholders**: ALWAYS replace hardcoded placeholders with live data from Supabase.
- **Data Freshness**: Ensure the auto-refresh mechanism (default 30s) is working and covers all critical stats.
- **Robustness**: Maintain fallback states for cases where database tables might not exist or are empty.
- **Accuracy**: Use the most accurate source of truth for stats (e.g., combining `platform_subscriptions`, `user_roles`, and `user_subdomains` for user counts).

### 2. UI & Noir Aesthetic
- **Monochrome**: Pure black background (`#000000`) and pure white text/borders.
- **Rigid Geometry**: STRICTLY enforce `border-radius: 0 !important`. No rounded corners on buttons, cards, or inputs.
- **Typography**: Headers (h1, h2, Bento titles) MUST be **UPPERCASE**.
- **Alignment**: Standardize on `text-left` for body content and lists.
- **Bento Grid**: Maintain the Bento-style layout for the overview, ensuring responsiveness and proper alignment.

### 3. Management Modules
- **User Management**: Ensure the user details side panel provides actionable data (tier, status, subdomain).
- **Blog Oversight**: Monitor pending submissions and active post counts.
- **Commerce Tracking**: Track product inventory, costs, and subscription revenue (MRR).
- **Outreach Monitoring**: Integration with Zoho Mail status and newsletter subscriber growth.

## Dashboard Components

### Bento Grid Layout
The dashboard uses a 4-column Bento grid:
- **Platform Overview**: 3x2 (Large chart + key stats)
- **System Alerts**: 1x2 (Scrollable alert list)
- **Small Cards**: 1x1 (Users, Subscriptions, Products, Blog, Newsletter, Mail, System)

### Standard Styles
- Cards: `.noir-card` or custom Bento card with white border.
- Buttons: White background with black text for primary actions; transparent with white border for secondary.
- Stats: Use `AnimatedNumber` for all numeric values.

## Global Debug Report Button

> **NON-NEGOTIABLE**: Every admin dashboard — without exception — must mount the Debug Report button. This is a brand standard, not an optional enhancement. No admin page ships without it.

Every admin page mounts a **"DEBUG REPORT"** button (`src/components/admin/CopyDebugReport.tsx`) in the header, next to the profile icon. It is wired up in `src/pages/Admin.tsx`.

When tapped it copies a markdown-formatted report containing:
- Timestamp, URL, user email, device/UA string
- Client-side errors (JS errors + unhandled rejections, captured by `src/lib/adminErrorLog.ts`)
- Recent API calls logged via `logApiCall()` (method, status, endpoint, detail)
- Vercel server logs for the last 30 min via `/api/admin/logs` (requires `VERCEL_ACCESS_TOKEN` in Vercel env vars)

**Adding API call logging to a new admin view:**
```ts
import { logApiCall, logError } from '../../lib/adminErrorLog';

// After a fetch:
logApiCall('GET', '/api/some/endpoint', response.status, detail);
// On error:
logError(err.message);
```

**Styling (Noir-compliant):**
```tsx
<button
  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-widest bg-black text-white border border-white hover:bg-white hover:text-black transition-colors"
  style={{ borderRadius: 0 }}
>
  <ClipboardCopy className="w-3 h-3" />
  DEBUG REPORT
</button>
```

## Verification Checklist
- [ ] No "coming soon" or static "--%" placeholders.
- [ ] No `rounded` or `rounded-*` classes (except for profile avatars if absolutely necessary).
- [ ] All headers are uppercase.
- [ ] All data is fetched from Supabase.
- [ ] Desktop and mobile layouts are aligned correctly.
- [ ] **`CopyDebugReport` is present in the admin header** — this is a hard requirement, not optional. No dashboard ships without it.
- [ ] `installGlobalListeners` called in the page's root `useEffect` (captures JS errors + unhandled rejections).
- [ ] All API calls inside the view use `logApiCall()` so they appear in the debug report.
