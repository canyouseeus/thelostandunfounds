# How to Inspect state.vscdb Files

## Step 1: Check Existing Folders First

Before recovering deleted files, let's see what's already there.

### In Terminal, check what files exist:

```bash
# Check first folder
ls -laR ~/Library/Application\ Support/Cursor/User/workspaceStorage/1762986751689/

# Check second folder
ls -laR ~/Library/Application\ Support/Cursor/User/workspaceStorage/ab121924d1bd1a5c18c41e14c662f275/

# Find all state.vscdb files
find ~/Library/Application\ Support/Cursor/User/workspaceStorage -name "state.vscdb" -type f
```

## Step 2: Download DB Browser for SQLite

1. Go to: https://sqlitebrowser.org/
2. Download "DB Browser for SQLite" for Mac
3. Install it

## Step 3: Open state.vscdb Files

1. **Open DB Browser for SQLite**

2. **Click "Open Database"**

3. **Navigate to a workspace folder:**
   ```
   /Users/canyouseeus/Library/Application Support/Cursor/User/workspaceStorage/1762986751689/
   ```
   Or:
   ```
   /Users/canyouseeus/Library/Application Support/Cursor/User/workspaceStorage/ab121924d1bd1a5c18c41e14c662f275/
   ```

4. **Select `state.vscdb`** (it might be in a subfolder)

5. **Click "Open"**

## Step 4: Inspect the Database

Once opened, you'll see:

### Browse Data Tab:
- Look for tables with names like:
  - `ItemTable`
  - `KeyValueTable`
  - Tables with "chat" or "ai" in the name

### Execute SQL Tab:
Run these queries to find chat data:

```sql
-- Find all tables
SELECT name FROM sqlite_master WHERE type='table';

-- Search for chat-related data
SELECT * FROM sqlite_master WHERE sql LIKE '%chat%' OR sql LIKE '%ai%';

-- If there's an ItemTable, check it
SELECT * FROM ItemTable LIMIT 100;

-- Search for specific keys
SELECT * FROM KeyValueTable WHERE key LIKE '%chat%' OR key LIKE '%ai%';
```

## Step 5: What to Look For

Look for data containing:
- `workbench.panel.aichat.view...`
- `workbench.panel.composerChatViewPanel...`
- `anysphere.cursor-retrieval`
- Chat messages, prompts, or conversation history

## Step 6: Export Data

If you find chat data:

1. **Select the table** with chat data
2. **Click "Export"** or "File → Export"
3. **Export as CSV or JSON**
4. **Save to a safe location**

## Step 7: Recover Deleted Workspace Folders

If you don't find your data in existing folders:

1. **Use R-Studio** (file recovery tool) to recover deleted workspace folders
2. **Download from:** https://www.r-studio.com/
3. **Scan:** `/Users/canyouseeus/Library/Application Support/Cursor/User/workspaceStorage/`
4. **Recover deleted hash-named folders**
5. **Then inspect their state.vscdb files**

## Quick Check Command

Run this to see if state.vscdb files exist:

```bash
find ~/Library/Application\ Support/Cursor/User/workspaceStorage -name "state.vscdb" -type f -exec ls -lh {} \;
```

This will show you all state.vscdb files and their sizes.
