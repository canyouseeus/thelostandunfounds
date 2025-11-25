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
    const sqlFiles: Array<{ path: string; mtime: Date; name: string; fullPath: string }> = [];
    
    console.log('Searching for SQL files. Workspace path:', workspacePath);
    console.log('Current working directory:', process.cwd());

    // Function to find SQL files in a specific directory (non-recursive)
    async function findSQLFilesInDir(dir: string, basePath: string = ''): Promise<void> {
      try {
        const entries = await readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          // Skip hidden files and common build directories
          if (entry.name.startsWith('.')) {
            continue;
          }
          
          if (entry.isFile() && entry.name.endsWith('.sql')) {
            try {
              const fullPath = join(dir, entry.name);
              const stats = await stat(fullPath);
              sqlFiles.push({
                path: basePath ? `${basePath}/${entry.name}` : entry.name,
                mtime: stats.mtime,
                name: entry.name,
                fullPath: fullPath
              });
            } catch (err) {
              console.warn(`Could not stat ${join(dir, entry.name)}:`, err);
            }
          }
        }
      } catch (err) {
        console.warn(`Could not read directory ${dir}:`, err);
      }
    }

    // Search in specific known directories first (more reliable in serverless)
    const searchPaths = [
      { dir: workspacePath, base: '' },
      { dir: join(workspacePath, 'sql'), base: 'sql' },
      { dir: join(workspacePath, 'public'), base: 'public' },
      { dir: join(workspacePath, 'public', 'sql'), base: 'public/sql' }
    ];

    // Try each search path
    for (const { dir, base } of searchPaths) {
      try {
        // Check if directory exists
        try {
          const dirStat = await stat(dir);
          if (!dirStat.isDirectory()) {
            console.log(`Path exists but is not a directory: ${dir}`);
            continue;
          }
        } catch (statErr) {
          console.log(`Directory does not exist or cannot be accessed: ${dir}`);
          continue;
        }
        
        await findSQLFilesInDir(dir, base);
        console.log(`Searched ${dir}, found ${sqlFiles.length} files so far`);
      } catch (err) {
        // Continue to next path if this one fails
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.warn(`Could not search in ${dir}:`, errorMsg);
      }
    }

    // If we still haven't found files, try a limited recursive search
    if (sqlFiles.length === 0) {
      async function findSQLFilesRecursive(dir: string, basePath: string = '', depth: number = 0): Promise<void> {
        // Limit recursion depth to avoid issues
        if (depth > 3) return;
        
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
                entry.name === 'build' ||
                entry.name === 'objects' ||
                entry.name === 'refs') {
              continue;
            }
            
            if (entry.isDirectory()) {
              await findSQLFilesRecursive(fullPath, relativePath, depth + 1);
            } else if (entry.isFile() && entry.name.endsWith('.sql')) {
              try {
                const stats = await stat(fullPath);
                sqlFiles.push({
                  path: relativePath,
                  mtime: stats.mtime,
                  name: entry.name,
                  fullPath: fullPath
                });
              } catch (err) {
                console.warn(`Could not stat ${fullPath}:`, err);
              }
            }
          }
        } catch (err) {
          // Skip directories we can't read
          console.warn(`Could not read directory ${dir}:`, err);
        }
      }

      await findSQLFilesRecursive(workspacePath);
    }

    // Fallback: Try to read known SQL files directly if filesystem search failed
    if (sqlFiles.length === 0) {
      console.log('Filesystem search failed, trying direct file access...');
      const knownSQLFiles = [
        'blog-schema-migration.sql',
        'database-schema.sql',
        'create-first-blog-post.sql',
        'admin-setup.sql',
        'blog-schema.sql',
      ];
      
      const knownPaths = [
        workspacePath,
        join(workspacePath, 'public'),
        join(workspacePath, 'sql'),
        join(workspacePath, 'public', 'sql'),
      ];
      
      for (const fileName of knownSQLFiles) {
        for (const basePath of knownPaths) {
          try {
            const filePath = join(basePath, fileName);
            const stats = await stat(filePath);
            sqlFiles.push({
              path: fileName,
              mtime: stats.mtime,
              name: fileName,
              fullPath: filePath
            });
            console.log(`Found SQL file via direct access: ${filePath}`);
            break; // Found this file, move to next
          } catch (e) {
            // File doesn't exist at this path, try next
          }
        }
      }
    }
    
    if (sqlFiles.length === 0) {
      console.error('No SQL files found. Searched paths:', searchPaths.map(p => p.dir));
      // Try to list what's actually in the workspace root
      try {
        const rootContents = await readdir(workspacePath);
        console.log('Workspace root contents:', rootContents.slice(0, 20));
      } catch (e) {
        console.error('Could not read workspace root:', e);
      }
      
      return res.status(404).json({ 
        error: 'No SQL files found',
        details: `Searched in: ${searchPaths.map(p => p.dir).join(', ')}`,
        workspacePath: workspacePath,
        cwd: process.cwd(),
        debug: 'Filesystem access may be limited in serverless environment'
      });
    }
    
    console.log(`Found ${sqlFiles.length} SQL files`);

    // Sort by modification time (most recent first)
    sqlFiles.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
    
    const mostRecent = sqlFiles[0];
    
    // Read the file content using the stored fullPath
    let content: string;
    try {
      content = await readFile(mostRecent.fullPath, 'utf-8');
    } catch (err) {
      console.error(`Error reading file ${mostRecent.fullPath}:`, err);
      return res.status(500).json({ 
        error: 'Could not read SQL file',
        details: err instanceof Error ? err.message : 'Unknown error',
        path: mostRecent.fullPath
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
      details: error?.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
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
