import type { VercelRequest, VercelResponse } from '@vercel/node'

// Static imports ensure Vercel bundles these files correctly (mirrors the
// pattern already used by api/shop/[...path].ts, api/admin/[...path].ts, etc).
import searchHandler from '../../lib/api-handlers/photos/_search-handler.js'
import downloadHandler from '../../lib/api-handlers/photos/_download-handler.js'
import streamHandler from '../../lib/api-handlers/photos/_stream-handler.js'
import checkoutHandler from '../../lib/api-handlers/photos/_checkout-handler.js'
import freeCheckoutHandler from '../../lib/api-handlers/photos/_free-checkout-handler.js'
import resendOrderHandler from '../../lib/api-handlers/photos/_resend-order-handler.js'
import bulkTagHandler from '../../lib/api-handlers/photos/_bulk-tag-handler.js'
import { photoTagsHandler, removePhotoTagHandler } from '../../lib/api-handlers/photos/_photo-tags-handler.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const pathParam = req.query.path
  const segments = Array.isArray(pathParam) ? pathParam : pathParam ? [pathParam] : []
  const route = segments.join('/')
  console.log('[Photos Router DEBUG]', { url: req.url, query: req.query, pathParam, segments, route })

  switch (route) {
    case 'search':
      return searchHandler(req, res)
    case 'download':
      return downloadHandler(req, res)
    case 'stream':
      return streamHandler(req, res)
    case 'checkout':
      return checkoutHandler(req, res)
    case 'free-checkout':
      return freeCheckoutHandler(req, res)
    case 'resend-order':
      return resendOrderHandler(req, res)
    case 'bulk-tag':
      return bulkTagHandler(req, res)
  }

  // /:id/tags (GET list, POST add) and /:id/tags/:tagId (DELETE)
  if (segments.length === 2 && segments[1] === 'tags') {
    return photoTagsHandler(req, res, segments[0])
  }
  if (segments.length === 3 && segments[1] === 'tags') {
    return removePhotoTagHandler(req, res, segments[0], segments[2])
  }

  return res.status(404).json({ error: 'Not found' })
}
