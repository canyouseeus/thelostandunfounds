# How to Stop Cursor from Auto-Restoring Sessions

Cursor is automatically restoring your previous session when it opens. Here's how to stop it:

## Method 1: Run the Script (Easiest)

1. **Quit Cursor completely** (`Cmd + Q` - make sure it's fully quit)
2. **Open Terminal** and run:
   ```bash
   cd /workspace
   ./stop-cursor-restore.sh
   ```
3. **Open Cursor** - it should start empty now
4. If it still tries to restore, immediately press `Cmd + W` to close the restored window
5. Then go to **File → Open Folder** to manually open your workspace

## Method 2: Manual Terminal Commands

**Quit Cursor first**, then run:

```bash
# Clear workspace storage (contains session restore data)
rm -rf ~/Library/Application\ Support/Cursor/User/workspaceStorage

# Clear cache
rm -rf ~/Library/Application\ Support/Cursor/Cache
rm -rf ~/Library/Application\ Support/Cursor/CachedData
rm -rf ~/Library/Application\ Support/Cursor/Code\ Cache

# Clear recent workspaces
rm -f ~/Library/Application\ Support/Cursor/User/globalStorage/storage.json
```

Then open Cursor.

## Method 3: Disable Auto-Restore in Settings

1. Open Cursor
2. Press `Cmd + ,` to open Settings
3. Search for: `window.restoreWindows`
4. Change it from `"all"` or `"folders"` to `"none"`
5. Also search for: `files.hotExit`
6. Change it to `"off"`
7. Restart Cursor

## Method 4: Force Close on Startup

If Cursor still auto-restores:

1. **As soon as Cursor opens**, immediately press:
   - `Cmd + W` (close current window)
   - Or `Cmd + Q` (quit) if it's trying to restore
2. **Then reopen Cursor** - it should start empty
3. **File → Open Folder** to manually open your workspace

## Method 5: Start Cursor from Terminal (Bypasses Restore)

```bash
# Quit Cursor first
# Then open it from terminal with no workspace:
open -a Cursor --args --new-window

# Or open it pointing to a different folder first:
open -a Cursor --args /tmp
```

Then once Cursor is open, go to File → Open Folder and select your actual workspace.

## If Nothing Works: Complete Reset

```bash
# Quit Cursor first!

# Remove ALL Cursor data
rm -rf ~/Library/Application\ Support/Cursor

# Restart Cursor - it will be completely fresh
```

## Quick Reference

**To prevent restore:**
- Clear `~/Library/Application Support/Cursor/User/workspaceStorage`
- Set `window.restoreWindows` to `"none"` in settings
- Close any auto-opened windows immediately with `Cmd + W`

**When opening Cursor:**
- Don't let it auto-restore - close windows immediately
- Use File → Open Folder to manually select workspace
- This creates a fresh session without the problematic files
