// Proxy API route - forwards requests to Railway backend
export default async function handler(req, res) {
  const railwayUrl = 'https://tiktok-downloader-production-ab40.up.railway.app';
  
  // Extract the path from the request
  // For /api/tiktok/auth/me, pathSegments will be ['auth', 'me']
  const pathSegments = req.query.path || [];
  let path = '';
  
  if (Array.isArray(pathSegments)) {
    // Join all path segments and add /api prefix
    path = '/api/' + pathSegments.join('/');
  } else if (pathSegments) {
    path = '/api/' + pathSegments;
  } else {
    path = '/api';
  }
  
  // Handle query string
  const queryString = req.url.includes('?') ? '?' + req.url.split('?')[1] : '';
  const targetUrl = `${railwayUrl}${path}${queryString}`;

  try {
    // Forward the request to Railway
    // Set origin to thelostandunfounds.com so Railway CORS accepts it
    const origin = req.headers.origin || req.headers.referer || 'https://thelostandunfounds.com';
    const fetchOptions = {
      method: req.method,
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/json',
        'Cookie': req.headers.cookie || '',
        'Authorization': req.headers.authorization || '',
        'User-Agent': req.headers['user-agent'] || '',
        'Origin': origin.includes('thelostandunfounds.com') ? 'https://thelostandunfounds.com' : origin,
        'Referer': req.headers.referer || 'https://thelostandunfounds.com',
      },
    };

    // Add body for POST/PUT/PATCH requests
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, fetchOptions);
    const data = await response.text();
    
    // Forward response headers including CORS headers
    const headersToForward = ['content-type', 'set-cookie', 'cache-control', 'access-control-allow-origin', 'access-control-allow-credentials', 'access-control-allow-methods', 'access-control-allow-headers'];
    headersToForward.forEach(header => {
      const value = response.headers.get(header);
      if (value) {
        res.setHeader(header, value);
      }
    });

    // Set CORS headers if Railway didn't set them
    if (!response.headers.get('access-control-allow-origin')) {
      res.setHeader('Access-Control-Allow-Origin', origin.includes('thelostandunfounds.com') ? 'https://thelostandunfounds.com' : origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    res.status(response.status).send(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Proxy error', message: error.message });
  }
}

