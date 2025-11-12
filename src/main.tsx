import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './components/Toast'
import { initializeMCPRegistry, initializeSkillsSystem } from './services/mcp-registry'
import App from './App.tsx'
import './index.css'

// Suppress 403/406 console errors from Supabase subscription queries
// Only suppress in production, show all errors in development
const originalConsoleError = console.error;
if (import.meta.env.PROD) {
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
}

// Suppress 403/406 console warnings from Supabase subscription queries
// Only suppress in production, show all warnings in development
const originalConsoleWarn = console.warn;
if (import.meta.env.PROD) {
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
}

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

// Debug: Check if root element exists
console.log('🔍 Starting React app initialization...');
console.log('🔍 Document ready state:', document.readyState);
console.log('🔍 Window loaded:', typeof window !== 'undefined');

// Wait for DOM to be ready
function initApp() {
  const rootElement = document.getElementById('root');
  console.log('🔍 Root element:', rootElement);

  if (!rootElement) {
    console.error('❌ Root element not found!');
    document.body.innerHTML = '<div style="color: red; padding: 20px; font-size: 20px; background: white; z-index: 99999; position: fixed; top: 0; left: 0; right: 0; bottom: 0;">ERROR: Root element not found!</div>';
    return;
  }

  console.log('✅ Root element found, rendering React app...');
  
  try {
    const root = ReactDOM.createRoot(rootElement);
    console.log('✅ React root created');
    
    root.render(
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
  } catch (error) {
    console.error('❌ Error rendering React app:', error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';
    
    // Show error message prominently
    rootElement.innerHTML = `
      <div style="color: red !important; padding: 40px !important; font-size: 24px !important; background: white !important; z-index: 99999 !important; position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; overflow: auto !important;">
        <h1 style="color: red !important; font-size: 32px !important;">React Rendering Error</h1>
        <p style="color: black !important; font-size: 18px !important;">Something went wrong loading the React app.</p>
        <pre style="background: #f0f0f0; padding: 20px; overflow: auto; font-size: 14px;">${errorMsg}</pre>
        <pre style="background: #f0f0f0; padding: 20px; overflow: auto; font-size: 12px; max-height: 400px;">${errorStack}</pre>
      </div>
    `;
  }
}

// Try to initialize immediately
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
