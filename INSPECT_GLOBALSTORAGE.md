# Inspect globalStorage state.vscdb Files

## Great News!

You found **large state.vscdb files** in globalStorage:
- `state.vscdb` - 536MB (very large!)
- `state.vscdb.backup` - 536MB (backup!)

These are MUCH larger than the workspace ones and likely contain your agent data!

## Step 1: Check storage.json First

Run this command:

```bash
cat ~/Library/Application\ Support/Cursor/User/globalStorage/storage.json | grep -i agent
```

This will show if there are agent references in the JSON file.

## Step 2: Open globalStorage state.vscdb in DB Browser

1. **Open DB Browser for SQLite**
2. **Click "Open Database"**
3. **Navigate to:**
   ```
   /Users/canyouseeus/Library/Application Support/Cursor/User/globalStorage/
   ```
4. **Open `state.vscdb`** (the 536MB file)

## Step 3: Query for Agent Data

Once opened, go to "Execute SQL" tab and run:

```sql
-- See all tables
SELECT name FROM sqlite_master WHERE type='table';

-- Check ItemTable
SELECT * FROM ItemTable LIMIT 50;

-- Check cursorDiskKV for agent keys
SELECT key, value FROM cursorDiskKV 
WHERE key LIKE '%agent%' OR key LIKE '%chat%' OR key LIKE '%ai%' OR key LIKE '%composer%';

-- Find all keys (might take a moment - it's a big file)
SELECT COUNT(*) FROM cursorDiskKV;

-- Search for specific agent-related keys
SELECT key FROM cursorDiskKV WHERE key LIKE '%agent%' LIMIT 100;
```

## Step 4: Check the Backup Too

Also check `state.vscdb.backup` - it might have older agent data!

## What to Look For

In the results, look for:
- Keys containing "agent"
- Keys containing "chat" or "ai"
- Agent configurations
- Chat history

The large file size (536MB) suggests there's a lot of data in there - your agents are likely there!

## Quick Check Command

Run this to see if storage.json has agent info:

```bash
cat ~/Library/Application\ Support/Cursor/User/globalStorage/storage.json | grep -i agent
```

Then open the state.vscdb file in DB Browser and run the SQL queries above.
