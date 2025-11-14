# How to Clear Cursor Cache on Mac

## Method 1: Using Terminal (Recommended)

1. **Quit Cursor completely** - Make sure Cursor is not running
   - Press `Cmd + Q` or go to Cursor → Quit Cursor

2. **Open Terminal** and run these commands:

```bash
# Clear Cursor cache
rm -rf ~/Library/Application\ Support/Cursor/Cache
rm -rf ~/Library/Application\ Support/Cursor/CachedData
rm -rf ~/Library/Application\ Support/Cursor/Code\ Cache
rm -rf ~/Library/Application\ Support/Cursor/GPUCache

# Clear Cursor workspace storage
rm -rf ~/Library/Application\ Support/Cursor/User/workspaceStorage

# Clear Cursor logs (optional, but can help)
rm -rf ~/Library/Application\ Support/Cursor/logs

# Clear Cursor's state (optional)
rm -rf ~/Library/Application\ Support/Cursor/User/globalStorage
```

3. **Restart Cursor**

## Method 2: Using Finder (Manual)

1. **Quit Cursor completely** (`Cmd + Q`)

2. **Open Finder** and press `Cmd + Shift + G` (Go to Folder)

3. **Navigate to these folders and delete them:**
   - `~/Library/Application Support/Cursor/Cache`
   - `~/Library/Application Support/Cursor/CachedData`
   - `~/Library/Application Support/Cursor/Code Cache`
   - `~/Library/Application Support/Cursor/GPUCache`
   - `~/Library/Application Support/Cursor/User/workspaceStorage`

4. **Empty Trash** (`Cmd + Shift + Delete`)

5. **Restart Cursor**

## Method 3: Nuclear Option (Complete Reset)

If the above doesn't work, you can completely reset Cursor:

```bash
# Quit Cursor first!

# Backup your settings (optional)
cp -r ~/Library/Application\ Support/Cursor/User/settings.json ~/Desktop/cursor-settings-backup.json

# Remove all Cursor data
rm -rf ~/Library/Application\ Support/Cursor

# Restart Cursor (it will recreate the folders)
```

**Warning:** This will remove all your Cursor settings, extensions, and preferences. You'll need to reconfigure Cursor after this.

## Quick One-Liner (Safe - Cache Only)

If you just want to clear the cache without losing settings:

```bash
rm -rf ~/Library/Application\ Support/Cursor/Cache ~/Library/Application\ Support/Cursor/CachedData ~/Library/Application\ Support/Cursor/Code\ Cache ~/Library/Application\ Support/Cursor/GPUCache && echo "✓ Cache cleared"
```

## After Clearing Cache

1. **Restart Cursor**
2. **Reopen your workspace**
3. **Check if the crash issue is resolved**

If the issue persists after clearing cache, it might be:
- A Cursor bug that needs to be reported
- An issue with the workspace file itself
- A corrupted extension or setting
