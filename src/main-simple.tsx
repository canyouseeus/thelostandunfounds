// Ultra-simple test to see if React works at all
import React from 'react'
import ReactDOM from 'react-dom/client'

console.log('🔍 SIMPLE TEST: Script is loading...');

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('❌ No root element!');
  document.body.innerHTML = '<h1 style="color: red;">ERROR: No root element found!</h1>';
} else {
  console.log('✅ Root element found');
  
  // Try rendering the simplest possible thing
  try {
    ReactDOM.createRoot(rootElement).render(
      <div style={{ color: 'white', padding: '20px', fontSize: '24px', backgroundColor: 'black' }}>
        <h1>TEST: React is working!</h1>
        <p>If you see this, React is rendering correctly.</p>
        <p>Time: {new Date().toLocaleTimeString()}</p>
      </div>
    );
    console.log('✅ Simple React render succeeded!');
  } catch (error) {
    console.error('❌ Simple React render failed:', error);
    rootElement.innerHTML = `
      <div style="color: red; padding: 20px;">
        <h1>React Render Error</h1>
        <pre>${error instanceof Error ? error.stack : String(error)}</pre>
      </div>
    `;
  }
}
