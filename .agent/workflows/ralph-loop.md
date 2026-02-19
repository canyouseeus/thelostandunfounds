---
description: Self-verification loop inspired by the Ralph Loop pattern. Use this after any code change to validate your own work before declaring done.
---

# Ralph Loop — Self-Verification Workflow

> "Software is clay on the pottery wheel. If something isn't right, throw it back on the wheel."

This workflow implements a loop: **Execute → Verify → Review → Fix or Escalate**. Run this after making any meaningful change.

## When to Use

- After implementing a feature or fix
- After modifying email templates or handlers
- After changing database schemas or SQL scripts
- After modifying deployment config
- Before telling the user "it's done"

## The Loop

### Step 1: Execute
Make the change. Write the code, update the config, create the file.

### Step 2: Verify
Run the appropriate verification for your change type:

**Code changes:**
```bash
# TypeScript check
npx tsc --noEmit

# Build check
npm run build
```

**Blog post changes:**
- Check the live URL: `https://www.thelostandunfounds.com/thelostarchives/[slug]`
- Verify text alignment is left-aligned
- Verify no "⸻" characters appear

**Email changes:**
- Send a test email using the test endpoint
- Verify branded template is used (logo/banner present)

**API changes:**
- Test the endpoint with curl or fetch
- Check for proper error handling

**Deployment changes:**
- Follow `.agent/workflows/deploy-and-verify.md`

### Step 3: Review
Review your own diff against the relevant rules:

1. Does this change violate any of the 5 critical invariants in `AGENTS.md`?
2. Did you read the relevant skill(s) before making this change?
3. Are there any unintended side effects?
4. Would this change make sense to a future agent session with no context?

### Step 4: Fix or Escalate

**If issues found:** Go back to Step 1. Fix the issue and loop again.

**If uncertain:** Ask the user. Don't guess on things that could break production.

**If clean:** You're done. Report what you did and what you verified.

## Key Principle

> "When you see a failure domain — put on your engineering hat and resolve the problem so it never happens again."

If the loop reveals a recurring issue, don't just fix it — encode the fix:
- Add a rule to the relevant skill's `SKILL.md`
- Add a check to `.agent/workflows/preflight-check.md`
- Update `AGENTS.md` if it's a new critical invariant
