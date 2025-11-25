/**
 * Generate SQL Manifest
 * Creates a manifest file listing all SQL files and their modification times
 * Run this script during build to generate the manifest
 */

import { readdir, stat, readFile } from 'fs/promises';
import { join } from 'path';
import { writeFile } from 'fs/promises';

interface SQLManifestEntry {
  filename: string;
  path: string;
  publicPath: string;
  modified: string;
  size: number;
}

async function generateManifest() {
  const workspacePath = process.cwd();
  const sqlFiles: SQLManifestEntry[] = [];

  // Check public directory first (these are accessible via HTTP)
  const publicDir = join(workspacePath, 'public');
  const sqlDir = join(publicDir, 'sql');
  
  const directoriesToCheck = [
    { dir: publicDir, basePath: '' },
    { dir: sqlDir, basePath: 'sql' }
  ];

  for (const { dir, basePath } of directoriesToCheck) {
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.sql')) {
          const fullPath = join(dir, entry.name);
          try {
            const stats = await stat(fullPath);
            const publicPath = basePath 
              ? `/sql/${entry.name}` 
              : `/${entry.name}`;
            
            sqlFiles.push({
              filename: entry.name,
              path: fullPath.replace(workspacePath, '').replace(/^\//, ''),
              publicPath,
              modified: stats.mtime.toISOString(),
              size: stats.size
            });
          } catch (err) {
            console.warn(`Could not stat ${fullPath}:`, err);
          }
        }
      }
    } catch (err) {
      // Directory might not exist, skip
      console.warn(`Could not read directory ${dir}:`, err);
    }
  }

  // Sort by modification time (most recent first)
  sqlFiles.sort((a, b) => 
    new Date(b.modified).getTime() - new Date(a.modified).getTime()
  );

  const manifest = {
    generated: new Date().toISOString(),
    files: sqlFiles
  };

  // Write manifest to public directory so it's accessible
  const manifestPath = join(publicDir, 'sql-manifest.json');
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  
  console.log(`Generated SQL manifest with ${sqlFiles.length} files`);
  console.log(`Most recent: ${sqlFiles[0]?.filename || 'none'}`);
}

generateManifest().catch(console.error);
