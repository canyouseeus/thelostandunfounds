/**
 * GitHub Repository Creation Script
 * 
 * Uses GitHub MCP to create a new repository for thelostandunfounds project
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const PROJECT_NAME = 'thelostandunfounds';
const REPO_NAME = 'thelostandunfounds';
const PROJECT_DIR = process.cwd();

interface GitHubRepoOptions {
  name: string;
  description?: string;
  private?: boolean;
  autoInit?: boolean;
}

/**
 * Create GitHub repository using GitHub MCP
 * 
 * Note: This requires GitHub MCP to be configured in Cursor IDE
 */
export async function createGitHubRepo(options: GitHubRepoOptions = {
  name: REPO_NAME,
  description: 'THE LOST+UNFOUNDS - Modern web application',
  private: false,
  autoInit: false,
}) {
  console.log('🚀 Creating GitHub repository...\n');
  
  try {
    // Check if git is initialized
    if (!existsSync(join(PROJECT_DIR, '.git'))) {
      console.log('📦 Initializing git repository...');
      execSync('git init', { cwd: PROJECT_DIR, stdio: 'inherit' });
    }

    // Check if package.json exists
    if (!existsSync(join(PROJECT_DIR, 'package.json'))) {
      throw new Error('package.json not found. Run this from the project root.');
    }

    // Read package.json for description
    const packageJson = JSON.parse(
      readFileSync(join(PROJECT_DIR, 'package.json'), 'utf-8')
    );

    const repoOptions = {
      name: options.name || REPO_NAME,
      description: options.description || packageJson.description || 'THE LOST+UNFOUNDS - Modern web application',
      private: options.private || false,
      autoInit: options.autoInit || false,
    };

    console.log('📋 Repository options:');
    console.log(`   Name: ${repoOptions.name}`);
    console.log(`   Description: ${repoOptions.description}`);
    console.log(`   Private: ${repoOptions.private}`);
    console.log('');

    // Note: Actual GitHub MCP integration would happen here
    // For now, we'll provide instructions
    console.log('📝 To create the repository, use one of these methods:\n');
    
    console.log('Option 1: GitHub CLI (if installed):');
    console.log(`   gh repo create ${repoOptions.name} \\`);
    console.log(`     --description "${repoOptions.description}" \\`);
    console.log(`     --${repoOptions.private ? 'private' : 'public'} \\`);
    console.log(`     --source=. \\`);
    console.log(`     --remote=origin \\`);
    console.log(`     --push\n`);

    console.log('Option 2: Manual GitHub Web Interface:');
    console.log('   1. Go to: https://github.com/new');
    console.log(`   2. Repository name: ${repoOptions.name}`);
    console.log(`   3. Description: ${repoOptions.description}`);
    console.log(`   4. Choose: ${repoOptions.private ? 'Private' : 'Public'}`);
    console.log('   5. DO NOT initialize with README, .gitignore, or license');
    console.log('   6. Click "Create repository"\n');

    console.log('Option 3: Use GitHub MCP in Cursor:');
    console.log('   Ask Cursor AI: "Create a GitHub repository named thelostandunfounds"');
    console.log('   The MCP server will handle the creation automatically\n');

    // Prepare git commands
    console.log('📤 After repository is created, run these commands:\n');
    console.log(`   git remote add origin https://github.com/YOUR_USERNAME/${repoOptions.name}.git`);
    console.log(`   git branch -M main`);
    console.log(`   git add .`);
    console.log(`   git commit -m "Initial commit: ${repoOptions.description}"`);
    console.log(`   git push -u origin main\n`);

    return {
      success: true,
      name: repoOptions.name,
      url: `https://github.com/YOUR_USERNAME/${repoOptions.name}`,
    };

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

// If run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createGitHubRepo().catch(console.error);
}

