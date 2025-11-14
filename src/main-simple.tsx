// Ultra-simple test to see if React works at all
import React from 'react'
import ReactDOM from 'react-dom/client'

console.log('🔍 SIMPLE TEST: Script is loading...');

// Wait a bit for other scripts to run first
setTimeout(() => {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error('❌ No root element!');
    document.body.innerHTML = '<h1 style="color: red;">ERROR: No root element found!</h1>';
    return;
  }
  
  console.log('✅ Root element found, clearing and rendering React...');
  
  // Clear any existing content
  rootElement.innerHTML = '';
  
  // Try rendering the simplest possible thing
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <div style={{ color: 'white', padding: '20px', fontSize: '24px', backgroundColor: 'black', minHeight: '100vh' }}>
        <h1 style={{ color: 'lime' }}>✅ TEST 3: React is working!</h1>
        <p>If you see this, React is rendering correctly.</p>
        <p>Time: {new Date().toLocaleTimeString()}</p>
        <div style={{ marginTop: '40px', padding: '20px', background: '#111', border: '2px solid lime' }}>
          <h2>Next Step:</h2>
          <p>React is working! Now we need to fix the main app.</p>
        </div>
      </div>
    );
    console.log('✅ Simple React render succeeded!');
  } catch (error) {
    console.error('❌ Simple React render failed:', error);
    rootElement.innerHTML = `
      <div style="color: red; padding: 20px; background: black;">
        <h1>React Render Error</h1>
        <pre style="color: white; background: #333; padding: 10px;">${error instanceof Error ? error.stack : String(error)}</pre>
      </div>
    `;
  }
}, 100);
