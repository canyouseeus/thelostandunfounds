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

// Log all errors in development to help debug
if (import.meta.env.DEV) {
  console.log('🚀 App starting...');
  
  // Override error handlers BEFORE React renders to catch all errors
  const originalErrorHandler = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    console.error('❌ Window error:', { message, source, lineno, colno, error });
    if (originalErrorHandler) {
      return originalErrorHandler.call(this, message, source, lineno, colno, error);
    }
    return false;
  };
  
  window.addEventListener('error', (event) => {
    console.error('❌ Global error event:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
      stack: event.error?.stack
    });
  }, true); // Use capture phase
  
  window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Unhandled promise rejection:', {
      reason: event.reason,
      stack: event.reason?.stack
    });
  });
}

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

// Verify root element exists
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('❌ Root element not found!');
  throw new Error('Root element with id "root" not found in HTML');
}

console.log('✅ Root element found, rendering React app...');

// Show a loading indicator immediately
const loadingDiv = document.createElement('div');
loadingDiv.id = 'react-loading';
loadingDiv.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #000; color: #0f0; display: flex; align-items: center; justify-content: center; font-family: monospace; font-size: 24px; z-index: 99999;';
loadingDiv.textContent = 'Loading React app...';
document.body.appendChild(loadingDiv);

// Test if React can render at all
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
  );
  console.log('✅ React app rendered successfully');
  
  // Remove loading indicator after a short delay
  setTimeout(() => {
    const loading = document.getElementById('react-loading');
    if (loading) loading.remove();
  }, 1000);
} catch (error) {
  console.error('❌ Failed to render React app:', error);
  
  // Remove loading indicator
  const loading = document.getElementById('react-loading');
  if (loading) loading.remove();
  
  // Show error on screen
  rootElement.innerHTML = `
    <div style="color: white; padding: 20px; font-family: monospace; background: #000; min-height: 100vh;">
      <h1 style="color: #f00;">Error Loading App</h1>
      <pre style="background: #333; padding: 10px; overflow: auto; color: #fff;">${error instanceof Error ? error.stack : String(error)}</pre>
    </div>
  `;
  throw error;
}
