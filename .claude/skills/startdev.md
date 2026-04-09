---
name: startdev
description: Start the dev server with pre-flight checks (kill port 3000, verify Supabase, start Vercel)
---

Start the dev server with all necessary pre-flight checks:

1. **Kill any process on port 3000** to prevent "port already in use" errors
2. **Verify Supabase is accessible** — check DNS and connectivity
3. **Start the Vercel dev server** on port 3000

Run these checks and then start the dev server. If any check fails, report the issue to the user. Once the server is running, confirm it's ready and provide the localhost URL.

Use the preview_start tool with name "dev" to start the server if not already running.
