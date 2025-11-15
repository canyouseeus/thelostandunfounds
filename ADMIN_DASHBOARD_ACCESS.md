# Admin Dashboard Access Guide

## Quick Access

1. **Start the dev server** (if not already running):
   ```bash
   npm run dev
   ```

2. **Access the dashboard**:
   - Open your browser: `http://localhost:3000/admin`
   - Make sure you're **logged in** as an admin user
   - If you see a redirect to `/`, you need to log in first

## About the Errors You're Seeing

### CSP Warning (Harmless)
The error about `.well-known/appspecific/com.chrome.devtools.json` is **completely harmless**. It's just Chrome DevTools trying to connect to a debugging endpoint. You can safely ignore this.

### 404 Errors
If you see 404 errors in the console:
1. **Check the Network tab** in DevTools to see what's actually failing
2. **Common causes**:
   - Missing images/assets
   - Database tables not set up (run the SQL schemas)
   - Authentication issues (not logged in as admin)

## Troubleshooting

### Can't Access Admin Dashboard

1. **Check if you're logged in**:
   - Go to `http://localhost:3000/`
   - Log in with your admin account
   - Then navigate to `/admin`

2. **Check admin status**:
   - Your user must have `is_admin = true` in the `user_roles` table
   - Or your email must match `admin@thelostandunfounds.com`

3. **Check browser console**:
   - Open DevTools (F12)
   - Look for actual errors (not warnings)
   - Red errors indicate real problems

### Database Tables Missing

If you see errors about missing tables, run the SQL schemas:

1. Go to Supabase Dashboard → SQL Editor
2. Run `admin-dashboard-schema.sql` (if not already done)
3. Run `comprehensive-admin-schema.sql` for the new features

### Components Not Loading

If the dashboard loads but sections are blank:

1. Check browser console for import errors
2. Verify all component files exist in `src/components/admin/`
3. Check for TypeScript compilation errors

## Expected Behavior

When everything is working:
- ✅ Dashboard loads with sidebar navigation
- ✅ You see categories: Overview, Content, E-commerce, Productivity, etc.
- ✅ Clicking tabs shows different sections
- ✅ No red errors in console (warnings are OK)

## Still Having Issues?

1. **Clear browser cache**: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
2. **Check server logs**: Look at the terminal running `npm run dev`
3. **Verify environment variables**: Make sure Supabase credentials are set
4. **Check database connection**: Verify Supabase is accessible

The CSP warning can be completely ignored - it's just Chrome being Chrome! 🎉
