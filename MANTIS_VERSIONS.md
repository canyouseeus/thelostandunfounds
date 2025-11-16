# MANTIS Version History

This file tracks all MANTIS versions saved.

## Versioning System

- **MANTIS-1.0.0**: Initial MANTIS version (comprehensive admin dashboard with full database schema)
- Versions increment automatically: 1.0.1, 1.0.2, 1.0.3, etc.

## How to Save a New Version

```bash
# Save with default message
npm run save:mantis

# Save with custom message
npm run save:mantis "Your custom commit message here"
```

## Version List

Run this to see all MANTIS versions:
```bash
git tag -l "MANTIS-*" | sort -V
```

## Version History

### MANTIS-1.0.0 (2025-11-16)
**Commit:** 20cf0e2

**Changes:**
- ✅ Fixed all Supabase database errors
- ✅ Created all admin dashboard tables (platform_subscriptions, tool_limits, tool_usage, blog_posts, products, user_roles, journal_entries, tasks, ideas, help_articles, code_snippets, affiliates, affiliate_commissions)
- ✅ Set up RLS policies for all tables
- ✅ Added tables to Supabase REST API publication
- ✅ Configured admin user credentials (admin@thelostandunfounds.com)
- ✅ Removed error suppression - all errors now properly logged
- ✅ Created comprehensive SQL schema files for database setup
- ✅ Added diagnostic and setup scripts

**Database Schema:**
- All tables created and accessible via REST API
- RLS policies configured for admin access
- Indexes and triggers set up
- Default data inserted (tool limits, sample help articles)

**Admin Credentials:**
- Email: admin@thelostandunfounds.com
- Password: Configured via terminal script

### MANTIS-1.0.1 (2025-11-16)
**Commit:** 6629c5e

**Changes:**
- ✅ Fixed RLS circular dependency issue
- ✅ Created `is_user_admin()` SECURITY DEFINER function to bypass RLS for admin checks
- ✅ Updated all RLS policies to use the new function
- ✅ All tables now accessible via REST API (200 status codes)
- ✅ Zero console errors - all database queries working
- ✅ Admin dashboard fully functional

**Technical Fix:**
- Problem: RLS policies were checking admin status by querying `user_roles` table, but `user_roles` itself had RLS enabled, creating a circular dependency
- Solution: Created `is_user_admin()` function with `SECURITY DEFINER` that bypasses RLS to check admin status
- Result: All RLS policies now work correctly, all tables accessible

**Status:**
- ✅ All database tables accessible
- ✅ All REST API requests returning 200
- ✅ No console errors
- ✅ Admin dashboard working perfectly

## Latest Version

The `MANTIS` tag always points to the latest version.

**Current Latest:** MANTIS-1.0.1

