# Database Schema Setup Guide

## Quick Start: Running the Database Schema

### Method 1: Using Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Sign in if needed
   - Select your project: **nonaqhllakrckbtbawrb**

2. **Open SQL Editor**
   - Click **"SQL Editor"** in the left sidebar (has a `</>` icon)
   - Or go directly to: https://supabase.com/dashboard/project/nonaqhllakrckbtbawrb/sql

3. **Create New Query**
   - Click **"New query"** button (top right)
   - Or press `Cmd+N` / `Ctrl+N`

4. **Copy SQL File**
   ```bash
   # From terminal, copy the comprehensive schema
   cat thelostandunfounds/comprehensive-admin-schema.sql | pbcopy  # macOS
   # Or open the file and copy manually
   ```

5. **Paste and Run**
   - Paste the SQL into the editor (`Cmd+V` / `Ctrl+V`)
   - Click **"Run"** button (bottom right)
   - Or press `Cmd+Enter` / `Ctrl+Enter`
   - Wait for "Success" message

6. **Verify Tables**
   - Go to **"Table Editor"** in left sidebar
   - You should see these tables:
     - ✅ `help_articles`
     - ✅ `admin_tasks`
     - ✅ `admin_ideas`
     - ✅ `daily_journal`
     - ✅ `blog_posts`
     - ✅ `products`
     - ✅ `affiliates`
     - ✅ `code_snippets`
     - And more...

### Method 2: Using Supabase CLI (Advanced)

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login to Supabase
npx supabase login

# Link to your project
npx supabase link --project-ref nonaqhllakrckbtbawrb

# Run the schema file
npx supabase db push --file comprehensive-admin-schema.sql
```

### Method 3: Using Script (Automated)

```bash
cd thelostandunfounds
npm run setup:database
```

## Which Schema File to Use?

- **`comprehensive-admin-schema.sql`** - Full admin dashboard schema (includes help_articles)
- **`database-schema.sql`** - Basic platform schema (subscriptions, tool limits)
- **`admin-dashboard-schema.sql`** - Admin-specific tables only

**For Help Center**: Use `comprehensive-admin-schema.sql` which includes the `help_articles` table.

## Troubleshooting

### Error: "relation already exists"
- Tables already exist - this is OK if you're re-running
- Use `CREATE TABLE IF NOT EXISTS` - it's safe to run multiple times

### Error: "permission denied"
- Make sure you're logged into Supabase Dashboard
- Check you have access to the project

### Error: "syntax error"
- Make sure you copied the entire SQL file
- Check for missing semicolons
- Verify the file isn't corrupted

### Tables Not Showing Up
- Refresh the Table Editor (F5)
- Check you're in the correct project
- Wait a few seconds and refresh again

## Verification Checklist

After running the schema, verify:

- [ ] `help_articles` table exists
- [ ] `admin_tasks` table exists
- [ ] `admin_ideas` table exists
- [ ] `daily_journal` table exists
- [ ] `blog_posts` table exists
- [ ] `products` table exists
- [ ] `affiliates` table exists
- [ ] Can see tables in Table Editor
- [ ] Can insert data into tables

## Next Steps

1. ✅ Database schema created
2. ⏭️ Load default help articles (click "Load Default Articles" in Help Center)
3. ⏭️ Start using the admin dashboard

