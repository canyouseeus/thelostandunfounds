import type { VercelRequest, VercelResponse } from '@vercel/node'

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(404).setHeader('Content-Type', 'text/html; charset=utf-8').end(
    '<!DOCTYPE html><html><head><title>404 Not Found</title>' +
    '<meta name="robots" content="noindex,nofollow"></head>' +
    '<body><h1>404 Not Found</h1></body></html>'
  )
}
