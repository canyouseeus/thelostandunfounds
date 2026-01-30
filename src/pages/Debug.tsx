/**
 * Debug Page - Shows console errors and warnings
 * Accessible at /debug
 */

import { useState, useEffect } from 'react';
import { ExclamationTriangleIcon, XMarkIcon, ArrowPathIcon, TrashIcon } from '@heroicons/react/24/outline';

interface LogEntry {
  id: number;
  type: 'log' | 'error' | 'warn' | 'info';
  message: string;
  timestamp: Date;
  stack?: string;
  details?: string;
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

    // Capture console.error with full details
    const originalError = console.error;
    console.error = (...args: any[]) => {
      originalError.apply(console, args);
      // Capture full error details
      const errorDetails = args.map(arg => {
        if (arg instanceof Error) {
          return {
            message: arg.message,
            stack: arg.stack,
            name: arg.name,
            full: JSON.stringify(arg, Object.getOwnPropertyNames(arg), 2)
          };
        } else if (typeof arg === 'object') {
          return JSON.stringify(arg, null, 2);
        }
        return String(arg);
      });
      const message = errorDetails.map(d => typeof d === 'string' ? d : d.message || JSON.stringify(d)).join(' ');
      const stack = args.find(arg => arg instanceof Error)?.stack ||
        (errorDetails.find(d => typeof d !== 'string' && d.stack) as any)?.stack;
      const fullDetails = errorDetails.length > 1 ? JSON.stringify(errorDetails, null, 2) : undefined;
      addLog('error', message, stack || fullDetails);
    };

    // Capture console.warn
    const originalWarn = console.warn;
    console.warn = (...args: any[]) => {
      originalWarn.apply(console, args);
      addLog('warn', args.join(' '));
    };

    // Capture unhandled errors with full details
    const handleError = (event: ErrorEvent) => {
      const errorDetails = {
        message: event.message || 'Unknown error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error ? {
          message: event.error.message,
          stack: event.error.stack,
          name: event.error.name,
          ...(event.error as any)
        } : null
      };
      addLog('error',
        `Unhandled Error: ${errorDetails.message} (${errorDetails.filename}:${errorDetails.lineno}:${errorDetails.colno})`,
        errorDetails.error?.stack || JSON.stringify(errorDetails, null, 2)
      );
    };

    // Capture unhandled promise rejections with full details
    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason instanceof Error
        ? {
          message: event.reason.message,
          stack: event.reason.stack,
          name: event.reason.name,
          ...(event.reason as any)
        }
        : event.reason;
      const reasonStr = typeof reason === 'object'
        ? JSON.stringify(reason, null, 2)
        : String(reason);
      addLog('error', `Unhandled Promise Rejection: ${reasonStr}`,
        event.reason instanceof Error ? event.reason.stack : undefined
      );
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

  const addLog = (type: LogEntry['type'], message: string, stack?: string, details?: string) => {
    setLogs(prev => {
      const newLog: LogEntry = {
        id: logId,
        type,
        message,
        timestamp: new Date(),
        stack,
        details,
      };
      setLogId(prevId => prevId + 1);
      // Keep last 200 logs for better debugging
      return [...prev.slice(-199), newLog];
    });
  };

  const clearLogs = () => {
    setLogs([]);
    setLogId(0);
  };

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'error':
        return 'text-red-400 border-white bg-red-900/20';
      case 'warn':
        return 'text-yellow-400 border-white bg-yellow-900/20';
      case 'info':
        return 'text-blue-400 border-white bg-blue-900/20';
      default:
        return 'text-white/70 border-white bg-black/30';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-2">
            <ExclamationTriangleIcon className="w-8 h-8 text-yellow-400" />
            Debug Console
          </h1>
          <p className="text-white/70">Real-time console error and log capture</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={clearLogs}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded text-white text-sm transition flex items-center gap-2"
          >
            <TrashIcon className="w-4 h-4" />
            Clear
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded text-white text-sm transition flex items-center gap-2"
          >
            <ArrowPathIcon className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-black/50 border border-white rounded-none p-4 mb-4">
        <div className="flex items-center gap-4 text-sm text-white/60">
          <span>Total Logs: {logs.length}</span>
          <span>Errors: {logs.filter(l => l.type === 'error').length}</span>
          <span>Warnings: {logs.filter(l => l.type === 'warn').length}</span>
        </div>
      </div>

      <div className="space-y-2 max-h-[70vh] overflow-y-auto">
        {logs.length === 0 ? (
          <div className="bg-black/50 border border-white rounded-none p-8 text-center">
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
                  <p className="text-sm font-mono break-words whitespace-pre-wrap">{log.message}</p>
                  {(log.stack || log.details) && (
                    <details className="mt-2">
                      <summary className="text-xs cursor-pointer opacity-60 hover:opacity-100">
                        {log.stack ? 'Stack Trace' : 'Details'}
                      </summary>
                      <pre className="text-xs mt-2 overflow-auto bg-black/30 p-2 rounded text-left whitespace-pre-wrap">
                        {log.stack || log.details}
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
