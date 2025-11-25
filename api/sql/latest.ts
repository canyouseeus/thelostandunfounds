/**
 * Latest SQL File API
 * Returns the most recently modified SQL file from the workspace
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { readdir, stat, readFile } from 'fs/promises';
import { join } from 'path';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const workspacePath = process.cwd();
    const sqlFiles: Array<{ path: string; mtime: Date; name: string }> = [];

    // Function to recursively find SQL files
    async function findSQLFiles(dir: string, basePath: string = ''): Promise<void> {
      try {
        const entries = await readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = join(dir, entry.name);
          const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;
          
          // Skip node_modules, .git, and other common directories
          if (entry.name.startsWith('.') || 
              entry.name === 'node_modules' || 
              entry.name === '.next' ||
              entry.name === 'dist' ||
              entry.name === 'build') {
            continue;
          }
          
          if (entry.isDirectory()) {
            await findSQLFiles(fullPath, relativePath);
          } else if (entry.isFile() && entry.name.endsWith('.sql')) {
            try {
              const stats = await stat(fullPath);
              sqlFiles.push({
                path: relativePath,
                mtime: stats.mtime,
                name: entry.name
              });
            } catch (err) {
              // Skip files we can't stat
              console.warn(`Could not stat ${fullPath}:`, err);
            }
          }
        }
      } catch (err) {
        // Skip directories we can't read
        console.warn(`Could not read directory ${dir}:`, err);
      }
    }

    // Find all SQL files
    await findSQLFiles(workspacePath);

    if (sqlFiles.length === 0) {
      return res.status(404).json({ error: 'No SQL files found' });
    }

    // Sort by modification time (most recent first)
    sqlFiles.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
    
    const mostRecent = sqlFiles[0];
    
    // Read the file content
    const fullPath = join(workspacePath, mostRecent.path);
    let content: string;
    try {
      content = await readFile(fullPath, 'utf-8');
    } catch (err) {
      return res.status(500).json({ 
        error: 'Could not read SQL file',
        details: err instanceof Error ? err.message : 'Unknown error'
      });
    }

    return res.status(200).json({
      filename: mostRecent.name,
      path: mostRecent.path,
      content: content,
      modified: mostRecent.mtime.toISOString(),
      modifiedRelative: getRelativeTime(mostRecent.mtime)
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
