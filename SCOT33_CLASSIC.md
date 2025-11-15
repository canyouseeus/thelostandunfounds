# SCOT33 CLASSIC

## Version Information
- **Version Name**: SCOT33 CLASSIC
- **Package Version**: 1.0.0-classic
- **Build Date**: November 2024

## Features

### Automated Error Monitoring & Debugging
SCOT33 CLASSIC includes a comprehensive error monitoring system that:
- Automatically monitors console errors in real-time
- Attempts to auto-fix common errors
- Falls back to known good version after 5 consecutive errors
- Logs all errors for debugging

### Error Auto-Fix Rules
1. **Missing Supabase Credentials** - Reloads page after checking env vars
2. **Network Errors** - Checks online status and reloads if online
3. **Code Chunk Failures** - Clears cache and reloads
4. **Module Not Found** - Reloads page
5. **Syntax Errors** - Flags for manual intervention

### Fallback Behavior
When too many errors occur, SCOT33 CLASSIC automatically:
- Clears all browser caches
- Reloads to the known good version (or homepage)
- Logs the fallback action for debugging

## Usage

### Access Error Monitor (Browser Console)
```javascript
// Get error logs
window.errorMonitor.getLogs()

// Get recent errors (last 5 minutes)
window.errorMonitor.getRecent(5)

// Set known good version
window.errorMonitor.setKnownGood(window.location.href)

// Clear logs
window.errorMonitor.clear()
```

## Configuration

The error monitor is automatically initialized when the app loads. It stores the current URL as the "known good version" on initialization.

## Related Files
- `src/services/error-monitor.ts` - Main error monitoring service
- `src/components/ErrorBoundary.tsx` - React error boundary
- `src/main.tsx` - Initialization point

## Notes
- Error monitor runs before any other code
- Suppresses expected errors (403/406 from Supabase subscription tables)
- Checks for errors every 5 seconds
- Maximum 100 error logs stored

