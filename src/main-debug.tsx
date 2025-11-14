// Debug version - no error suppression
import React from 'react'
import ReactDOM from 'react-dom/client'

console.log('🔍 DEBUG: Starting app...');

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('❌ No root element!');
  document.body.innerHTML = '<h1 style="color: red;">ERROR: No root element</h1>';
} else {
  console.log('✅ Root element found');
  
  try {
    // Render simplest possible React component
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <div style={{ color: 'white', padding: '20px', background: 'black', minHeight: '100vh' }}>
        <h1 style={{ color: 'lime' }}>✅ React is working!</h1>
        <p>If you see this, React rendered successfully.</p>
        <p>Time: {new Date().toLocaleTimeString()}</p>
      </div>
    );
    console.log('✅ React rendered successfully');
  } catch (error) {
    console.error('❌ React render failed:', error);
    rootElement.innerHTML = `
      <div style="color: red; padding: 20px; background: black;">
        <h1>React Error</h1>
        <pre style="color: white;">${error instanceof Error ? error.stack : String(error)}</pre>
      </div>
    `;
  }
}
