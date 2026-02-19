---
description: Pre-commit invariant checklist. Run this before any commit to catch rule violations early.
---

# Preflight Check Workflow

> "By enforcing invariants, not micromanaging implementations, we let agents ship fast without undermining the foundation."

Run these checks before committing. If any fail, fix before proceeding.

## Mandatory Checks

### 1. Build passes
```bash
npm run build
```
If this fails, fix TypeScript/build errors before committing.

### 2. No new loose docs in project root
```bash
# Check for any new .md files in root (not in docs/, .agent/, etc.)
ls -la *.md | wc -l
```
New documentation should go in `docs/`, not the project root. Exceptions: `README.md`, `AGENTS.md`, `ARCHITECTURE.md`, `BLOG_POST_STYLE_GUIDE.md`.

### 3. Email handlers use branded templates
If you modified any file in `api/mail/`, `api/newsletter/`, or `lib/api-handlers/`:
- Verify it uses `generateNewsletterEmail()`, `generateTransactionalEmail()`, or `wrapEmailContent()` from `lib/email-template.ts`
- Never use `processEmailContent` alone
- Never hardcode raw HTML email templates

### 4. Blog text alignment
If you modified `BlogPost.tsx`, `BlogAnalysis.tsx`, or any blog component:
- Verify all body text uses `text-left`
- No `text-center` or `text-justify` on paragraph content

### 5. SQL scripts use safe patterns
If you created or modified a SQL file:
- Never use `ON CONFLICT (slug)` — the slug column may not have a unique constraint
- Must use check-and-insert/update pattern (check existence first with `SELECT INTO`, then `IF/ELSE`)

### 6. Skill was consulted
Before implementing, check: did you read the relevant skill(s) from `.agent/skills/` or `skills/`?
If not, read them now and verify your implementation aligns.

## Quick One-Liner
```bash
npm run build && echo "✅ Build passed"
```

## If a Check Fails
Fix the issue, then re-run the preflight check. Don't skip checks — they exist because violations have broken production before.
