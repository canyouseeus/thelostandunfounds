# Bug Tracker

This file tracks all bugs found and fixed in the project.

## Bug Status Legend

- 🐛 **OPEN** - Bug is active and needs fixing
- 🔧 **IN PROGRESS** - Bug is being worked on
- ✅ **FIXED** - Bug has been fixed
- ❌ **WON'T FIX** - Bug won't be fixed (by design or low priority)
- 🔍 **INVESTIGATING** - Bug is being investigated

---

## Fixed Bugs

### BUG-001: RLS Circular Dependency Causing 500 Errors
**Status:** ✅ FIXED  
**Fixed in:** MANTIS-1.0.1  
**Date:** 2025-11-16

**Description:**
RLS policies were checking admin status by querying `user_roles` table, but `user_roles` itself had RLS enabled, creating a circular dependency that blocked all admin table access.

**Symptoms:**
- All admin dashboard tables returning 500 errors
- `tool_usage`, `products`, `blog_posts`, `tasks`, `ideas`, `affiliates` all inaccessible
- Console showing `[object Object]` errors

**Root Cause:**
RLS policies used direct queries like:
```sql
EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.is_admin = true
)
```
But `user_roles` table also had RLS, causing circular dependency.

**Solution:**
Created `is_user_admin()` SECURITY DEFINER function that bypasses RLS:
```sql
CREATE OR REPLACE FUNCTION is_user_admin(user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_roles 
    WHERE user_roles.user_id = user_id_param 
    AND user_roles.is_admin = true
  );
END;
$$;
```

Updated all RLS policies to use `is_user_admin(auth.uid())` instead of direct queries.

**Files Changed:**
- `fix-rls-circular-dependency.sql` - Created fix SQL
- All RLS policies updated

**Verification:**
- All tables now return 200 status codes
- Zero console errors
- Admin dashboard fully functional

---

### BUG-002: Database Tables Not Created
**Status:** ✅ FIXED  
**Fixed in:** MANTIS-1.0.0  
**Date:** 2025-11-16

**Description:**
Database tables didn't exist, causing "Table does not exist" errors throughout the application.

**Symptoms:**
- Console errors: "Table 'platform_subscriptions' does not exist!"
- All Supabase queries failing with 500 errors
- Admin dashboard completely broken

**Root Cause:**
SQL schema wasn't run in Supabase database.

**Solution:**
Created comprehensive SQL schema and ran it in Supabase SQL Editor:
- Created all 13 tables
- Added tables to REST API publication
- Set up RLS policies
- Created indexes and triggers

**Files Changed:**
- `comprehensive-admin-schema.sql` - Complete schema
- `create-platform-subscriptions-only.sql` - Step-by-step creation
- `create-remaining-tables.sql` - Remaining tables

**Verification:**
- All tables created successfully
- Tables accessible via REST API

---

### BUG-003: Error Suppression Hiding Real Issues
**Status:** ✅ FIXED  
**Fixed in:** MANTIS-1.0.0  
**Date:** 2025-11-16

**Description:**
Error suppression code was hiding real bugs instead of fixing them.

**Symptoms:**
- Errors being silently suppressed
- No visibility into actual problems
- Made debugging impossible

**Root Cause:**
Extensive `console.error` and `console.warn` overrides suppressing all Supabase errors.

**Solution:**
Removed all error suppression and improved error logging to show detailed error information:
- Removed silent error catching
- Added detailed error logging with error codes, messages, and status
- All errors now properly logged for debugging

**Files Changed:**
- `src/main.tsx` - Removed error suppression
- `src/servers/subscription/index.ts` - Improved error logging
- `src/components/admin/DashboardOverview.tsx` - Improved error logging
- `src/pages/Admin.tsx` - Improved error logging

**Verification:**
- All errors now visible in console
- Detailed error information available for debugging

---

### BUG-004: SQL Schema Syntax Error - ALTER PUBLICATION
**Status:** ✅ FIXED  
**Fixed in:** MANTIS-1.0.0  
**Date:** 2025-11-16

**Description:**
SQL schema had syntax error: `ALTER PUBLICATION` doesn't support `IF NOT EXISTS`.

**Symptoms:**
- SQL execution failing with syntax error
- Tables not being added to REST API publication

**Root Cause:**
Used `ALTER PUBLICATION supabase ADD TABLE IF NOT EXISTS` which is invalid syntax.

**Solution:**
Changed to check if table exists in publication before adding:
```sql
IF NOT EXISTS (
  SELECT 1 FROM pg_publication_tables 
  WHERE pubname = 'supabase' AND tablename = 'table_name'
) THEN
  ALTER PUBLICATION supabase ADD TABLE table_name;
END IF;
```

**Files Changed:**
- `comprehensive-admin-schema.sql` - Fixed publication syntax

**Verification:**
- SQL executes without errors
- Tables added to publication successfully

---

### BUG-005: Admin User Not Set in Database
**Status:** ✅ FIXED  
**Fixed in:** MANTIS-1.0.0  
**Date:** 2025-11-16

**Description:**
Admin user existed in auth.users but not in user_roles table, so RLS policies couldn't recognize admin status.

**Symptoms:**
- User authenticated but RLS blocking access
- Admin dashboard inaccessible
- All admin queries returning 403/500

**Root Cause:**
`user_roles` table didn't have entry for admin user.

**Solution:**
Created SQL to insert admin user into `user_roles` table:
```sql
INSERT INTO user_roles (user_id, email, is_admin)
SELECT id, email, true
FROM auth.users
WHERE email = 'admin@thelostandunfounds.com'
ON CONFLICT (user_id) 
DO UPDATE SET is_admin = true;
```

**Files Changed:**
- `set-specific-admin.sql` - Admin user setup SQL
- `setup-admin-user.sh` - Terminal script for admin setup

**Verification:**
- Admin user set in user_roles table
- Admin status verified via SQL query

---

## Open Bugs

### BUG-006: Recurring Port Conflict and Process Management Issues
**Status:** 🔍 INVESTIGATING  
**Severity:** Medium  
**Date:** 2025-11-16

**Description:**
Recurring pattern where multiple dev server processes accumulate, causing port conflicts and 500 errors. This happens when:
1. Starting `vercel dev` or `npm run dev` without checking for existing processes
2. Processes don't terminate cleanly
3. Multiple instances run simultaneously
4. Ports remain bound after process termination

**Symptoms:**
- Multiple `vercel dev` or `vite` processes running simultaneously
- Port 3000 (or other ports) already in use errors
- 500 Internal Server Errors when accessing dev server
- Processes accumulating over time
- Getting stuck in loops trying to test/fix issues

**Root Cause:**
- Not checking for existing processes before starting new ones
- Background processes not being properly tracked
- No cleanup mechanism between attempts
- Processes started in background not being monitored

**Prevention Pattern (Solution):**
**ALWAYS follow this pattern before starting dev servers:**

1. **Check for existing processes:**
   ```bash
   ps aux | grep -E "vercel|vite" | grep -v grep
   lsof -i -P | grep LISTEN | grep -E "3000|5173"
   ```

2. **Kill all related processes:**
   ```bash
   pkill -9 -f "vercel dev"
   pkill -9 -f "vite"
   lsof -ti:3000 | xargs kill -9 2>/dev/null
   lsof -ti:5173 | xargs kill -9 2>/dev/null
   ```

3. **Verify ports are free:**
   ```bash
   lsof -i -P | grep LISTEN | grep -E "3000|5173" || echo "Ports free"
   ```

4. **Then start server:**
   ```bash
   npm run dev
   ```

**Files Changed:**
- `scripts/kill-port-3000.sh` - Already exists for port 3000
- Need to create comprehensive cleanup script

**Verification:**
- No duplicate processes running
- Ports free before starting
- Server starts cleanly

**Related Issues:**
- BUG-007: vercel dev compatibility issues
- Port conflict with Google Drive MCP (already documented)

---

### BUG-007: vercel dev Not Working with Vite Framework
**Status:** ❌ WON'T FIX (Known Limitation)  
**Severity:** Low  
**Date:** 2025-11-16

**Description:**
`vercel dev` has compatibility issues with Vite's dev server, causing 500 errors when trying to serve React app. The dev server starts but Vite's HMR endpoints (`/@vite/client`, `/@react-refresh`) return 500 errors.

**Symptoms:**
- `vercel dev` starts successfully
- Port 3000 is listening
- HTML loads but React doesn't mount
- 500 errors for `/@vite/client`, `/@react-refresh`, `/main.tsx`
- Console: "Failed to load resource: 500"
- React doesn't mount after timeout

**Root Cause:**
`vercel dev` doesn't properly proxy Vite's dev server endpoints. The `devCommand` in `vercel.json` doesn't integrate correctly with Vite's HMR system.

**Solution:**
**API routes only work in production on Vercel.**

For local development:
- Use `npm run dev` for frontend development (fast, no API routes)
- Test API routes in production deployment
- Document this limitation clearly

**Workaround:**
1. Local frontend dev: `npm run dev` (Vite only)
2. API route testing: Deploy to production (`git push`)
3. Full testing: Use production URL

**Files Changed:**
- `vercel.json` - Removed `devCommand` (doesn't work)
- `VERCEL_DEV_SETUP.md` - Updated with reality
- `src/pages/Shop.tsx` - Already shows helpful local dev message

**Verification:**
- `npm run dev` works perfectly for frontend
- API routes work in production
- Documentation reflects limitations

**Related Issues:**
- BUG-006: Process management issues (exacerbated by trying to fix this)

---

### BUG-008: Getting Stuck in Testing Loops
**Status:** 🔍 INVESTIGATING  
**Severity:** Medium  
**Date:** 2025-11-16

**Description:**
Pattern of getting stuck trying to test things that don't work, repeatedly attempting the same approach without recognizing the fundamental issue.

**Symptoms:**
- Repeatedly trying to test `vercel dev` when it doesn't work
- Getting stuck on curl commands that hang
- Not recognizing when something fundamentally won't work
- Wasting time on approaches that are known to fail

**Root Cause:**
- Not checking if something is fundamentally broken before testing
- Not recognizing patterns from previous attempts
- Not documenting known limitations
- Not stopping when hitting the same error repeatedly

**Prevention Pattern:**
**Before testing something that previously failed:**

1. **Check if it's a known limitation:**
   - Review BUGS.md for related issues
   - Check documentation for known issues
   - Don't retry approaches that are documented as not working

2. **Verify prerequisites:**
   - Is the server actually running?
   - Are ports free?
   - Are processes clean?

3. **Set timeout:**
   - If testing hangs, stop after reasonable timeout
   - Don't keep retrying the same thing

4. **Document the limitation:**
   - If something doesn't work, document it
   - Add to BUGS.md with status "WON'T FIX" if it's a known limitation
   - Update docs to reflect reality

**Files Changed:**
- `BUGS.md` - This file (documenting the pattern)
- Need to create testing checklist

**Verification:**
- Known limitations documented
- Testing follows checklist
- No repeated attempts on broken approaches

---

## Bug Reporting Guidelines

When reporting a bug, include:
1. **Title:** Brief description
2. **Status:** Current status (use legend above)
3. **Severity:** Critical / High / Medium / Low
4. **Description:** What the bug is
5. **Steps to Reproduce:** How to trigger it
6. **Expected Behavior:** What should happen
7. **Actual Behavior:** What actually happens
8. **Environment:** Browser, OS, etc.
9. **Screenshots/Logs:** If applicable
10. **Related Issues:** Link to related bugs

---

## Bug ID Format

- Format: `BUG-XXX` (e.g., BUG-001, BUG-002)
- Auto-incrementing
- Tracked in this file

---

## Related Files

- `MISSING_FEATURES_TODO.md` - Feature requests and missing features
- `MANTIS_VERSIONS.md` - Version history with bug fixes
- `CHANGELOG.md` - Change log (if exists)

