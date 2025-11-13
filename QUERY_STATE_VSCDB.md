# How to Query state.vscdb Tables

You found:
- `ItemTable`
- `cursorDiskKV`

These likely contain your chat/agent data. Here's how to inspect them:

## Step 1: Check ItemTable

In DB Browser's "Execute SQL" tab, run:

```sql
-- See structure of ItemTable
SELECT * FROM ItemTable LIMIT 50;
```

This shows the first 50 rows. Look for:
- Chat messages
- Agent configurations
- AI conversation history

## Step 2: Check cursorDiskKV

```sql
-- See all keys in cursorDiskKV
SELECT key FROM cursorDiskKV;

-- Search for chat/agent related keys
SELECT key, value FROM cursorDiskKV 
WHERE key LIKE '%chat%' OR key LIKE '%ai%' OR key LIKE '%agent%' OR key LIKE '%composer%';
```

## Step 3: Look for Specific Keys

Try these queries:

```sql
-- Find workbench panel keys (chat panels)
SELECT key, value FROM cursorDiskKV 
WHERE key LIKE '%workbench.panel%';

-- Find cursor retrieval keys
SELECT key, value FROM cursorDiskKV 
WHERE key LIKE '%cursor-retrieval%' OR key LIKE '%anysphere%';

-- Find chat view keys
SELECT key, value FROM cursorDiskKV 
WHERE key LIKE '%aichat%' OR key LIKE '%composerChat%';
```

## Step 4: Export Data

If you find your chat/agent data:

1. **Select the table** (ItemTable or cursorDiskKV)
2. **Click "Browse Data" tab**
3. **File → Export → Export table to CSV file**
4. **Save it** somewhere safe

## Step 5: Check Both Databases

Do this for BOTH state.vscdb files:
1. `/Users/canyouseeus/Library/Application Support/Cursor/User/workspaceStorage/ab121924d1bd1a5c18c41e14c662f275/state.vscdb`
2. `/Users/canyouseeus/Library/Application Support/Cursor/User/workspaceStorage/1762986751689/state.vscdb`

One might have your agents, the other might not.

## What to Look For

In the results, look for:
- Keys containing: `workbench.panel.aichat.view`
- Keys containing: `composerChatViewPanel`
- Keys containing: `anysphere.cursor-retrieval`
- Values containing: chat messages, prompts, agent configs
