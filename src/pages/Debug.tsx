/**
 * Debug Page - Shows console errors and warnings
 * Accessible at /debug
 */

import { useState, useEffect } from 'react';
import { AlertTriangle, X, RefreshCw, Trash2 } from 'lucide-react';

interface LogEntry {
  id: number;
  type: 'log' | 'error' | 'warn' | 'info';
  message: string;
  timestamp: Date;
  stack?: string;
}

declare global {
  interface Window {
    __DEBUG_LOGS__?: Array<{
      type: string;
      message: string;
      stack?: string;
      timestamp: string;
    }>;
  }
}

export default function Debug() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logId, setLogId] = useState(0);

  useEffect(() => {
    // Load existing logs from window storage (captured before React mounted)
    if (window.__DEBUG_LOGS__ && window.__DEBUG_LOGS__.length > 0) {
      const existingLogs: LogEntry[] = window.__DEBUG_LOGS__.map((log, idx) => ({
        id: idx,
        type: log.type as LogEntry['type'],
        message: log.message,
        timestamp: new Date(log.timestamp),
        stack: log.stack,
      }));
      setLogs(existingLogs);
      setLogId(existingLogs.length);
    }

    // Capture console.log
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      originalLog.apply(console, args);
      addLog('log', args.join(' '));
    };

    // Capture console.error
    const originalError = console.error;
    console.error = (...args: any[]) => {
      originalError.apply(console, args);
      const message = args.map(arg => 
        arg instanceof Error ? arg.message : String(arg)
      ).join(' ');
      const stack = args.find(arg => arg instanceof Error)?.stack;
      addLog('error', message, stack);
    };

    // Capture console.warn
    const originalWarn = console.warn;
    console.warn = (...args: any[]) => {
      originalWarn.apply(console, args);
      addLog('warn', args.join(' '));
    };

    // Capture unhandled errors
    const handleError = (event: ErrorEvent) => {
      addLog('error', event.message || 'Unknown error', event.error?.stack);
    };

    // Capture unhandled promise rejections
    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason instanceof Error 
        ? event.reason.message 
        : String(event.reason);
      const stack = event.reason instanceof Error ? event.reason.stack : undefined;
      addLog('error', `Unhandled Promise Rejection: ${reason}`, stack);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    // Add initial log
    addLog('info', 'Debug page loaded - capturing console output');

    // Periodically sync with window storage
    const syncInterval = setInterval(() => {
      if (window.__DEBUG_LOGS__ && window.__DEBUG_LOGS__.length > logs.length) {
        const newLogs = window.__DEBUG_LOGS__.slice(logs.length).map((log, idx) => ({
          id: logId + idx,
          type: log.type as LogEntry['type'],
          message: log.message,
          timestamp: new Date(log.timestamp),
          stack: log.stack,
        }));
        setLogs(prev => [...prev, ...newLogs]);
        setLogId(prev => prev + newLogs.length);
      }
    }, 500);

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
      clearInterval(syncInterval);
    };
  }, [logs.length, logId]);

  const addLog = (type: LogEntry['type'], message: string, stack?: string) => {
    setLogs(prev => {
      const newLog: LogEntry = {
        id: logId,
        type,
        message,
        timestamp: new Date(),
        stack,
      };
      setLogId(prevId => prevId + 1);
      // Keep last 100 logs
      return [...prev.slice(-99), newLog];
    });
  };

  const clearLogs = () => {
    setLogs([]);
    setLogId(0);
  };

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'error':
        return 'text-red-400 border-red-500/50 bg-red-900/20';
      case 'warn':
        return 'text-yellow-400 border-yellow-500/50 bg-yellow-900/20';
      case 'info':
        return 'text-blue-400 border-blue-500/50 bg-blue-900/20';
      default:
        return 'text-white/70 border-white/10 bg-black/30';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-2">
            <AlertTriangle className="w-8 h-8 text-yellow-400" />
            Debug Console
          </h1>
          <p className="text-white/70">Real-time console error and log capture</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={clearLogs}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded text-white text-sm transition flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded text-white text-sm transition flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-black/50 border border-white/10 rounded-none p-4 mb-4">
        <div className="flex items-center gap-4 text-sm text-white/60">
          <span>Total Logs: {logs.length}</span>
          <span>Errors: {logs.filter(l => l.type === 'error').length}</span>
          <span>Warnings: {logs.filter(l => l.type === 'warn').length}</span>
        </div>
      </div>

      <div className="space-y-2 max-h-[70vh] overflow-y-auto">
        {logs.length === 0 ? (
          <div className="bg-black/50 border border-white/10 rounded-none p-8 text-center">
            <p className="text-white/60">No logs captured yet. Errors and console output will appear here.</p>
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className={`border rounded-none p-4 ${getLogColor(log.type)}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold uppercase">{log.type}</span>
                    <span className="text-xs opacity-60">
                      {log.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm font-mono break-words">{log.message}</p>
                  {log.stack && (
                    <details className="mt-2">
                      <summary className="text-xs cursor-pointer opacity-60">Stack Trace</summary>
                      <pre className="text-xs mt-2 overflow-auto bg-black/30 p-2 rounded">
                        {log.stack}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
