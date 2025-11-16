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

### MANTIS-1.0.2 (2025-11-16)
**Commit:** 7c81137

**Changes:**
- ✅ Fixed Fourthwall API integration - Changed from `/offers` to `/products` endpoint (matching fw-setup)
- ✅ Added HTML entity decoding for product titles and descriptions (handles `&#34;`, emojis, etc.)
- ✅ Fixed image extraction - Extract URLs from image objects `{id, url, width, height}`
- ✅ Added product deduplication - Prevents duplicate products from appearing twice
- ✅ Updated shop UI - Changed header to "SHOP" and removed Fourthwall store link
- ✅ Fixed product grid - Set to 3 columns maximum layout
- ✅ Added server-side HTML tag stripping for clean descriptions
- ✅ Improved response parsing - Handle `{results: [...]}` format from Fourthwall API

**Technical Details:**
- Switched API endpoints from `/v1/collections/{handle}/offers` to `/v1/collections/{handle}/products`
- Added `decodeHtmlEntities()` function to decode HTML entities like `&#34;` → `"`
- Added `extractImageUrls()` function to extract URLs from image objects
- Added `stripHtmlTags()` function to remove HTML tags from descriptions server-side
- Implemented deduplication using Map/Set to prevent duplicate products
- Updated shop page to display clean product descriptions without HTML tags

**Files Modified:**
- `api/fourthwall/products.ts` - Updated endpoints, added helpers, deduplication
- `api/fourthwall/collections/[handle].ts` - Updated endpoints and response parsing
- `src/pages/Shop.tsx` - Updated UI, added description cleaning, deduplication

**Status:**
- ✅ Products loading correctly from Fourthwall
- ✅ Images displaying properly
- ✅ Product names and descriptions rendering cleanly
- ✅ No duplicate products
- ✅ Shop page displaying correctly

## Latest Version

The `MANTIS` tag always points to the latest version.

**Current Latest:** MANTIS-1.0.2

