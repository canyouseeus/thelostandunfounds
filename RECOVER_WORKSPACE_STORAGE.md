# Recover Cursor Workspace Storage

## Workspace Storage Path on Mac

The workspace storage path is:
```
~/Library/Application Support/Cursor/User/workspaceStorage/
```

Each workspace gets a folder inside `workspaceStorage` with a hash/ID name.

## Find Your Workspace Folder

### Method 1: Check if Any Folders Remain

Run this in Terminal:
```bash
ls -la ~/Library/Application\ Support/Cursor/User/workspaceStorage/
```

If the folder exists but is empty, or if folders were deleted, you'll need to recover from backup.

### Method 2: Find Workspace Folder Name

The workspace folder name is typically a hash based on your workspace path. To find it:

1. **Check Time Machine** (if enabled):
   - Open Time Machine
   - Navigate to: `~/Library/Application Support/Cursor/User/workspaceStorage/`
   - Look for folders with recent modification dates
   - Restore the folder(s) you need

2. **Check if folder still exists**:
   ```bash
   # List all workspace storage folders
   find ~/Library/Application\ Support/Cursor/User/workspaceStorage -type d -maxdepth 1 2>/dev/null
   ```

### Method 3: Recover from Time Machine

If Time Machine is enabled:

1. **Open Time Machine**
2. **Navigate to**: `~/Library/Application Support/Cursor/User/workspaceStorage/`
3. **Go back in time** to before you ran the clear commands
4. **Select the workspace folder(s)** you need
5. **Click "Restore"**

The workspace folder name is usually a long hash string like:
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0
```

## What Was in Workspace Storage

The workspace storage folder typically contains:
- `workspace.json` - Workspace configuration
- `state.vscdb` - Workspace state database
- Session restore data
- Open files list
- Editor state

## If You Can't Recover

If Time Machine doesn't have a backup, you'll need to:
1. **Reopen your workspace** - Cursor will create a new workspace storage folder
2. **Reconfigure any workspace-specific settings**
3. **The workspace will work**, but you'll lose:
   - Previous session restore data
   - Open files from last session
   - Editor state (scroll positions, etc.)

## Check Current State

Run this to see what's currently in workspaceStorage:
```bash
ls -laR ~/Library/Application\ Support/Cursor/User/workspaceStorage/ 2>/dev/null | head -20
```

If it's empty or doesn't exist, the folders were cleared and you'll need Time Machine to recover them.
