# Prompt for Starting Development Server

Copy and paste this prompt to another agent:

---

**I need help starting the development server for my React/Vite project.**

## Project Details:
- **Project Type**: React + TypeScript + Vite application
- **Location**: `/workspace` directory
- **Package Manager**: npm
- **Dev Server Port**: 3000 (configured in vite.config.ts)

## What I Need:
1. Check if Node.js and npm are installed
2. Install dependencies if needed (`npm install`)
3. Start the development server (`npm run dev`)
4. Verify the server is running and accessible
5. Provide the URL to access the shop page (`/shop`)

## Current State:
- The project has a `package.json` with all dependencies listed
- Environment variables should be in `.env.local` (may need to be created from `.env.example`)
- The shop integration is set up and ready to use

## Important Notes:
- The dev server should start on `http://localhost:3000`
- If there are missing dependencies, install them
- If there are environment variable errors, let me know what's missing
- The shop page route is `/shop` and should be accessible once the server is running

## Expected Output:
- Confirmation that the server is running
- The URL to access the application (should be `http://localhost:3000`)
- Instructions on how to access the shop page
- Any errors or warnings that need attention

Please start the development server and confirm it's working.

---
