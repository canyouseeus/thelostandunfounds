/**
 * Global error + API call log for admin debug reports.
 * Captures window errors, unhandled rejections, and API calls automatically.
 */

export interface LogEntry {
  ts: string;
  type: 'error' | 'api' | 'warn';
  message: string;
}

const MAX = 40;
const entries: LogEntry[] = [];

function push(entry: LogEntry) {
  entries.unshift(entry);
  if (entries.length > MAX) entries.length = MAX;
}

export function logApiCall(method: string, url: string, status: number, detail: string) {
  push({ ts: new Date().toISOString(), type: status >= 400 ? 'error' : 'api', message: `${method} ${url} → ${status}\n${detail}` });
}

export function logError(msg: string) {
  push({ ts: new Date().toISOString(), type: 'error', message: msg });
}

export function getEntries(): LogEntry[] {
  return [...entries];
}

export function clearEntries() {
  entries.length = 0;
}

// Install global listeners once
let installed = false;
export function installGlobalListeners() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  window.addEventListener('error', (e) => {
    push({ ts: new Date().toISOString(), type: 'error', message: `${e.message}\n${e.filename}:${e.lineno}:${e.colno}` });
  });

  window.addEventListener('unhandledrejection', (e) => {
    const msg = e.reason instanceof Error ? `${e.reason.message}\n${e.reason.stack || ''}` : String(e.reason);
    push({ ts: new Date().toISOString(), type: 'error', message: msg });
  });
}
