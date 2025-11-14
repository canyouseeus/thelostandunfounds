# Local Setup Guide

## Step 1: Clone the Repository

Open a terminal on your local machine and run:

```bash
git clone https://github.com/canyouseeus/thelostandunfounds.git
cd thelostandunfounds
```

## Step 2: Checkout the Correct Branch

```bash
git checkout cursor/fix-local-site-not-running-2730
```

Or if you want to use the main branch:
```bash
git checkout main
```

## Step 3: Install Dependencies

```bash
npm install
```

**Note:** If you get an error about `@scot33/tools-registry` not being found, that's okay - it's an optional dependency. The app will work without it.

## Step 4: Create Environment File

Create a file named `.env.local` in the project root with:

```env
VITE_SUPABASE_URL=https://nonaqhllakrckbtbawrb.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vbmFxaGxsYWtyY2tidGJhd3JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MzI2MzAsImV4cCI6MjA3NjEwODYzMH0.uf-XaKQF10LHqVlZyXtg45zj5slMkapKSv-GAGVileU
VITE_TURNSTILE_SITE_KEY=your_turnstile_site_key_here
```

## Step 5: Start the Development Server

```bash
npm run dev
```

## Step 6: Open in Browser

The server will start and show you a URL like:
```
➜  Local:   http://localhost:3000/
```

Open that URL in your browser!

## Troubleshooting

### If `npm install` fails:
- Make sure you have Node.js installed (version 16 or higher)
- Try: `npm install --legacy-peer-deps`

### If the site doesn't load:
- Check the terminal for error messages
- Make sure port 3000 isn't already in use
- Try a different port: `npm run dev -- --port 3001`

### If you see module errors:
- The `@scot33/tools-registry` dependency is optional - errors about it can be ignored
- The app will work without it

## Quick Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```
