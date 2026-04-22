Run a dependency security audit and apply safe fixes.

**Step 1 — See what's vulnerable:**
```bash
cd /Users/thelostunfounds/thelostandunfounds && npm audit
```

**Step 2 — Apply safe fixes (no breaking changes):**
```bash
cd /Users/thelostunfounds/thelostandunfounds && npm audit fix
```

**Step 3 — Preview breaking-change fixes before applying:**
```bash
cd /Users/thelostunfounds/thelostandunfounds && npm audit fix --force --dry-run
```
Review the dry-run output. If it touches react, vite, supabase-js, googleapis, or paypal — stop and report back before running `--force`.

**Step 4 — If dry-run looks safe, apply:**
```bash
cd /Users/thelostunfounds/thelostandunfounds && npm audit fix --force
```

**Step 5 — Commit the fixes:**
```bash
cd /Users/thelostunfounds/thelostandunfounds && git add package.json package-lock.json && git commit -m "fix: resolve npm audit vulnerabilities"
```

Share the `npm audit` output and I'll tell you which fixes are safe to apply.
