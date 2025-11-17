# Debugging Guide

This guide consolidates all debugging information for thelostandunfounds.com.

## Table of Contents

1. [Error Monitoring System](#error-monitoring-system)
2. [Common Errors & Solutions](#common-errors--solutions)
3. [Browser Console Debugging](#browser-console-debugging)
4. [Email Debugging](#email-debugging)
5. [Database Debugging](#database-debugging)
6. [OAuth Debugging](#oauth-debugging)

---

## Error Monitoring System

The application includes an automated error monitoring system. See [SCOT33_CLASSIC.md](./SCOT33_CLASSIC.md) for complete documentation.

### Quick Access

```javascript
// In browser console
window.errorMonitor.getLogs()        // Get all error logs
window.errorMonitor.getRecent(5)     // Get recent errors (last 5 minutes)
window.errorMonitor.clear()          // Clear logs
```

### Key Features

- ✅ Automatic error detection and logging
- ✅ Auto-fix for common errors
- ✅ Fallback to known good version after 5 consecutive errors
- ✅ Integration with React ErrorBoundary

---

## Common Errors & Solutions

### Console Errors

#### "Failed to load resource" (403/406)

**Common Causes:**
- Supabase RLS policies blocking access
- Missing environment variables
- OAuth configuration issues

**Solutions:**
1. Check Supabase RLS policies
2. Verify environment variables are set
3. See [OAuth Debugging](#oauth-debugging) section

#### "Module not found" or "Cannot find module"

**Solution:**
- Clear browser cache
- Restart dev server
- Check import paths

#### Network Errors

**Solution:**
- Check internet connection
- Verify API endpoints are accessible
- Check CORS configuration

### React Errors

#### Component Errors

React errors are caught by `ErrorBoundary` component and displayed with a user-friendly UI. Check browser console for detailed stack traces.

#### Mount Errors

If React fails to mount, check:
1. Root element exists in `index.html`
2. No JavaScript syntax errors
3. All dependencies are installed

---

## Browser Console Debugging

### Expected Console Messages

These are **normal** and not errors:
- `📦 All imports loaded successfully`
- `🚀 React is mounting...`
- `✅ React mounted successfully`
- `🎯 SCOT33 CLASSIC Error Monitor initialized`
- `[Vercel Web Analytics] Debug mode is enabled` (development only)

### Suppressed Errors

These errors are automatically suppressed:
- 403/406 errors from Supabase subscription tables (`platform_subscriptions`, `tool_limits`, `tool_usage`)
- "Failed to load resource" errors (expected in some cases)

### Debugging Steps

1. **Open Browser DevTools** (F12)
2. **Check Console Tab** for errors
3. **Check Network Tab** for failed requests
4. **Use Error Monitor API**:
   ```javascript
   window.errorMonitor.getLogs()
   ```

---

## Email Debugging

See [CHECK_EMAIL_ERRORS.md](./CHECK_EMAIL_ERRORS.md) for detailed email debugging guide.

### Quick Checks

1. **Vercel Function Logs**
   - Go to Vercel Dashboard → Functions → `api/newsletter-subscribe` → Logs
   - Look for: "Failed to send confirmation email", "Zoho token refresh failed"

2. **Test Email Configuration**
   - Visit: `https://www.thelostandunfounds.com/api/test-email-config?token=reset-newsletter-2024`
   - Shows Zoho credentials status

3. **Browser Network Tab**
   - Check `newsletter-subscribe` request response
   - Look for `warning` field in response

### Common Issues

- **Missing Zoho credentials** → Check Vercel Environment Variables
- **Expired refresh token** → Regenerate Zoho refresh token
- **Wrong account ID** → Check Zoho API response format

---

## Database Debugging

### Supabase Connection Issues

**Check Environment Variables:**
```bash
# Local development
cat .env.local | grep SUPABASE

# Should have:
# VITE_SUPABASE_URL=...
# VITE_SUPABASE_ANON_KEY=...
```

**Verify Connection:**
```typescript
import { supabase } from './lib/supabase';
const { data, error } = await supabase.from('users').select('count');
console.log('Connection test:', { data, error });
```

### RLS Policy Issues

**Check RLS Policies:**
- Go to Supabase Dashboard → Authentication → Policies
- Verify policies are active
- Check if `is_user_admin()` function exists

**Common RLS Errors:**
- 403 Forbidden → RLS policy blocking access
- 500 Internal Server Error → RLS circular dependency (see BUGS.md)

### Database Schema Issues

**Check Tables Exist:**
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

**Check RLS Status:**
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

---

## OAuth Debugging

### Google OAuth 403 Errors

**Most Common Fix:** Publish OAuth Consent Screen

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials/consent)
2. Check if status is "Testing" → **Click "PUBLISH APP"**
3. Wait 2-5 minutes for changes to propagate

**Verify Configuration:**

1. **Google Cloud Console:**
   - Redirect URI: `https://nonaqhllakrckbtbawrb.supabase.co/auth/v1/callback`
   - OAuth consent screen: **Published** (not Testing)

2. **Supabase Dashboard:**
   - Settings → Authentication → URL Configuration
   - Site URL: `http://localhost:3000` (dev) or production URL
   - Redirect URLs: Include `http://localhost:3000/**` and callback URL

3. **Supabase Google Provider:**
   - Authentication → Providers → Google
   - Enabled: ON
   - Client ID/Secret match Google Cloud Console

**See Also:** [QUICK_FIX_403_ERROR.md](./QUICK_FIX_403_ERROR.md) for detailed steps

### OAuth Redirect Errors

**Error:** "redirect_uri_mismatch"

**Solution:**
1. Add exact redirect URI to Google Cloud Console
2. Verify Supabase redirect URLs match
3. No trailing slashes in URIs

---

## Bug Tracking

All bugs are tracked in [BUGS.md](./BUGS.md). When fixing bugs:

1. Add bug entry to BUGS.md
2. Include: description, symptoms, root cause, solution
3. Update status: 🐛 OPEN → 🔧 IN PROGRESS → ✅ FIXED

---

## Getting Help

### Check These First

1. ✅ Browser console for errors
2. ✅ Error monitor logs: `window.errorMonitor.getLogs()`
3. ✅ BUGS.md for known issues
4. ✅ Environment variables are set
5. ✅ Supabase connection is working

### Resources

- [SCOT33_CLASSIC.md](./SCOT33_CLASSIC.md) - Error monitoring system docs
- [BUGS.md](./BUGS.md) - Bug tracker
- [CHECK_EMAIL_ERRORS.md](./CHECK_EMAIL_ERRORS.md) - Email debugging
- [QUICK_FIX_403_ERROR.md](./QUICK_FIX_403_ERROR.md) - OAuth 403 fixes

---

## Related Files

- `src/services/error-monitor.ts` - Error monitoring service
- `src/components/ErrorBoundary.tsx` - React error boundary
- `src/main.tsx` - Error monitor initialization
- `BUGS.md` - Bug tracking log




