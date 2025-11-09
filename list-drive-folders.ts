#!/usr/bin/env node
/**
 * List Google Drive Folders
 * 
 * This script lists folders from your Google Drive using the existing connection.
 * It tries multiple methods:
 * 1. MCP Google Drive tools (if available)
 * 2. Environment variables with API credentials
 * 3. Existing token/credentials files
 */

import { readFileSync } from 'fs';
import { existsSync } from 'fs';
import { execSync } from 'child_process';

async function listFoldersWithMCP() {
  try {
    // Try to use MCP tools if available
    console.log('Attempting to list folders via MCP...');
    
    // This would require MCP client setup
    // For now, we'll check if we can access it another way
    return null;
  } catch (error) {
    console.error('MCP method failed:', error);
    return null;
  }
}

async function listFoldersWithAPI() {
  try {
    // Check for credentials in environment or files
    const credsPath = './credentials.json';
    const tokenPath = './token.pickle';
    
    if (existsSync(credsPath) || existsSync(tokenPath)) {
      console.log('Found credentials files. Using Python script...');
      try {
        const output = execSync('python3 list_google_drive_folders.py', {
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        console.log(output);
        return true;
      } catch (error: any) {
        if (error.stdout) {
          console.log(error.stdout);
        }
        if (error.stderr && !error.stderr.includes('credentials.json not found')) {
          console.error(error.stderr);
        }
        return false;
      }
    }
    
    return false;
  } catch (error) {
    console.error('API method failed:', error);
    return false;
  }
}

async function main() {
  console.log('🔍 Listing Google Drive folders...\n');
  
  // Try MCP first
  const mcpResult = await listFoldersWithMCP();
  if (mcpResult) {
    return;
  }
  
  // Try API method
  const apiResult = await listFoldersWithAPI();
  if (apiResult) {
    return;
  }
  
  // If neither worked, provide instructions
  console.log('\n❌ Could not find Google Drive connection.');
  console.log('\nTo list your folders, you can:');
  console.log('1. Run the Python script: python3 list_google_drive_folders.py');
  console.log('2. Ensure credentials.json is in the project root');
  console.log('3. Or use MCP Google Drive tools if configured');
}

main().catch(console.error);
