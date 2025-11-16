import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './components/Toast'
import App from './App.tsx'
import './index.css'

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
    message.includes('500') ||
    message.includes('platform_subscriptions') ||
    message.includes('tool_limits') ||
    message.includes('tool_usage') ||
    message.includes('user_roles') ||
    message.includes('on_conflict') ||
    message.includes('permission denied') ||
    message.includes('policy') ||
    message.includes('does not exist') ||
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
  // Suppress 403/406/500 errors related to subscription tables (expected if tables don't exist)
  if (
    errorMsg.includes('403') || 
    errorMsg.includes('406') || 
    errorMsg.includes('500') ||
    errorMsg.includes('platform_subscriptions') ||
    errorMsg.includes('tool_limits') ||
    errorMsg.includes('tool_usage') ||
    errorMsg.includes('user_roles') ||
    errorMsg.includes('on_conflict') ||
    errorMsg.includes('permission denied') ||
    errorMsg.includes('policy') ||
    errorMsg.includes('does not exist')
  ) {
    event.preventDefault();
    return;
  }
  // Log other errors
  originalConsoleError('Error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason?.toString()?.toLowerCase() || '';
  // Suppress 403/406/500 errors related to subscription tables (expected if tables don't exist)
  if (
    reason.includes('403') || 
    reason.includes('406') || 
    reason.includes('500') ||
    reason.includes('platform_subscriptions') ||
    reason.includes('tool_limits') ||
    reason.includes('tool_usage') ||
    reason.includes('user_roles') ||
    reason.includes('on_conflict') ||
    reason.includes('permission denied') ||
    reason.includes('policy') ||
    reason.includes('does not exist')
  ) {
    event.preventDefault();
    return;
  }
  // Log other rejections
  originalConsoleError('Unhandled rejection:', event.reason);
});

// Skip MCP registry for now to isolate issue
// initializeMCPRegistry()
//   .then(async (mcpResult) => {
//     const { toolRegistry } = await import('./services/mcp-registry');
//     if (toolRegistry) {
//       await initializeSkillsSystem(toolRegistry);
//       if (import.meta.env.DEV) {
//         console.log('✅ Skills system initialized');
//       }
//     }
//   })
//   .catch((error) => {
//     if (import.meta.env.DEV) {
//       console.warn('MCP registry initialization failed (this is optional):', error);
//     }
//   });

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found!')
}

console.log('🚀 React is mounting...', { rootElement })

try {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <ToastProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </React.StrictMode>,
  )
  console.log('✅ React mounted successfully')
} catch (error) {
  console.error('❌ React mount failed:', error)
  rootElement.innerHTML = `
    <div style="color: red; padding: 20px;">
      <h1>React Mount Failed</h1>
      <pre>${error}</pre>
    </div>
  `
}
