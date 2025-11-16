/**
 * Automated Error Monitoring and Debugging System
 * SCOT33 CLASSIC Version
 * 
 * Features:
 * - Monitors console errors automatically
 * - Attempts to auto-fix common errors
 * - Falls back to known good version (SCOT33 CLASSIC) if manual intervention needed
 */

interface ErrorLog {
  timestamp: number;
  message: string;
  stack?: string;
  source?: string;
  line?: number;
  column?: number;
  type: 'error' | 'warning' | 'unhandledrejection';
  fixed?: boolean;
  fixAttempted?: string;
}

interface AutoFixRule {
  pattern: RegExp;
  fix: (error: ErrorLog) => Promise<boolean> | boolean;
  description: string;
  priority: number; // Higher = more important
}

class ErrorMonitor {
  private errorLogs: ErrorLog[] = [];
  private maxLogs = 100;
  private knownGoodVersion: string | null = null;
  private consecutiveErrors = 0;
  private readonly MAX_CONSECUTIVE_ERRORS = 5;
  private readonly ERROR_CHECK_INTERVAL = 5000; // Check every 5 seconds
  private checkInterval: number | null = null;
  private originalConsoleError: typeof console.error;
  private originalConsoleWarn: typeof console.warn;
  private readonly VERSION = 'SCOT33 CLASSIC';

  private autoFixRules: AutoFixRule[] = [
    {
      pattern: /supabase.*credentials.*must.*be.*set/i,
      priority: 10,
      description: 'Missing Supabase credentials',
      fix: async (error) => {
        console.log('🔧 Auto-fix: Attempting to reload environment variables...');
        // Try to reload the page after a short delay to allow env vars to load
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
          console.error('❌ Auto-fix failed: Environment variables still missing');
          return false;
        }
        console.log('✅ Auto-fix: Environment variables detected, reloading...');
        window.location.reload();
        return true;
      }
    },
    {
      pattern: /failed to fetch|network error|networkerror/i,
      priority: 8,
      description: 'Network connectivity issue',
      fix: async (error) => {
        console.log('🔧 Auto-fix: Network error detected, retrying...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        // Check if we're online
        if (navigator.onLine) {
          console.log('✅ Auto-fix: Network is online, reloading...');
          window.location.reload();
          return true;
        }
        return false;
      }
    },
    {
      pattern: /chunk.*failed|loading chunk.*failed/i,
      priority: 9,
      description: 'Failed to load code chunk',
      fix: async (error) => {
        console.log('🔧 Auto-fix: Code chunk failed to load, clearing cache and reloading...');
        // Clear service worker cache if available
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
        }
        // Force reload with cache bypass
        window.location.reload();
        return true;
      }
    },
    {
      pattern: /module.*not found|cannot find module/i,
      priority: 7,
      description: 'Module not found',
      fix: async (error) => {
        console.log('🔧 Auto-fix: Module not found, reloading...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        window.location.reload();
        return true;
      }
    },
    {
      pattern: /syntax error|unexpected token/i,
      priority: 6,
      description: 'Syntax error',
      fix: async (error) => {
        // Syntax errors usually need manual intervention
        console.warn('⚠️ Syntax error detected - manual intervention may be required');
        return false;
      }
    }
  ];

  constructor() {
    this.originalConsoleError = console.error.bind(console);
    this.originalConsoleWarn = console.warn.bind(console);
    this.initialize();
    console.log(`🎯 ${this.VERSION} Error Monitor initialized`);
  }

  private initialize() {
    // Store current version as known good version
    this.knownGoodVersion = window.location.href;

    // Override console.error
    console.error = (...args: any[]) => {
      this.logError('error', args);
      this.originalConsoleError(...args);
    };

    // Override console.warn
    console.warn = (...args: any[]) => {
      this.logError('warning', args);
      this.originalConsoleWarn(...args);
    };

    // Global error handler
    window.addEventListener('error', (event) => {
      this.handleError({
        timestamp: Date.now(),
        message: event.message || 'Unknown error',
        stack: event.error?.stack,
        source: event.filename,
        line: event.lineno,
        column: event.colno,
        type: 'error'
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError({
        timestamp: Date.now(),
        message: event.reason?.toString() || 'Unhandled promise rejection',
        stack: event.reason?.stack,
        type: 'unhandledrejection'
      });
    });

    // Start periodic error check
    this.startPeriodicCheck();
  }

  private logError(type: 'error' | 'warning' | 'unhandledrejection', args: any[]) {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');

    const errorLog: ErrorLog = {
      timestamp: Date.now(),
      message,
      stack: args.find(arg => arg?.stack)?.stack,
      type
    };

    this.errorLogs.push(errorLog);
    if (this.errorLogs.length > this.maxLogs) {
      this.errorLogs.shift();
    }

    // Try to auto-fix
    this.attemptAutoFix(errorLog);
  }

  private async attemptAutoFix(errorLog: ErrorLog): Promise<boolean> {
    // Sort rules by priority (highest first)
    const sortedRules = [...this.autoFixRules].sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      if (rule.pattern.test(errorLog.message)) {
        console.log(`🔍 Auto-fix rule matched: ${rule.description}`);
        errorLog.fixAttempted = rule.description;
        
        try {
          const fixed = await rule.fix(errorLog);
          if (fixed) {
            errorLog.fixed = true;
            this.consecutiveErrors = 0;
            console.log(`✅ Auto-fix successful: ${rule.description}`);
            return true;
          }
        } catch (fixError) {
          console.error('Auto-fix attempt failed:', fixError);
        }
      }
    }

    // If no rule matched or fix failed, increment consecutive errors
    this.consecutiveErrors++;
    
    // If too many consecutive errors, fall back to known good version
    if (this.consecutiveErrors >= this.MAX_CONSECUTIVE_ERRORS) {
      console.error(`❌ Too many consecutive errors (${this.consecutiveErrors}), falling back to known good version`);
      this.fallbackToKnownGoodVersion();
      return false;
    }

    return false;
  }

  private handleError(errorLog: ErrorLog) {
    // Skip suppressed errors (403/406 from Supabase subscription tables)
    const suppressedPatterns = [
      /403|406|platform_subscriptions|tool_limits|tool_usage|failed to load resource/i
    ];
    
    if (suppressedPatterns.some(pattern => pattern.test(errorLog.message))) {
      return;
    }

    this.logError(errorLog.type, [errorLog.message]);
  }

  private startPeriodicCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = window.setInterval(() => {
      this.checkForErrors();
    }, this.ERROR_CHECK_INTERVAL);
  }

  private checkForErrors() {
    // Check if there are recent critical errors
    const recentErrors = this.errorLogs.filter(
      log => Date.now() - log.timestamp < 30000 && !log.fixed
    );

    if (recentErrors.length > 0) {
      console.warn(`⚠️ Detected ${recentErrors.length} recent unfixed errors`);
      
      // Try to fix them again
      recentErrors.forEach(error => {
        if (!error.fixed) {
          this.attemptAutoFix(error);
        }
      });
    }

    // Reset consecutive errors counter if no recent errors
    if (recentErrors.length === 0) {
      this.consecutiveErrors = Math.max(0, this.consecutiveErrors - 1);
    }
  }

  private fallbackToKnownGoodVersion() {
    console.error(`🚨 Falling back to ${this.VERSION} version due to repeated errors`);
    
    if (this.knownGoodVersion) {
      console.log(`📍 Reloading ${this.VERSION} version: ${this.knownGoodVersion}`);
      
      // Clear all caches
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => caches.delete(name));
        });
      }
      
      // Clear localStorage and sessionStorage (optional, be careful)
      // localStorage.clear();
      // sessionStorage.clear();
      
      // Reload to SCOT33 CLASSIC version
      setTimeout(() => {
        window.location.href = this.knownGoodVersion || window.location.origin;
      }, 1000);
    } else {
      // Fallback to homepage (SCOT33 CLASSIC)
      console.log(`📍 No known good version, reloading ${this.VERSION} homepage`);
      window.location.href = '/';
    }
  }

  public getErrorLogs(): ErrorLog[] {
    return [...this.errorLogs];
  }

  public getRecentErrors(minutes: number = 5): ErrorLog[] {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return this.errorLogs.filter(log => log.timestamp >= cutoff);
  }

  public clearLogs() {
    this.errorLogs = [];
    this.consecutiveErrors = 0;
  }

  public setKnownGoodVersion(url: string) {
    this.knownGoodVersion = url;
    console.log(`✅ Known good version set: ${url}`);
  }

  /**
   * Public method to report errors from external sources (e.g., ErrorBoundary)
   */
  public reportError(type: 'error' | 'warning' | 'unhandledrejection', ...args: any[]) {
    this.logError(type, args);
  }

  public destroy() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    console.error = this.originalConsoleError;
    console.warn = this.originalConsoleWarn;
  }
}

// Create singleton instance
let errorMonitorInstance: ErrorMonitor | null = null;

export function initializeErrorMonitor(): ErrorMonitor {
  if (!errorMonitorInstance) {
    errorMonitorInstance = new ErrorMonitor();
    console.log('✅ SCOT33 CLASSIC Error monitoring system initialized');
  }
  return errorMonitorInstance;
}

export function getErrorMonitor(): ErrorMonitor | null {
  return errorMonitorInstance;
}

// Export for debugging
if (typeof window !== 'undefined') {
  (window as any).errorMonitor = {
    getInstance: () => errorMonitorInstance,
    initialize: initializeErrorMonitor,
    getLogs: () => errorMonitorInstance?.getErrorLogs() || [],
    getRecent: (minutes?: number) => errorMonitorInstance?.getRecentErrors(minutes) || [],
    clear: () => errorMonitorInstance?.clearLogs(),
    setKnownGood: (url: string) => errorMonitorInstance?.setKnownGoodVersion(url)
  };
}

export default ErrorMonitor;

