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

*No open bugs at this time.*

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

