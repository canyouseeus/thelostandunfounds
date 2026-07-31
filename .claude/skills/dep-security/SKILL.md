---
name: dep-security
description: Audit and remediate npm dependency vulnerabilities. Use after any npm install or dependency change, before every production deploy, and whenever the /audit command is invoked. Covers npm audit triage, safe vs breaking fixes, and severity thresholds.
---

# Dependency Security Audit

## When to Run
- After any `npm install` or dependency change
- Before every production deploy
- Any time the `/audit` slash command is invoked

## Protocol

Run these from the project root.

### Step 1 — Get the full picture
```bash
npm audit --json > /tmp/audit.json && npm audit
```

### Step 2 — Apply safe fixes (no breaking changes)
```bash
npm audit fix
```
Run this first. It only upgrades within semver-compatible ranges. Re-run `npm audit` afterward to see what remains.

### Step 3 — Review breaking-change fixes
```bash
npm audit fix --force
```
⚠️ This can introduce breaking changes. Only run after reviewing what `--force` will change:
```bash
npm audit fix --force --dry-run
```
Check the dry-run output. If any package listed is a core dependency (react, vite, supabase-js, googleapis, stripe), do NOT run `--force` — investigate manually instead.

### Step 4 — Handle unfixable vulnerabilities
Some vulnerabilities have no fix yet (upstream issue). For each one:
1. Check if the vulnerable code path is actually reachable in production
2. If it's only in a devDependency and never runs in production, it can be accepted
3. If it's in a production dependency and the path is reachable, escalate — find an alternative package or pin to a safe version

### Step 5 — Verify and commit
```bash
npm audit
git add package.json package-lock.json
git commit -m "fix: resolve npm audit vulnerabilities"
```

## Severity Thresholds

| Severity | Action |
|----------|--------|
| Critical | Fix immediately — block deploy |
| High     | Fix before next deploy |
| Moderate | Fix within current sprint |
| Low      | Track — fix in batch with next dependency update |

## Current Known State
Run `npm audit` to see live status. As of last check: 49 vulnerabilities (2 low, 20 moderate, 27 high) — `npm audit fix` should resolve the safe subset without breaking changes.

## Do Not
- Run `npm audit fix --force` blindly on core packages
- Ignore high/critical vulnerabilities in production dependencies
- Commit `package-lock.json` without re-running the audit after changes
