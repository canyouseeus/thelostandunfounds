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

// No error suppression - let all errors show so we can fix them properly

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
