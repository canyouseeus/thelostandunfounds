# Clear Cursor Cache on Mac - Direct Commands

Since you're on your Mac (not the remote workspace), run these commands directly in Terminal:

## Step 1: Quit Cursor Completely
Press `Cmd + Q` to make sure Cursor is fully quit.

## Step 2: Run These Commands in Terminal

Copy and paste these commands one by one:

```bash
# Clear workspace storage (this contains the session restore data)
rm -rf ~/Library/Application\ Support/Cursor/User/workspaceStorage

# Clear cache
rm -rf ~/Library/Application\ Support/Cursor/Cache
rm -rf ~/Library/Application\ Support/Cursor/CachedData
rm -rf ~/Library/Application\ Support/Cursor/Code\ Cache
rm -rf ~/Library/Application\ Support/Cursor/GPUCache

# Clear recent workspaces list
rm -f ~/Library/Application\ Support/Cursor/User/globalStorage/storage.json
rm -f ~/Library/Application\ Support/Cursor/User/globalStorage/storage.db

echo "✓ Done! Cursor cache cleared."
```

## Step 3: Open Cursor Fresh

1. Open Cursor
2. **If it tries to restore**, immediately press `Cmd + W` to close the window
3. Go to **File → Open Folder** and manually select your workspace folder

## One-Liner Version (Copy All at Once)

```bash
rm -rf ~/Library/Application\ Support/Cursor/User/workspaceStorage ~/Library/Application\ Support/Cursor/Cache ~/Library/Application\ Support/Cursor/CachedData ~/Library/Application\ Support/Cursor/Code\ Cache ~/Library/Application\ Support/Cursor/GPUCache ~/Library/Application\ Support/Cursor/User/globalStorage/storage.json ~/Library/Application\ Support/Cursor/User/globalStorage/storage.db && echo "✓ Cursor cache cleared - restart Cursor now"
```

## Disable Auto-Restore Permanently

After clearing cache, also disable auto-restore:

1. Open Cursor
2. Press `Cmd + ,` (Settings)
3. Search for: `window.restoreWindows`
4. Change to: `"none"`
5. Search for: `files.hotExit`  
6. Change to: `"off"`

This prevents Cursor from saving/restoring sessions in the future.
