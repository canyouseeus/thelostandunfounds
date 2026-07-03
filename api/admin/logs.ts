import type { VercelRequest, VercelResponse } from '@vercel/node';

const ADMIN_EMAILS = ['thelostandunfounds@gmail.com', 'admin@thelostandunfounds.com'];

function isAdmin(req: VercelRequest): boolean {
  const email = (req.headers['x-admin-email'] as string || '').toLowerCase();
  if (ADMIN_EMAILS.includes(email)) return true;
  const host = req.headers.host || '';
  return host.includes('localhost') || host.includes('127.0.0.1');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Email');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin access required' });

  const token = process.env.VERCEL_ACCESS_TOKEN;
  if (!token) {
    return res.status(200).json({
      lines: [],
      error: 'VERCEL_ACCESS_TOKEN not set — add it to Vercel env vars to enable server log fetching'
    });
  }

  const teamId = 'team_mb29bMintz7Ffd29VRICdhGx';
  const projectId = 'thelostandunfounds';
  const since = req.query.since ? Number(req.query.since) : Date.now() - 30 * 60 * 1000;

  try {
    // Fetch runtime logs via Vercel REST API
    const url = new URL(`https://api.vercel.com/v1/projects/${projectId}/runtime-logs`);
    url.searchParams.set('teamId', teamId);
    url.searchParams.set('since', String(since));
    url.searchParams.set('limit', '100');
    url.searchParams.set('source', 'serverless');

    const r = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!r.ok) {
      const text = await r.text();
      return res.status(200).json({ lines: [], error: `Vercel API ${r.status}: ${text.slice(0, 300)}` });
    }

    const data = await r.json();
    // Normalize — Vercel returns either { logs: [...] } or an array
    const raw: any[] = Array.isArray(data) ? data : (data.logs || data.data || []);

    const lines: string[] = raw.map((entry: any) => {
      const ts = entry.date ? new Date(entry.date).toISOString() : '';
      const level = entry.level || entry.type || 'info';
      const msg = entry.message || entry.text || JSON.stringify(entry);
      return `[${ts}] [${level.toUpperCase()}] ${msg}`;
    });

    return res.status(200).json({ lines });
  } catch (err: any) {
    return res.status(200).json({ lines: [], error: err.message });
  }
}
