#!/usr/bin/env node

/**
 * GitHub Repository Setup Script
 * 
 * Creates a new GitHub repository for thelostandunfounds project
 * and sets up the initial commit.
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const PROJECT_NAME = 'thelostandunfounds';
const REPO_NAME = 'thelostandunfounds';
const PROJECT_DIR = process.cwd();

// Check if we're in the right directory
if (!existsSync(join(PROJECT_DIR, 'package.json'))) {
  console.error('❌ Error: package.json not found. Run this script from the project root.');
  process.exit(1);
}

console.log('🚀 Setting up GitHub repository for thelostandunfounds...\n');

try {
  // Step 1: Initialize git if not already initialized
  if (!existsSync(join(PROJECT_DIR, '.git'))) {
    console.log('📦 Initializing git repository...');
    execSync('git init', { cwd: PROJECT_DIR, stdio: 'inherit' });
  } else {
    console.log('✅ Git repository already initialized');
  }

  // Step 2: Create .gitignore if it doesn't exist
  if (!existsSync(join(PROJECT_DIR, '.gitignore'))) {
    console.log('📝 Creating .gitignore...');
    const gitignore = `# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/

# Production
dist/
build/

# Misc
.DS_Store
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

# Editor directories and files
.idea
.vscode
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# Vercel
.vercel

# TypeScript
*.tsbuildinfo
`;
    writeFileSync(join(PROJECT_DIR, '.gitignore'), gitignore);
  }

  // Step 3: Add all files
  console.log('\n📤 Adding files to git...');
  execSync('git add .', { cwd: PROJECT_DIR, stdio: 'inherit' });

  // Step 4: Create initial commit
  console.log('\n💾 Creating initial commit...');
  try {
    execSync('git commit -m "Initial commit: THE LOST+UNFOUNDS project setup"', {
      cwd: PROJECT_DIR,
      stdio: 'inherit'
    });
  } catch (error) {
    console.log('⚠️  No changes to commit or commit already exists');
  }

  console.log('\n✅ Local git repository ready!');
  console.log('\n📋 Next steps:');
  console.log('\n1. Create repository on GitHub:');
  console.log(`   - Go to: https://github.com/new`);
  console.log(`   - Repository name: ${REPO_NAME}`);
  console.log(`   - Description: THE LOST+UNFOUNDS - Modern web application`);
  console.log(`   - Choose: Public or Private`);
  console.log(`   - DO NOT initialize with README, .gitignore, or license`);
  console.log(`   - Click "Create repository"`);
  
  console.log('\n2. Connect local repository to GitHub:');
  console.log(`   git remote add origin https://github.com/YOUR_USERNAME/${REPO_NAME}.git`);
  console.log(`   git branch -M main`);
  console.log(`   git push -u origin main`);
  
  console.log('\n3. Or use GitHub CLI (if installed):');
  console.log(`   gh repo create ${REPO_NAME} --public --source=. --remote=origin --push`);
  
  console.log('\n4. Add domain to Vercel:');
  console.log(`   - Go to Vercel dashboard`);
  console.log(`   - Import project from GitHub`);
  console.log(`   - Add domain: thelostandunfounds.com`);
  console.log(`   - Deploy!`);

} catch (error) {
  console.error('\n❌ Error:', error);
  process.exit(1);
}

