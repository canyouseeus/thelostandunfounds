# How to Set Up Database Schema in Supabase

## Step-by-Step Guide

### Step 1: Open Supabase Dashboard
1. Go to: https://supabase.com/dashboard
2. Sign in if needed
3. Select your project: **nonaqhllakrckbtbawrb** (or the project you're using)

### Step 2: Open SQL Editor
1. In the left sidebar, click **"SQL Editor"** (it has a `</>` icon)
2. Or go directly to: https://supabase.com/dashboard/project/nonaqhllakrckbtbawrb/sql

### Step 3: Create New Query
1. Click the **"New query"** button (top right)
2. Or click **"New"** → **"New query"**

### Step 4: Copy and Paste SQL
1. Open `database-schema.sql` file
2. **Select all** (Cmd+A / Ctrl+A)
3. **Copy** (Cmd+C / Ctrl+C)
4. **Paste** into the SQL Editor (Cmd+V / Ctrl+V)

### Step 5: Run the SQL
1. Click the **"Run"** button (bottom right, or press Cmd+Enter / Ctrl+Enter)
2. Wait for execution to complete
3. You should see: "Success. No rows returned" or similar success message

### Step 6: Verify Tables Were Created
1. In the left sidebar, click **"Table Editor"**
2. You should see these new tables:
   - ✅ `platform_subscriptions`
   - ✅ `tool_limits`
   - ✅ `tool_usage`

### Step 7: Verify Data Was Inserted
1. Click on `tool_limits` table
2. You should see rows with:
   - `tiktok` tool limits (free: 5, premium/pro: unlimited)
   - `youtube` tool limits (for future)
   - `image-converter` tool limits (for future)

---

## Quick Copy-Paste Method

**Option 1: Copy from file**
```bash
# In terminal, copy the SQL file contents
cat thelostandunfounds/database-schema.sql | pbcopy  # macOS
# Then paste into Supabase SQL Editor
```

**Option 2: Direct URL**
1. Go to: https://supabase.com/dashboard/project/nonaqhllakrckbtbawrb/sql/new
2. Paste SQL from `database-schema.sql`
3. Click Run

---

## What the SQL Does

1. **Creates 3 tables**:
   - `platform_subscriptions` - Stores user subscriptions
   - `tool_limits` - Defines limits per tool per tier
   - `tool_usage` - Tracks user actions

2. **Creates indexes** for performance

3. **Inserts default limits**:
   - TikTok: free (5/day), premium/pro (unlimited)
   - YouTube: free (3/day), premium/pro (unlimited)
   - Image Converter: free (10/day), premium/pro (unlimited)

4. **Sets up Row Level Security**:
   - Users can only see their own data
   - Tool limits are public (no sensitive data)

5. **Creates trigger** to auto-update `updated_at` timestamp

---

## Troubleshooting

### Error: "relation already exists"
- **Solution**: Tables already exist. You can either:
  - Drop existing tables first: `DROP TABLE IF EXISTS platform_subscriptions CASCADE;`
  - Or skip this step if tables are already set up

### Error: "permission denied"
- **Solution**: Make sure you're logged in and have access to the project

### Error: "syntax error"
- **Solution**: Make sure you copied the entire SQL file, including all semicolons

### Tables not showing up
- **Solution**: Refresh the Table Editor page (F5)
- Check if you're looking at the correct project

---

## Verification Checklist

After running the SQL, verify:

- [ ] `platform_subscriptions` table exists
- [ ] `tool_limits` table exists  
- [ ] `tool_usage` table exists
- [ ] `tool_limits` has data (check rows)
- [ ] Can see tables in Table Editor

---

## Next Steps After Database Setup

1. ✅ Database schema created
2. ⏭️ Add environment variables (`.env.local`)
3. ⏭️ Test the app (`npm run dev`)

You're almost there! 🚀



