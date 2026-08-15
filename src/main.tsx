import React from 'react'
import ReactDOM from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { ToastProvider } from './components/Toast'
import App from './App.tsx'
import './index.css'

declare global {
  interface Window {
    __DEBUG_LOGS__?: { type: string; message: string; stack?: string; timestamp: string }[]
  }
}

// Take over scroll restoration from the browser so back-navigation lands at the
// top of the page (Layout scrolls to top on route change) instead of the
// browser restoring the previous scroll position. The Shop opts back in by
// explicitly restoring position when returning from an external product page.
if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

// Initialize debug log storage if not exists
if (typeof window !== 'undefined') {
  const win = window as Window;
  win.__DEBUG_LOGS__ = win.__DEBUG_LOGS__ || [];

  const addDebugLog = (type: string, message: string, stack?: string) => {
    win.__DEBUG_LOGS__!.push({
      type,
      message,
      stack,
      timestamp: new Date().toISOString()
    });
    if (win.__DEBUG_LOGS__!.length > 200) {
      win.__DEBUG_LOGS__!.shift();
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
console.error = function (...args: any[]) {
  // Temporarily show all errors for debugging
  originalConsoleError.apply(console, args);
};

// Suppress 403/406 console warnings from Supabase subscription queries
const originalConsoleWarn = console.warn;
console.warn = function (...args: any[]) {
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
    // Log suppressed warnings for debugging
    console.log('[DEBUG_SUPPRESSED_WARN]', ...args);
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
    console.log('[DEBUG_SUPPRESSED_ERROR]', errorMsg);
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
    console.log('[DEBUG_SUPPRESSED_REJECTION]', reason);
    return;
  }
  // Log other rejections
  originalConsoleError('Unhandled rejection:', event.reason);
});

const rootElement = document.getElementById('root')
if (!rootElement) {
  console.error('Root element not found – skipping React mount. Refresh the page to recover.')
} else {
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

    // Hide the pre-render once the app has actually PAINTED, not merely mounted.
    //
    // Mount fires before any data arrives, so hiding there left a crawler
    // looking at a loading spinner where the real content used to be — the
    // gallery pages were reporting Soft 404 in Search Console for exactly this.
    // The pre-render lives outside #root (see index.html) so React no longer
    // destroys it, and it stays on screen until there is something to replace it.
    hidePreRenderWhenPainted()
    watchShellHeadTags()
  } catch (error) {
    console.error('❌ React mount failed:', error)
    rootElement.innerHTML = `
      <div style="color: red; padding: 20px;">
        <h1>React Mount Failed</h1>
        <pre>${error}</pre>
      </div>
    `
  }
}

/**
 * Keep the pre-rendered content visible until the app paints something real.
 *
 * "Real" is deliberately crude — enough text in #root that a crawler snapshot
 * would carry meaning. A spinner or an empty shell does not clear the bar, so
 * a slow or failed data fetch leaves the pre-rendered content in place rather
 * than replacing it with nothing.
 *
 * The timeout is the safety valve in the other direction: whatever happens, a
 * human never ends up looking at both at once for more than a moment.
 */
function hidePreRenderWhenPainted() {
  const preRender = document.getElementById('pre-render')
  const root = document.getElementById('root')
  if (!preRender || !root) return

  // Remove rather than hide. Every pre-render carries its own <h1> (see
  // scripts/pre-render-core-pages.ts), and display:none leaves that heading in
  // the DOM, so a rendering crawler counted two H1s on every URL on the site and
  // read the shell's copy alongside the real page's. Once the app has painted,
  // the shell has done its whole job — the snapshot should not still contain it.
  const dispose = () => { preRender.remove() }
  const painted = () => (root.textContent || '').trim().length > 120

  if (painted()) { dispose(); return }

  const observer = new MutationObserver(() => {
    if (!painted()) return
    observer.disconnect()
    clearTimeout(fallback)
    dispose()
  })
  observer.observe(root, { childList: true, subtree: true, characterData: true })

  const fallback = setTimeout(() => { observer.disconnect(); dispose() }, 8000)
}

/**
 * Drop the shell's head tags once Helmet has restated them.
 *
 * The static shell (index.html, or the pre-render/404 variants built from it)
 * ships its own canonical, description and robots tags. react-helmet-async only
 * manages the tags it created — marked data-rh — so it appends alongside the
 * shell's rather than replacing them, and every page ended up serving two
 * canonicals and two descriptions.
 *
 * Where the two disagree it is worse than untidy. The catch-all rewrite serves
 * dist/404.html, whose `noindex, nofollow` is baked into the markup; a page that
 * declared `index,follow` through Helmet ended up carrying both, and a crawler
 * resolving conflicting robots directives takes the most restrictive one. /demos
 * asked to be indexed and was telling Google the opposite.
 *
 * A shell tag is removed only once Helmet has supplied a replacement of the same
 * kind, so a page that never renders keeps whatever the shell gave it. Helmet
 * commits its tags in an effect, after the first DOM write, so this watches the
 * head rather than running once — and it keeps watching, because client-side
 * navigation swaps these tags on every route change.
 */
function dropShellHeadTagsHelmetReplaced() {
  // Declared in the function body, not at module scope: this runs during mount,
  // which is above these definitions in the file, so a module-level const would
  // still be in its temporal dead zone and throw.
  const selectors = [
    'link[rel="canonical"]',
    'meta[name="description"]',
    'meta[name="robots"]',
    'meta[property="og:url"]',
  ]

  for (const selector of selectors) {
    const tags = [...document.querySelectorAll(selector)]
    if (!tags.some((tag) => tag.hasAttribute('data-rh'))) continue
    tags.filter((tag) => !tag.hasAttribute('data-rh')).forEach((tag) => tag.remove())
  }
}

function watchShellHeadTags() {
  dropShellHeadTagsHelmetReplaced()

  // Removing a tag re-enters this callback, but by then the duplicate is gone
  // and the pass is a no-op, so it settles rather than looping.
  new MutationObserver(dropShellHeadTagsHelmetReplaced)
    .observe(document.head, { childList: true })
}
