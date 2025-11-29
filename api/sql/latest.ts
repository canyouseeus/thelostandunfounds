/**
 * Latest SQL File API
 * Returns the most recently modified SQL file from the public directory
 * Uses a manifest file generated at build time, or falls back to fetching files directly
 */

import { VercelRequest, VercelResponse } from '@vercel/node';

// List of known SQL files in the public directory (fallback if manifest doesn't exist)
const SQL_FILES = [
  '/blog-schema-migration.sql',
  '/create-first-blog-post.sql',
  '/sql/create-blog-post-all-for-a-dream.sql',
  '/sql/create-blog-post-artificial-intelligence-the-job-killer.sql',
  '/sql/create-blog-post-our-tech-stack.sql',
  '/sql/create-blog-post-building-a-creative-brand-that-rewards-people-for-life.sql'
];

interface SQLFileInfo {
  filename: string;
  path: string;
  content: string;
  lastModified: Date | null;
}

interface ManifestEntry {
  filename: string;
  path: string;
  publicPath: string;
  modified: string;
  size: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the base URL - use the request host or fallback to environment variable
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const baseUrl = req.headers.host 
      ? `${protocol}://${req.headers.host}` 
      : process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:5173'; // Fallback for local dev

    let sqlFiles: SQLFileInfo[] = [];

    // Try to fetch manifest first
    try {
      const manifestUrl = `${baseUrl}/sql-manifest.json`;
      const manifestResponse = await fetch(manifestUrl, {
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      if (manifestResponse.ok) {
        const manifest = await manifestResponse.json() as { files: ManifestEntry[] };
        
        // Fetch the most recent file from manifest
        if (manifest.files && manifest.files.length > 0) {
          const mostRecentManifest = manifest.files[0]; // Already sorted by modified time
          const fileUrl = `${baseUrl}${mostRecentManifest.publicPath}`;
          const fileResponse = await fetch(fileUrl);
          
          if (fileResponse.ok) {
            const content = await fileResponse.text();
            sqlFiles.push({
              filename: mostRecentManifest.filename,
              path: mostRecentManifest.publicPath,
              content,
              lastModified: new Date(mostRecentManifest.modified)
            });
          }
        }
      }
    } catch (manifestError) {
      console.warn('Could not fetch manifest, falling back to direct file fetch:', manifestError);
    }

    // Fallback: fetch all SQL files directly if manifest didn't work
    if (sqlFiles.length === 0) {
      for (const sqlPath of SQL_FILES) {
        try {
          const url = `${baseUrl}${sqlPath}`;
          const response = await fetch(url, {
            headers: {
              'Cache-Control': 'no-cache'
            }
          });
          
          if (response.ok) {
            const content = await response.text();
            const lastModifiedHeader = response.headers.get('last-modified');
            const lastModified = lastModifiedHeader 
              ? new Date(lastModifiedHeader) 
              : new Date(); // Fallback to now if no header
            
            const filename = sqlPath.split('/').pop() || sqlPath;
            
            sqlFiles.push({
              filename,
              path: sqlPath,
              content,
              lastModified
            });
          }
        } catch (err) {
          console.warn(`Could not fetch ${sqlPath}:`, err);
          // Continue to next file
        }
      }

      // Sort by modification time (most recent first) if we fetched multiple
      if (sqlFiles.length > 1) {
        sqlFiles.sort((a, b) => {
          const timeA = a.lastModified?.getTime() || 0;
          const timeB = b.lastModified?.getTime() || 0;
          return timeB - timeA;
        });
      }
    }

    if (sqlFiles.length === 0) {
      return res.status(404).json({ error: 'No SQL files found' });
    }
    
    const mostRecent = sqlFiles[0];

    return res.status(200).json({
      filename: mostRecent.filename,
      path: mostRecent.path,
      content: mostRecent.content,
      modified: mostRecent.lastModified?.toISOString() || new Date().toISOString(),
      modifiedRelative: mostRecent.lastModified 
        ? getRelativeTime(mostRecent.lastModified)
        : 'unknown'
    });
  } catch (error: any) {
    console.error('Error finding latest SQL file:', error);
    return res.status(500).json({ 
      error: 'Failed to find latest SQL file',
      details: error.message 
    });
  }
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}
