import React from 'react'
import ReactDOM from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { ToastProvider } from './components/Toast'
import App from './App.tsx'
import './index.css'

// Initialize debug log storage if not exists
if (typeof window !== 'undefined') {
  window.__DEBUG_LOGS__ = window.__DEBUG_LOGS__ || [];
  
  const addDebugLog = (type: string, message: string, stack?: string) => {
    window.__DEBUG_LOGS__.push({
      type,
      message,
      stack,
      timestamp: new Date().toISOString()
    });
    if (window.__DEBUG_LOGS__.length > 200) {
      window.__DEBUG_LOGS__.shift();
    }
  };

  // Override console methods to capture logs
  const originalLog = console.log;
  console.log = (...args: any[]) => {
    originalLog.apply(console, args);
    addDebugLog('log', args.map(a => String(a)).join(' '));
  };

  const originalError = console.error;
  console.error = (...args: any[]) => {
    originalError.apply(console, args);
    const message = args.map(arg => 
      arg instanceof Error ? arg.message : String(arg)
    ).join(' ');
    const stack = args.find(arg => arg instanceof Error)?.stack;
    addDebugLog('error', message, stack);
  };

  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    originalWarn.apply(console, args);
    addDebugLog('warn', args.map(a => String(a)).join(' '));
  };
}

console.log('📦 All imports loaded successfully')

// Skip error monitor for now to isolate issue
// try {
//   initializeErrorMonitor();
// } catch (error) {
//   console.error('Error monitor init failed:', error);
// }

// Temporarily disable error suppression to debug blank page
// TODO: Re-enable after fixing the issue
const originalConsoleError = console.error;
console.error = function(...args: any[]) {
  // Temporarily show all errors for debugging
  originalConsoleError.apply(console, args);
};

// Suppress 403/406 console warnings from Supabase subscription queries
const originalConsoleWarn = console.warn;
console.warn = function(...args: any[]) {
  const message = args.join(' ').toLowerCase();
  // Suppress 403/406 warnings related to subscription tables
  if (
    message.includes('403') || 
    message.includes('406') || 
    message.includes('platform_subscriptions') ||
    message.includes('tool_limits') ||
    message.includes('tool_usage') ||
    message.includes('mcp registry tools not available') // Suppress MCP fallback warning
  ) {
    // Suppress these warnings - they're expected if database tables don't exist or MCP tools unavailable
    return;
  }
  originalConsoleWarn.apply(console, args);
};

// Global error handler - suppress 403/406 errors from Supabase subscription queries
window.addEventListener('error', (event) => {
  const errorMsg = event.message?.toLowerCase() || '';
  // Suppress 403/406 errors related to subscription tables (expected if tables don't exist)
  if (
    errorMsg.includes('403') || 
    errorMsg.includes('406') || 
    errorMsg.includes('platform_subscriptions') ||
    errorMsg.includes('tool_limits') ||
    errorMsg.includes('tool_usage')
  ) {
    return;
  }
  // Log other errors
  originalConsoleError('Error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason?.toString()?.toLowerCase() || '';
  // Suppress 403/406 errors related to subscription tables (expected if tables don't exist)
  if (
    reason.includes('403') || 
    reason.includes('406') || 
    reason.includes('platform_subscriptions') ||
    reason.includes('tool_limits') ||
    reason.includes('tool_usage')
  ) {
    return;
  }
  // Log other rejections
  originalConsoleError('Unhandled rejection:', event.reason);
});

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found!')
}

console.log('🚀 React is mounting...', { rootElement })

try {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <HelmetProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </HelmetProvider>
    </React.StrictMode>,
  )
  console.log('✅ React mounted successfully')
  
  // Hide pre-render content when React mounts
  const preRender = document.getElementById('pre-render')
  if (preRender) {
    preRender.style.display = 'none'
  }
} catch (error) {
  console.error('❌ React mount failed:', error)
  rootElement.innerHTML = `
    <div style="color: red; padding: 20px;">
      <h1>React Mount Failed</h1>
      <pre>${error}</pre>
    </div>
  `
}
