---
description: Periodic maintenance workflow for cleaning up stale docs, duplicate files, and documentation drift. Run monthly or when the repo feels cluttered.
---

# Cleanup / Garbage Collection Workflow

> "Technical debt is like a high-interest loan: it's almost always better to pay it down continuously in small increments than to let it compound."

## When to Run
- Monthly maintenance
- When you notice duplicate or outdated docs
- After a large feature is complete
- When a new agent session can't find what it needs

## Steps

### 1. Scan for root-level doc sprawl
```bash
# Count markdown files in project root
ls -1 *.md 2>/dev/null | wc -l
```
Target: Keep to essential files only (`README.md`, `AGENTS.md`, `ARCHITECTURE.md`, `BLOG_POST_STYLE_GUIDE.md`). Everything else should live in `docs/`.

### 2. Identify stale/duplicate docs
Look for patterns like:
- Multiple docs about the same topic (e.g., `DEPLOYMENT.md` + `DEPLOYMENT_ANALYSIS.md` + `DEPLOYMENT_COMPLETE.md`)
- "NEXT_STEPS" or "TODO" docs that reference completed work
- "FIX" or "QUICK_FIX" docs for issues that have been resolved
- Status docs (`PUSH_SUCCESS.md`, `IMPLEMENTATION_COMPLETE.md`) that are no longer relevant

### 3. Consolidate or archive
For each stale doc:
- **If the content is still useful**: Move it to the appropriate `docs/` subdirectory
- **If it's outdated but historically interesting**: Move to `docs/archive/`
- **If it's fully obsolete**: Delete it

### 4. Update docs/index.md
After moving or deleting docs, update `docs/index.md` to reflect the current state. Mark documents with their freshness status:
- ✅ Active — currently accurate
- ⚠️ Needs Review — may be outdated
- 🗄️ Archived — moved to `docs/archive/`

### 5. Check skill freshness
Scan `.agent/skills/` and `skills/` directories:
- Are any skills referencing files or patterns that no longer exist?
- Are any skills missing coverage for new features?
- Do skill instructions match current implementation?

### 6. Verify AGENTS.md accuracy
Read `AGENTS.md` and confirm:
- All linked files exist
- The "Where to Find Things" table is current
- The 5 critical invariants are still the right 5

### 7. Check .cursorrules alignment
Compare `.cursorrules` with actual skill/workflow files:
- Is the keyword-to-skill mapping table up to date?
- Are there new skills missing from the table?
- Are there stale rules that no longer apply?

## Output
After running this workflow, report:
- Number of docs consolidated or archived
- Any skills updated
- Any new gaps identified
- Updated `docs/index.md` status
