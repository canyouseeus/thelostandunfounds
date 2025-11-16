# SCOT33 CLASSIC - Error Monitoring & Debugging System

## Version Information
- **Version Name**: SCOT33 CLASSIC
- **Package Version**: 1.0.0-classic
- **Build Date**: November 2024

## Overview

SCOT33 CLASSIC includes a comprehensive automated error monitoring and debugging system that:
- Monitors console errors in real-time
- Attempts to auto-fix common errors automatically
- Falls back to known good version after 5 consecutive errors
- Logs all errors for debugging
- Integrates with React ErrorBoundary for component-level error catching

## Features

### Automated Error Monitoring
- **Real-time Monitoring**: Intercepts all console errors and warnings
- **Unhandled Promise Rejections**: Catches async errors automatically
- **Error Logging**: Stores up to 100 error logs with timestamps and stack traces
- **Periodic Checks**: Monitors for errors every 5 seconds

### Error Auto-Fix Rules

The system automatically attempts to fix common errors:

1. **Missing Supabase Credentials** (Priority: 10)
   - Pattern: `/supabase.*credentials.*must.*be.*set/i`
   - Fix: Reloads page after checking environment variables

2. **Network Errors** (Priority: 8)
   - Pattern: `/failed to fetch|network error/i`
   - Fix: Checks online status and reloads if online

3. **Code Chunk Failures** (Priority: 9)
   - Pattern: `/chunk.*failed|loading chunk.*failed/i`
   - Fix: Clears cache and reloads

4. **Module Not Found** (Priority: 7)
   - Pattern: `/module.*not found|cannot find module/i`
   - Fix: Reloads page

5. **Syntax Errors** (Priority: 6)
   - Pattern: `/syntax error|unexpected token/i`
   - Fix: Flags for manual intervention

### Suppressed Errors

The following errors are automatically suppressed (not logged):
- 403/406 errors related to Supabase subscription tables
- Platform subscriptions, tool_limits, tool_usage errors
- "Failed to load resource" errors (expected in some cases)

### Fallback Behavior

After **5 consecutive unfixed errors**, the system automatically:
1. Clears all browser caches
2. Reloads to the known good version (or homepage if not set)
3. Logs the fallback action

## Usage

### Browser Console API

Access the error monitor directly from the browser console:

```javascript
// Get all error logs
window.errorMonitor.getLogs()

// Get recent errors (last N minutes)
window.errorMonitor.getRecent(5)

// Set known good version
window.errorMonitor.setKnownGood(window.location.href)

// Clear all logs
window.errorMonitor.clear()

// Get the monitor instance
window.errorMonitor.getInstance()
```

### Programmatic Usage

```typescript
import { getErrorMonitor, initializeErrorMonitor } from './services/error-monitor';

// Initialize (usually done in main.tsx)
initializeErrorMonitor();

// Get instance
const monitor = getErrorMonitor();
if (monitor) {
  // Report custom error
  monitor.reportError('error', 'Custom error message', errorObject);
  
  // Get logs
  const logs = monitor.getErrorLogs();
  const recent = monitor.getRecentErrors(5);
}
```

## Expected Console Messages

These are normal and not errors:
- `📦 All imports loaded successfully`
- `🚀 React is mounting...`
- `✅ React mounted successfully`
- `🎯 SCOT33 CLASSIC Error Monitor initialized`
- `[Vercel Web Analytics] Debug mode is enabled` (development only)

## Configuration

The error monitor is automatically initialized when the app loads (`src/main.tsx`). It stores the current URL as the "known good version" on initialization.

## Architecture

### Components

1. **ErrorMonitor Service** (`src/services/error-monitor.ts`)
   - Core error monitoring logic
   - Auto-fix rules engine
   - Error logging and storage

2. **ErrorBoundary Component** (`src/components/ErrorBoundary.tsx`)
   - React error boundary for component-level errors
   - Integrates with ErrorMonitor service
   - Displays user-friendly error UI

3. **Initialization** (`src/main.tsx`)
   - Initializes error monitor before React mounts
   - Ensures errors are caught from the start

## Related Files
- `src/services/error-monitor.ts` - Main error monitoring service
- `src/components/ErrorBoundary.tsx` - React error boundary component
- `src/main.tsx` - Initialization point
- `BUGS.md` - Bug tracking and resolution log

## Troubleshooting

### Error Monitor Not Working

1. Check browser console for initialization message
2. Verify `initializeErrorMonitor()` is called in `main.tsx`
3. Check for JavaScript errors preventing initialization

### Too Many Auto-Reloads

1. Check error logs: `window.errorMonitor.getLogs()`
2. Review suppressed error patterns
3. Adjust `MAX_CONSECUTIVE_ERRORS` if needed (default: 5)

### Errors Not Being Caught

1. Verify ErrorBoundary wraps your app components
2. Check that errors match auto-fix patterns
3. Review suppressed error patterns

## Notes
- Error monitor runs before any other code
- Maximum 100 error logs stored (oldest removed when limit reached)
- Checks for errors every 5 seconds
- Known good version defaults to current URL on initialization

