import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './components/Toast'
import { initializeMCPRegistry, initializeSkillsSystem } from './services/mcp-registry'
import App from './App.tsx'
import './index.css'

// Suppress 403/406 console errors from Supabase subscription queries
const originalConsoleError = console.error;
console.error = function(...args: any[]) {
  const message = args.join(' ').toLowerCase();
  // Suppress 403/406 errors related to subscription tables (expected if tables don't exist)
  if (
    message.includes('403') || 
    message.includes('406') || 
    message.includes('platform_subscriptions') ||
    message.includes('tool_limits') ||
    message.includes('tool_usage') ||
    message.includes('failed to load resource')
  ) {
    // Suppress these errors - they're expected if database tables don't exist
    return;
  }
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
    message.includes('tool_usage')
  ) {
    // Suppress these warnings - they're expected if database tables don't exist
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
    event.preventDefault();
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
    event.preventDefault();
    return;
  }
  // Log other rejections
  originalConsoleError('Unhandled rejection:', event.reason);
});

// Initialize MCP registry and skills system on startup (non-blocking)
initializeMCPRegistry()
  .then(async (mcpResult) => {
    // Initialize skills system after MCP registry is ready
    if (mcpResult.toolRegistry) {
      await initializeSkillsSystem(mcpResult.toolRegistry);
      if (import.meta.env.DEV) {
        console.log('✅ Skills system initialized');
      }
    }
  })
  .catch((error) => {
    // Silently handle MCP registry errors - it's optional
    if (import.meta.env.DEV) {
      console.warn('MCP registry initialization failed (this is optional):', error);
    }
  });

ReactDOM.createRoot(document.getElementById('root')!).render(
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
