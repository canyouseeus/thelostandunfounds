# Clear Cursor Session State on Mac

Cursor is trying to restore your previous session which includes the problematic `strike.py` file. Here's how to clear it:

## Method 1: Clear Workspace Storage (Recommended)

**Quit Cursor first** (`Cmd + Q`), then run in Terminal:

```bash
# Clear workspace storage (this contains session restore data)
rm -rf ~/Library/Application\ Support/Cursor/User/workspaceStorage

# Also clear recent workspaces
rm -rf ~/Library/Application\ Support/Cursor/User/globalStorage/storage.json

# Clear cache
rm -rf ~/Library/Application\ Support/Cursor/Cache
rm -rf ~/Library/Application\ Support/Cursor/CachedData
rm -rf ~/Library/Application\ Support/Cursor/Code\ Cache
```

Then restart Cursor and **open the folder fresh** (File → Open Folder) instead of letting it restore.

## Method 2: Disable Session Restore Temporarily

1. Open Cursor
2. Go to **Cursor → Settings** (or `Cmd + ,`)
3. Search for "restore"
4. Disable:
   - `window.restoreWindows` → set to `"none"`
   - `files.hotExit` → set to `"off"`
5. Quit and restart Cursor

## Method 3: Start Fresh Workspace

Instead of opening the previous workspace:

1. **Quit Cursor** (`Cmd + Q`)
2. **Clear workspace storage** (Method 1 above)
3. **Open Cursor**
4. **File → Open Folder** → Navigate to `/workspace` manually
5. This will create a fresh session without restoring the old state

## Method 4: Nuclear Option - Complete Reset

If nothing else works:

```bash
# Quit Cursor first!

# Backup your settings (optional)
cp -r ~/Library/Application\ Support/Cursor/User/settings.json ~/Desktop/cursor-settings-backup.json

# Remove ALL Cursor data
rm -rf ~/Library/Application\ Support/Cursor

# Restart Cursor - it will be like a fresh install
```

## Quick One-Liner (Clears Session State)

```bash
rm -rf ~/Library/Application\ Support/Cursor/User/workspaceStorage ~/Library/Application\ Support/Cursor/Cache ~/Library/Application\ Support/Cursor/CachedData && echo "✓ Session state cleared"
```

After running this, restart Cursor and open your folder fresh (don't let it restore the previous session).
