---
name: verify-ui-changes
description: Standard procedure for verifying UI updates and bug fixes visually. Use after making CSS, layout, or component changes. Defines test case, launches browser, checks for layout stability, alignment, and console errors.
---

# Verify UI Changes

Use this skill whenever you modify UI components, CSS, or layout logic to ensure visual correctness and stability.

## 1. Define the Test Case
Before launching the browser, clearly define:
- **Target URL**: Where the change is visible.
- **Key Elements**: Which components need inspection.
- **Interactions**: What clicks/inputs trigger the state changes.
- **Success Criteria**: What *exactly* should happen (e.g., "Colon remains fixed at x=500", "No console errors").

## 2. Launch Browser Subagent
Call `browser_subagent` with a detailed task prompt:

```markdown
Navigate to [URL].
1. [Interaction Step 1]
2. [Interaction Step 2]
...
Critically observe [Specific Element] for [Specific Behavior (e.g., layout shift, bounce, flash)].
Capture browser console logs to check for errors.
Return a report confirming [Success Criteria] or detailing any regressions.
```

## 3. Critical Observation Checks
- **Layout Stability**: Do elements jump, shift, or resize unexpectedly?
- **Alignment**: Are items properly centered/aligned as requested?
- **Console Errors**: Are there any red errors in the console? (Use `capture_browser_console_logs`)
- **Responsive Behavior**: Does it look right at the current viewport size?

## 4. Documentation
- Verify the change with a screenshot or recording.
- If issues persist, **DO NOT** mark the task as done. Iterate on the fix.

---

## 5. Make the check capable of failing

A check that passes when its inputs are missing is not a check. Verify the failure path before
trusting the pass.

Real example from this codebase — this loop reported five documents identical when **none of the
screenshots had been generated**. `md5sum` errored on both sides, both variables came back empty,
and empty equals empty:

```bash
a=$(md5sum orig.png | cut -d' ' -f1)   # file missing → a=""
b=$(md5sum new.png  | cut -d' ' -f1)   # file missing → b=""
[ "$a" = "$b" ] && echo "IDENTICAL"    # ✅ passes, proves nothing
```

Guard the inputs, and prefer a comparison that errors on a missing file:

```bash
[ -s orig.png ] && [ -s new.png ] || { echo "MISSING RENDER"; exit 1; }
cmp -s orig.png new.png && echo "identical" || echo "DIFFERS"
```

Before trusting any new check: break it on purpose once and confirm it reports failure.

## 6. Inspect the whole output, not just what you changed

Three bugs shipped this month because verification confirmed the specific fix and stopped there:

- A viewport of 1100×1600 was used to compare 3–7 page documents. It covered page one. Everything
  below the fold went unchecked and was declared identical.
- An invoice banner was fixed, the overlap it caused was fixed — and the brand name printed twice
  in the result, plainly visible in the rendered image, unnoticed because the check was "is the
  overlap gone?"
- A typecheck was reported clean while running against an empty `node_modules`, where it could
  not resolve a single import.

Render the full artifact, view it, and read it as a whole before calling the task done. For
multi-page documents, size the viewport to the longest one.

## 7. Static checks for design-system compliance

Cheap, mechanical, and they cannot be talked around:

```bash
# No borders, shadows, dividers, or rings anywhere in the changed files
grep -rE "border-|shadow-|divide-[xy]|ring-" <changed files>   # expect no matches

# No new type errors vs the pre-change baseline
npx tsc --noEmit 2>&1 | grep -c "error TS"
```

Run the typecheck **only with dependencies installed** — against an empty `node_modules` it
resolves nothing and reports success regardless of the code.
