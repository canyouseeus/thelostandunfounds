import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Reset scroll position on navigation.
 *
 * Layout already does this, but the standalone preview and demo routes
 * (/fadebox-preview, /kattitude-preview, /kiosk-demo, /demos) render outside
 * Layout, so they kept whatever scroll offset the previous page had. Sending a
 * client a demo link from a page they had scrolled down meant the demo opened
 * partway down — one landed on the Google reviews section instead of the top.
 *
 * Mounted once inside the router so it covers every route regardless of
 * whether that route uses Layout.
 *
 * An in-page anchor (#section) is left alone — that navigation is a request to
 * jump to a specific element, and forcing the top would break it.
 */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (hash) return
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname, hash])

  return null
}
